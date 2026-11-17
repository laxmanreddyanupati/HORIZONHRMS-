using System.Net.Mail;
using HorizonHRMS.Api.Data;
using HorizonHRMS.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace HorizonHRMS.Api.Infrastructure;

public sealed class BootstrapAdminOptions
{
    public bool Enabled { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = "Administrator";
    public string Password { get; set; } = string.Empty;
}

public static class BootstrapAdmin
{
    public static async Task EnsureAsync(HrmsDbContext db, BootstrapAdminOptions options, CancellationToken cancellationToken = default)
    {
        // Empty-database initialization must never reset an existing account.
        if (!options.Enabled || await db.Users.AnyAsync(cancellationToken)) return;
        var email = options.Email.Trim().ToLowerInvariant();
        if (!MailAddress.TryCreate(email, out var parsed) || parsed.Address != email)
            throw new InvalidOperationException("BootstrapAdmin:Email must be a valid email address.");
        if (options.Password.Length is < 16 or > 256)
            throw new InvalidOperationException("BootstrapAdmin:Password must contain 16 to 256 characters.");
        db.Users.Add(new AppUser
        {
            Id = Guid.NewGuid().ToString("N"),
            Name = string.IsNullOrWhiteSpace(options.Name) ? "Administrator" : options.Name.Trim(),
            Email = email,
            PasswordHash = PasswordService.Hash(options.Password),
            Role = Roles.SuperAdmin,
            Status = "Active",
        });
        await db.SaveChangesAsync(cancellationToken);
    }
}
