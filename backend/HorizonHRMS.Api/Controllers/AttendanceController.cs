using HorizonHRMS.Api.Contracts;
using HorizonHRMS.Api.Data;
using HorizonHRMS.Api.Infrastructure;
using HorizonHRMS.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HorizonHRMS.Api.Controllers;

[ApiController]
[Route("api/attendance")]
[Authorize]
public sealed class AttendanceController(HrmsDbContext db, AuditService audit, DemoClock clock) : ControllerBase
{
    [HttpGet("daily")]
    public async Task<ActionResult<List<AttendanceRecordDto>>> Daily(
        [FromQuery] DateOnly? date,
        [FromQuery] string? departmentId,
        [FromQuery] string? status,
        [FromQuery] string? search,
        [FromQuery] string? managerId,
        CancellationToken cancellationToken)
    {
        var targetDate = date ?? clock.Today;
        var query = db.AttendanceRecords.AsNoTracking().Where(record => record.Date == targetDate);

        var visible = await AccessScope.VisibleEmployeeIdsAsync(db, User, cancellationToken);
        if (visible is not null)
        {
            query = query.Where(record => visible.Contains(record.EmployeeId));
        }

        var records = await query.ToListAsync(cancellationToken);
        var employeeIds = records.Select(record => record.EmployeeId).Distinct().ToList();
        var employees = await db.Employees.AsNoTracking()
            .Where(employee => employeeIds.Contains(employee.Id))
            .ToDictionaryAsync(employee => employee.Id, cancellationToken);

        var term = search?.Trim().ToLowerInvariant() ?? string.Empty;
        var rows = records
            .Where(record => employees.ContainsKey(record.EmployeeId))
            .Select(record => new { Record = record, Employee = employees[record.EmployeeId] })
            .Where(row => string.IsNullOrWhiteSpace(departmentId) || departmentId == "all" || row.Employee.DepartmentId == departmentId)
            .Where(row => string.IsNullOrWhiteSpace(managerId) || row.Employee.ManagerId == managerId)
            .Where(row => string.IsNullOrWhiteSpace(status) || status == "all" || row.Record.Status == status)
            .Where(row => term.Length == 0 ||
                          $"{row.Employee.FirstName} {row.Employee.LastName}".ToLower().Contains(term) ||
                          row.Employee.Id.ToLower().Contains(term))
            .OrderBy(row => row.Employee.LastName)
            .ThenBy(row => row.Employee.FirstName)
            .Select(row => row.Record.ToDto(row.Employee.ToDto()))
            .ToList();

        return Ok(rows);
    }

    [HttpGet("summary")]
    public async Task<ActionResult<AttendanceSummaryDto>> Summary(
        [FromQuery] DateOnly? date, CancellationToken cancellationToken)
    {
        var targetDate = date ?? clock.Today;
        var employeeQuery = db.Employees.AsNoTracking().Where(employee => employee.Status != EmployeeStatuses.Inactive);
        var recordQuery = db.AttendanceRecords.AsNoTracking().Where(record => record.Date == targetDate);

        var visible = await AccessScope.VisibleEmployeeIdsAsync(db, User, cancellationToken);
        if (visible is not null)
        {
            employeeQuery = employeeQuery.Where(employee => visible.Contains(employee.Id));
            recordQuery = recordQuery.Where(record => visible.Contains(record.EmployeeId));
        }

        var total = await employeeQuery.CountAsync(cancellationToken);
        var statuses = await recordQuery
            .GroupBy(record => record.Status)
            .Select(group => new { Status = group.Key, Count = group.Count() })
            .ToListAsync(cancellationToken);

        int Count(string status) => statuses.FirstOrDefault(item => item.Status == status)?.Count ?? 0;

        var present = Count(AttendanceStatuses.Present);
        var late = Count(AttendanceStatuses.Late);
        var halfDay = Count(AttendanceStatuses.HalfDay);
        var onLeave = Count(AttendanceStatuses.OnLeave);
        var absent = Count(AttendanceStatuses.Absent);
        var accounted = present + late + halfDay + onLeave + absent;

        return Ok(new AttendanceSummaryDto
        {
            Date = targetDate,
            Present = present,
            Absent = absent,
            Late = late,
            HalfDay = halfDay,
            OnLeave = onLeave,
            NotMarked = Math.Max(0, total - accounted),
            Total = total,
            Rate = total == 0 ? 0 : Math.Round((present + late + halfDay) / (decimal)total * 100, 1, MidpointRounding.AwayFromZero),
        });
    }

    [HttpGet("employee/{employeeId}")]
    public async Task<ActionResult<List<AttendanceRecordDto>>> EmployeeMonth(
        string employeeId,
        [FromQuery] int month,
        [FromQuery] int year,
        CancellationToken cancellationToken)
    {
        await AccessScope.EnsureCanSeeEmployeeAsync(db, User, employeeId, cancellationToken);

        if (month is < 0 or > 11)
        {
            throw ApiException.BadRequest("Month must be a zero-based value between 0 and 11.", "invalid_month");
        }

        var records = await db.AttendanceRecords.AsNoTracking()
            .Where(record => record.EmployeeId == employeeId && record.Date.Year == year && record.Date.Month == month + 1)
            .OrderBy(record => record.Date)
            .ToListAsync(cancellationToken);

        return Ok(records.Select(record => record.ToDto()).ToList());
    }

    [HttpGet("today/{employeeId}")]
    public async Task<ActionResult<AttendanceRecordDto?>> Today(string employeeId, CancellationToken cancellationToken)
    {
        await AccessScope.EnsureCanSeeEmployeeAsync(db, User, employeeId, cancellationToken);
        var record = await db.AttendanceRecords.AsNoTracking()
            .FirstOrDefaultAsync(item => item.EmployeeId == employeeId && item.Date == clock.Today, cancellationToken);
        return Ok(record?.ToDto());
    }

    [HttpPost("check-in")]
    public async Task<ActionResult<AttendanceRecordDto>> CheckIn(SelfActionRequest request, CancellationToken cancellationToken)
    {
        var employeeId = AccessScope.RequireEmployeeId(User, request.EmployeeId);
        await AccessScope.EnsureCanSeeEmployeeAsync(db, User, employeeId, cancellationToken);

        var record = await db.AttendanceRecords
            .FirstOrDefaultAsync(item => item.EmployeeId == employeeId && item.Date == clock.Today, cancellationToken)
            ?? throw ApiException.NotFound("No attendance record was found for the current attendance date.", "attendance_not_found");

        if (!string.IsNullOrWhiteSpace(record.CheckIn))
        {
            throw ApiException.Conflict("You have already checked in for the current attendance date.", "already_checked_in");
        }

        record.CheckIn = "09:06";
        record.Status = AttendanceStatuses.Present;
        record.WorkedHours = null;
        record.Note = "Checked in via the HRMS.";
        audit.Record(User, HttpContext, "Checked in", "Attendance", employeeId);
        await db.SaveChangesAsync(cancellationToken);
        return Ok(record.ToDto());
    }

    [HttpPost("check-out")]
    public async Task<ActionResult<AttendanceRecordDto>> CheckOut(SelfActionRequest request, CancellationToken cancellationToken)
    {
        var employeeId = AccessScope.RequireEmployeeId(User, request.EmployeeId);
        await AccessScope.EnsureCanSeeEmployeeAsync(db, User, employeeId, cancellationToken);

        var record = await db.AttendanceRecords
            .FirstOrDefaultAsync(item => item.EmployeeId == employeeId && item.Date == clock.Today, cancellationToken)
            ?? throw ApiException.NotFound("No attendance record was found for the current attendance date.", "attendance_not_found");

        if (string.IsNullOrWhiteSpace(record.CheckIn))
        {
            throw ApiException.Conflict("Please check in before checking out.", "not_checked_in");
        }

        if (!string.IsNullOrWhiteSpace(record.CheckOut))
        {
            throw ApiException.Conflict("You have already checked out for the current attendance date.", "already_checked_out");
        }

        record.CheckOut = "18:14";
        record.WorkedHours = 9.1m;
        audit.Record(User, HttpContext, "Checked out", "Attendance", employeeId);
        await db.SaveChangesAsync(cancellationToken);
        return Ok(record.ToDto());
    }

    [HttpGet("corrections")]
    public async Task<ActionResult<List<AttendanceCorrectionDto>>> Corrections(
        [FromQuery] string? status,
        [FromQuery] string? managerId,
        CancellationToken cancellationToken)
    {
        var query = db.AttendanceCorrections.AsNoTracking().AsQueryable();
        var visible = await AccessScope.VisibleEmployeeIdsAsync(db, User, cancellationToken);
        if (visible is not null)
        {
            query = query.Where(correction => visible.Contains(correction.EmployeeId));
        }

        if (!string.IsNullOrWhiteSpace(status) && status != "all")
        {
            query = query.Where(correction => correction.Status == status);
        }

        var corrections = await query.OrderByDescending(correction => correction.RequestedOn).ToListAsync(cancellationToken);

        if (!string.IsNullOrWhiteSpace(managerId))
        {
            var reports = await db.Employees.AsNoTracking()
                .Where(employee => employee.ManagerId == managerId)
                .Select(employee => employee.Id)
                .ToListAsync(cancellationToken);
            var managerSet = reports.ToHashSet(StringComparer.Ordinal);
            corrections = corrections.Where(correction => managerSet.Contains(correction.EmployeeId)).ToList();
        }

        return Ok(corrections.Select(correction => correction.ToDto()).ToList());
    }

    [HttpPost("corrections")]
    public async Task<ActionResult<AttendanceCorrectionDto>> SubmitCorrection(
        AttendanceCorrectionRequest request, CancellationToken cancellationToken)
    {
        var employeeId = AccessScope.RequireEmployeeId(User, request.EmployeeId);
        await AccessScope.EnsureCanSeeEmployeeAsync(db, User, employeeId, cancellationToken);

        var settings = await db.AttendanceSettings.AsNoTracking().FirstOrDefaultAsync(cancellationToken);
        if (settings is { AllowCorrections: false })
        {
            throw ApiException.Conflict("Attendance corrections are currently disabled.", "corrections_disabled");
        }

        if (!AttendanceStatuses.All.Contains(request.RequestedStatus))
        {
            throw ApiException.BadRequest("Choose a valid attendance status.", "invalid_status");
        }

        var windowDays = settings?.CorrectionWindowDays ?? 7;
        if (request.Date > clock.Today || request.Date < clock.Today.AddDays(-windowDays))
        {
            throw ApiException.BadRequest(
                $"Corrections can only be requested for the last {windowDays} day(s).",
                "outside_correction_window");
        }

        var record = await db.AttendanceRecords.AsNoTracking()
            .FirstOrDefaultAsync(item => item.EmployeeId == employeeId && item.Date == request.Date, cancellationToken)
            ?? throw ApiException.NotFound("No attendance record exists for the selected date.", "attendance_not_found");

        var duplicate = await db.AttendanceCorrections.AnyAsync(
            correction => correction.EmployeeId == employeeId &&
                          correction.Date == request.Date &&
                          correction.Status == "Pending",
            cancellationToken);
        if (duplicate)
        {
            throw ApiException.Conflict("A pending correction already exists for this date.", "duplicate_correction");
        }

        var ids = await db.AttendanceCorrections.AsNoTracking().Select(item => item.Id).ToListAsync(cancellationToken);
        var max = ids
            .Select(id => int.TryParse(id.Replace("ACR-", string.Empty), out var value) ? value : 0)
            .DefaultIfEmpty(1000)
            .Max();

        var correction = new AttendanceCorrection
        {
            Id = $"ACR-{max + 1}",
            EmployeeId = employeeId,
            Date = request.Date,
            CurrentStatus = record.Status,
            RequestedStatus = request.RequestedStatus,
            Reason = request.Reason.Trim(),
            RequestedOn = clock.Today,
            Status = "Pending",
        };

        db.AttendanceCorrections.Add(correction);
        audit.Record(User, HttpContext, "Submitted attendance correction", "Attendance", $"{employeeId} on {request.Date:yyyy-MM-dd}");
        await db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(Corrections), null, correction.ToDto());
    }

    [HttpPost("corrections/{id}/decision")]
    [Authorize(Policy = Policies.PeopleManagers)]
    public async Task<ActionResult<AttendanceCorrectionDto>> DecideCorrection(
        string id, DecisionRequest request, CancellationToken cancellationToken)
    {
        if (request.Status is not ("Approved" or "Rejected"))
        {
            throw ApiException.BadRequest("Decision must be Approved or Rejected.", "invalid_decision");
        }

        var correction = await db.AttendanceCorrections.FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw ApiException.NotFound("Correction request not found.");
        if (correction.Status != "Pending")
        {
            throw ApiException.Conflict("This request has already been reviewed.", "already_decided");
        }

        await AccessScope.EnsureCanSeeEmployeeAsync(db, User, correction.EmployeeId, cancellationToken);

        correction.Status = request.Status;
        correction.DecidedBy = User.GetDisplayName();
        correction.DecidedOn = clock.Today;
        correction.Note = request.Note;

        if (request.Status == "Approved")
        {
            var record = await db.AttendanceRecords.FirstOrDefaultAsync(
                item => item.EmployeeId == correction.EmployeeId && item.Date == correction.Date, cancellationToken);
            if (record is not null)
            {
                record.Status = correction.RequestedStatus;
                record.Note = "Updated through an approved attendance correction.";
            }
        }

        audit.Record(User, HttpContext, $"{request.Status} attendance correction", "Attendance", $"{correction.EmployeeId} on {correction.Date:yyyy-MM-dd}");
        await db.SaveChangesAsync(cancellationToken);
        return Ok(correction.ToDto());
    }

    [HttpGet("shifts")]
    public async Task<ActionResult<List<ShiftDto>>> Shifts(CancellationToken cancellationToken)
    {
        var shifts = await db.Shifts.AsNoTracking().OrderBy(shift => shift.Name).ToListAsync(cancellationToken);
        var counts = await db.Employees.AsNoTracking()
            .Where(employee => employee.Status != EmployeeStatuses.Inactive)
            .GroupBy(employee => employee.ShiftId)
            .Select(group => new { ShiftId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.ShiftId, item => item.Count, cancellationToken);

        return Ok(shifts.Select(shift =>
        {
            var dto = shift.ToDto();
            dto.AssignedCount = counts.GetValueOrDefault(shift.Id);
            return dto;
        }).ToList());
    }

    [HttpGet("holidays")]
    public async Task<ActionResult<List<HolidayDto>>> Holidays(CancellationToken cancellationToken)
    {
        var holidays = await db.Holidays.AsNoTracking().OrderBy(holiday => holiday.Date).ToListAsync(cancellationToken);
        return Ok(holidays.Select(holiday => holiday.ToDto()).ToList());
    }

    [HttpGet("holidays/{date}")]
    public async Task<ActionResult<HolidayDto?>> HolidayForDate(DateOnly date, CancellationToken cancellationToken)
    {
        var holiday = await db.Holidays.AsNoTracking().FirstOrDefaultAsync(item => item.Date == date, cancellationToken);
        return Ok(holiday?.ToDto());
    }
}
