using System.Net.Http.Json;
using HorizonHRMS.Api.Data;
using HorizonHRMS.Api.Infrastructure;
using HorizonHRMS.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace HorizonHRMS.Api.Tests;

public class BootstrapAdminTests
{
    [Fact]
    public async Task EmptyDatabase_CreatesHashedAdmin_AndNeverResetsExistingPassword()
    {
        using var factory = new HrmsWebApplicationFactory { SeedEnabled = false };
        using var client = factory.CreateClient();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HrmsDbContext>();
        const string password = "BootstrapTest!Password456";
        await BootstrapAdmin.EnsureAsync(db, new() { Enabled = true, Email = " CLOUD.ADMIN@example.com ", Password = password });
        var user = await db.Users.SingleAsync();
        Assert.Equal("cloud.admin@example.com", user.Email);
        Assert.Equal(Roles.SuperAdmin, user.Role);
        Assert.NotEqual(password, user.PasswordHash);
        Assert.True(PasswordService.Verify(password, user.PasswordHash));
        await BootstrapAdmin.EnsureAsync(db, new() { Enabled = true, Email = user.Email, Password = "DifferentTest!Password456" });
        Assert.True(PasswordService.Verify(password, (await db.Users.SingleAsync()).PasswordHash));
        using var login = await client.PostAsJsonAsync("/api/auth/login", new { email = user.Email, password });
        login.EnsureSuccessStatusCode();
    }

    [Theory]
    [InlineData("invalid-email", "BootstrapTest!Password456")]
    [InlineData("admin@example.com", "short")]
    public async Task InvalidBootstrapConfiguration_DoesNotCreateAnyUser(string email, string password)
    {
        using var factory = new HrmsWebApplicationFactory { SeedEnabled = false };
        using var client = factory.CreateClient();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HrmsDbContext>();
        await Assert.ThrowsAsync<InvalidOperationException>(() => BootstrapAdmin.EnsureAsync(db,
            new() { Enabled = true, Email = email, Password = password }));
        Assert.False(await db.Users.AnyAsync());
    }

    [Fact]
    public async Task DisabledBootstrap_DoesNotCreateAnAccount()
    {
        using var factory = new HrmsWebApplicationFactory { SeedEnabled = false };
        using var client = factory.CreateClient();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HrmsDbContext>();
        await BootstrapAdmin.EnsureAsync(db, new() { Enabled = false });
        Assert.False(await db.Users.AnyAsync());
    }

    [Fact]
    public async Task PopulatedDatabase_DoesNotAddAnotherAdministrator()
    {
        using var factory = new HrmsWebApplicationFactory();
        using var client = factory.CreateClient();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HrmsDbContext>();
        var before = await db.Users.CountAsync();
        await BootstrapAdmin.EnsureAsync(db, new() { Enabled = true, Email = "new-admin@example.com", Password = "BootstrapTest!Password456" });
        Assert.Equal(before, await db.Users.CountAsync());
        Assert.False(await db.Users.AnyAsync(user => user.Email == "new-admin@example.com"));
    }
}
