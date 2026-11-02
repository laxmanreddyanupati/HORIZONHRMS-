using System.Net;
using System.Net.Http.Json;
using HorizonHRMS.Api.Tests;

namespace HorizonHRMS.Api.Tests;

public class AuthorizationTests : IClassFixture<HrmsWebApplicationFactory>
{
    private readonly HrmsWebApplicationFactory _factory;

    public AuthorizationTests(HrmsWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task Employee_CannotAccessPayrollRuns()
    {
        var client = _factory.CreateAuthenticatedClient(HrmsWebApplicationFactory.EmployeeEmail, HrmsWebApplicationFactory.EmployeePassword);
        var response = await client.GetAsync("/api/payroll/runs");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task PayrollAdmin_CanAccessPayrollRuns()
    {
        var client = _factory.CreateAuthenticatedClient(HrmsWebApplicationFactory.PayrollAdminEmail, HrmsWebApplicationFactory.PayrollAdminPassword);
        var response = await client.GetAsync("/api/payroll/runs");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Employee_CannotAccessAdminUsers()
    {
        var client = _factory.CreateAuthenticatedClient(HrmsWebApplicationFactory.EmployeeEmail, HrmsWebApplicationFactory.EmployeePassword);
        var response = await client.GetAsync("/api/admin/users");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task HrAdmin_CanAccessAdminUsers()
    {
        var client = _factory.CreateAuthenticatedClient(HrmsWebApplicationFactory.HrAdminEmail, HrmsWebApplicationFactory.HrAdminPassword);
        var response = await client.GetAsync("/api/admin/users");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Employee_CanAccessOwnPayslips()
    {
        var client = _factory.CreateAuthenticatedClient(HrmsWebApplicationFactory.EmployeeEmail, HrmsWebApplicationFactory.EmployeePassword);
        // need employee id; fetch via me? Employee has EmployeeId HZT-0005
        var response = await client.GetAsync("/api/payroll/employees/HZT-0005/payslips");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
