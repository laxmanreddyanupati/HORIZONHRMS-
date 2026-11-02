using HorizonHRMS.Api.Contracts;
using HorizonHRMS.Api.Data;
using HorizonHRMS.Api.Infrastructure;
using HorizonHRMS.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HorizonHRMS.Api.Controllers;

[ApiController]
[Route("api/leave")]
[Authorize]
public sealed class LeaveController(HrmsDbContext db, AuditService audit, DemoClock clock) : ControllerBase
{
    private const string UnpaidLeaveTypeId = "lt-unpaid";

    [HttpGet("types")]
    public async Task<ActionResult<List<LeaveTypeDto>>> Types(CancellationToken cancellationToken)
    {
        var types = SeedOrder.OrderBySeed(
            await db.LeaveTypes.AsNoTracking().ToListAsync(cancellationToken),
            type => type.Id,
            SeedOrder.LeaveTypeIds);
        return Ok(types.Select(type => type.ToDto()).ToList());
    }

    [HttpGet("policies")]
    public async Task<ActionResult<List<LeavePolicyDto>>> GetPolicies(CancellationToken cancellationToken)
    {
        var policies = SeedOrder.OrderBySeed(
            await db.LeavePolicies.AsNoTracking().ToListAsync(cancellationToken),
            policy => policy.LeaveTypeId,
            SeedOrder.LeaveTypeIds);
        return Ok(policies.Select(policy => policy.ToDto()).ToList());
    }

    [HttpGet("requests")]
    public async Task<ActionResult<List<LeaveRequestDto>>> Requests(
        [FromQuery] string? status,
        [FromQuery] string? employeeId,
        [FromQuery] string? managerId,
        [FromQuery] string? leaveTypeId,
        [FromQuery] string? search,
        CancellationToken cancellationToken)
    {
        var query = db.LeaveRequests.AsNoTracking().AsQueryable();

        var visible = await AccessScope.VisibleEmployeeIdsAsync(db, User, cancellationToken);
        if (visible is not null)
        {
            query = query.Where(request => visible.Contains(request.EmployeeId));
        }

        if (!string.IsNullOrWhiteSpace(status) && status != "all")
        {
            query = query.Where(request => request.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(employeeId))
        {
            query = query.Where(request => request.EmployeeId == employeeId);
        }

        if (!string.IsNullOrWhiteSpace(leaveTypeId) && leaveTypeId != "all")
        {
            query = query.Where(request => request.LeaveTypeId == leaveTypeId);
        }

        var requests = await query.OrderByDescending(request => request.AppliedOn).ToListAsync(cancellationToken);

        if (!string.IsNullOrWhiteSpace(managerId))
        {
            var reportIds = await db.Employees.AsNoTracking()
                .Where(employee => employee.ManagerId == managerId)
                .Select(employee => employee.Id)
                .ToListAsync(cancellationToken);
            var managerTeam = reportIds.ToHashSet(StringComparer.Ordinal);
            requests = requests.Where(request => managerTeam.Contains(request.EmployeeId)).ToList();
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            var employees = await db.Employees.AsNoTracking()
                .Select(employee => new { employee.Id, employee.FirstName, employee.LastName })
                .ToDictionaryAsync(employee => employee.Id, cancellationToken);
            var types = await db.LeaveTypes.AsNoTracking()
                .Select(type => new { type.Id, type.Name })
                .ToDictionaryAsync(type => type.Id, type => type.Name, cancellationToken);

            requests = requests.Where(request =>
            {
                var employee = employees.GetValueOrDefault(request.EmployeeId);
                var name = employee is null ? string.Empty : $"{employee.FirstName} {employee.LastName}".ToLowerInvariant();
                var typeName = types.GetValueOrDefault(request.LeaveTypeId)?.ToLowerInvariant() ?? string.Empty;
                return name.Contains(term) ||
                       request.EmployeeId.ToLowerInvariant().Contains(term) ||
                       typeName.Contains(term) ||
                       request.Reason.ToLowerInvariant().Contains(term);
            }).ToList();
        }

        return Ok(requests.Select(request => request.ToDto()).ToList());
    }

    [HttpGet("balances/{employeeId}")]
    public async Task<ActionResult<List<LeaveBalanceDto>>> Balances(string employeeId, CancellationToken cancellationToken)
    {
        await AccessScope.EnsureCanSeeEmployeeAsync(db, User, employeeId, cancellationToken);
        var balances = await db.LeaveBalances.AsNoTracking()
            .Where(balance => balance.EmployeeId == employeeId)
            .ToListAsync(cancellationToken);
        return Ok(SeedOrder.OrderBySeed(balances, balance => balance.LeaveTypeId, SeedOrder.LeaveTypeIds)
            .Select(balance => balance.ToDto())
            .ToList());
    }

    [HttpGet("balances")]
    public async Task<ActionResult<List<LeaveBalanceDto>>> AllBalances(CancellationToken cancellationToken)
    {
        var query = db.LeaveBalances.AsNoTracking().AsQueryable();
        var visible = await AccessScope.VisibleEmployeeIdsAsync(db, User, cancellationToken);
        if (visible is not null)
        {
            query = query.Where(balance => visible.Contains(balance.EmployeeId));
        }

        var balances = await query.ToListAsync(cancellationToken);
        var leaveTypeRank = SeedOrder.LeaveTypeIds
            .Select((id, index) => new { id, index })
            .ToDictionary(item => item.id, item => item.index, StringComparer.Ordinal);

        return Ok(balances
            .OrderBy(balance => balance.EmployeeId, StringComparer.Ordinal)
            .ThenBy(balance => leaveTypeRank.GetValueOrDefault(balance.LeaveTypeId, int.MaxValue))
            .Select(balance => balance.ToDto())
            .ToList());
    }

    [HttpPost("requests")]
    public async Task<ActionResult<LeaveRequestDto>> Apply(LeaveApplicationRequest request, CancellationToken cancellationToken)
    {
        var employeeId = AccessScope.RequireEmployeeId(User, request.EmployeeId);
        await AccessScope.EnsureCanSeeEmployeeAsync(db, User, employeeId, cancellationToken);

        if (request.ToDate < request.FromDate)
        {
            throw ApiException.BadRequest("End date cannot be before the start date.", "invalid_date_range");
        }

        var type = await db.LeaveTypes.AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == request.LeaveTypeId, cancellationToken)
            ?? throw ApiException.BadRequest("Please choose a valid leave type.", "invalid_leave_type");

        var days = request.ToDate.DayNumber - request.FromDate.DayNumber + 1;
        if (days <= 0)
        {
            throw ApiException.BadRequest("The leave period must include at least one day.", "invalid_date_range");
        }

        var overlapping = await db.LeaveRequests.AsNoTracking().AnyAsync(
            existing => existing.EmployeeId == employeeId &&
                        (existing.Status == LeaveStatuses.Approved || existing.Status == LeaveStatuses.Pending) &&
                        existing.FromDate <= request.ToDate &&
                        existing.ToDate >= request.FromDate,
            cancellationToken);
        if (overlapping)
        {
            throw ApiException.Conflict(
                "This request overlaps an existing pending or approved leave request.",
                "overlapping_leave");
        }

        LeaveBalance? balance = null;
        if (type.Id != UnpaidLeaveTypeId)
        {
            balance = await db.LeaveBalances
                .FirstOrDefaultAsync(item => item.EmployeeId == employeeId && item.LeaveTypeId == type.Id, cancellationToken);
            if (balance is not null)
            {
                var available = balance.Allocated - balance.Used - balance.Pending;
                if (days > available)
                {
                    throw ApiException.BadRequest(
                        $"Insufficient {type.Name} balance. Available: {available:0.#} day(s).",
                        "insufficient_leave_balance");
                }
            }
        }

        var ids = await db.LeaveRequests.AsNoTracking().Select(item => item.Id).ToListAsync(cancellationToken);
        var max = ids
            .Select(id => int.TryParse(id.Replace("LV-", string.Empty), out var value) ? value : 0)
            .DefaultIfEmpty(1000)
            .Max();

        var leaveRequest = new LeaveRequest
        {
            Id = $"LV-{max + 1}",
            EmployeeId = employeeId,
            LeaveTypeId = type.Id,
            FromDate = request.FromDate,
            ToDate = request.ToDate,
            Days = days,
            Reason = request.Reason.Trim(),
            AppliedOn = clock.Today,
            Status = LeaveStatuses.Pending,
        };

        db.LeaveRequests.Add(leaveRequest);
        if (balance is not null)
        {
            balance.Pending += days;
        }

        audit.Record(User, HttpContext, "Applied for leave", "Leave", $"{employeeId}: {type.Name} {request.FromDate:yyyy-MM-dd} to {request.ToDate:yyyy-MM-dd}");
        await db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(Requests), null, leaveRequest.ToDto());
    }

    [HttpPost("requests/{id}/decision")]
    [Authorize(Policy = Policies.HrStaff)]
    public async Task<ActionResult<LeaveRequestDto>> Decide(string id, DecisionRequest request, CancellationToken cancellationToken)
    {
        if (request.Status is not ("Approved" or "Rejected"))
        {
            throw ApiException.BadRequest("Decision must be Approved or Rejected.", "invalid_decision");
        }

        var leaveRequest = await db.LeaveRequests.FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw ApiException.NotFound("Leave request not found.");
        if (leaveRequest.Status != LeaveStatuses.Pending)
        {
            throw ApiException.Conflict("This request has already been reviewed.", "already_decided");
        }

        if (request.Status == LeaveStatuses.Approved)
        {
            var overlap = await db.LeaveRequests.AsNoTracking().AnyAsync(
                other => other.EmployeeId == leaveRequest.EmployeeId &&
                         other.Id != leaveRequest.Id &&
                         other.Status == LeaveStatuses.Approved &&
                         other.FromDate <= leaveRequest.ToDate &&
                         other.ToDate >= leaveRequest.FromDate,
                cancellationToken);
            if (overlap)
            {
                throw ApiException.Conflict(
                    "Another approved leave request already covers this period.",
                    "overlapping_approved_leave");
            }
        }

        leaveRequest.Status = request.Status;
        leaveRequest.DecidedOn = clock.Today;
        leaveRequest.Note = request.Note;
        leaveRequest.ApproverId = User.GetEmployeeId() ?? User.GetUserId();

        var balance = await db.LeaveBalances.FirstOrDefaultAsync(
            item => item.EmployeeId == leaveRequest.EmployeeId && item.LeaveTypeId == leaveRequest.LeaveTypeId,
            cancellationToken);
        if (balance is not null)
        {
            balance.Pending = Math.Max(0, balance.Pending - leaveRequest.Days);
            if (request.Status == LeaveStatuses.Approved)
            {
                balance.Used = Math.Min(balance.Allocated, balance.Used + leaveRequest.Days);
            }
        }

        audit.Record(User, HttpContext, $"{request.Status} leave request", "Leave", $"{leaveRequest.Id} for {leaveRequest.EmployeeId}");
        await db.SaveChangesAsync(cancellationToken);
        return Ok(leaveRequest.ToDto());
    }

    [HttpPost("requests/{id}/cancel")]
    public async Task<ActionResult<LeaveRequestDto>> Cancel(string id, SelfActionRequest request, CancellationToken cancellationToken)
    {
        var leaveRequest = await db.LeaveRequests.FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw ApiException.NotFound("Leave request not found.");

        if (!User.IsHrStaff())
        {
            var self = User.GetEmployeeId();
            if (string.IsNullOrWhiteSpace(self) || leaveRequest.EmployeeId != self)
            {
                throw ApiException.Forbidden("You can only cancel your own leave requests.");
            }
        }

        if (leaveRequest.Status != LeaveStatuses.Pending)
        {
            throw ApiException.Conflict("Only pending requests can be cancelled.", "not_cancellable");
        }

        leaveRequest.Status = LeaveStatuses.Cancelled;
        var balance = await db.LeaveBalances.FirstOrDefaultAsync(
            item => item.EmployeeId == leaveRequest.EmployeeId && item.LeaveTypeId == leaveRequest.LeaveTypeId,
            cancellationToken);
        if (balance is not null)
        {
            balance.Pending = Math.Max(0, balance.Pending - leaveRequest.Days);
        }

        audit.Record(User, HttpContext, "Cancelled leave request", "Leave", $"{leaveRequest.Id} for {leaveRequest.EmployeeId}");
        await db.SaveChangesAsync(cancellationToken);
        return Ok(leaveRequest.ToDto());
    }

    [HttpGet("summary")]
    public async Task<ActionResult<object>> Summary(CancellationToken cancellationToken)
    {
        var query = db.LeaveRequests.AsNoTracking().AsQueryable();
        var visible = await AccessScope.VisibleEmployeeIdsAsync(db, User, cancellationToken);
        if (visible is not null)
        {
            query = query.Where(request => visible.Contains(request.EmployeeId));
        }

        var requests = await query.ToListAsync(cancellationToken);
        var today = clock.Today;

        return Ok(new
        {
            totalRequests = requests.Count,
            pending = requests.Count(request => request.Status == LeaveStatuses.Pending),
            approved = requests.Count(request => request.Status == LeaveStatuses.Approved),
            rejected = requests.Count(request => request.Status == LeaveStatuses.Rejected),
            onLeaveToday = requests.Count(request =>
                request.Status == LeaveStatuses.Approved &&
                request.FromDate <= today &&
                request.ToDate >= today),
        });
    }
}
