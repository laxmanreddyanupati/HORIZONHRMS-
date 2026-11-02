using HorizonHRMS.Api.Contracts;
using HorizonHRMS.Api.Data;
using HorizonHRMS.Api.Infrastructure;
using HorizonHRMS.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HorizonHRMS.Api.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize]
public sealed class DashboardController(HrmsDbContext db, DemoClock clock) : ControllerBase
{
    [HttpGet("overview")]
    public async Task<ActionResult<DashboardOverviewDto>> Overview(CancellationToken cancellationToken)
    {
        var today = clock.Today;
        var employees = await db.Employees.AsNoTracking().ToListAsync(cancellationToken);
        var departments = SeedOrder.OrderBySeed(
            await db.Departments.AsNoTracking().ToListAsync(cancellationToken),
            department => department.Id,
            SeedOrder.DepartmentIds);
        var attendance = await db.AttendanceRecords.AsNoTracking().ToListAsync(cancellationToken);
        var leaveRequests = await db.LeaveRequests.AsNoTracking().ToListAsync(cancellationToken);
        var payrollRuns = await db.PayrollRuns.AsNoTracking()
            .OrderBy(run => run.Year)
            .ThenBy(run => run.Month)
            .ToListAsync(cancellationToken);
        var jobs = await db.JobOpenings.AsNoTracking().ToListAsync(cancellationToken);
        var expenses = await db.ExpenseClaims.AsNoTracking().ToListAsync(cancellationToken);
        var holidays = await db.Holidays.AsNoTracking().OrderBy(holiday => holiday.Date).ToListAsync(cancellationToken);
        var activities = await db.AuditLogs.AsNoTracking()
            .OrderByDescending(log => log.Timestamp)
            .Take(6)
            .ToListAsync(cancellationToken);

        var activeEmployees = employees.Where(employee => employee.Status != EmployeeStatuses.Inactive).ToList();
        var todayRecords = attendance.Where(record => record.Date == today).ToList();
        var present = todayRecords.Count(record => record.Status == AttendanceStatuses.Present);
        var late = todayRecords.Count(record => record.Status == AttendanceStatuses.Late);
        var halfDay = todayRecords.Count(record => record.Status == AttendanceStatuses.HalfDay);
        var onLeave = todayRecords.Count(record => record.Status == AttendanceStatuses.OnLeave);
        var totalActive = activeEmployees.Count;
        var attendanceRate = totalActive == 0
            ? 0
            : Math.Round((present + late + halfDay) / (decimal)totalActive * 100, 1, MidpointRounding.AwayFromZero);

        var currentRun = payrollRuns.LastOrDefault();
        var openJobs = jobs.Where(job => job.Status == "Open").ToList();

        return Ok(new DashboardOverviewDto
        {
            Snapshot = today.ToString("yyyy-MM-dd"),
            Stats = new DashboardStatsDto
            {
                TotalEmployees = employees.Count,
                ActiveEmployees = totalActive,
                PresentToday = present + late,
                OnLeaveToday = onLeave,
                PendingLeaveRequests = leaveRequests.Count(request => request.Status == LeaveStatuses.Pending),
                NewHiresThisMonth = employees.Count(employee =>
                    employee.DateOfJoining.Year == today.Year && employee.DateOfJoining.Month == today.Month),
                AttritionRate = 3.1m,
                OpenPositions = openJobs.Sum(job => job.Openings),
                AttendanceRate = attendanceRate,
                PayrollMonthLabel = currentRun?.PeriodLabel ?? string.Empty,
                MonthlyPayroll = currentRun?.NetTotal ?? 0,
            },
            Growth = BuildGrowth(employees, today),
            Departments = BuildDepartments(departments, employees),
            Attendance = BuildAttendanceTrend(attendance, holidays, today),
            Payroll = payrollRuns.Select(run => new DashboardPayrollPointDto
            {
                Month = Formatting.MonthShort(run.Month),
                Gross = Math.Round(run.GrossTotal / 100_000m, 0, MidpointRounding.AwayFromZero),
                Net = Math.Round(run.NetTotal / 100_000m, 0, MidpointRounding.AwayFromZero),
                Deductions = Math.Round(run.DeductionsTotal / 100_000m, 0, MidpointRounding.AwayFromZero),
            }).ToList(),
            CurrentRun = currentRun?.ToDto(),
            Birthdays = BuildEvents(employees, employee => employee.DateOfBirth, today, 45, 4, withYears: false),
            Anniversaries = BuildEvents(
                activeEmployees, employee => employee.DateOfJoining, today, 60, 4, withYears: true),
            Activities = activities.Select(log => log.ToDto()).ToList(),
            UpcomingHolidays = holidays
                .Where(holiday => holiday.Date >= today)
                .Take(3)
                .Select(holiday => holiday.ToDto())
                .ToList(),
            PendingExpenses = expenses.Count(claim => claim.Status == ExpenseStatuses.Pending),
            OpenRoles = openJobs.Count,
        });
    }

    private static List<DashboardGrowthPointDto> BuildGrowth(List<Employee> employees, DateOnly today)
    {
        var monthStart = new DateOnly(today.Year, today.Month, 1);
        var points = new List<DashboardGrowthPointDto>();
        for (var offset = 11; offset >= 0; offset--)
        {
            var month = monthStart.AddMonths(-offset);
            var cutoff = month.AddMonths(1).AddDays(-1);
            points.Add(new DashboardGrowthPointDto
            {
                Month = Formatting.MonthShort(month.Month),
                Headcount = employees.Count(employee =>
                    employee.DateOfJoining <= cutoff && employee.Status != EmployeeStatuses.Inactive),
            });
        }

        return points;
    }

    private static List<DashboardDepartmentDto> BuildDepartments(List<Department> departments, List<Employee> employees)
    {
        return departments
            .Select((department, index) => new DashboardDepartmentDto
            {
                Name = department.Name,
                Value = employees.Count(employee => employee.DepartmentId == department.Id),
                Color = SeedOrder.ChartColors[index % SeedOrder.ChartColors.Length],
            })
            .Where(item => item.Value > 0)
            .OrderByDescending(item => item.Value)
            .ToList();
    }

    private static List<DashboardAttendancePointDto> BuildAttendanceTrend(
        List<AttendanceRecord> records, List<Holiday> holidays, DateOnly today)
    {
        var holidayDates = holidays.Select(holiday => holiday.Date).ToHashSet();
        var byDate = records
            .GroupBy(record => record.Date)
            .ToDictionary(group => group.Key, group => group.ToList());

        var points = new List<DashboardAttendancePointDto>();
        var cursor = today;
        while (points.Count < 7)
        {
            var isWeekend = cursor.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday;
            if (!isWeekend && !holidayDates.Contains(cursor))
            {
                var dayRecords = byDate.GetValueOrDefault(cursor) ?? [];
                points.Add(new DashboardAttendancePointDto
                {
                    Day = Formatting.DayShort(cursor),
                    Date = cursor.ToString("yyyy-MM-dd"),
                    Present = dayRecords.Count(record =>
                        record.Status is AttendanceStatuses.Present or AttendanceStatuses.Late or AttendanceStatuses.HalfDay),
                    Absent = dayRecords.Count(record => record.Status == AttendanceStatuses.Absent),
                    OnLeave = dayRecords.Count(record => record.Status == AttendanceStatuses.OnLeave),
                });
            }

            cursor = cursor.AddDays(-1);
        }

        points.Reverse();
        return points;
    }

    private static List<DashboardEventDto> BuildEvents(
        List<Employee> employees,
        Func<Employee, DateOnly> dateSelector,
        DateOnly today,
        int maxDaysAway,
        int limit,
        bool withYears)
    {
        var events = new List<DashboardEventDto>();

        foreach (var employee in employees)
        {
            var original = dateSelector(employee);
            var next = new DateOnly(today.Year, original.Month, original.Day);
            if (next < today)
            {
                next = new DateOnly(today.Year + 1, original.Month, original.Day);
            }

            var daysAway = next.DayNumber - today.DayNumber;
            if (daysAway > maxDaysAway)
            {
                continue;
            }

            var years = next.Year - original.Year;
            if (withYears && years < 1)
            {
                continue;
            }

            events.Add(new DashboardEventDto
            {
                Employee = employee.ToDto(),
                Date = next.ToString("yyyy-MM-dd"),
                DaysAway = daysAway,
                Years = withYears ? years : null,
            });
        }

        return events
            .OrderBy(item => item.DaysAway)
            .ThenBy(item => item.Employee.Id, StringComparer.Ordinal)
            .Take(limit)
            .ToList();
    }
}
