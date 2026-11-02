using System.Globalization;
using HorizonHRMS.Api.Contracts;
using HorizonHRMS.Api.Data;
using HorizonHRMS.Api.Infrastructure;
using HorizonHRMS.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HorizonHRMS.Api.Controllers;

/// <summary>
/// Mirrors src/services/report-service.ts. Row keys, column order, summary
/// labels and notice strings are kept identical so the Reports page can render
/// the API payload without any shape translation.
/// </summary>
[ApiController]
[Route("api/reports")]
[Authorize(Policy = Policies.Operations)]
public sealed class ReportsController(HrmsDbContext db, DemoClock clock) : ControllerBase
{
    private static readonly string[] ReportOrder =
    [
        "headcount",
        "department",
        "attendance",
        "leave",
        "payroll",
        "recruitment",
    ];

    [HttpGet]
    public async Task<ActionResult<List<ReportDefinitionDto>>> All(CancellationToken cancellationToken)
    {
        return Ok(await BuildAsync(ReportOrder, cancellationToken));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ReportDefinitionDto>> One(string id, CancellationToken cancellationToken)
    {
        if (!ReportOrder.Contains(id, StringComparer.OrdinalIgnoreCase))
        {
            throw ApiException.NotFound("Report not found.");
        }

        var reports = await BuildAsync([id.ToLowerInvariant()], cancellationToken);
        return Ok(reports[0]);
    }

    private async Task<List<ReportDefinitionDto>> BuildAsync(IEnumerable<string> ids, CancellationToken cancellationToken)
    {
        var employees = await db.Employees.AsNoTracking().ToListAsync(cancellationToken);
        var departments = SeedOrder.OrderBySeed(
            await db.Departments.AsNoTracking().ToListAsync(cancellationToken),
            department => department.Id,
            SeedOrder.DepartmentIds);
        var jobs = await db.JobOpenings.AsNoTracking().OrderBy(job => job.Id).ToListAsync(cancellationToken);
        var candidates = await db.Candidates.AsNoTracking().ToListAsync(cancellationToken);
        var interviews = await db.Interviews.AsNoTracking().ToListAsync(cancellationToken);

        var requested = ids.ToHashSet(StringComparer.Ordinal);
        var reports = new List<ReportDefinitionDto>();

        if (requested.Contains("headcount"))
        {
            reports.Add(BuildHeadcount(employees, departments));
        }

        if (requested.Contains("department"))
        {
            reports.Add(BuildDepartments(employees, departments, jobs));
        }

        if (requested.Contains("attendance"))
        {
            var attendance = await db.AttendanceRecords.AsNoTracking().ToListAsync(cancellationToken);
            reports.Add(BuildAttendance(employees, departments, attendance));
        }

        if (requested.Contains("leave"))
        {
            var leaveRequests = await db.LeaveRequests.AsNoTracking().ToListAsync(cancellationToken);
            var leaveBalances = await db.LeaveBalances.AsNoTracking().ToListAsync(cancellationToken);
            var leaveTypes = SeedOrder.OrderBySeed(
                await db.LeaveTypes.AsNoTracking().ToListAsync(cancellationToken),
                type => type.Id,
                SeedOrder.LeaveTypeIds);
            reports.Add(BuildLeave(leaveRequests, leaveBalances, leaveTypes));
        }

        if (requested.Contains("payroll"))
        {
            var payrollRuns = await db.PayrollRuns.AsNoTracking()
                .OrderBy(run => run.Year)
                .ThenBy(run => run.Month)
                .ToListAsync(cancellationToken);
            reports.Add(BuildPayroll(payrollRuns));
        }

        if (requested.Contains("recruitment"))
        {
            reports.Add(BuildRecruitment(departments, jobs, candidates, interviews));
        }

        return reports;
    }

    private ReportDefinitionDto BuildHeadcount(List<Employee> employees, List<Department> departments)
    {
        var fiscalYearStart = FiscalYearStart(clock.Today);
        var rows = departments
            .Select(department =>
            {
                var members = employees.Where(employee => employee.DepartmentId == department.Id).ToList();
                return new Dictionary<string, object?>
                {
                    ["department"] = department.Name,
                    ["code"] = department.Code,
                    ["headcount"] = members.Count,
                    ["active"] = members.Count(employee => employee.Status == EmployeeStatuses.Active),
                    ["probation"] = members.Count(employee => employee.Status == EmployeeStatuses.Probation),
                    ["onLeave"] = members.Count(employee => employee.Status == EmployeeStatuses.OnLeave),
                    ["inactive"] = members.Count(employee => employee.Status == EmployeeStatuses.Inactive),
                    ["newHires"] = members.Count(employee => employee.DateOfJoining >= fiscalYearStart),
                };
            })
            .ToList();

        rows.Add(new Dictionary<string, object?>
        {
            ["department"] = "Total",
            ["code"] = "—",
            ["headcount"] = rows.Sum(row => (int)row["headcount"]!),
            ["active"] = rows.Sum(row => (int)row["active"]!),
            ["probation"] = rows.Sum(row => (int)row["probation"]!),
            ["onLeave"] = rows.Sum(row => (int)row["onLeave"]!),
            ["inactive"] = rows.Sum(row => (int)row["inactive"]!),
            ["newHires"] = rows.Sum(row => (int)row["newHires"]!),
        });

        var activeEmployees = employees.Count(employee => employee.Status != EmployeeStatuses.Inactive);

        return new ReportDefinitionDto
        {
            Id = "headcount",
            Title = "Employee Headcount",
            Description = "Headcount by department with employment status split.",
            Columns =
            [
                Column("department", "Department"),
                Column("code", "Code"),
                Column("headcount", "Headcount", "right"),
                Column("active", "Active", "right"),
                Column("probation", "Probation", "right"),
                Column("onLeave", "On Leave", "right"),
                Column("inactive", "Inactive", "right"),
                Column("newHires", "New Hires (FY)", "right"),
            ],
            Rows = rows,
            Summary =
            [
                Summary("Total headcount", employees.Count.ToString(CultureInfo.InvariantCulture)),
                Summary("Active workforce", activeEmployees.ToString(CultureInfo.InvariantCulture)),
                Summary("Departments", departments.Count.ToString(CultureInfo.InvariantCulture)),
                Summary("Snapshot date", Formatting.DateLong(clock.Today)),
            ],
            Notice = "Demonstration data only.",
        };
    }

    private ReportDefinitionDto BuildDepartments(
        List<Employee> employees, List<Department> departments, List<JobOpening> jobs)
    {
        var rows = departments.Select(department =>
        {
            var members = employees.Where(employee => employee.DepartmentId == department.Id).ToList();
            var head = employees.FirstOrDefault(employee => employee.Id == department.HeadId);
            return new Dictionary<string, object?>
            {
                ["department"] = department.Name,
                ["code"] = department.Code,
                ["head"] = head is null ? "—" : $"{head.FirstName} {head.LastName}",
                ["location"] = department.Location,
                ["headcount"] = members.Count,
                ["openRoles"] = jobs.Count(job => job.DepartmentId == department.Id && job.Status == "Open"),
            };
        }).ToList();

        var largest = rows
            .OrderByDescending(row => (int)row["headcount"]!)
            .FirstOrDefault();
        var openRoles = jobs.Count(job => job.Status == "Open");

        return new ReportDefinitionDto
        {
            Id = "department",
            Title = "Department Report",
            Description = "Department ownership, location and hiring demand.",
            Columns =
            [
                Column("department", "Department"),
                Column("code", "Code"),
                Column("head", "Department Head"),
                Column("location", "Primary Location"),
                Column("headcount", "Employees", "right"),
                Column("openRoles", "Open Roles", "right"),
            ],
            Rows = rows,
            Summary =
            [
                Summary("Departments", departments.Count.ToString(CultureInfo.InvariantCulture)),
                Summary("Open roles", openRoles.ToString(CultureInfo.InvariantCulture)),
                Summary("Largest department",
                    largest is null
                        ? "—"
                        : $"{largest["department"]} · {largest["headcount"]}"),
                Summary("Snapshot date", Formatting.DateLong(clock.Today)),
            ],
            Notice = "Demonstration data only.",
        };
    }

    private ReportDefinitionDto BuildAttendance(
        List<Employee> employees, List<Department> departments, List<AttendanceRecord> attendance)
    {
        var today = clock.Today;
        var monthStart = new DateOnly(today.Year, today.Month, 1);
        var rows = departments.Select(department =>
        {
            var members = employees
                .Where(employee => employee.DepartmentId == department.Id && employee.Status != EmployeeStatuses.Inactive)
                .ToList();
            var ids = members.Select(employee => employee.Id).ToHashSet(StringComparer.Ordinal);
            var records = attendance
                .Where(record => record.Date >= monthStart && record.Date <= today && ids.Contains(record.EmployeeId))
                .ToList();

            var present = records.Count(record => record.Status is AttendanceStatuses.Present or AttendanceStatuses.Late);
            var leave = records.Count(record => record.Status == AttendanceStatuses.OnLeave);
            var absent = records.Count(record => record.Status == AttendanceStatuses.Absent);
            var workingDays = records.Select(record => record.Date).Distinct().Count();
            var rate = records.Count == 0
                ? 0m
                : Math.Round(present / (decimal)records.Count * 100m, 1, MidpointRounding.AwayFromZero);

            return new Dictionary<string, object?>
            {
                ["department"] = department.Name,
                ["employees"] = members.Count,
                ["workingDays"] = workingDays,
                ["present"] = present,
                ["absent"] = absent,
                ["onLeave"] = leave,
                ["rate"] = $"{rate.ToString(CultureInfo.InvariantCulture)}%",
            };
        }).ToList();

        var todayRecords = attendance.Where(record => record.Date == today).ToList();
        var activeCount = employees.Count(employee => employee.Status != EmployeeStatuses.Inactive);
        var presentToday = todayRecords.Count(record => record.Status == AttendanceStatuses.Present);
        var lateToday = todayRecords.Count(record => record.Status == AttendanceStatuses.Late);
        var halfDayToday = todayRecords.Count(record => record.Status == AttendanceStatuses.HalfDay);
        var onLeaveToday = todayRecords.Count(record => record.Status == AttendanceStatuses.OnLeave);
        var todayRate = activeCount == 0
            ? 0m
            : Math.Round((presentToday + lateToday + halfDayToday) / (decimal)activeCount * 100m, 1, MidpointRounding.AwayFromZero);

        return new ReportDefinitionDto
        {
            Id = "attendance",
            Title = "Attendance Report",
            Description = $"October {today.Year} attendance by department up to {today.Day} {Formatting.MonthShort(today.Month)}.",
            Columns =
            [
                Column("department", "Department"),
                Column("employees", "Employees", "right"),
                Column("workingDays", "Working Days", "right"),
                Column("present", "Present Days", "right"),
                Column("absent", "Absent Days", "right"),
                Column("onLeave", "Leave Days", "right"),
                Column("rate", "Attendance %", "right"),
            ],
            Rows = rows,
            Summary =
            [
                Summary("Present today", (presentToday + lateToday).ToString(CultureInfo.InvariantCulture)),
                Summary("On leave today", onLeaveToday.ToString(CultureInfo.InvariantCulture)),
                Summary("Attendance rate", $"{todayRate.ToString(CultureInfo.InvariantCulture)}%"),
                Summary("Period", $"{Formatting.MonthShort(today.Month)} {today.Year}"),
            ],
            Notice = "Derived from demonstration attendance records.",
        };
    }

    private static ReportDefinitionDto BuildLeave(
        List<LeaveRequest> leaveRequests, List<LeaveBalance> leaveBalances, List<LeaveType> leaveTypes)
    {
        var rows = leaveTypes.Select(type =>
        {
            var requests = leaveRequests.Where(request => request.LeaveTypeId == type.Id).ToList();
            var allocations = leaveBalances.Where(balance => balance.LeaveTypeId == type.Id).ToList();
            var approvedDays = requests
                .Where(request => request.Status == LeaveStatuses.Approved)
                .Sum(request => request.Days);

            return new Dictionary<string, object?>
            {
                ["leaveType"] = type.Name,
                ["code"] = type.Code,
                ["requests"] = requests.Count,
                ["approved"] = requests.Count(request => request.Status == LeaveStatuses.Approved),
                ["pending"] = requests.Count(request => request.Status == LeaveStatuses.Pending),
                ["days"] = approvedDays,
                ["allocated"] = allocations.Sum(balance => balance.Allocated),
                ["utilised"] = allocations.Sum(balance => balance.Used),
            };
        }).ToList();

        var totalApprovedDays = leaveRequests
            .Where(request => request.Status == LeaveStatuses.Approved)
            .Sum(request => request.Days);

        return new ReportDefinitionDto
        {
            Id = "leave",
            Title = "Leave Report",
            Description = "Leave utilisation by type for the current leave year.",
            Columns =
            [
                Column("leaveType", "Leave Type"),
                Column("code", "Code"),
                Column("requests", "Requests", "right"),
                Column("approved", "Approved", "right"),
                Column("pending", "Pending", "right"),
                Column("days", "Approved Days", "right"),
                Column("allocated", "Allocated Days", "right"),
                Column("utilised", "Used Days", "right"),
            ],
            Rows = rows,
            Summary =
            [
                Summary("Total requests", leaveRequests.Count.ToString(CultureInfo.InvariantCulture)),
                Summary("Pending approvals",
                    leaveRequests.Count(request => request.Status == LeaveStatuses.Pending).ToString(CultureInfo.InvariantCulture)),
                Summary("Approved days", totalApprovedDays.ToString(CultureInfo.InvariantCulture)),
                Summary("Leave types", leaveTypes.Count.ToString(CultureInfo.InvariantCulture)),
            ],
            Notice = "Demonstration leave records; no legal entitlement is implied.",
        };
    }

    private static ReportDefinitionDto BuildPayroll(List<PayrollRun> payrollRuns)
    {
        var rows = payrollRuns.Select(run => new Dictionary<string, object?>
        {
            ["period"] = run.PeriodLabel,
            ["employees"] = run.EmployeeCount,
            ["gross"] = Formatting.Currency(run.GrossTotal),
            ["deductions"] = Formatting.Currency(run.DeductionsTotal),
            ["net"] = Formatting.Currency(run.NetTotal),
            ["status"] = run.Status,
            ["processedOn"] = run.ProcessedOn is null ? "—" : Formatting.DateLong(run.ProcessedOn.Value),
        }).ToList();

        var latestNet = payrollRuns.Count == 0 ? 0m : payrollRuns[^1].NetTotal;
        var totalGross = payrollRuns.Sum(run => run.GrossTotal);

        return new ReportDefinitionDto
        {
            Id = "payroll",
            Title = "Payroll Summary",
            Description = "Monthly payroll runs for FY 2026–27 (demonstration figures).",
            Columns =
            [
                Column("period", "Pay Period"),
                Column("employees", "Employees", "right"),
                Column("gross", "Gross", "right"),
                Column("deductions", "Deductions", "right"),
                Column("net", "Net Pay", "right"),
                Column("status", "Status"),
                Column("processedOn", "Processed On"),
            ],
            Rows = rows,
            Summary =
            [
                Summary("Runs in FY", payrollRuns.Count.ToString(CultureInfo.InvariantCulture)),
                Summary("Latest net payroll", Formatting.Currency(latestNet, compact: true)),
                Summary("Total gross (FY)", Formatting.Currency(totalGross, compact: true)),
                Summary("Status", "Demonstration only"),
            ],
            Notice = "Payroll figures are fictional. No statutory compliance is claimed and no disbursement occurs.",
        };
    }

    private static ReportDefinitionDto BuildRecruitment(
        List<Department> departments,
        List<JobOpening> jobs,
        List<Candidate> candidates,
        List<Interview> interviews)
    {
        var rows = jobs.Select(job =>
        {
            var jobCandidates = candidates.Where(candidate => candidate.JobId == job.Id).ToList();
            return new Dictionary<string, object?>
            {
                ["job"] = job.Title,
                ["department"] = departments.FirstOrDefault(department => department.Id == job.DepartmentId)?.Name ?? "—",
                ["location"] = job.Location,
                ["openings"] = job.Openings,
                ["candidates"] = jobCandidates.Count,
                ["interviews"] = interviews.Count(interview => interview.JobId == job.Id),
                ["offers"] = jobCandidates.Count(candidate => candidate.Stage == "Offer"),
                ["hired"] = jobCandidates.Count(candidate => candidate.Stage == "Hired"),
                ["status"] = job.Status,
            };
        }).ToList();

        var openJobs = jobs.Where(job => job.Status == "Open").ToList();

        return new ReportDefinitionDto
        {
            Id = "recruitment",
            Title = "Recruitment Report",
            Description = "Open roles and candidate pipeline activity.",
            Columns =
            [
                Column("job", "Role"),
                Column("department", "Department"),
                Column("location", "Location"),
                Column("openings", "Openings", "right"),
                Column("candidates", "Candidates", "right"),
                Column("interviews", "Interviews", "right"),
                Column("offers", "Offers", "right"),
                Column("hired", "Hired", "right"),
                Column("status", "Status"),
            ],
            Rows = rows,
            Summary =
            [
                Summary("Open roles", openJobs.Count.ToString(CultureInfo.InvariantCulture)),
                Summary("Open positions", openJobs.Sum(job => job.Openings).ToString(CultureInfo.InvariantCulture)),
                Summary("Candidates", candidates.Count.ToString(CultureInfo.InvariantCulture)),
                Summary("Interviews scheduled",
                    interviews.Count(interview => interview.Status == "Scheduled").ToString(CultureInfo.InvariantCulture)),
            ],
            Notice = "Candidate records are fictional demonstration data.",
        };
    }

    private static DateOnly FiscalYearStart(DateOnly today) =>
        today.Month >= 4
            ? new DateOnly(today.Year, 4, 1)
            : new DateOnly(today.Year - 1, 4, 1);

    private static ReportColumnDto Column(string key, string label, string? align = null) =>
        new() { Key = key, Label = label, Align = align };

    private static Dictionary<string, string> Summary(string label, string value) =>
        new() { ["label"] = label, ["value"] = value };
}
