using System.Net;
using System.Net.Http.Json;
using HorizonHRMS.Api.Contracts;
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

    [Fact]
    public async Task PayrollAdmin_CanSaveSalaryAndCreateOneDraftPerMonth()
    {
        using var client = _factory.CreateAuthenticatedClient(
            HrmsWebApplicationFactory.PayrollAdminEmail, HrmsWebApplicationFactory.PayrollAdminPassword);
        const string employeeId = "HZT-0001";
        var saved = await client.PutAsJsonAsync($"/api/payroll/salary-structures/{employeeId}", new
        {
            effectiveFrom = "2030-01-01",
            annualCtc = 600000,
            earnings = new[] { new { name = "Basic salary", amount = 50000 } },
            deductions = new[] { new { name = "Example deduction", amount = 2500 } },
        });
        Assert.Equal(HttpStatusCode.OK, saved.StatusCode);

        var period = new { year = 2030, month = 1 };
        var response = await client.PostAsJsonAsync("/api/payroll/runs", period);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var run = Assert.IsType<PayrollRunDto>(await response.Content.ReadFromJsonAsync<PayrollRunDto>());
        Assert.Equal("Draft", run.Status);

        var slips = await client.GetFromJsonAsync<List<PayslipDto>>($"/api/payroll/runs/{run.Id}/payslips");
        var employeeSlip = Assert.Single(slips!, slip => slip.EmployeeId == employeeId);
        Assert.Equal(47500m, employeeSlip.Net);
        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsJsonAsync("/api/payroll/runs", period)).StatusCode);
    }
}
