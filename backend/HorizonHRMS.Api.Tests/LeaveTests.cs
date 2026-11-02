using System.Net;
using System.Net.Http.Json;
using HorizonHRMS.Api.Tests;

namespace HorizonHRMS.Api.Tests;

public class LeaveTests : IClassFixture<HrmsWebApplicationFactory>
{
    private readonly HrmsWebApplicationFactory _factory;

    public LeaveTests(HrmsWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task ApplyLeave_AsEmployee_CreatesPendingRequest()
    {
        var client = _factory.CreateAuthenticatedClient(HrmsWebApplicationFactory.EmployeeEmail, HrmsWebApplicationFactory.EmployeePassword);
        var response = await client.PostAsJsonAsync("/api/leave/requests", new
        {
            leaveTypeId = "lt-casual",
            fromDate = "2026-11-02",
            toDate = "2026-11-02",
            reason = "Integration test leave request",
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<LeaveRequestDto>();
        Assert.NotNull(body);
        Assert.Equal("Pending", body!.Status);
        Assert.Equal("HZT-0005", body.EmployeeId);
    }

    [Fact]
    public async Task ApplyOverlappingLeave_IsRejected()
    {
        var client = _factory.CreateAuthenticatedClient(HrmsWebApplicationFactory.EmployeeEmail, HrmsWebApplicationFactory.EmployeePassword);
        await client.PostAsJsonAsync("/api/leave/requests", new
        {
            leaveTypeId = "lt-casual",
            fromDate = "2026-11-10",
            toDate = "2026-11-10",
            reason = "First leave",
        });
        var second = await client.PostAsJsonAsync("/api/leave/requests", new
        {
            leaveTypeId = "lt-sick",
            fromDate = "2026-11-10",
            toDate = "2026-11-10",
            reason = "Overlapping leave",
        });
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    [Fact]
    public async Task ApplyLeave_WithInsufficientBalance_IsRejected()
    {
        var client = _factory.CreateAuthenticatedClient(HrmsWebApplicationFactory.EmployeeEmail, HrmsWebApplicationFactory.EmployeePassword);
        // request 100 days of casual leave
        var response = await client.PostAsJsonAsync("/api/leave/requests", new
        {
            leaveTypeId = "lt-casual",
            fromDate = "2027-01-01",
            toDate = "2027-04-10",
            reason = "Too long",
        });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task LeaveDecision_AsHrStaff_ApprovesAndUpdatesBalance()
    {
        var employeeClient = _factory.CreateAuthenticatedClient(HrmsWebApplicationFactory.EmployeeEmail, HrmsWebApplicationFactory.EmployeePassword);
        var created = await (await employeeClient.PostAsJsonAsync("/api/leave/requests", new
        {
            leaveTypeId = "lt-casual",
            fromDate = "2026-12-01",
            toDate = "2026-12-01",
            reason = "Approval test",
        })).Content.ReadFromJsonAsync<LeaveRequestDto>();

        var hrClient = _factory.CreateAuthenticatedClient(HrmsWebApplicationFactory.HrAdminEmail, HrmsWebApplicationFactory.HrAdminPassword);
        var decision = await hrClient.PostAsJsonAsync($"/api/leave/requests/{created!.Id}/decision", new
        {
            status = "Approved",
            note = "Approved in test",
        });
        Assert.Equal(HttpStatusCode.OK, decision.StatusCode);
        var decided = await decision.Content.ReadFromJsonAsync<LeaveRequestDto>();
        Assert.Equal("Approved", decided!.Status);
    }

    [Fact]
    public async Task LeaveDecision_AsEmployee_IsForbidden()
    {
        var employeeClient = _factory.CreateAuthenticatedClient(HrmsWebApplicationFactory.EmployeeEmail, HrmsWebApplicationFactory.EmployeePassword);
        var created = await (await employeeClient.PostAsJsonAsync("/api/leave/requests", new
        {
            leaveTypeId = "lt-casual",
            fromDate = "2026-12-15",
            toDate = "2026-12-15",
            reason = "Forbidden decision test",
        })).Content.ReadFromJsonAsync<LeaveRequestDto>();

        var otherEmployeeClient = _factory.CreateAuthenticatedClient(HrmsWebApplicationFactory.ManagerEmail, HrmsWebApplicationFactory.ManagerPassword);
        // manager is not HrStaff? manager is not in HrStaff policy, so forbidden
        var decision = await otherEmployeeClient.PostAsJsonAsync($"/api/leave/requests/{created!.Id}/decision", new
        {
            status = "Approved",
        });
        Assert.Equal(HttpStatusCode.Forbidden, decision.StatusCode);
    }
}

public sealed class LeaveRequestDto
{
    public string Id { get; set; } = string.Empty;
    public string EmployeeId { get; set; } = string.Empty;
    public string LeaveTypeId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}
