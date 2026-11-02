using HorizonHRMS.Api.Contracts;
using HorizonHRMS.Api.Data;
using HorizonHRMS.Api.Infrastructure;
using HorizonHRMS.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HorizonHRMS.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(HrmsDbContext db, TokenService tokens, AuditService audit) : ControllerBase
{
    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request, CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(candidate => candidate.Email == email, cancellationToken);
        if (user is null || !PasswordService.Verify(request.Password, user.PasswordHash))
        {
            throw ApiException.Unauthorized("Invalid email or password.", "invalid_credentials");
        }

        if (!string.Equals(user.Status, "Active", StringComparison.OrdinalIgnoreCase))
        {
            throw new ApiException(
                System.Net.HttpStatusCode.Forbidden,
                "account_inactive",
                "This account is not active. Contact an administrator.");
        }

        var response = await tokens.IssueTokensAsync(user, cancellationToken);
        audit.Record(User, HttpContext, "Signed in", "Authentication", user.Email);
        await db.SaveChangesAsync(cancellationToken);
        return Ok(response);
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Refresh(RefreshRequest request, CancellationToken cancellationToken)
    {
        var hash = TokenService.HashRefreshToken(request.RefreshToken);
        var stored = await db.RefreshTokens
            .Include(token => token.User)
            .FirstOrDefaultAsync(token => token.TokenHash == hash, cancellationToken);

        if (stored is null || stored.RevokedAt is not null || stored.ExpiresAt <= DateTime.UtcNow || stored.User is null)
        {
            throw ApiException.Unauthorized("The refresh token is invalid or has expired. Please sign in again.", "invalid_refresh_token");
        }

        if (!string.Equals(stored.User.Status, "Active", StringComparison.OrdinalIgnoreCase))
        {
            throw new ApiException(System.Net.HttpStatusCode.Forbidden, "account_inactive", "This account is not active.");
        }

        stored.RevokedAt = DateTime.UtcNow;
        var response = await tokens.IssueTokensAsync(stored.User, cancellationToken);
        stored.ReplacedByTokenHash = TokenService.HashRefreshToken(response.RefreshToken);
        await db.SaveChangesAsync(cancellationToken);
        return Ok(response);
    }

    [HttpPost("logout")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Logout(LogoutRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        var hash = TokenService.HashRefreshToken(request.RefreshToken);
        var stored = await db.RefreshTokens
            .FirstOrDefaultAsync(token => token.TokenHash == hash && token.UserId == userId, cancellationToken);

        if (stored is not null && stored.RevokedAt is null)
        {
            stored.RevokedAt = DateTime.UtcNow;
            audit.Record(User, HttpContext, "Signed out", "Authentication", User.GetDisplayName());
            await db.SaveChangesAsync(cancellationToken);
        }

        return NoContent();
    }

    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(SystemUserDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<SystemUserDto>> Me(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        var user = await db.Users.AsNoTracking()
            .FirstOrDefaultAsync(candidate => candidate.Id == userId, cancellationToken);
        if (user is null)
        {
            throw ApiException.Unauthorized("The user account no longer exists.", "account_missing");
        }

        return Ok(user.ToDto());
    }
}
