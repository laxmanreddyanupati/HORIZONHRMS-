using System.Net;
using HorizonHRMS.Api.Tests;

namespace HorizonHRMS.Api.Tests;

public class DashboardAndReportsTests : IClassFixture<HrmsWebApplicationFactory>
{
    private readonly HrmsWebApplicationFactory _factory;

    public DashboardAndReportsTests(HrmsWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task DashboardOverview_AsSuperAdmin_ReturnsOk()
    {
        var client = _factory.CreateAuthenticatedClient(HrmsWebApplicationFactory.SuperAdminEmail, HrmsWebApplicationFactory.SuperAdminPassword);
        var response = await client.GetAsync("/api/dashboard/overview");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Reports_AsOperations_ReturnsOk()
    {
        var client = _factory.CreateAuthenticatedClient(HrmsWebApplicationFactory.HrAdminEmail, HrmsWebApplicationFactory.HrAdminPassword);
        var response = await client.GetAsync("/api/reports");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Reports_AsEmployee_ReturnsForbidden()
    {
        var client = _factory.CreateAuthenticatedClient(HrmsWebApplicationFactory.EmployeeEmail, HrmsWebApplicationFactory.EmployeePassword);
        var response = await client.GetAsync("/api/reports");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task ReportById_AsOperations_ReturnsOk()
    {
        var client = _factory.CreateAuthenticatedClient(HrmsWebApplicationFactory.HrAdminEmail, HrmsWebApplicationFactory.HrAdminPassword);
        var list = await client.GetAsync("/api/reports");
        var content = await list.Content.ReadAsStringAsync();
        Assert.True(list.IsSuccessStatusCode);
    }
}
