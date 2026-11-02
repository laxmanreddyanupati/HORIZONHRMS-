using System.Security.Cryptography;
using HorizonHRMS.Api.Contracts;
using HorizonHRMS.Api.Data;
using HorizonHRMS.Api.Infrastructure;
using HorizonHRMS.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HorizonHRMS.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize]
public sealed class AdminController(HrmsDbContext db, AuditService audit) : ControllerBase
{
    private static readonly string[] UserStatuses = ["Active", "Invited", "Suspended"];
    private static readonly string[] HolidayTypes = ["Public", "Optional", "Company"];

    private static readonly (string Id, string Name, string Description)[] RoleDefinitions =
    [
        ("super-admin", "Super Admin", "Full platform access and configuration."),
        ("hr-admin", "HR Admin", "People operations, policies and reporting."),
        ("hr-executive", "HR Executive", "Employee records, recruitment and HR operations."),
        ("manager", "Manager", "Team attendance, leave, performance and expenses."),
        ("payroll-admin", "Payroll Admin", "Payroll processing and salary configuration."),
        ("employee", "Employee", "Self-service attendance, leave and payslips."),
    ];

    /* ----------------------------- Company profile ----------------------------- */

    [HttpGet("company-profile")]
    public async Task<ActionResult<CompanyProfileDto>> CompanyProfile(CancellationToken cancellationToken)
    {
        var setting = await GetOrCreateCompanyAsync(cancellationToken);
        return Ok(setting.ToDto());
    }

    [HttpPut("company-profile")]
    [Authorize(Policy = Policies.Settings)]
    public async Task<ActionResult<CompanyProfileDto>> UpdateCompanyProfile(
        CompanyProfileRequest request, CancellationToken cancellationToken)
    {
        var setting = await GetOrCreateCompanyAsync(cancellationToken);

        setting.LegalName = request.LegalName.Trim();
        setting.DisplayName = request.DisplayName.Trim();
        setting.Domain = request.Domain.Trim();
        setting.Industry = request.Industry.Trim();
        setting.Headquarters = request.Headquarters.Trim();
        setting.Email = request.Email.Trim().ToLowerInvariant();
        setting.Phone = request.Phone.Trim();
        setting.Website = request.Website.Trim();
        setting.Gstin = request.Gstin.Trim();
        setting.Pan = request.Pan.Trim();
        setting.Cin = request.Cin.Trim();
        setting.Currency = request.Currency.Trim();
        setting.Timezone = request.Timezone.Trim();
        setting.FinancialYear = request.FinancialYear.Trim();
        setting.PayrollFrequency = request.PayrollFrequency.Trim();

        audit.Record(User, HttpContext, "Updated company profile", "Settings", setting.DisplayName);
        await db.SaveChangesAsync(cancellationToken);
        return Ok(setting.ToDto());
    }

    /* -------------------------- Notification preferences ------------------------ */

    [HttpGet("notification-preferences")]
    public async Task<ActionResult<List<NotificationPreferenceDto>>> NotificationPreferences(CancellationToken cancellationToken)
    {
        var preferences = await db.NotificationPreferences.AsNoTracking()
            .OrderBy(preference => preference.Id)
            .ToListAsync(cancellationToken);
        return Ok(preferences.Select(preference => preference.ToDto()).ToList());
    }

    [HttpPatch("notification-preferences/{id}")]
    [Authorize(Policy = Policies.Settings)]
    public async Task<ActionResult<NotificationPreferenceDto>> UpdateNotificationPreference(
        string id, NotificationPreferenceRequest request, CancellationToken cancellationToken)
    {
        var preference = await db.NotificationPreferences.FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw ApiException.NotFound("Notification preference not found.");

        preference.Email = request.Email;
        preference.InApp = request.InApp;

        audit.Record(User, HttpContext, "Updated notification preference", "Settings", preference.Label);
        await db.SaveChangesAsync(cancellationToken);
        return Ok(preference.ToDto());
    }

    /* ----------------------------- Attendance settings -------------------------- */

    [HttpGet("attendance-settings")]
    public async Task<ActionResult<AttendanceSettingsDto>> AttendanceSettings(CancellationToken cancellationToken)
    {
        var setting = await GetOrCreateAttendanceAsync(cancellationToken);
        return Ok(setting.ToDto());
    }

    [HttpPut("attendance-settings")]
    [Authorize(Policy = Policies.Settings)]
    public async Task<ActionResult<AttendanceSettingsDto>> UpdateAttendanceSettings(
        AttendanceSettingsRequest request, CancellationToken cancellationToken)
    {
        var setting = await GetOrCreateAttendanceAsync(cancellationToken);

        setting.WorkWeek = request.WorkWeek.Trim();
        setting.ShiftStart = request.ShiftStart.Trim();
        setting.ShiftEnd = request.ShiftEnd.Trim();
        setting.GraceMinutes = request.GraceMinutes;
        setting.HalfDayHours = request.HalfDayHours;
        setting.FullDayHours = request.FullDayHours;
        setting.AutoMarkAbsent = request.AutoMarkAbsent;
        setting.RequireLocation = request.RequireLocation;
        setting.AllowCorrections = request.AllowCorrections;
        setting.CorrectionWindowDays = request.CorrectionWindowDays;

        audit.Record(User, HttpContext, "Updated attendance settings", "Settings", setting.WorkWeek);
        await db.SaveChangesAsync(cancellationToken);
        return Ok(setting.ToDto());
    }

    /* ------------------------------- Payroll settings --------------------------- */

    [HttpGet("payroll-settings")]
    public async Task<ActionResult<PayrollSettingsDto>> PayrollSettings(CancellationToken cancellationToken)
    {
        var setting = await GetOrCreatePayrollAsync(cancellationToken);
        return Ok(setting.ToDto());
    }

    [HttpPut("payroll-settings")]
    [Authorize(Policy = Policies.Settings)]
    public async Task<ActionResult<PayrollSettingsDto>> UpdatePayrollSettings(
        PayrollSettingsRequest request, CancellationToken cancellationToken)
    {
        var setting = await GetOrCreatePayrollAsync(cancellationToken);

        setting.PayDay = request.PayDay;
        setting.InputCutoffDay = request.InputCutoffDay;
        setting.ApprovalRequired = request.ApprovalRequired;
        setting.PayslipRelease = request.PayslipRelease.Trim();
        setting.BankFileFormat = request.BankFileFormat.Trim();
        setting.StatutoryProfile = request.StatutoryProfile.Trim();
        setting.EffectiveFrom = request.EffectiveFrom;
        setting.PfRate = request.PfRate;
        setting.EsiRate = request.EsiRate;
        setting.ProfessionalTax = request.ProfessionalTax;
        setting.TdsMethod = request.TdsMethod.Trim();
        setting.Disclaimer = request.Disclaimer.Trim();

        audit.Record(User, HttpContext, "Updated payroll settings", "Settings", setting.StatutoryProfile);
        await db.SaveChangesAsync(cancellationToken);
        return Ok(setting.ToDto());
    }

    [HttpPut("leave-policies/{leaveTypeId}")]
    [Authorize(Policy = Policies.Settings)]
    public async Task<ActionResult<LeavePolicyDto>> UpdateLeavePolicy(
        string leaveTypeId, LeavePolicyUpdateRequest request, CancellationToken cancellationToken)
    {
        var policy = await db.LeavePolicies.FirstOrDefaultAsync(item => item.LeaveTypeId == leaveTypeId, cancellationToken)
            ?? throw ApiException.NotFound("Leave policy not found.");

        policy.MaxConsecutiveDays = request.MaxConsecutiveDays;
        policy.NoticePeriodDays = request.NoticePeriodDays;

        audit.Record(User, HttpContext, "Updated leave policy", "Settings", leaveTypeId);
        await db.SaveChangesAsync(cancellationToken);
        return Ok(policy.ToDto());
    }

    [HttpGet("leave-policies")]
    public async Task<ActionResult<List<LeavePolicyDto>>> LeavePolicies(CancellationToken cancellationToken)
    {
        var policies = await db.LeavePolicies.AsNoTracking().ToListAsync(cancellationToken);
        return Ok(policies.Select(policy => policy.ToDto()).ToList());
    }

    /* ---------------------------------- Holidays -------------------------------- */

    [HttpGet("holidays")]
    public async Task<ActionResult<List<HolidayDto>>> Holidays(CancellationToken cancellationToken)
    {
        var holidays = await db.Holidays.AsNoTracking()
            .OrderBy(holiday => holiday.Date)
            .ToListAsync(cancellationToken);
        return Ok(holidays.Select(holiday => holiday.ToDto()).ToList());
    }

    [HttpPost("holidays")]
    [Authorize(Policy = Policies.Settings)]
    public async Task<ActionResult<HolidayDto>> CreateHoliday(HolidayRequest request, CancellationToken cancellationToken)
    {
        if (!HolidayTypes.Contains(request.Type))
        {
            throw ApiException.BadRequest($"Holiday type must be one of: {string.Join(", ", HolidayTypes)}.", "invalid_holiday_type");
        }

        var ids = await db.Holidays.AsNoTracking().Select(holiday => holiday.Id).ToListAsync(cancellationToken);
        var max = ids
            .Select(id => int.TryParse(id.Replace("HOL-", string.Empty), out var value) ? value : 0)
            .DefaultIfEmpty(0)
            .Max();

        var holiday = new Holiday
        {
            Id = $"HOL-{max + 1:00}",
            Name = request.Name.Trim(),
            Date = request.Date,
            Type = request.Type,
        };

        db.Holidays.Add(holiday);
        audit.Record(User, HttpContext, "Added holiday", "Settings", $"{holiday.Name} ({holiday.Date:yyyy-MM-dd})");
        await db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(Holidays), null, holiday.ToDto());
    }

    [HttpDelete("holidays/{id}")]
    [Authorize(Policy = Policies.Settings)]
    public async Task<IActionResult> DeleteHoliday(string id, CancellationToken cancellationToken)
    {
        var holiday = await db.Holidays.FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw ApiException.NotFound("Holiday not found.");

        db.Holidays.Remove(holiday);
        audit.Record(User, HttpContext, "Removed holiday", "Settings", $"{holiday.Name} ({holiday.Date:yyyy-MM-dd})");
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    /* ----------------------------------- Roles ---------------------------------- */

    [HttpGet("roles")]
    [Authorize(Policy = Policies.Settings)]
    public async Task<ActionResult<List<RoleConfigDto>>> GetRoles(CancellationToken cancellationToken)
    {
        var counts = await db.Users.AsNoTracking()
            .GroupBy(user => user.Role)
            .Select(group => new { Role = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.Role, item => item.Count, cancellationToken);

        return Ok(RoleDefinitions.Select(definition => new RoleConfigDto
        {
            Id = definition.Id,
            Name = definition.Name,
            Description = definition.Description,
            Members = counts.GetValueOrDefault(definition.Id),
        }).ToList());
    }

    /* --------------------------------- Audit log -------------------------------- */

    [HttpGet("audit-logs")]
    [Authorize(Policy = Policies.HrAdmin)]
    public async Task<ActionResult<List<AuditLogDto>>> AuditLogs(
        [FromQuery] string? module, [FromQuery] string? search, CancellationToken cancellationToken)
    {
        var query = db.AuditLogs.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(module) && module != "all")
        {
            query = query.Where(log => log.Module == module);
        }

        var logs = await query.OrderByDescending(log => log.Timestamp).ToListAsync(cancellationToken);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            logs = logs.Where(log =>
                log.Actor.ToLowerInvariant().Contains(term) ||
                log.Action.ToLowerInvariant().Contains(term) ||
                log.Target.ToLowerInvariant().Contains(term)).ToList();
        }

        return Ok(logs.Select(log => log.ToDto()).ToList());
    }

    /* ------------------------------- System users ------------------------------- */

    [HttpGet("users")]
    [Authorize(Policy = Policies.HrAdmin)]
    public async Task<ActionResult<List<SystemUserDto>>> Users(CancellationToken cancellationToken)
    {
        var users = await db.Users.AsNoTracking().OrderBy(user => user.Name).ToListAsync(cancellationToken);
        return Ok(users.Select(user => user.ToDto()).ToList());
    }

    [HttpPost("users/invite")]
    [Authorize(Policy = Policies.HrAdmin)]
    public async Task<ActionResult<SystemUserDto>> InviteUser(InviteUserRequest request, CancellationToken cancellationToken)
    {
        if (!Roles.All.Contains(request.Role))
        {
            throw ApiException.BadRequest($"Role must be one of: {string.Join(", ", Roles.All)}.", "invalid_role");
        }

        var email = request.Email.Trim().ToLowerInvariant();
        var exists = await db.Users.AnyAsync(user => user.Email == email, cancellationToken);
        if (exists)
        {
            throw ApiException.Conflict("A user with this email address already exists.", "email_in_use");
        }

        string? employeeId = null;
        if (!string.IsNullOrWhiteSpace(request.EmployeeId))
        {
            var employeeExists = await db.Employees.AnyAsync(employee => employee.Id == request.EmployeeId, cancellationToken);
            if (!employeeExists)
            {
                throw ApiException.BadRequest("Please choose a valid employee.", "invalid_employee");
            }

            employeeId = request.EmployeeId;
        }

        var ids = await db.Users.AsNoTracking().Select(user => user.Id).ToListAsync(cancellationToken);
        var max = ids
            .Select(id => int.TryParse(id.Replace("USR-", string.Empty), out var value) ? value : 0)
            .DefaultIfEmpty(0)
            .Max();

        // An invitation cannot be signed in to until an administrator provisions a
        // password. Store an unguessable hash rather than a shared default password.
        var placeholder = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));

        var user = new AppUser
        {
            Id = $"USR-{max + 1:000}",
            EmployeeId = employeeId,
            Name = request.Name.Trim(),
            Email = email,
            PasswordHash = PasswordService.Hash(placeholder),
            Role = request.Role,
            Status = "Invited",
            MfaEnabled = false,
        };

        db.Users.Add(user);
        audit.Record(User, HttpContext, "Invited system user", "Administration", $"{user.Name} ({user.Email}) as {user.Role}");
        await db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(Users), null, user.ToDto());
    }

    [HttpPatch("users/{id}")]
    [Authorize(Policy = Policies.HrAdmin)]
    public async Task<ActionResult<SystemUserDto>> UpdateUser(
        string id, UpdateUserRequest request, CancellationToken cancellationToken)
    {
        var user = await db.Users.FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw ApiException.NotFound("System user not found.");

        var currentUserId = User.GetUserId();
        if (user.Id == currentUserId && (request.Status is not null || request.Role is not null))
        {
            var changesOwnAccess =
                (request.Status is not null && request.Status != user.Status) ||
                (request.Role is not null && request.Role != user.Role);
            if (changesOwnAccess)
            {
                throw ApiException.BadRequest(
                    "You cannot change your own role or account status.", "self_access_change");
            }
        }

        if (!string.IsNullOrWhiteSpace(request.Role))
        {
            if (!Roles.All.Contains(request.Role))
            {
                throw ApiException.BadRequest($"Role must be one of: {string.Join(", ", Roles.All)}.", "invalid_role");
            }

            user.Role = request.Role;
        }

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            if (!UserStatuses.Contains(request.Status))
            {
                throw ApiException.BadRequest($"Status must be one of: {string.Join(", ", UserStatuses)}.", "invalid_user_status");
            }

            user.Status = request.Status;
        }

        audit.Record(User, HttpContext, "Updated system user", "Administration", $"{user.Name} ({user.Id})");
        await db.SaveChangesAsync(cancellationToken);
        return Ok(user.ToDto());
    }

    [HttpPatch("users/{id}/mfa")]
    [Authorize(Policy = Policies.HrAdmin)]
    public async Task<ActionResult<SystemUserDto>> UpdateMfa(string id, MfaUpdateRequest request, CancellationToken cancellationToken)
    {
        var user = await db.Users.FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw ApiException.NotFound("System user not found.");

        user.MfaEnabled = request.MfaEnabled;
        audit.Record(User, HttpContext, $"Turned MFA {(request.MfaEnabled ? "on" : "off")}", "Administration", user.Email);
        await db.SaveChangesAsync(cancellationToken);
        return Ok(user.ToDto());
    }

    /* --------------------------- Organization lookups --------------------------- */

    [HttpGet("branches")]
    public async Task<ActionResult<List<BranchDto>>> Branches(CancellationToken cancellationToken)
    {
        var branches = await db.Branches.AsNoTracking().OrderBy(branch => branch.Name).ToListAsync(cancellationToken);
        var counts = await db.Employees.AsNoTracking()
            .GroupBy(employee => employee.BranchId)
            .Select(group => new { BranchId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.BranchId, item => item.Count, cancellationToken);

        return Ok(branches.Select(branch => branch.ToDto(counts.GetValueOrDefault(branch.Id))).ToList());
    }

    [HttpGet("departments")]
    public async Task<ActionResult<List<DepartmentDto>>> Departments(CancellationToken cancellationToken)
    {
        var departments = await db.Departments.AsNoTracking().OrderBy(department => department.Name).ToListAsync(cancellationToken);
        var counts = await db.Employees.AsNoTracking()
            .GroupBy(employee => employee.DepartmentId)
            .Select(group => new { DepartmentId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.DepartmentId, item => item.Count, cancellationToken);

        return Ok(departments.Select(department => department.ToDto(counts.GetValueOrDefault(department.Id))).ToList());
    }

    [HttpGet("designations")]
    public async Task<ActionResult<List<DesignationDto>>> Designations(CancellationToken cancellationToken)
    {
        var designations = await db.Designations.AsNoTracking().OrderBy(designation => designation.Title).ToListAsync(cancellationToken);
        var counts = await db.Employees.AsNoTracking()
            .GroupBy(employee => employee.DesignationId)
            .Select(group => new { DesignationId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.DesignationId, item => item.Count, cancellationToken);

        return Ok(designations.Select(designation => designation.ToDto(counts.GetValueOrDefault(designation.Id))).ToList());
    }

    /* --------------------------------- Helpers ---------------------------------- */

    private async Task<CompanySetting> GetOrCreateCompanyAsync(CancellationToken cancellationToken)
    {
        var setting = await db.CompanySettings.FirstOrDefaultAsync(item => item.Id == 1, cancellationToken);
        if (setting is not null)
        {
            return setting;
        }

        setting = new CompanySetting
        {
            Id = 1,
            LegalName = "Horizon Technologies Private Limited",
            DisplayName = "Horizon Technologies",
            Domain = "horizontech.example",
            Industry = "Information Technology",
            Headquarters = "Hyderabad, Telangana, India",
            Email = "people@horizontech.example",
            Phone = "+91 40 6789 1200",
            Website = "www.horizontech.example",
            Gstin = "36AABCH1234P1ZQ (demo)",
            Pan = "AABCH1234P (demo)",
            Cin = "U72200TG2016PTC104521 (demo)",
            Currency = "INR (₹)",
            Timezone = "Asia/Kolkata (IST)",
            FinancialYear = "April – March",
            PayrollFrequency = "Monthly",
        };
        db.CompanySettings.Add(setting);
        await db.SaveChangesAsync(cancellationToken);
        return setting;
    }

    private async Task<AttendanceSetting> GetOrCreateAttendanceAsync(CancellationToken cancellationToken)
    {
        var setting = await db.AttendanceSettings.FirstOrDefaultAsync(item => item.Id == 1, cancellationToken);
        if (setting is not null)
        {
            return setting;
        }

        setting = new AttendanceSetting { Id = 1 };
        db.AttendanceSettings.Add(setting);
        await db.SaveChangesAsync(cancellationToken);
        return setting;
    }

    private async Task<PayrollSetting> GetOrCreatePayrollAsync(CancellationToken cancellationToken)
    {
        var setting = await db.PayrollSettings.FirstOrDefaultAsync(item => item.Id == 1, cancellationToken);
        if (setting is not null)
        {
            return setting;
        }

        setting = new PayrollSetting
        {
            Id = 1,
            EffectiveFrom = DateOnly.FromDateTime(DateTime.UtcNow),
            Disclaimer = "Payroll values in this demonstration are fictional. No salary is disbursed.",
        };
        db.PayrollSettings.Add(setting);
        await db.SaveChangesAsync(cancellationToken);
        return setting;
    }
}
