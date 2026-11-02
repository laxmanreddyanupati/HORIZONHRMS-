using HorizonHRMS.Api.Contracts;
using HorizonHRMS.Api.Data;
using HorizonHRMS.Api.Infrastructure;
using HorizonHRMS.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HorizonHRMS.Api.Controllers;

[ApiController]
[Route("api/employees")]
[Authorize]
public sealed class EmployeesController(HrmsDbContext db, AuditService audit) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<EmployeeDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<EmployeeDto>>> List(
        [FromQuery] string? search,
        [FromQuery] string? departmentId,
        [FromQuery] string? status,
        [FromQuery] string? designationId,
        [FromQuery] string? branchId,
        [FromQuery] string? managerId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string sortBy = "name",
        [FromQuery] string sortDir = "asc",
        CancellationToken cancellationToken = default)
    {
        var query = db.Employees.AsNoTracking().AsQueryable();

        var visible = await AccessScope.VisibleEmployeeIdsAsync(db, User, cancellationToken);
        if (visible is not null)
        {
            query = query.Where(employee => visible.Contains(employee.Id));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(employee =>
                (employee.FirstName + " " + employee.LastName).ToLower().Contains(term) ||
                employee.Email.ToLower().Contains(term) ||
                employee.Id.ToLower().Contains(term) ||
                employee.Phone.Contains(term));
        }

        if (IsFilter(departmentId))
        {
            query = query.Where(employee => employee.DepartmentId == departmentId);
        }

        if (IsFilter(status))
        {
            query = query.Where(employee => employee.Status == status);
        }

        if (IsFilter(designationId))
        {
            query = query.Where(employee => employee.DesignationId == designationId);
        }

        if (IsFilter(branchId))
        {
            query = query.Where(employee => employee.BranchId == branchId);
        }

        if (!string.IsNullOrWhiteSpace(managerId))
        {
            query = query.Where(employee => employee.ManagerId == managerId);
        }

        query = (sortBy, sortDir?.ToLowerInvariant()) switch
        {
            ("dateOfJoining", "desc") => query.OrderByDescending(employee => employee.DateOfJoining).ThenBy(employee => employee.Id),
            ("dateOfJoining", _) => query.OrderBy(employee => employee.DateOfJoining).ThenBy(employee => employee.Id),
            ("id", "desc") => query.OrderByDescending(employee => employee.Id),
            ("id", _) => query.OrderBy(employee => employee.Id),
            (_, "desc") => query.OrderByDescending(employee => employee.LastName).ThenByDescending(employee => employee.FirstName),
            _ => query.OrderBy(employee => employee.LastName).ThenBy(employee => employee.FirstName),
        };

        pageSize = Math.Clamp(pageSize, 1, 200);
        var total = await query.CountAsync(cancellationToken);
        var totalPages = Math.Max(1, (int)Math.Ceiling(total / (double)pageSize));
        var safePage = Math.Clamp(page, 1, totalPages);

        var employees = await query
            .Skip((safePage - 1) * pageSize)
            .Take(pageSize)
            .Include(employee => employee.EmergencyContacts)
            .Include(employee => employee.Documents)
            .Include(employee => employee.EmploymentHistory)
            .ToListAsync(cancellationToken);

        return Ok(new PagedResult<EmployeeDto>
        {
            Data = employees.Select(employee => employee.ToDto()).ToList(),
            Total = total,
            Page = safePage,
            PageSize = pageSize,
            TotalPages = totalPages,
        });
    }

    [HttpGet("counts")]
    public async Task<ActionResult<object>> Counts(CancellationToken cancellationToken)
    {
        var query = db.Employees.AsNoTracking().AsQueryable();
        var visible = await AccessScope.VisibleEmployeeIdsAsync(db, User, cancellationToken);
        if (visible is not null)
        {
            query = query.Where(employee => visible.Contains(employee.Id));
        }

        var counts = await query
            .GroupBy(employee => employee.Status)
            .Select(group => new { Status = group.Key, Count = group.Count() })
            .ToListAsync(cancellationToken);

        return Ok(new
        {
            total = counts.Sum(item => item.Count),
            active = counts.FirstOrDefault(item => item.Status == EmployeeStatuses.Active)?.Count ?? 0,
            probation = counts.FirstOrDefault(item => item.Status == EmployeeStatuses.Probation)?.Count ?? 0,
            onLeave = counts.FirstOrDefault(item => item.Status == EmployeeStatuses.OnLeave)?.Count ?? 0,
            inactive = counts.FirstOrDefault(item => item.Status == EmployeeStatuses.Inactive)?.Count ?? 0,
        });
    }

    [HttpGet("{id}")]
    [ProducesResponseType(typeof(EmployeeDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<EmployeeDto>> Get(string id, CancellationToken cancellationToken)
    {
        await AccessScope.EnsureCanSeeEmployeeAsync(db, User, id, cancellationToken);

        var employee = await db.Employees.AsNoTracking()
            .Include(item => item.EmergencyContacts)
            .Include(item => item.Documents)
            .Include(item => item.EmploymentHistory)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw ApiException.NotFound("Employee not found.");

        return Ok(employee.ToDto());
    }

    [HttpPost]
    [Authorize(Policy = Policies.HrStaff)]
    [ProducesResponseType(typeof(EmployeeDto), StatusCodes.Status201Created)]
    public async Task<ActionResult<EmployeeDto>> Create(EmployeeUpsertRequest request, CancellationToken cancellationToken)
    {
        await ValidateRequestAsync(request, null, cancellationToken);

        var email = request.Email.Trim().ToLowerInvariant();
        var employee = new Employee
        {
            Id = await NextEmployeeIdAsync(cancellationToken),
            ShiftId = "shift-general",
            IsDetailed = request.Bank is not null || request.Statutory is not null,
            CreatedAt = DateTime.UtcNow,
        };

        employee.ApplyTo(request, email);
        employee.About = $"{employee.FirstName} is part of the {employee.DepartmentId.Replace("dept-", string.Empty)} team at Horizon Technologies.";
        employee.EmergencyContacts.Add(new EmergencyContact
        {
            Id = $"EC-{Guid.NewGuid():N}",
            EmployeeId = employee.Id,
            Name = request.EmergencyContactName.Trim(),
            Relationship = request.EmergencyContactRelationship.Trim(),
            Phone = request.EmergencyContactPhone.Trim(),
        });
        employee.EmploymentHistory.Add(new EmploymentHistoryItem
        {
            Id = $"HIS-{Guid.NewGuid():N}",
            EmployeeId = employee.Id,
            Title = "Joined Horizon Technologies",
            Department = employee.DepartmentId.Replace("dept-", string.Empty),
            EffectiveFrom = employee.DateOfJoining,
            Type = "Joining",
        });

        db.Employees.Add(employee);
        audit.Record(User, HttpContext, "Created employee", "Employees", $"{employee.FirstName} {employee.LastName} ({employee.Id})");
        await db.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(Get), new { id = employee.Id }, employee.ToDto());
    }

    [HttpPut("{id}")]
    [Authorize(Policy = Policies.HrStaff)]
    [ProducesResponseType(typeof(EmployeeDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<EmployeeDto>> Update(string id, EmployeeUpsertRequest request, CancellationToken cancellationToken)
    {
        var employee = await db.Employees
            .Include(item => item.EmergencyContacts)
            .Include(item => item.Documents)
            .Include(item => item.EmploymentHistory)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw ApiException.NotFound("Employee not found.");

        await ValidateRequestAsync(request, id, cancellationToken);

        var previousDepartment = employee.DepartmentId;
        employee.ApplyTo(request, request.Email.Trim().ToLowerInvariant());

        var primaryContact = employee.EmergencyContacts.FirstOrDefault();
        if (primaryContact is null)
        {
            employee.EmergencyContacts.Add(new EmergencyContact
            {
                Id = $"EC-{Guid.NewGuid():N}",
                EmployeeId = employee.Id,
                Name = request.EmergencyContactName.Trim(),
                Relationship = request.EmergencyContactRelationship.Trim(),
                Phone = request.EmergencyContactPhone.Trim(),
            });
        }
        else
        {
            primaryContact.Name = request.EmergencyContactName.Trim();
            primaryContact.Relationship = request.EmergencyContactRelationship.Trim();
            primaryContact.Phone = request.EmergencyContactPhone.Trim();
        }

        if (previousDepartment != employee.DepartmentId)
        {
            employee.EmploymentHistory.Add(new EmploymentHistoryItem
            {
                Id = $"HIS-{Guid.NewGuid():N}",
                EmployeeId = employee.Id,
                Title = "Department transfer",
                Department = employee.DepartmentId.Replace("dept-", string.Empty),
                EffectiveFrom = DateOnly.FromDateTime(DateTime.UtcNow),
                Type = "Transfer",
            });
        }

        audit.Record(User, HttpContext, "Updated employee", "Employees", $"{employee.FirstName} {employee.LastName} ({employee.Id})");
        await db.SaveChangesAsync(cancellationToken);
        return Ok(employee.ToDto());
    }

    [HttpPatch("{id}/status")]
    [Authorize(Policy = Policies.HrStaff)]
    [ProducesResponseType(typeof(EmployeeDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<EmployeeDto>> SetStatus(string id, EmployeeStatusRequest request, CancellationToken cancellationToken)
    {
        if (!EmployeeStatuses.All.Contains(request.Status))
        {
            throw ApiException.BadRequest(
                "Choose a valid employment status.",
                "invalid_status",
                new Dictionary<string, string[]> { ["status"] = [$"Allowed values: {string.Join(", ", EmployeeStatuses.All)}."] });
        }

        var employee = await db.Employees
            .Include(item => item.EmergencyContacts)
            .Include(item => item.Documents)
            .Include(item => item.EmploymentHistory)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw ApiException.NotFound("Employee not found.");

        if (employee.Id == User.GetEmployeeId() && request.Status == EmployeeStatuses.Inactive)
        {
            throw ApiException.Conflict("You cannot deactivate your own employee record.", "self_deactivation_blocked");
        }

        employee.Status = request.Status;
        employee.UpdatedAt = DateTime.UtcNow;
        audit.Record(User, HttpContext, $"Set employee status to {request.Status}", "Employees", $"{employee.FirstName} {employee.LastName} ({employee.Id})");
        await db.SaveChangesAsync(cancellationToken);
        return Ok(employee.ToDto());
    }

    private static bool IsFilter(string? value) => !string.IsNullOrWhiteSpace(value) && value != "all";

    private async Task ValidateRequestAsync(EmployeeUpsertRequest request, string? currentEmployeeId, CancellationToken cancellationToken)
    {
        var errors = new Dictionary<string, List<string>>();

        if (!EmployeeStatuses.All.Contains(request.Status))
        {
            AddError(errors, "status", "Choose a valid employment status.");
        }

        if (!EmploymentTypes.All.Contains(request.EmploymentType))
        {
            AddError(errors, "employmentType", "Choose a valid employment type.");
        }

        if (!new[] { "Male", "Female", "Other" }.Contains(request.Gender))
        {
            AddError(errors, "gender", "Choose a valid gender.");
        }

        if (!new[] { "Single", "Married" }.Contains(request.MaritalStatus))
        {
            AddError(errors, "maritalStatus", "Choose a valid marital status.");
        }

        if (request.DateOfJoining > DateOnly.FromDateTime(DateTime.UtcNow))
        {
            AddError(errors, "dateOfJoining", "Joining date cannot be in the future.");
        }

        if (request.DateOfBirth >= DateOnly.FromDateTime(DateTime.UtcNow))
        {
            AddError(errors, "dateOfBirth", "Date of birth must be in the past.");
        }

        var email = request.Email.Trim().ToLowerInvariant();
        var emailTaken = await db.Employees.AnyAsync(
            employee => employee.Email == email && employee.Id != currentEmployeeId, cancellationToken);
        if (emailTaken)
        {
            AddError(errors, "email", "Another employee already uses this work email address.");
        }

        if (!await db.Departments.AnyAsync(department => department.Id == request.DepartmentId, cancellationToken))
        {
            AddError(errors, "departmentId", "Choose an existing department.");
        }

        if (!await db.Branches.AnyAsync(branch => branch.Id == request.BranchId, cancellationToken))
        {
            AddError(errors, "branchId", "Choose an existing branch.");
        }

        var designation = await db.Designations.AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == request.DesignationId, cancellationToken);
        if (designation is null)
        {
            AddError(errors, "designationId", "Choose an existing designation.");
        }
        else if (designation.DepartmentId != request.DepartmentId)
        {
            AddError(errors, "designationId", "The designation does not belong to the selected department.");
        }

        if (!string.IsNullOrWhiteSpace(request.ManagerId))
        {
            if (request.ManagerId == currentEmployeeId)
            {
                AddError(errors, "managerId", "An employee cannot report to themselves.");
            }
            else
            {
                var managerExists = await db.Employees.AnyAsync(employee => employee.Id == request.ManagerId, cancellationToken);
                if (!managerExists)
                {
                    AddError(errors, "managerId", "Choose an existing manager.");
                }
                else if (currentEmployeeId is not null && await WouldCreateCycleAsync(currentEmployeeId, request.ManagerId, cancellationToken))
                {
                    AddError(errors, "managerId", "This reporting line would create a cycle.");
                }
            }
        }

        if (errors.Count > 0)
        {
            throw ApiException.BadRequest(
                "Please correct the highlighted employee details.",
                "validation_failed",
                errors.ToDictionary(pair => pair.Key, pair => pair.Value.ToArray()));
        }
    }

    private static void AddError(IDictionary<string, List<string>> errors, string key, string message)
    {
        if (!errors.TryGetValue(key, out var list))
        {
            list = [];
            errors[key] = list;
        }

        list.Add(message);
    }

    private async Task<bool> WouldCreateCycleAsync(string employeeId, string managerId, CancellationToken cancellationToken)
    {
        var managerMap = await db.Employees.AsNoTracking()
            .ToDictionaryAsync(employee => employee.Id, employee => employee.ManagerId, cancellationToken);

        var visited = new HashSet<string>(StringComparer.Ordinal);
        var current = managerId;
        while (!string.IsNullOrWhiteSpace(current) && visited.Add(current))
        {
            if (current == employeeId)
            {
                return true;
            }

            current = managerMap.TryGetValue(current, out var next) ? next : null;
        }

        return false;
    }

    private async Task<string> NextEmployeeIdAsync(CancellationToken cancellationToken)
    {
        var ids = await db.Employees.AsNoTracking().Select(employee => employee.Id).ToListAsync(cancellationToken);
        var max = ids
            .Select(id => int.TryParse(id.Replace("HZT-", string.Empty), out var value) ? value : 0)
            .DefaultIfEmpty(0)
            .Max();
        return $"HZT-{max + 1:0000}";
    }
}
