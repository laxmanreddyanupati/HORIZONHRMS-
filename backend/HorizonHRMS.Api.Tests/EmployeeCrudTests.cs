using System.Net;
using System.Net.Http.Json;
using HorizonHRMS.Api.Tests;

namespace HorizonHRMS.Api.Tests;

public class EmployeeCrudTests : IClassFixture<HrmsWebApplicationFactory>
{
    private readonly HrmsWebApplicationFactory _factory;

    public EmployeeCrudTests(HrmsWebApplicationFactory factory) => _factory = factory;

    private static object NewEmployeePayload(string email) => new
    {
        firstName = "Test",
        lastName = "Employee",
        email,
        personalEmail = "test.employee.personal@example.com",
        phone = "+91 90000 00000",
        gender = "Male",
        dateOfBirth = "1995-01-01",
        maritalStatus = "Single",
        bloodGroup = "O+",
        departmentId = "dept-eng",
        designationId = "des-se",
        branchId = "br-hyd",
        employmentType = "Full-time",
        status = "Active",
        dateOfJoining = "2026-09-01",
        workLocation = "Hyderabad",
        address = new
        {
            line1 = "1 Test Street",
            city = "Hyderabad",
            state = "Telangana",
            postalCode = "500001",
            country = "India",
        },
        emergencyContactName = "Test Contact",
        emergencyContactRelationship = "Spouse",
        emergencyContactPhone = "+91 90000 00001",
    };

    [Fact]
    public async Task CreateEmployee_AsHrStaff_ReturnsCreated()
    {
        var client = _factory.CreateAuthenticatedClient(HrmsWebApplicationFactory.HrAdminEmail, HrmsWebApplicationFactory.HrAdminPassword);
        var email = $"test.create.{Guid.NewGuid():N}@example.com";
        var response = await client.PostAsJsonAsync("/api/employees", NewEmployeePayload(email));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<EmployeeDto>();
        Assert.NotNull(created);
        Assert.StartsWith("HZT-", created!.Id);
        Assert.Equal("Test", created.FirstName);
    }

    [Fact]
    public async Task GetEmployee_AfterCreate_ReturnsSame()
    {
        var client = _factory.CreateAuthenticatedClient(HrmsWebApplicationFactory.HrAdminEmail, HrmsWebApplicationFactory.HrAdminPassword);
        var email = $"test.get.{Guid.NewGuid():N}@example.com";
        var created = await (await client.PostAsJsonAsync("/api/employees", NewEmployeePayload(email))).Content.ReadFromJsonAsync<EmployeeDto>();
        var response = await client.GetAsync($"/api/employees/{created!.Id}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var fetched = await response.Content.ReadFromJsonAsync<EmployeeDto>();
        Assert.Equal(created.Id, fetched!.Id);
        Assert.Equal(email, fetched.Email);
    }

    [Fact]
    public async Task CreateEmployee_WithDuplicateEmail_Returns400()
    {
        var client = _factory.CreateAuthenticatedClient(HrmsWebApplicationFactory.HrAdminEmail, HrmsWebApplicationFactory.HrAdminPassword);
        var email = $"test.dup.{Guid.NewGuid():N}@example.com";
        await client.PostAsJsonAsync("/api/employees", NewEmployeePayload(email));
        var second = await client.PostAsJsonAsync("/api/employees", NewEmployeePayload(email));
        Assert.Equal(HttpStatusCode.BadRequest, second.StatusCode);
    }

    [Fact]
    public async Task DeactivateEmployee_SetsStatusInactive()
    {
        var client = _factory.CreateAuthenticatedClient(HrmsWebApplicationFactory.HrAdminEmail, HrmsWebApplicationFactory.HrAdminPassword);
        var email = $"test.deact.{Guid.NewGuid():N}@example.com";
        var created = await (await client.PostAsJsonAsync("/api/employees", NewEmployeePayload(email))).Content.ReadFromJsonAsync<EmployeeDto>();
        var response = await client.PatchAsJsonAsync($"/api/employees/{created!.Id}/status", new { status = "Inactive" });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await response.Content.ReadFromJsonAsync<EmployeeDto>();
        Assert.Equal("Inactive", updated!.Status);
    }

    [Fact]
    public async Task CreateEmployee_AsEmployee_Returns403()
    {
        var client = _factory.CreateAuthenticatedClient(HrmsWebApplicationFactory.EmployeeEmail, HrmsWebApplicationFactory.EmployeePassword);
        var email = $"test.forbidden.{Guid.NewGuid():N}@example.com";
        var response = await client.PostAsJsonAsync("/api/employees", NewEmployeePayload(email));
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Employees_Pagination_ReturnsPagedResult()
    {
        var client = _factory.CreateAuthenticatedClient(HrmsWebApplicationFactory.HrAdminEmail, HrmsWebApplicationFactory.HrAdminPassword);
        var response = await client.GetAsync("/api/employees?page=1&pageSize=5");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<PagedResultDto<EmployeeDto>>();
        Assert.NotNull(body);
        Assert.True(body!.PageSize <= 5);
        Assert.True(body.Total >= 1);
    }
}

public sealed class EmployeeDto
{
    public string Id { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}

public sealed class PagedResultDto<T>
{
    public List<T> Data { get; set; } = [];
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
}
