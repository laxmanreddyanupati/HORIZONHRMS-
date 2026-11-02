using System.Net;
using System.Net.Http.Json;
using HorizonHRMS.Api.Tests;
using Microsoft.AspNetCore.Mvc.Testing;

namespace HorizonHRMS.Api.Tests;

public class HealthAndAuthTests : IClassFixture<HrmsWebApplicationFactory>
{
    private readonly HrmsWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public HealthAndAuthTests(HrmsWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Health_ReturnsOk()
    {
        var response = await _client.GetAsync("/health");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Login_WithValidCredentials_ReturnsToken()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            email = HrmsWebApplicationFactory.SuperAdminEmail,
            password = HrmsWebApplicationFactory.SuperAdminPassword,
        });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<LoginResponse>();
        Assert.False(string.IsNullOrWhiteSpace(body?.AccessToken));
        Assert.Equal(HrmsWebApplicationFactory.SuperAdminEmail, body?.User.Email);
        Assert.Equal("super-admin", body?.User.Role);
    }

    [Fact]
    public async Task Login_WithInvalidPassword_Returns401()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            email = HrmsWebApplicationFactory.SuperAdminEmail,
            password = "wrong-password-123",
        });
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Me_WithoutToken_Returns401()
    {
        var response = await _client.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Me_WithValidToken_ReturnsUser()
    {
        var client = _factory.CreateAuthenticatedClient(HrmsWebApplicationFactory.SuperAdminEmail, HrmsWebApplicationFactory.SuperAdminPassword);
        var response = await client.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var user = await response.Content.ReadFromJsonAsync<SystemUserDto>();
        Assert.Equal(HrmsWebApplicationFactory.SuperAdminEmail, user?.Email);
    }
}
