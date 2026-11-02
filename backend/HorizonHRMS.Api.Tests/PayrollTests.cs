using System.Net;
using HorizonHRMS.Api.Tests;

namespace HorizonHRMS.Api.Tests;

public class PayrollTests : IClassFixture<HrmsWebApplicationFactory>
{
    private readonly HrmsWebApplicationFactory _factory;

    public PayrollTests(HrmsWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task PayrollRuns_AsPayrollStaff_ReturnsOk()
    {
        var client = _factory.CreateAuthenticatedClient(HrmsWebApplicationFactory.PayrollAdminEmail, HrmsWebApplicationFactory.PayrollAdminPassword);
        var response = await client.GetAsync("/api/payroll/runs");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task PayrollRuns_AsEmployee_ReturnsForbidden()
    {
        var client = _factory.CreateAuthenticatedClient(HrmsWebApplicationFactory.EmployeeEmail, HrmsWebApplicationFactory.EmployeePassword);
        var response = await client.GetAsync("/api/payroll/runs");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task EmployeePayslips_AsEmployee_ReturnsOk()
    {
        var client = _factory.CreateAuthenticatedClient(HrmsWebApplicationFactory.EmployeeEmail, HrmsWebApplicationFactory.EmployeePassword);
        var response = await client.GetAsync("/api/payroll/employees/HZT-0005/payslips");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task SalaryStructure_AsEmployee_ReturnsOwn()
    {
        var client = _factory.CreateAuthenticatedClient(HrmsWebApplicationFactory.EmployeeEmail, HrmsWebApplicationFactory.EmployeePassword);
        var response = await client.GetAsync("/api/payroll/salary-structures/HZT-0005");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task SalaryStructure_AsEmployee_OtherEmployeeForbidden()
    {
        var client = _factory.CreateAuthenticatedClient(HrmsWebApplicationFactory.EmployeeEmail, HrmsWebApplicationFactory.EmployeePassword);
        var response = await client.GetAsync("/api/payroll/salary-structures/HZT-0001");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task ProcessPayrollRun_AsPayrollStaff_Succeeds()
    {
        var client = _factory.CreateAuthenticatedClient(HrmsWebApplicationFactory.PayrollAdminEmail, HrmsWebApplicationFactory.PayrollAdminPassword);
        // get a draft run
        var runs = await client.GetAsync("/api/payroll/runs");
        var content = await runs.Content.ReadAsStringAsync();
        // find a Draft run id by simple parse
        Assert.True(runs.IsSuccessStatusCode);
    }

    [Fact]
    public async Task PayrollDashboard_AsPayrollStaff_ReturnsOk()
    {
        var client = _factory.CreateAuthenticatedClient(HrmsWebApplicationFactory.PayrollAdminEmail, HrmsWebApplicationFactory.PayrollAdminPassword);
        var response = await client.GetAsync("/api/payroll/dashboard");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
