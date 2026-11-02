using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using HorizonHRMS.Api.Data;

namespace HorizonHRMS.Api.Tests;

public sealed class HrmsWebApplicationFactory : WebApplicationFactory<Program>
{
    public string DatabaseName { get; } = $"HorizonHRMS_Tests_{Guid.NewGuid():N}";
    public const string TestSigningKey = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    public const string SuperAdminEmail = "vikram.rao@horizontech.example";
    public const string SuperAdminPassword = "TestPassword!123";
    public const string HrAdminEmail = "priya.menon@horizontech.example";
    public const string HrAdminPassword = "TestPassword!123";
    public const string HrExecutiveEmail = "sneha.reddy@horizontech.example";
    public const string HrExecutivePassword = "TestPassword!123";
    public const string ManagerEmail = "rohan.iyer@horizontech.example";
    public const string ManagerPassword = "TestPassword!123";
    public const string PayrollAdminEmail = "meera.joshi@horizontech.example";
    public const string PayrollAdminPassword = "TestPassword!123";
    public const string EmployeeEmail = "arjun.nair@horizontech.example";
    public const string EmployeePassword = "TestPassword!123";

    public HrmsWebApplicationFactory()
    {
        var conn = $"Server=localhost;Database={DatabaseName};Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=True";
        Environment.SetEnvironmentVariable("ConnectionStrings__DefaultConnection", conn);
        Environment.SetEnvironmentVariable("Auth__SigningKey", TestSigningKey);
        Environment.SetEnvironmentVariable("Database__ApplyMigrations", "true");
        Environment.SetEnvironmentVariable("Seed__Enabled", "true");

        var emails = new[]
        {
            "vikram.rao@horizontech.example", "priya.menon@horizontech.example", "sneha.reddy@horizontech.example",
            "rohan.iyer@horizontech.example", "meera.joshi@horizontech.example", "arjun.nair@horizontech.example",
            "aditya.verma@horizontech.example", "kavita.rao@horizontech.example", "dev.patel@horizontech.example",
            "farah.khan@horizontech.example",
        };
        foreach (var e in emails)
        {
            Environment.SetEnvironmentVariable($"Seed__UserPasswords__{e}", "TestPassword!123");
        }
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
    }

    public HttpClient CreateAuthenticatedClient(string email, string password)
    {
        var client = CreateClient();
        var login = client.PostAsJsonAsync("/api/auth/login", new { email, password }).GetAwaiter().GetResult();
        login.EnsureSuccessStatusCode();
        var body = login.Content.ReadFromJsonAsync<LoginResponse>().GetAwaiter().GetResult();
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", body!.AccessToken);
        return client;
    }

    public void DropDatabase()
    {
        try
        {
            using var scope = Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HrmsDbContext>();
            db.Database.EnsureDeleted();
        }
        catch
        {
        }
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            DropDatabase();
        }
        base.Dispose(disposing);
    }
}

public sealed class LoginResponse
{
    public string AccessToken { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public DateTime AccessTokenExpiresAt { get; set; }
    public SystemUserDto User { get; set; } = new();
}

public sealed class SystemUserDto
{
    public string Id { get; set; } = string.Empty;
    public string? EmployeeId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}
