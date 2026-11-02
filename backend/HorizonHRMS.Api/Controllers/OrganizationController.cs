using System.Text.RegularExpressions;
using HorizonHRMS.Api.Contracts;
using HorizonHRMS.Api.Data;
using HorizonHRMS.Api.Infrastructure;
using HorizonHRMS.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HorizonHRMS.Api.Controllers;

[ApiController]
[Route("api/organization")]
[Authorize]
public sealed class OrganizationController(HrmsDbContext db, AuditService audit) : ControllerBase
{
    [HttpGet("departments")]
    public async Task<ActionResult<List<DepartmentDto>>> Departments(CancellationToken cancellationToken)
    {
        var departments = await db.Departments.AsNoTracking().OrderBy(department => department.Name).ToListAsync(cancellationToken);
        var headcounts = await db.Employees.AsNoTracking()
            .GroupBy(employee => employee.DepartmentId)
            .Select(group => new { DepartmentId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.DepartmentId, item => item.Count, cancellationToken);
        var openRoles = await db.JobOpenings.AsNoTracking()
            .Where(job => job.Status == "Open")
            .GroupBy(job => job.DepartmentId)
            .Select(group => new { DepartmentId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.DepartmentId, item => item.Count, cancellationToken);

        return Ok(departments.Select(department => department.ToDto(
            headcounts.GetValueOrDefault(department.Id),
            openRoles.GetValueOrDefault(department.Id))));
    }

    [HttpPost("departments")]
    [Authorize(Policy = Policies.HrStaff)]
    public async Task<ActionResult<DepartmentDto>> CreateDepartment(DepartmentRequest request, CancellationToken cancellationToken)
    {
        await ValidateDepartmentAsync(request, null, cancellationToken);

        var department = new Department
        {
            Id = await UniqueIdAsync("dept-", request.Code, db.Departments.Select(item => item.Id), cancellationToken),
            Name = request.Name.Trim(),
            Code = request.Code.Trim().ToUpperInvariant(),
            Description = request.Description.Trim(),
            HeadId = Normalize(request.HeadId),
            ParentId = Normalize(request.ParentId),
            Location = request.Location.Trim(),
            Email = request.Email.Trim().ToLowerInvariant(),
            CreatedAt = DateOnly.FromDateTime(DateTime.UtcNow),
        };

        db.Departments.Add(department);
        audit.Record(User, HttpContext, "Created department", "Organization", $"{department.Name} ({department.Code})");
        await db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(Departments), null, department.ToDto(0, 0));
    }

    [HttpPut("departments/{id}")]
    [Authorize(Policy = Policies.HrStaff)]
    public async Task<ActionResult<DepartmentDto>> UpdateDepartment(string id, DepartmentRequest request, CancellationToken cancellationToken)
    {
        var department = await db.Departments.FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw ApiException.NotFound("Department not found.");

        await ValidateDepartmentAsync(request, id, cancellationToken);

        department.Name = request.Name.Trim();
        department.Code = request.Code.Trim().ToUpperInvariant();
        department.Description = request.Description.Trim();
        department.HeadId = Normalize(request.HeadId);
        if (request.ParentId is not null)
        {
            department.ParentId = Normalize(request.ParentId);
        }
        department.Location = request.Location.Trim();
        department.Email = request.Email.Trim().ToLowerInvariant();

        audit.Record(User, HttpContext, "Updated department", "Organization", $"{department.Name} ({department.Code})");
        await db.SaveChangesAsync(cancellationToken);
        return Ok(department.ToDto());
    }

    [HttpDelete("departments/{id}")]
    [Authorize(Policy = Policies.HrStaff)]
    public async Task<IActionResult> DeleteDepartment(string id, CancellationToken cancellationToken)
    {
        var department = await db.Departments.FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw ApiException.NotFound("Department not found.");

        var headcount = await db.Employees.CountAsync(employee => employee.DepartmentId == id, cancellationToken);
        if (headcount > 0)
        {
            throw ApiException.Conflict($"Reassign the {headcount} employee(s) in this department before deleting it.");
        }

        var openRoles = await db.JobOpenings.CountAsync(
            job => job.DepartmentId == id && job.Status != "Closed", cancellationToken);
        if (openRoles > 0)
        {
            throw ApiException.Conflict("Close or reassign the linked job openings before deleting this department.");
        }

        var children = await db.Departments.CountAsync(item => item.ParentId == id, cancellationToken);
        if (children > 0)
        {
            throw ApiException.Conflict("Reassign the child departments before deleting this department.");
        }

        db.Departments.Remove(department);
        audit.Record(User, HttpContext, "Deleted department", "Organization", $"{department.Name} ({department.Code})");
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpGet("designations")]
    public async Task<ActionResult<List<DesignationDto>>> Designations(CancellationToken cancellationToken)
    {
        var designations = await db.Designations.AsNoTracking().OrderBy(item => item.Title).ToListAsync(cancellationToken);
        var headcounts = await db.Employees.AsNoTracking()
            .GroupBy(employee => employee.DesignationId)
            .Select(group => new { DesignationId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.DesignationId, item => item.Count, cancellationToken);

        return Ok(designations.Select(item => item.ToDto(headcounts.GetValueOrDefault(item.Id))));
    }

    [HttpPost("designations")]
    [Authorize(Policy = Policies.HrStaff)]
    public async Task<ActionResult<DesignationDto>> CreateDesignation(DesignationRequest request, CancellationToken cancellationToken)
    {
        await ValidateDesignationAsync(request, null, cancellationToken);

        var designation = new Designation
        {
            Id = await UniqueIdAsync("des-", request.Title, db.Designations.Select(item => item.Id), cancellationToken),
            Title = request.Title.Trim(),
            DepartmentId = request.DepartmentId,
            Level = request.Level.Trim(),
            Grade = request.Grade.Trim(),
        };

        db.Designations.Add(designation);
        audit.Record(User, HttpContext, "Created designation", "Organization", designation.Title);
        await db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(Designations), null, designation.ToDto());
    }

    [HttpPut("designations/{id}")]
    [Authorize(Policy = Policies.HrStaff)]
    public async Task<ActionResult<DesignationDto>> UpdateDesignation(string id, DesignationRequest request, CancellationToken cancellationToken)
    {
        var designation = await db.Designations.FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw ApiException.NotFound("Designation not found.");

        await ValidateDesignationAsync(request, id, cancellationToken);

        designation.Title = request.Title.Trim();
        designation.DepartmentId = request.DepartmentId;
        designation.Level = request.Level.Trim();
        designation.Grade = request.Grade.Trim();

        audit.Record(User, HttpContext, "Updated designation", "Organization", designation.Title);
        await db.SaveChangesAsync(cancellationToken);
        return Ok(designation.ToDto());
    }

    [HttpDelete("designations/{id}")]
    [Authorize(Policy = Policies.HrStaff)]
    public async Task<IActionResult> DeleteDesignation(string id, CancellationToken cancellationToken)
    {
        var designation = await db.Designations.FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw ApiException.NotFound("Designation not found.");

        var headcount = await db.Employees.CountAsync(employee => employee.DesignationId == id, cancellationToken);
        if (headcount > 0)
        {
            throw ApiException.Conflict($"This designation is assigned to {headcount} employee(s). Reassign them before deleting.");
        }

        db.Designations.Remove(designation);
        audit.Record(User, HttpContext, "Deleted designation", "Organization", designation.Title);
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpGet("branches")]
    public async Task<ActionResult<List<BranchDto>>> Branches(CancellationToken cancellationToken)
    {
        var branches = await db.Branches.AsNoTracking().OrderBy(branch => branch.Name).ToListAsync(cancellationToken);
        var headcounts = await db.Employees.AsNoTracking()
            .GroupBy(employee => employee.BranchId)
            .Select(group => new { BranchId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.BranchId, item => item.Count, cancellationToken);

        return Ok(branches.Select(branch => branch.ToDto(headcounts.GetValueOrDefault(branch.Id))));
    }

    [HttpPost("branches")]
    [Authorize(Policy = Policies.HrStaff)]
    public async Task<ActionResult<BranchDto>> CreateBranch(BranchRequest request, CancellationToken cancellationToken)
    {
        await ValidateBranchAsync(request, null, cancellationToken);

        if (request.IsHeadquarters)
        {
            await db.Branches.ForEachAsync(branch => branch.IsHeadquarters = false, cancellationToken);
        }

        var branch = new Branch
        {
            Id = await UniqueIdAsync("br-", request.City, db.Branches.Select(item => item.Id), cancellationToken),
            Name = request.Name.Trim(),
            Address = request.Address.Trim(),
            City = request.City.Trim(),
            State = request.State.Trim(),
            Phone = request.Phone.Trim(),
            HeadId = Normalize(request.HeadId),
            IsHeadquarters = request.IsHeadquarters,
        };

        db.Branches.Add(branch);
        audit.Record(User, HttpContext, "Created branch", "Organization", branch.Name);
        await db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(Branches), null, branch.ToDto());
    }

    [HttpPut("branches/{id}")]
    [Authorize(Policy = Policies.HrStaff)]
    public async Task<ActionResult<BranchDto>> UpdateBranch(string id, BranchRequest request, CancellationToken cancellationToken)
    {
        var branch = await db.Branches.FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw ApiException.NotFound("Branch not found.");

        await ValidateBranchAsync(request, id, cancellationToken);

        if (request.IsHeadquarters && !branch.IsHeadquarters)
        {
            await db.Branches.ForEachAsync(item => item.IsHeadquarters = false, cancellationToken);
        }

        branch.Name = request.Name.Trim();
        branch.Address = request.Address.Trim();
        branch.City = request.City.Trim();
        branch.State = request.State.Trim();
        branch.Phone = request.Phone.Trim();
        branch.HeadId = Normalize(request.HeadId);
        branch.IsHeadquarters = request.IsHeadquarters;

        audit.Record(User, HttpContext, "Updated branch", "Organization", branch.Name);
        await db.SaveChangesAsync(cancellationToken);
        return Ok(branch.ToDto());
    }

    [HttpDelete("branches/{id}")]
    [Authorize(Policy = Policies.HrStaff)]
    public async Task<IActionResult> DeleteBranch(string id, CancellationToken cancellationToken)
    {
        var branch = await db.Branches.FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw ApiException.NotFound("Branch not found.");

        if (branch.IsHeadquarters)
        {
            throw ApiException.Conflict("The headquarters branch cannot be deleted.");
        }

        var headcount = await db.Employees.CountAsync(employee => employee.BranchId == id, cancellationToken);
        if (headcount > 0)
        {
            throw ApiException.Conflict($"{headcount} employee(s) are assigned to this branch. Reassign them before deleting.");
        }

        db.Branches.Remove(branch);
        audit.Record(User, HttpContext, "Deleted branch", "Organization", branch.Name);
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpGet("org-chart")]
    public async Task<ActionResult<OrgNodeDto?>> OrgChart(CancellationToken cancellationToken)
    {
        var employees = await db.Employees.AsNoTracking()
            .Where(employee => employee.Status != EmployeeStatuses.Inactive)
            .ToListAsync(cancellationToken);

        var root = employees.FirstOrDefault(employee => string.IsNullOrWhiteSpace(employee.ManagerId));
        if (root is null)
        {
            return Ok(null);
        }

        OrgNodeDto Build(Employee employee, HashSet<string> path)
        {
            var node = new OrgNodeDto { Employee = employee.ToDto() };
            if (!path.Add(employee.Id))
            {
                return node;
            }

            foreach (var report in employees.Where(item => item.ManagerId == employee.Id).OrderBy(item => item.LastName))
            {
                node.Children.Add(Build(report, path));
            }

            path.Remove(employee.Id);
            return node;
        }

        return Ok(Build(root, new HashSet<string>(StringComparer.Ordinal)));
    }

    [HttpGet("reporting-lines")]
    public async Task<ActionResult<List<ReportingLineDto>>> ReportingLines(CancellationToken cancellationToken)
    {
        var employees = await db.Employees.AsNoTracking()
            .Where(employee => employee.Status != EmployeeStatuses.Inactive)
            .ToListAsync(cancellationToken);

        var managers = employees
            .Where(employee => employees.Any(report => report.ManagerId == employee.Id))
            .OrderBy(employee => employee.LastName)
            .ToList();

        return Ok(managers.Select(manager => new ReportingLineDto
        {
            Manager = manager.ToDto(),
            Reports = employees
                .Where(report => report.ManagerId == manager.Id)
                .OrderBy(report => report.LastName)
                .Select(report => report.ToDto())
                .ToList(),
        }).ToList());
    }

    [HttpGet("lookups")]
    public async Task<ActionResult<object>> Lookups(CancellationToken cancellationToken)
    {
        var employees = await db.Employees.AsNoTracking()
            .Where(employee => employee.Status != EmployeeStatuses.Inactive)
            .OrderBy(employee => employee.LastName)
            .ThenBy(employee => employee.FirstName)
            .Select(employee => new
            {
                employee.Id,
                employee.FirstName,
                employee.LastName,
                employee.DepartmentId,
                employee.DesignationId,
                employee.BranchId,
                employee.ManagerId,
            })
            .ToListAsync(cancellationToken);

        return Ok(new
        {
            employees,
            departments = await db.Departments.AsNoTracking().OrderBy(item => item.Name).Select(item => new { item.Id, item.Name, item.Code }).ToListAsync(cancellationToken),
            designations = await db.Designations.AsNoTracking().OrderBy(item => item.Title).Select(item => new { item.Id, item.Title, item.DepartmentId, item.Level, item.Grade }).ToListAsync(cancellationToken),
            branches = await db.Branches.AsNoTracking().OrderBy(item => item.Name).Select(item => new { item.Id, item.Name, item.City, item.State }).ToListAsync(cancellationToken),
        });
    }

    private static string? Normalize(string? value) => string.IsNullOrWhiteSpace(value) ? null : value;

    private static string Slug(string value) =>
        Regex.Replace(value.Trim().ToLowerInvariant(), "[^a-z0-9]+", "-").Trim('-');

    private static async Task<string> UniqueIdAsync(
        string prefix, string source, IQueryable<string> existingIds, CancellationToken cancellationToken)
    {
        var slug = Slug(source);
        if (string.IsNullOrWhiteSpace(slug))
        {
            slug = "item";
        }

        var candidate = $"{prefix}{slug}";
        var ids = await existingIds.ToListAsync(cancellationToken);
        if (!ids.Contains(candidate, StringComparer.OrdinalIgnoreCase))
        {
            return candidate;
        }

        var suffix = 2;
        while (ids.Contains($"{candidate}-{suffix}", StringComparer.OrdinalIgnoreCase))
        {
            suffix++;
        }

        return $"{candidate}-{suffix}";
    }

    private async Task ValidateDepartmentAsync(DepartmentRequest request, string? currentId, CancellationToken cancellationToken)
    {
        var errors = new Dictionary<string, string[]>();
        var code = request.Code.Trim();
        if (await db.Departments.AnyAsync(
                department => department.Code.ToLower() == code.ToLower() && department.Id != currentId,
                cancellationToken))
        {
            errors["code"] = ["A department with this code already exists."];
        }

        if (await db.Departments.AnyAsync(
                department => department.Name.ToLower() == request.Name.Trim().ToLower() && department.Id != currentId,
                cancellationToken))
        {
            errors["name"] = ["A department with this name already exists."];
        }

        if (!string.IsNullOrWhiteSpace(request.ParentId) &&
            !await db.Departments.AnyAsync(department => department.Id == request.ParentId, cancellationToken))
        {
            errors["parentId"] = ["Choose an existing parent department."];
        }

        if (!string.IsNullOrWhiteSpace(request.HeadId) &&
            !await db.Employees.AnyAsync(employee => employee.Id == request.HeadId, cancellationToken))
        {
            errors["headId"] = ["Choose an existing employee as head of department."];
        }

        if (errors.Count > 0)
        {
            throw ApiException.BadRequest("Please correct the department details.", "validation_failed", errors);
        }
    }

    private async Task ValidateDesignationAsync(DesignationRequest request, string? currentId, CancellationToken cancellationToken)
    {
        var errors = new Dictionary<string, string[]>();
        if (!await db.Departments.AnyAsync(department => department.Id == request.DepartmentId, cancellationToken))
        {
            errors["departmentId"] = ["Choose an existing department."];
        }

        if (await db.Designations.AnyAsync(
                designation => designation.Title.ToLower() == request.Title.Trim().ToLower() && designation.Id != currentId,
                cancellationToken))
        {
            errors["title"] = ["A designation with this title already exists."];
        }

        if (errors.Count > 0)
        {
            throw ApiException.BadRequest("Please correct the designation details.", "validation_failed", errors);
        }
    }

    private async Task ValidateBranchAsync(BranchRequest request, string? currentId, CancellationToken cancellationToken)
    {
        var errors = new Dictionary<string, string[]>();
        if (!string.IsNullOrWhiteSpace(request.HeadId) &&
            !await db.Employees.AnyAsync(employee => employee.Id == request.HeadId, cancellationToken))
        {
            errors["headId"] = ["Choose an existing employee as branch head."];
        }

        if (await db.Branches.AnyAsync(
                branch => branch.Name.ToLower() == request.Name.Trim().ToLower() &&
                          branch.City.ToLower() == request.City.Trim().ToLower() &&
                          branch.Id != currentId,
                cancellationToken))
        {
            errors["name"] = ["A branch with this name already exists in the city."];
        }

        if (errors.Count > 0)
        {
            throw ApiException.BadRequest("Please correct the branch details.", "validation_failed", errors);
        }
    }
}
