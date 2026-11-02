using HorizonHRMS.Api.Contracts;
using HorizonHRMS.Api.Data;
using HorizonHRMS.Api.Infrastructure;
using HorizonHRMS.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HorizonHRMS.Api.Controllers;

[ApiController]
[Route("api/expenses")]
[Authorize]
public sealed class ExpensesController(HrmsDbContext db, AuditService audit, DemoClock clock) : ControllerBase
{
    [HttpGet("categories")]
    public async Task<ActionResult<List<ExpenseCategoryDto>>> Categories(CancellationToken cancellationToken)
    {
        var categories = await db.ExpenseCategories.AsNoTracking()
            .OrderBy(category => category.Name)
            .ToListAsync(cancellationToken);
        return Ok(categories.Select(category => category.ToDto()).ToList());
    }

    [HttpGet]
    public async Task<ActionResult<List<ExpenseClaimDto>>> Claims(
        [FromQuery] string? status,
        [FromQuery] string? employeeId,
        [FromQuery] string? managerId,
        [FromQuery] string? categoryId,
        [FromQuery] string? search,
        CancellationToken cancellationToken)
    {
        var query = db.ExpenseClaims.AsNoTracking().AsQueryable();

        var visible = await AccessScope.VisibleEmployeeIdsAsync(db, User, cancellationToken);
        if (visible is not null)
        {
            query = query.Where(claim => visible.Contains(claim.EmployeeId));
        }

        if (!string.IsNullOrWhiteSpace(status) && status != "all")
        {
            query = query.Where(claim => claim.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(employeeId))
        {
            query = query.Where(claim => claim.EmployeeId == employeeId);
        }

        if (!string.IsNullOrWhiteSpace(categoryId) && categoryId != "all")
        {
            query = query.Where(claim => claim.CategoryId == categoryId);
        }

        var claims = await query
            .OrderByDescending(claim => claim.SubmittedOn)
            .ThenByDescending(claim => claim.Id)
            .ToListAsync(cancellationToken);

        if (!string.IsNullOrWhiteSpace(managerId))
        {
            var reportIds = await db.Employees.AsNoTracking()
                .Where(employee => employee.ManagerId == managerId)
                .Select(employee => employee.Id)
                .ToListAsync(cancellationToken);
            var team = reportIds.ToHashSet(StringComparer.Ordinal);
            claims = claims.Where(claim => team.Contains(claim.EmployeeId)).ToList();
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            claims = claims.Where(claim =>
                claim.Title.ToLowerInvariant().Contains(term) ||
                claim.Description.ToLowerInvariant().Contains(term) ||
                claim.Id.ToLowerInvariant().Contains(term)).ToList();
        }

        return Ok(claims.Select(claim => claim.ToDto()).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<ExpenseClaimDto>> Create(ExpenseRequest request, CancellationToken cancellationToken)
    {
        var employeeId = AccessScope.RequireEmployeeId(User, request.EmployeeId);
        var employeeExists = await db.Employees.AnyAsync(employee => employee.Id == employeeId, cancellationToken);
        if (!employeeExists)
        {
            throw ApiException.BadRequest("Please choose a valid employee.", "invalid_employee");
        }

        var category = await db.ExpenseCategories.AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == request.CategoryId, cancellationToken)
            ?? throw ApiException.BadRequest("Please choose a valid expense category.", "invalid_category");

        if (request.Date > clock.Today)
        {
            throw ApiException.BadRequest("Expense date cannot be in the future.", "invalid_expense_date");
        }

        if (category.Limit > 0 && request.Amount > category.Limit)
        {
            throw ApiException.BadRequest(
                $"The {category.Name} limit is {category.Limit:0.#}. Reduce the claim or choose another category.",
                "category_limit_exceeded");
        }

        var ids = await db.ExpenseClaims.AsNoTracking().Select(claim => claim.Id).ToListAsync(cancellationToken);
        var max = ids
            .Select(id => int.TryParse(id.Replace("EXP-", string.Empty), out var value) ? value : 0)
            .DefaultIfEmpty(5000)
            .Max();

        var claim = new ExpenseClaim
        {
            Id = $"EXP-{max + 1}",
            EmployeeId = employeeId,
            CategoryId = category.Id,
            Title = request.Title.Trim(),
            Amount = request.Amount,
            Date = request.Date,
            SubmittedOn = clock.Today,
            Status = ExpenseStatuses.Pending,
            Description = request.Description.Trim(),
            ReceiptName = string.IsNullOrWhiteSpace(request.ReceiptName) ? null : request.ReceiptName.Trim(),
        };

        db.ExpenseClaims.Add(claim);
        audit.Record(User, HttpContext, "Submitted expense claim", "Expenses", $"{claim.Id} · {claim.Title} ({claim.Amount:0.00})");
        await db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(Claims), null, claim.ToDto());
    }

    [HttpPost("{id}/decision")]
    [Authorize(Policy = Policies.Operations)]
    public async Task<ActionResult<ExpenseClaimDto>> Decide(string id, DecisionRequest request, CancellationToken cancellationToken)
    {
        if (request.Status is not (ExpenseStatuses.Approved or ExpenseStatuses.Rejected))
        {
            throw ApiException.BadRequest("Decision must be Approved or Rejected.", "invalid_decision");
        }

        var claim = await db.ExpenseClaims.FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw ApiException.NotFound("Expense claim not found.");

        if (claim.Status != ExpenseStatuses.Pending)
        {
            throw ApiException.Conflict("This claim has already been reviewed.", "already_decided");
        }

        claim.Status = request.Status;
        claim.ApprovedBy = User.GetEmployeeId() ?? User.GetUserId();

        audit.Record(User, HttpContext, $"{request.Status} expense claim", "Expenses", $"{claim.Id} · {claim.Title}");
        await db.SaveChangesAsync(cancellationToken);
        return Ok(claim.ToDto());
    }

    [HttpPost("{id}/reimburse")]
    [Authorize(Policy = Policies.Operations)]
    public async Task<ActionResult<ExpenseClaimDto>> Reimburse(string id, CancellationToken cancellationToken)
    {
        var claim = await db.ExpenseClaims.FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw ApiException.NotFound("Expense claim not found.");

        if (claim.Status != ExpenseStatuses.Approved)
        {
            throw ApiException.Conflict("Only approved claims can be marked reimbursed.", "not_reimbursable");
        }

        claim.Status = ExpenseStatuses.Reimbursed;
        claim.ReimbursedOn = clock.Today;

        audit.Record(User, HttpContext, "Marked expense reimbursed", "Expenses", $"{claim.Id} · {claim.Title}");
        await db.SaveChangesAsync(cancellationToken);
        return Ok(claim.ToDto());
    }

    [HttpGet("summary")]
    public async Task<ActionResult<ExpenseSummaryDto>> Summary(CancellationToken cancellationToken)
    {
        var query = db.ExpenseClaims.AsNoTracking().AsQueryable();
        var visible = await AccessScope.VisibleEmployeeIdsAsync(db, User, cancellationToken);
        if (visible is not null)
        {
            query = query.Where(claim => visible.Contains(claim.EmployeeId));
        }

        var claims = await query.ToListAsync(cancellationToken);
        var pending = claims.Where(claim => claim.Status == ExpenseStatuses.Pending).ToList();

        return Ok(new ExpenseSummaryDto
        {
            TotalClaims = claims.Count,
            TotalAmount = claims.Sum(claim => claim.Amount),
            PendingCount = pending.Count,
            PendingAmount = pending.Sum(claim => claim.Amount),
            ApprovedAmount = claims.Where(claim => claim.Status == ExpenseStatuses.Approved).Sum(claim => claim.Amount),
            ReimbursedAmount = claims.Where(claim => claim.Status == ExpenseStatuses.Reimbursed).Sum(claim => claim.Amount),
        });
    }
}
