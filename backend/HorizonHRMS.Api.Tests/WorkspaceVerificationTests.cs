using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using HorizonHRMS.Api.Data;
using HorizonHRMS.Api.Infrastructure;
using HorizonHRMS.Api.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;

namespace HorizonHRMS.Api.Tests;

public class WorkspaceVerificationTests
{
    [Fact]
    public async Task EmptyWorkspace_AllCollectionReadsSucceed_AndRequireAuthentication()
    {
        using var factory = new HrmsWebApplicationFactory { SeedEnabled = false };
        {
            using var client = factory.CreateClient();
            using var schema = await client.GetFromJsonAsync<JsonDocument>("/swagger/v1/swagger.json");
            var paths = schema!.RootElement.GetProperty("paths").EnumerateObject()
                .Where(path => path.Value.TryGetProperty("get", out _) && !path.Name.Contains('{'))
                .Select(path => path.Name).ToArray();
            Assert.True(paths.Length >= 50, "Expected discovery of collection endpoints across all modules.");
            foreach (var path in paths.Where(path => path.StartsWith("/api/")))
            {
                using var response = await client.GetAsync(path);
                Assert.True(response.StatusCode == HttpStatusCode.Unauthorized,
                    $"Anonymous GET {path}: expected 401, got {(int)response.StatusCode}");
            }
            using (var scope = factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<HrmsDbContext>();
                Assert.Equal(factory.DatabaseName, db.Database.GetDbConnection().Database);
                db.Users.Add(new AppUser
                {
                    Id = Guid.NewGuid().ToString("N"), Name = "Workspace Test Admin",
                    Email = "workspace-admin@example.com", Role = Roles.SuperAdmin,
                    Status = "Active", PasswordHash = PasswordService.Hash("WorkspaceTest!234")
                });
                await db.SaveChangesAsync();
            }
            using var login = await client.PostAsJsonAsync("/api/auth/login",
                new { email = "workspace-admin@example.com", password = "WorkspaceTest!234" });
            login.EnsureSuccessStatusCode();
            var session = await login.Content.ReadFromJsonAsync<LoginResponse>();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", session!.AccessToken);
            foreach (var path in paths)
            {
                using var response = await client.GetAsync(path);
                Assert.True(response.IsSuccessStatusCode,
                    $"Empty workspace GET {path}: {(int)response.StatusCode} {await response.Content.ReadAsStringAsync()}");
            }
            var company = await client.GetFromJsonAsync<JsonElement>("/api/admin/company-profile");
            foreach (var field in new[] { "legalName", "displayName", "domain", "industry", "headquarters", "email", "phone", "website", "gstin", "pan", "cin" })
                Assert.Equal(string.Empty, company.GetProperty(field).GetString());
            var overview = await client.GetFromJsonAsync<JsonElement>("/api/dashboard/overview");
            Assert.Equal(JsonValueKind.Null, overview.GetProperty("currentRun").ValueKind);
        }
    }

    [Fact]
    public async Task OrganizationReferenceData_CreateUpdateDelete_RoundTrips()
    {
        using var factory = new HrmsWebApplicationFactory();
        using var client = factory.CreateAuthenticatedClient(
            HrmsWebApplicationFactory.SuperAdminEmail, HrmsWebApplicationFactory.SuperAdminPassword);
        var department = await Create(client, "/api/organization/departments",
            new { name = "Verification Department", code = "VERIFY", description = "Isolated test", email = "verify@example.com" });
        var departmentId = department.GetProperty("id").GetString();
        var designation = await Create(client, "/api/organization/designations",
            new { title = "Verification Analyst", departmentId, level = "L1", grade = "G1" });
        var designationId = designation.GetProperty("id").GetString();
        var branch = await Create(client, "/api/organization/branches",
            new { name = "Verification Branch", city = "Hyderabad", state = "Telangana", isHeadquarters = false });
        var branchId = branch.GetProperty("id").GetString();
        using var update = await client.PutAsJsonAsync($"/api/organization/departments/{departmentId}",
            new { name = "Updated Verification Department", code = "VERIFY", description = "Updated", email = "verify@example.com" });
        update.EnsureSuccessStatusCode();
        var updated = await update.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Updated Verification Department", updated.GetProperty("name").GetString());
        foreach (var path in new[] { $"designations/{designationId}", $"branches/{branchId}", $"departments/{departmentId}" })
        {
            using var response = await client.DeleteAsync($"/api/organization/{path}");
            Assert.True(response.IsSuccessStatusCode, $"DELETE {path}: {await response.Content.ReadAsStringAsync()}");
        }
        var departments = await client.GetFromJsonAsync<JsonElement>("/api/organization/departments");
        Assert.DoesNotContain(departments.EnumerateArray(), item => item.GetProperty("id").GetString() == departmentId);
    }

    [Fact]
    public async Task AssetRegistration_Persists_AndRejectsDuplicateIdentifier()
    {
        using var factory = new HrmsWebApplicationFactory();
        using var client = factory.CreateAuthenticatedClient(
            HrmsWebApplicationFactory.SuperAdminEmail, HrmsWebApplicationFactory.SuperAdminPassword);
        var payload = new { assetId = "VERIFY-LAPTOP", serialNumber = "VERIFY-SERIAL", name = "Verification laptop", type = "LAPTOP" };
        var asset = await Create(client, "/api/it-assets", payload);
        var id = asset.GetProperty("id").GetString();
        using var get = await client.GetAsync($"/api/it-assets/{id}");
        get.EnsureSuccessStatusCode();
        var stored = await get.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(payload.assetId, stored.GetProperty("assetId").GetString());
        using var duplicate = await client.PostAsJsonAsync("/api/it-assets", payload);
        Assert.True(duplicate.StatusCode is HttpStatusCode.BadRequest or HttpStatusCode.Conflict,
            $"Duplicate asset returned {(int)duplicate.StatusCode}");
    }

    [Fact]
    public async Task Project_CreateUpdateCompleteDelete_RoundTrips()
    {
        using var factory = new HrmsWebApplicationFactory();
        using var client = factory.CreateAuthenticatedClient(
            HrmsWebApplicationFactory.SuperAdminEmail, HrmsWebApplicationFactory.SuperAdminPassword);
        var project = await Create(client, "/api/projects", new
        {
            title = "Verification project", departmentId = "dept-eng", status = "Active",
            startDate = "2026-11-17", endDate = "2026-12-31", budget = 10000, memberIds = Array.Empty<string>()
        });
        var id = project.GetProperty("id").GetString();
        using var update = await client.PutAsJsonAsync($"/api/projects/{id}", new
        {
            title = "Updated verification project", departmentId = "dept-eng", status = "Active",
            startDate = "2026-11-17", endDate = "2026-12-31", budget = 12000, memberIds = Array.Empty<string>()
        });
        update.EnsureSuccessStatusCode();
        using var complete = await client.PatchAsJsonAsync($"/api/projects/{id}/status", new { status = "Completed" });
        complete.EnsureSuccessStatusCode();
        var stored = await client.GetFromJsonAsync<JsonElement>($"/api/projects/{id}");
        Assert.Equal("Updated verification project", stored.GetProperty("title").GetString());
        Assert.Equal("Completed", stored.GetProperty("status").GetString());
        using var delete = await client.DeleteAsync($"/api/projects/{id}");
        delete.EnsureSuccessStatusCode();
        using var missing = await client.GetAsync($"/api/projects/{id}");
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Department_OptionalEmail_CanBeOmittedOrBlank(string? email)
    {
        using var factory = new HrmsWebApplicationFactory();
        using var client = factory.CreateAuthenticatedClient(
            HrmsWebApplicationFactory.SuperAdminEmail, HrmsWebApplicationFactory.SuperAdminPassword);
        var payload = new Dictionary<string, object?> { ["name"] = "Optional Email Department", ["code"] = "OPTIONAL" };
        if (email is not null) payload["email"] = email;
        var created = await Create(client, "/api/organization/departments", payload);
        Assert.Equal(string.Empty, created.GetProperty("email").GetString());
        using var update = await client.PutAsJsonAsync($"/api/organization/departments/{created.GetProperty("id").GetString()}", payload);
        update.EnsureSuccessStatusCode();
        payload["email"] = "invalid-email";
        using var invalid = await client.PostAsJsonAsync("/api/organization/departments", payload);
        Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);
    }

    [Fact]
    public async Task Notifications_ReadAll_PersistsAndKeepsOtherUsersUnread()
    {
        using var factory = new HrmsWebApplicationFactory();
        using var client = factory.CreateAuthenticatedClient(
            HrmsWebApplicationFactory.SuperAdminEmail, HrmsWebApplicationFactory.SuperAdminPassword);
        string otherNotificationId = Guid.NewGuid().ToString("N");
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<HrmsDbContext>();
            var userId = db.Users.Single(user => user.Email == HrmsWebApplicationFactory.SuperAdminEmail).Id;
            var otherId = db.Users.Single(user => user.Email == HrmsWebApplicationFactory.HrAdminEmail).Id;
            db.Notifications.AddRange(
                new Notification { Id = Guid.NewGuid().ToString("N"), UserId = userId, Title = "Verify read", Message = "Test", Module = "system", CreatedAt = DateTime.UtcNow },
                new Notification { Id = otherNotificationId, UserId = otherId, Title = "Other account", Message = "Test", Module = "system", CreatedAt = DateTime.UtcNow });
            await db.SaveChangesAsync();
        }
        var count = await client.GetFromJsonAsync<JsonElement>("/api/notifications/unread-count");
        Assert.True(count.GetProperty("count").GetInt32() > 0);
        using var readAll = await client.PostAsync("/api/notifications/read-all", null);
        readAll.EnsureSuccessStatusCode();
        var after = await client.GetFromJsonAsync<JsonElement>("/api/notifications/unread-count");
        Assert.Equal(0, after.GetProperty("count").GetInt32());
        var list = await client.GetFromJsonAsync<JsonElement>("/api/notifications");
        Assert.All(list.EnumerateArray(), item => Assert.True(item.GetProperty("isRead").GetBoolean()));
        using var verifyScope = factory.Services.CreateScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<HrmsDbContext>();
        Assert.False(verifyDb.Notifications.Single(item => item.Id == otherNotificationId).IsRead);
    }

    private static async Task<JsonElement> Create(HttpClient client, string path, object payload)
    {
        using var response = await client.PostAsJsonAsync(path, payload);
        Assert.True(response.IsSuccessStatusCode, $"POST {path}: {(int)response.StatusCode} {await response.Content.ReadAsStringAsync()}");
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }
}
