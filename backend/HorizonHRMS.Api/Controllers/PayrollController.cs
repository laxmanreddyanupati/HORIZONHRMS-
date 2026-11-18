using System.Globalization;
using System.Text;
using HorizonHRMS.Api.Contracts;
using HorizonHRMS.Api.Data;
using HorizonHRMS.Api.Infrastructure;
using HorizonHRMS.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HorizonHRMS.Api.Controllers;

[ApiController]
[Route("api/payroll")]
[Authorize]
public sealed class PayrollController(HrmsDbContext db, AuditService audit, DemoClock clock) : ControllerBase
{
    [HttpGet("runs")]
    [Authorize(Policy = Policies.PayrollStaff)]
    public async Task<ActionResult<List<PayrollRunDto>>> Runs(CancellationToken cancellationToken)
    {
        var runs = await db.PayrollRuns.AsNoTracking()
            .OrderByDescending(run => run.Year)
            .ThenByDescending(run => run.Month)
            .ToListAsync(cancellationToken);
        return Ok(runs.Select(run => run.ToDto()).ToList());
    }

    [HttpPost("runs")]
    [Authorize(Policy = Policies.PayrollManage)]
    public async Task<ActionResult<PayrollRunDto>> CreateRun(CreatePayrollRunRequest request, CancellationToken cancellationToken)
    {
        var start = new DateOnly(request.Year, request.Month, 1);
        var end = start.AddMonths(1).AddDays(-1);
        if (await RunExistsAsync())
            throw ApiException.Conflict("A payroll run already exists for this month.", "payroll_period_exists");

        var eligible = await (
            from employee in db.Employees.AsNoTracking()
            join structure in db.SalaryStructures.AsNoTracking() on employee.Id equals structure.EmployeeId
            where employee.Status != EmployeeStatuses.Inactive && employee.DateOfJoining <= end &&
                structure.EffectiveFrom <= end
            select new { employee.Id, employee.DateOfJoining, Structure = structure }
        ).ToListAsync(cancellationToken);

        if (eligible.Count == 0)
            throw ApiException.BadRequest("Add a salary structure effective by this month for at least one eligible employee.");

        var run = new PayrollRun
        {
            Id = FormattableString.Invariant($"PR-{start:yyyy-MM}"),
            Year = start.Year,
            Month = start.Month,
            PeriodLabel = start.ToString("MMMM yyyy", CultureInfo.InvariantCulture),
        };
        var workingDays = CountWeekdays(start, end);
        var slips = new List<Payslip>();
        foreach (var employee in eligible)
        {
            var paidFrom = new[] { start, employee.DateOfJoining, employee.Structure.EffectiveFrom }.Max();
            var paidDays = CountWeekdays(paidFrom, end);
            if (paidDays == 0) continue;

            var fraction = (decimal)paidDays / workingDays;
            var earnings = Prorate(employee.Structure.Earnings, fraction);
            var deductions = Prorate(employee.Structure.Deductions, fraction);
            var gross = earnings.Sum(component => component.Amount);
            var totalDeductions = deductions.Sum(component => component.Amount);
            slips.Add(new Payslip
            {
                Id = $"{run.Id}-{employee.Id}",
                PayrollRunId = run.Id,
                EmployeeId = employee.Id,
                Year = run.Year,
                Month = run.Month,
                Earnings = earnings,
                Deductions = deductions,
                Gross = gross,
                TotalDeductions = totalDeductions,
                Net = gross - totalDeductions,
                WorkingDays = workingDays,
                PaidDays = paidDays,
            });
        }
        if (slips.Count == 0)
            throw ApiException.BadRequest("No eligible employees have payable weekdays in this month.");

        run.EmployeeCount = slips.Count;
        run.GrossTotal = slips.Sum(slip => slip.Gross);
        run.DeductionsTotal = slips.Sum(slip => slip.TotalDeductions);
        run.NetTotal = slips.Sum(slip => slip.Net);
        db.PayrollRuns.Add(run);
        db.Payslips.AddRange(slips);
        audit.Record(User, HttpContext, "Created draft payroll run", "Payroll", run.Id);
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            if (await RunExistsAsync())
                throw ApiException.Conflict("A payroll run already exists for this month.", "payroll_period_exists");
            throw;
        }
        return CreatedAtAction(nameof(Run), new { runId = run.Id }, run.ToDto());

        Task<bool> RunExistsAsync() => db.PayrollRuns.AnyAsync(
            item => item.Year == request.Year && item.Month == request.Month, cancellationToken);
    }

    private static int CountWeekdays(DateOnly start, DateOnly end)
    {
        var count = 0;
        for (var date = start; date <= end; date = date.AddDays(1))
        {
            if (date.DayOfWeek is not (DayOfWeek.Saturday or DayOfWeek.Sunday)) count++;
        }
        return count;
    }

    private static List<SalaryComponent> Prorate(List<SalaryComponent> components, decimal fraction)
    {
        var monthlyTotal = 0m;
        var roundedTotal = 0m;
        var result = new List<SalaryComponent>(components.Count);
        foreach (var component in components)
        {
            monthlyTotal += component.Amount;
            var nextTotal = decimal.Round(monthlyTotal * fraction, 2, MidpointRounding.AwayFromZero);
            result.Add(new SalaryComponent
            {
                Id = component.Id,
                Name = component.Name,
                Type = component.Type,
                Statutory = component.Statutory,
                Amount = nextTotal - roundedTotal,
            });
            roundedTotal = nextTotal;
        }
        return result;
    }

    [HttpGet("runs/{runId}")]
    [Authorize(Policy = Policies.PayrollStaff)]
    public async Task<ActionResult<PayrollRunDto>> Run(string runId, CancellationToken cancellationToken)
    {
        var run = await db.PayrollRuns.AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == runId, cancellationToken)
            ?? throw ApiException.NotFound("Payroll run not found.");
        return Ok(run.ToDto());
    }

    [HttpGet("runs/{runId}/payslips")]
    [Authorize(Policy = Policies.PayrollStaff)]
    public async Task<ActionResult<List<PayslipDto>>> Payslips(string runId, CancellationToken cancellationToken)
    {
        if (!await db.PayrollRuns.AnyAsync(run => run.Id == runId, cancellationToken))
        {
            throw ApiException.NotFound("Payroll run not found.");
        }

        var payslips = await db.Payslips.AsNoTracking()
            .Where(slip => slip.PayrollRunId == runId)
            .OrderBy(slip => slip.EmployeeId)
            .ToListAsync(cancellationToken);
        return Ok(payslips.Select(slip => slip.ToDto()).ToList());
    }

    [HttpGet("runs/{runId}/payslips/{employeeId}")]
    public async Task<ActionResult<PayslipDto>> Payslip(string runId, string employeeId, CancellationToken cancellationToken)
    {
        await AccessScope.EnsureCanSeeEmployeeAsync(db, User, employeeId, cancellationToken);
        if (!User.IsPayrollStaff() && User.GetEmployeeId() != employeeId)
        {
            throw ApiException.Forbidden("Employees can only view their own payslips.");
        }

        var payslip = await db.Payslips.AsNoTracking()
            .FirstOrDefaultAsync(slip => slip.EmployeeId == employeeId && slip.PayrollRunId == runId, cancellationToken)
            ?? throw ApiException.NotFound("Payslip not found.");
        return Ok(payslip.ToDto());
    }

    [HttpGet("employees/{employeeId}/payslips")]
    public async Task<ActionResult<List<PayslipDto>>> EmployeePayslips(string employeeId, CancellationToken cancellationToken)
    {
        await AccessScope.EnsureCanSeeEmployeeAsync(db, User, employeeId, cancellationToken);
        if (!User.IsPayrollStaff() && User.GetEmployeeId() != employeeId)
        {
            throw ApiException.Forbidden("Employees can only view their own payslips.");
        }

        var payslips = await db.Payslips.AsNoTracking()
            .Where(slip => slip.EmployeeId == employeeId)
            .OrderByDescending(slip => slip.Year)
            .ThenByDescending(slip => slip.Month)
            .ToListAsync(cancellationToken);
        return Ok(payslips.Select(slip => slip.ToDto()).ToList());
    }

    [HttpGet("salary-structures")]
    [Authorize(Policy = Policies.PayrollStaff)]
    public async Task<ActionResult<List<SalaryStructureDto>>> SalaryStructures(CancellationToken cancellationToken)
    {
        var structures = await db.SalaryStructures.AsNoTracking().OrderBy(item => item.EmployeeId).ToListAsync(cancellationToken);
        return Ok(structures.Select(item => item.ToDto()).ToList());
    }

    [HttpGet("salary-structures/{employeeId}")]
    public async Task<ActionResult<SalaryStructureDto>> SalaryStructure(string employeeId, CancellationToken cancellationToken)
    {
        await AccessScope.EnsureCanSeeEmployeeAsync(db, User, employeeId, cancellationToken);
        if (!User.IsPayrollStaff() && User.GetEmployeeId() != employeeId)
        {
            throw ApiException.Forbidden("Employees can only view their own salary structure.");
        }

        var structure = await db.SalaryStructures.AsNoTracking()
            .FirstOrDefaultAsync(item => item.EmployeeId == employeeId, cancellationToken)
            ?? throw ApiException.NotFound("Salary structure not found.");
        return Ok(structure.ToDto());
    }

    [HttpPut("salary-structures/{employeeId}")]
    [Authorize(Policy = Policies.PayrollManage)]
    public async Task<ActionResult<SalaryStructureDto>> SaveSalaryStructure(
        string employeeId, SaveSalaryStructureRequest request, CancellationToken cancellationToken)
    {
        if (!await db.Employees.AnyAsync(employee => employee.Id == employeeId, cancellationToken))
            throw ApiException.NotFound("Employee not found.");

        if (request.EffectiveFrom == default || request.AnnualCtc <= 0 || request.AnnualCtc > 120_000_000m ||
            request.Earnings.Concat(request.Deductions).Any(component => component is null ||
                string.IsNullOrWhiteSpace(component.Name) || component.Name.Length > 100 ||
                component.Amount < 0 || component.Amount > 10_000_000m ||
                decimal.Round(component.Amount, 2) != component.Amount))
            throw ApiException.BadRequest("Enter an effective date, annual CTC, and valid monthly component names and amounts.");

        var gross = request.Earnings.Sum(component => component.Amount);
        if (gross <= 0 || request.Deductions.Sum(component => component.Amount) > gross)
            throw ApiException.BadRequest("Monthly gross must be positive and deductions cannot exceed gross.");

        var structure = await db.SalaryStructures.FindAsync([employeeId], cancellationToken);
        var isNew = structure is null;
        if (structure is null)
        {
            structure = new SalaryStructure { EmployeeId = employeeId };
            db.SalaryStructures.Add(structure);
        }
        structure.EffectiveFrom = request.EffectiveFrom;
        structure.AnnualCtc = decimal.Round(request.AnnualCtc, 2);
        structure.Earnings = ToComponents(request.Earnings, "earning");
        structure.Deductions = ToComponents(request.Deductions, "deduction");
        audit.Record(User, HttpContext, "Saved salary structure", "Payroll", employeeId);
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException) when (isNew)
        {
            if (await db.SalaryStructures.AnyAsync(item => item.EmployeeId == employeeId, cancellationToken))
                throw ApiException.Conflict("A salary structure was just added for this employee. Reload and edit it.");
            throw;
        }
        return Ok(structure.ToDto());
    }

    private static List<SalaryComponent> ToComponents(List<SalaryComponentDto> values, string type) =>
        values.Select((component, index) => new SalaryComponent
        {
            Id = $"{type}-{index + 1}",
            Name = component.Name.Trim(),
            Type = type,
            Amount = component.Amount,
            Statutory = component.Statutory,
        }).ToList();

    [HttpPost("runs/{runId}/process")]
    [Authorize(Policy = Policies.PayrollStaff)]
    public async Task<ActionResult<PayrollRunDto>> Process(string runId, CancellationToken cancellationToken)
    {
        var run = await db.PayrollRuns.FirstOrDefaultAsync(item => item.Id == runId, cancellationToken)
            ?? throw ApiException.NotFound("Payroll run not found.");
        if (run.Status == PayrollStatuses.Paid)
        {
            throw ApiException.Conflict("This payroll run has already been paid.", "payroll_already_paid");
        }

        run.Status = PayrollStatuses.Processed;
        run.ProcessedOn = clock.Today;

        var payslips = await db.Payslips.Where(slip => slip.PayrollRunId == runId).ToListAsync(cancellationToken);
        foreach (var slip in payslips)
        {
            slip.Status = PayrollStatuses.Processed;
        }

        audit.Record(User, HttpContext, "Processed payroll run", "Payroll", $"{run.PeriodLabel} ({run.Id})");
        await db.SaveChangesAsync(cancellationToken);
        return Ok(run.ToDto());
    }

    [HttpPost("runs/{runId}/pay")]
    [Authorize(Policy = Policies.PayrollStaff)]
    public async Task<ActionResult<PayrollRunDto>> MarkPaid(string runId, CancellationToken cancellationToken)
    {
        var run = await db.PayrollRuns.FirstOrDefaultAsync(item => item.Id == runId, cancellationToken)
            ?? throw ApiException.NotFound("Payroll run not found.");
        if (run.Status != PayrollStatuses.Processed)
        {
            throw ApiException.Conflict("Process the payroll run before marking it paid.", "payroll_not_processed");
        }

        run.Status = PayrollStatuses.Paid;

        var payslips = await db.Payslips.Where(slip => slip.PayrollRunId == runId).ToListAsync(cancellationToken);
        foreach (var slip in payslips)
        {
            slip.Status = PayrollStatuses.Paid;
        }

        audit.Record(User, HttpContext, "Marked payroll run paid", "Payroll", $"{run.PeriodLabel} ({run.Id})");
        await db.SaveChangesAsync(cancellationToken);
        return Ok(run.ToDto());
    }

    [HttpGet("dashboard")]
    [Authorize(Policy = Policies.PayrollStaff)]
    public async Task<ActionResult<object>> Dashboard(CancellationToken cancellationToken)
    {
        var runs = await db.PayrollRuns.AsNoTracking()
            .OrderByDescending(run => run.Year)
            .ThenByDescending(run => run.Month)
            .ToListAsync(cancellationToken);
        var currentRun = runs.FirstOrDefault();
        var activeCount = await db.Employees.CountAsync(employee => employee.Status != EmployeeStatuses.Inactive, cancellationToken);
        var statutory = await db.StatutorySettings.AsNoTracking().FirstOrDefaultAsync(cancellationToken);
        var paidRuns = runs.Where(run => run.Status == PayrollStatuses.Paid).ToList();

        return Ok(new
        {
            currentRun = currentRun?.ToDto(),
            runs = runs.Select(run => run.ToDto()).ToList(),
            activeCount,
            statutoryConfig = statutory?.ToDto(),
            ytdGross = paidRuns.Sum(run => run.GrossTotal),
            ytdNet = paidRuns.Sum(run => run.NetTotal),
            pendingRuns = runs.Count(run => run.Status is PayrollStatuses.Draft or PayrollStatuses.Processing),
        });
    }

    [HttpGet("payslips/{employeeId}/{runId}/download")]
    public async Task<IActionResult> DownloadPayslip(string employeeId, string runId, CancellationToken cancellationToken)
    {
        await AccessScope.EnsureCanSeeEmployeeAsync(db, User, employeeId, cancellationToken);
        if (!User.IsPayrollStaff() && User.GetEmployeeId() != employeeId)
        {
            throw ApiException.Forbidden("Employees can only download their own payslips.");
        }

        var payslip = await db.Payslips.AsNoTracking()
            .FirstOrDefaultAsync(slip => slip.EmployeeId == employeeId && slip.PayrollRunId == runId, cancellationToken)
            ?? throw ApiException.NotFound("Payslip not found.");
        var employee = await db.Employees.AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == employeeId, cancellationToken)
            ?? throw ApiException.NotFound("Employee not found.");
        var run = await db.PayrollRuns.AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == runId, cancellationToken)
            ?? throw ApiException.NotFound("Payroll run not found.");

        var builder = new StringBuilder();
        builder.AppendLine("HORIZON TECHNOLOGIES PVT. LTD. - DEMONSTRATION PAYSLIP");
        builder.AppendLine("This document is fictional and generated for product demonstration only.");
        builder.AppendLine();
        builder.AppendLine($"Employee: {employee.FirstName} {employee.LastName} ({employee.Id})");
        builder.AppendLine($"Pay period: {run.PeriodLabel}");
        builder.AppendLine($"Payslip ID: {payslip.Id}");
        builder.AppendLine($"Paid days: {payslip.PaidDays} / {payslip.WorkingDays}");
        builder.AppendLine();
        builder.AppendLine("EARNINGS");
        foreach (var item in payslip.Earnings)
        {
            builder.AppendLine($"{item.Name}: {item.Amount:N2}");
        }
        builder.AppendLine($"Gross earnings: {payslip.Gross:N2}");
        builder.AppendLine();
        builder.AppendLine("DEDUCTIONS (illustrative demo values)");
        foreach (var item in payslip.Deductions)
        {
            builder.AppendLine($"{item.Name}: {item.Amount:N2}");
        }
        builder.AppendLine($"Total deductions: {payslip.TotalDeductions:N2}");
        builder.AppendLine();
        builder.AppendLine($"Net pay (demo): {payslip.Net:N2}");
        builder.AppendLine();
        builder.AppendLine("Statutory rates in this demo are illustrative and not current legal rates.");
        builder.AppendLine("No real salary disbursement has taken place.");

        return File(Encoding.UTF8.GetBytes(builder.ToString()), "text/plain; charset=utf-8",
            $"Horizon-Payslip-{employee.Id}-{run.Id}.txt");
    }
}
