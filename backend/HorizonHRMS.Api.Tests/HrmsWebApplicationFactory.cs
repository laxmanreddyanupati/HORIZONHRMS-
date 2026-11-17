using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using HorizonHRMS.Api.Data;
using Microsoft.Data.SqlClient;

namespace HorizonHRMS.Api.Tests;

public sealed class HrmsWebApplicationFactory : WebApplicationFactory<Program>
{
    public string DatabaseName { get; } = $"HorizonHRMS_Tests_{Guid.NewGuid():N}";
    private readonly Dictionary<string, string?> previousEnvironment = new();
    private bool seedEnabled = true;
    private bool disposed;
    public bool SeedEnabled
    {
        get => seedEnabled;
        set { seedEnabled = value; SetEnvironmentSetting("Seed__Enabled", value.ToString()); }
    }
    private string TestConnection => $"Server=localhost;Database={DatabaseName};Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=True";
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
        // Minimal-host startup reads some configuration before test host callbacks.
        // Set these before startup and restore them when this fixture is disposed.
        foreach (var (key, value) in GetSettings())
            SetEnvironmentSetting(key.Replace(":", "__"), value);
    }

    private void SetEnvironmentSetting(string key, string? value)
    {
        if (!previousEnvironment.ContainsKey(key)) previousEnvironment[key] = Environment.GetEnvironmentVariable(key);
        Environment.SetEnvironmentVariable(key, value);
    }

    private Dictionary<string, string?> GetSettings()
    {
        var settings = new Dictionary<string, string?>
        {
            ["ConnectionStrings:DefaultConnection"] = TestConnection,
            ["Auth:SigningKey"] = TestSigningKey,
            ["Database:ApplyMigrations"] = "true",
            ["Seed:Enabled"] = SeedEnabled.ToString(),
            ["Demo:SnapshotDate"] = "2026-10-30",
        };

        var emails = new[]
        {
            "vikram.rao@horizontech.example", "priya.menon@horizontech.example", "sneha.reddy@horizontech.example",
            "rohan.iyer@horizontech.example", "meera.joshi@horizontech.example", "arjun.nair@horizontech.example",
            "aditya.verma@horizontech.example", "kavita.rao@horizontech.example", "dev.patel@horizontech.example",
            "farah.khan@horizontech.example",
        };
        foreach (var e in emails)
        {
            settings[$"Seed:UserPasswords:{e}"] = "TestPassword!123";
        }
        return settings;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        var settings = GetSettings();
        builder.ConfigureAppConfiguration((_, configuration) => configuration.AddInMemoryCollection(settings));
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<HrmsDbContext>();
            services.RemoveAll<DbContextOptions<HrmsDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<HrmsDbContext>>();
            services.AddDbContext<HrmsDbContext>(options => options.UseSqlServer(TestConnection));
        });
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
        // Never resolve an application-configured context for destructive cleanup.
        var options = new DbContextOptionsBuilder<HrmsDbContext>()
            .UseSqlServer(TestConnection, sql => sql.CommandTimeout(120)).Options;
        using var db = new HrmsDbContext(options);
        if (db.Database.GetDbConnection().Database != DatabaseName || !DatabaseName.StartsWith("HorizonHRMS_Tests_"))
            throw new InvalidOperationException("Refusing to delete a non-test database.");
        db.Database.EnsureDeleted();
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing && !disposed)
        {
            try
            {
                // Stop the host before removing its database; pooled test connections
                // must not keep it busy during DROP DATABASE.
                base.Dispose(disposing);
                SqlConnection.ClearAllPools();
                DropDatabase();
            }
            finally
            {
                foreach (var (key, value) in previousEnvironment) Environment.SetEnvironmentVariable(key, value);
                disposed = true;
            }
            return;
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
