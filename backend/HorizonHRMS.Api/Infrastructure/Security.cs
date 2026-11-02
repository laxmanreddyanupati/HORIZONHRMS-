using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using HorizonHRMS.Api.Contracts;
using HorizonHRMS.Api.Data;
using HorizonHRMS.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace HorizonHRMS.Api.Infrastructure;

public sealed class AuthSettings
{
    public const string SectionName = "Auth";

    public string Issuer { get; set; } = "HorizonHRMS";
    public string Audience { get; set; } = "HorizonHRMS.Client";
    public string SigningKey { get; set; } = string.Empty;
    public int AccessTokenMinutes { get; set; } = 30;
    public int RefreshTokenDays { get; set; } = 7;
}

public static class PasswordService
{
    private const int Iterations = 210_000;
    private const int SaltSize = 32;
    private const int HashSize = 32;
    private const string Prefix = "PBKDF2-SHA256";

    public static string Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var hash = Rfc2898DeriveBytes.Pbkdf2(
            Encoding.UTF8.GetBytes(password),
            salt,
            Iterations,
            HashAlgorithmName.SHA256,
            HashSize);
        return $"{Prefix}${Iterations}${Convert.ToBase64String(salt)}${Convert.ToBase64String(hash)}";
    }

    public static bool Verify(string password, string stored)
    {
        if (string.IsNullOrWhiteSpace(stored))
        {
            return false;
        }

        var parts = stored.Split('$', StringSplitOptions.None);
        if (parts.Length != 4 || parts[0] != Prefix || !int.TryParse(parts[1], out var iterations))
        {
            return false;
        }

        try
        {
            var salt = Convert.FromBase64String(parts[2]);
            var expected = Convert.FromBase64String(parts[3]);
            var actual = Rfc2898DeriveBytes.Pbkdf2(
                Encoding.UTF8.GetBytes(password),
                salt,
                iterations,
                HashAlgorithmName.SHA256,
                expected.Length);
            return CryptographicOperations.FixedTimeEquals(expected, actual);
        }
        catch (FormatException)
        {
            return false;
        }
    }
}

public sealed class TokenService(IOptions<AuthSettings> options, HrmsDbContext db)
{
    private readonly AuthSettings _settings = options.Value;

    public (string Token, DateTime ExpiresAt) CreateAccessToken(AppUser user)
    {
        var now = DateTime.UtcNow;
        var expires = now.AddMinutes(Math.Clamp(_settings.AccessTokenMinutes, 5, 1440));
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
            new("name", user.Name),
            new("role", user.Role),
        };

        if (!string.IsNullOrWhiteSpace(user.EmployeeId))
        {
            claims.Add(new Claim("employeeId", user.EmployeeId));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.SigningKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: _settings.Issuer,
            audience: _settings.Audience,
            claims: claims,
            notBefore: now,
            expires: expires,
            signingCredentials: credentials);

        return (new JwtSecurityTokenHandler().WriteToken(token), expires);
    }

    public (string Raw, string Hash, DateTime ExpiresAt) CreateRefreshToken()
    {
        var raw = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64))
            .Replace('+', '-').Replace('/', '_').TrimEnd('=');
        return (raw, HashRefreshToken(raw), DateTime.UtcNow.AddDays(Math.Clamp(_settings.RefreshTokenDays, 1, 60)));
    }

    public static string HashRefreshToken(string raw) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(raw))).ToLowerInvariant();

    public async Task<AuthResponse> IssueTokensAsync(AppUser user, CancellationToken cancellationToken)
    {
        var (accessToken, accessExpiresAt) = CreateAccessToken(user);
        var (rawRefresh, refreshHash, refreshExpiresAt) = CreateRefreshToken();

        db.RefreshTokens.Add(new RefreshToken
        {
            Id = Guid.NewGuid().ToString("N"),
            UserId = user.Id,
            TokenHash = refreshHash,
            ExpiresAt = refreshExpiresAt,
        });

        user.LastActive = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        return new AuthResponse
        {
            AccessToken = accessToken,
            RefreshToken = rawRefresh,
            AccessTokenExpiresAt = accessExpiresAt,
            User = user.ToDto(),
        };
    }
}

public static class ClaimsPrincipalExtensions
{
    public static string? GetUserId(this ClaimsPrincipal principal) =>
        principal.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? principal.FindFirstValue(ClaimTypes.NameIdentifier);

    public static string GetDisplayName(this ClaimsPrincipal principal) =>
        principal.FindFirstValue("name") ?? principal.Identity?.Name ?? "Unknown user";

    public static string GetRole(this ClaimsPrincipal principal) =>
        principal.FindFirstValue("role") ?? string.Empty;

    public static string? GetEmployeeId(this ClaimsPrincipal principal) =>
        principal.FindFirstValue("employeeId");

    public static bool HasAnyRole(this ClaimsPrincipal principal, params string[] roles) =>
        roles.Any(role => principal.IsInRole(role));

    public static string ClientIp(this HttpContext context) =>
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
}

public static class AccessScope
{
    public static bool IsHrStaff(this ClaimsPrincipal principal) =>
        principal.HasAnyRole(Roles.SuperAdmin, Roles.HrAdmin, Roles.HrExecutive);

    public static bool IsHrAdmin(this ClaimsPrincipal principal) =>
        principal.HasAnyRole(Roles.SuperAdmin, Roles.HrAdmin);

    public static bool IsManager(this ClaimsPrincipal principal) =>
        principal.HasAnyRole(Roles.Manager);

    public static bool IsPayrollStaff(this ClaimsPrincipal principal) =>
        principal.HasAnyRole(Roles.SuperAdmin, Roles.HrAdmin, Roles.PayrollAdmin);

    public static bool CanSeeAllPeople(this ClaimsPrincipal principal) =>
        principal.HasAnyRole(Roles.SuperAdmin, Roles.HrAdmin, Roles.HrExecutive, Roles.PayrollAdmin);

    /// <summary>
    /// Returns null when the caller may see every employee. Otherwise returns the
    /// employee IDs the caller is allowed to see (self, plus direct reports for managers).
    /// </summary>
    public static async Task<HashSet<string>?> VisibleEmployeeIdsAsync(
        HrmsDbContext db, ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        if (user.CanSeeAllPeople())
        {
            return null;
        }

        var self = user.GetEmployeeId();
        if (string.IsNullOrWhiteSpace(self))
        {
            return [];
        }

        var ids = new HashSet<string>(StringComparer.Ordinal) { self };
        if (user.IsManager())
        {
            var reports = await db.Employees
                .AsNoTracking()
                .Where(employee => employee.ManagerId == self)
                .Select(employee => employee.Id)
                .ToListAsync(cancellationToken);
            ids.UnionWith(reports);
        }

        return ids;
    }

    public static async Task EnsureCanSeeEmployeeAsync(
        HrmsDbContext db, ClaimsPrincipal user, string employeeId, CancellationToken cancellationToken)
    {
        if (user.CanSeeAllPeople())
        {
            return;
        }

        var visible = await VisibleEmployeeIdsAsync(db, user, cancellationToken);
        if (visible is null || visible.Contains(employeeId))
        {
            return;
        }

        throw ApiException.Forbidden("You can only access your own records or your direct reports.");
    }

    public static string RequireEmployeeId(ClaimsPrincipal user, string? requestedEmployeeId, bool allowOverrideForHr = true)
    {
        var self = user.GetEmployeeId();
        if (allowOverrideForHr && user.IsHrStaff())
        {
            var value = string.IsNullOrWhiteSpace(requestedEmployeeId) ? self : requestedEmployeeId;
            if (string.IsNullOrWhiteSpace(value))
            {
                throw ApiException.BadRequest("An employee must be specified.", "employee_required");
            }
            return value;
        }

        if (string.IsNullOrWhiteSpace(self))
        {
            throw ApiException.Forbidden("This action requires a user linked to an employee record.");
        }

        if (!string.IsNullOrWhiteSpace(requestedEmployeeId) && requestedEmployeeId != self)
        {
            throw ApiException.Forbidden("You can only act on your own records.");
        }

        return self;
    }
}
