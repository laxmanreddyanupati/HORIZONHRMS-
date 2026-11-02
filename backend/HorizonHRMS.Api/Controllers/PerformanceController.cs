using HorizonHRMS.Api.Contracts;
using HorizonHRMS.Api.Data;
using HorizonHRMS.Api.Infrastructure;
using HorizonHRMS.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HorizonHRMS.Api.Controllers;

[ApiController]
[Route("api/performance")]
[Authorize]
public sealed class PerformanceController(HrmsDbContext db, AuditService audit, DemoClock clock) : ControllerBase
{
    private static readonly string[] ReviewTypes = ["Self", "Manager", "Peer", "HR"];
    private static readonly string[] FeedbackTypes = ["Praise", "Constructive", "Check-in"];

    [HttpGet("cycles")]
    public async Task<ActionResult<List<AppraisalCycleDto>>> Cycles(CancellationToken cancellationToken)
    {
        var cycles = await db.AppraisalCycles.AsNoTracking()
            .OrderByDescending(cycle => cycle.StartDate)
            .ToListAsync(cancellationToken);
        return Ok(cycles.Select(cycle => cycle.ToDto()).ToList());
    }

    [HttpGet("goals")]
    public async Task<ActionResult<List<GoalDto>>> Goals([FromQuery] string? employeeId, CancellationToken cancellationToken)
    {
        var query = db.Goals.AsNoTracking().AsQueryable();
        var visible = await AccessScope.VisibleEmployeeIdsAsync(db, User, cancellationToken);
        if (visible is not null)
        {
            query = query.Where(goal => visible.Contains(goal.EmployeeId));
        }

        if (!string.IsNullOrWhiteSpace(employeeId))
        {
            query = query.Where(goal => goal.EmployeeId == employeeId);
        }

        var goals = await query.OrderBy(goal => goal.DueDate).ToListAsync(cancellationToken);
        return Ok(goals.Select(goal => goal.ToDto()).ToList());
    }

    [HttpPost("goals")]
    [Authorize(Policy = Policies.PeopleManagers)]
    public async Task<ActionResult<GoalDto>> CreateGoal(GoalRequest request, CancellationToken cancellationToken)
    {
        await AccessScope.EnsureCanSeeEmployeeAsync(db, User, request.EmployeeId, cancellationToken);
        await EnsureEmployeeExistsAsync(request.EmployeeId, cancellationToken);

        var goal = new Goal
        {
            Id = $"GOAL-{request.EmployeeId}-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
            EmployeeId = request.EmployeeId,
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            Category = request.Category.Trim(),
            Weight = request.Weight,
            Target = request.Target.Trim(),
            Progress = 0,
            DueDate = request.DueDate,
            Status = "Not Started",
        };

        db.Goals.Add(goal);
        audit.Record(User, HttpContext, "Created goal", "Performance", $"{goal.Title} for {goal.EmployeeId}");
        await db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(Goals), new { employeeId = goal.EmployeeId }, goal.ToDto());
    }

    [HttpPatch("goals/{id}/progress")]
    public async Task<ActionResult<GoalDto>> UpdateGoalProgress(string id, GoalProgressRequest request, CancellationToken cancellationToken)
    {
        var goal = await db.Goals.FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw ApiException.NotFound("Goal not found.");

        await AccessScope.EnsureCanSeeEmployeeAsync(db, User, goal.EmployeeId, cancellationToken);

        goal.Progress = Math.Clamp(request.Progress, 0, 100);
        goal.Status = goal.Progress >= 100
            ? "Completed"
            : goal.Status == "Not Started"
                ? "On Track"
                : goal.Status;

        audit.Record(User, HttpContext, "Updated goal progress", "Performance", $"{goal.Title} is {goal.Progress}% complete");
        await db.SaveChangesAsync(cancellationToken);
        return Ok(goal.ToDto());
    }

    [HttpGet("reviews")]
    public async Task<ActionResult<List<ReviewDto>>> Reviews(
        [FromQuery] string? employeeId,
        [FromQuery] string? cycleId,
        [FromQuery] string? status,
        CancellationToken cancellationToken)
    {
        var query = db.Reviews.AsNoTracking().AsQueryable();
        var visible = await AccessScope.VisibleEmployeeIdsAsync(db, User, cancellationToken);
        if (visible is not null)
        {
            query = query.Where(review => visible.Contains(review.EmployeeId));
        }

        if (!string.IsNullOrWhiteSpace(employeeId))
        {
            query = query.Where(review => review.EmployeeId == employeeId);
        }

        if (!string.IsNullOrWhiteSpace(cycleId) && cycleId != "all")
        {
            query = query.Where(review => review.CycleId == cycleId);
        }

        if (!string.IsNullOrWhiteSpace(status) && status != "all")
        {
            query = query.Where(review => review.Status == status);
        }

        var reviews = await query
            .OrderByDescending(review => review.SubmittedOn)
            .ThenBy(review => review.EmployeeId)
            .ToListAsync(cancellationToken);
        return Ok(reviews.Select(review => review.ToDto()).ToList());
    }

    [HttpPost("reviews")]
    [Authorize(Policy = Policies.PeopleManagers)]
    public async Task<ActionResult<ReviewDto>> SubmitReview(ReviewSubmitRequest request, CancellationToken cancellationToken)
    {
        await AccessScope.EnsureCanSeeEmployeeAsync(db, User, request.EmployeeId, cancellationToken);
        await EnsureEmployeeExistsAsync(request.EmployeeId, cancellationToken);

        if (!ReviewTypes.Contains(request.Type))
        {
            throw ApiException.BadRequest($"Review type must be one of: {string.Join(", ", ReviewTypes)}.", "invalid_review_type");
        }

        var cycle = await CurrentCycleAsync(cancellationToken)
            ?? throw ApiException.BadRequest("No appraisal cycle is available.", "cycle_missing");

        var reviewerId = User.GetEmployeeId() ?? request.ReviewerId ?? User.GetUserId() ?? "system";
        var review = await db.Reviews.FirstOrDefaultAsync(
            item => item.EmployeeId == request.EmployeeId && item.CycleId == cycle.Id && item.Type == request.Type,
            cancellationToken);

        if (review is null)
        {
            review = new Review
            {
                Id = $"REV-{request.Type.ToUpperInvariant()}-{request.EmployeeId}-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
                EmployeeId = request.EmployeeId,
                CycleId = cycle.Id,
                ReviewerId = reviewerId,
                Type = request.Type,
            };
            db.Reviews.Add(review);
        }

        review.ReviewerId = reviewerId;
        review.Rating = request.Rating;
        review.Summary = request.Summary.Trim();
        review.Status = "Completed";
        review.SubmittedOn = clock.Today;

        audit.Record(User, HttpContext, "Submitted review", "Performance", $"{request.Type} review for {request.EmployeeId}");
        await db.SaveChangesAsync(cancellationToken);
        return Ok(review.ToDto());
    }

    [HttpGet("feedback")]
    public async Task<ActionResult<List<FeedbackDto>>> Feedback([FromQuery] string? employeeId, CancellationToken cancellationToken)
    {
        var query = db.Feedback.AsNoTracking().AsQueryable();
        var visible = await AccessScope.VisibleEmployeeIdsAsync(db, User, cancellationToken);
        if (visible is not null)
        {
            query = query.Where(feedback => visible.Contains(feedback.EmployeeId));
        }

        if (!string.IsNullOrWhiteSpace(employeeId))
        {
            query = query.Where(feedback => feedback.EmployeeId == employeeId);
        }

        var feedback = await query
            .OrderByDescending(item => item.Date)
            .ToListAsync(cancellationToken);
        return Ok(feedback.Select(item => item.ToDto()).ToList());
    }

    [HttpPost("feedback")]
    [Authorize(Policy = Policies.PeopleManagers)]
    public async Task<ActionResult<FeedbackDto>> SubmitFeedback(FeedbackRequest request, CancellationToken cancellationToken)
    {
        await AccessScope.EnsureCanSeeEmployeeAsync(db, User, request.EmployeeId, cancellationToken);
        await EnsureEmployeeExistsAsync(request.EmployeeId, cancellationToken);

        if (!FeedbackTypes.Contains(request.Type))
        {
            throw ApiException.BadRequest($"Feedback type must be one of: {string.Join(", ", FeedbackTypes)}.", "invalid_feedback_type");
        }

        var item = new Feedback
        {
            Id = $"FB-{Guid.NewGuid():N}",
            EmployeeId = request.EmployeeId,
            FromId = User.GetEmployeeId() ?? request.FromId ?? User.GetUserId() ?? "system",
            Date = clock.Today,
            Type = request.Type,
            Message = request.Message.Trim(),
            Rating = request.Rating,
        };

        db.Feedback.Add(item);
        audit.Record(User, HttpContext, "Gave feedback", "Performance", $"{item.Type} feedback for {item.EmployeeId}");
        await db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(Feedback), new { employeeId = item.EmployeeId }, item.ToDto());
    }

    [HttpGet("summary")]
    public async Task<ActionResult<PerformanceSummaryDto>> Summary(CancellationToken cancellationToken)
    {
        var visible = await AccessScope.VisibleEmployeeIdsAsync(db, User, cancellationToken);

        var goalQuery = db.Goals.AsNoTracking().AsQueryable();
        var reviewQuery = db.Reviews.AsNoTracking().AsQueryable();
        if (visible is not null)
        {
            goalQuery = goalQuery.Where(goal => visible.Contains(goal.EmployeeId));
            reviewQuery = reviewQuery.Where(review => visible.Contains(review.EmployeeId));
        }

        var goals = await goalQuery.ToListAsync(cancellationToken);
        var cycle = await CurrentCycleAsync(cancellationToken);
        List<Review> reviews = cycle is null
            ? []
            : await reviewQuery.Where(review => review.CycleId == cycle.Id).ToListAsync(cancellationToken);
        var completed = reviews.Where(review => review.Status == "Completed").ToList();

        return Ok(new PerformanceSummaryDto
        {
            TotalGoals = goals.Count,
            OnTrack = goals.Count(goal => goal.Status == "On Track"),
            AtRisk = goals.Count(goal => goal.Status == "At Risk"),
            Completed = goals.Count(goal => goal.Status == "Completed"),
            PendingReviews = reviews.Count(review => review.Status != "Completed"),
            CompletedReviews = completed.Count,
            AverageRating = completed.Count == 0
                ? 0
                : Math.Round(completed.Average(review => review.Rating), 2, MidpointRounding.AwayFromZero),
        });
    }

    private async Task<AppraisalCycle?> CurrentCycleAsync(CancellationToken cancellationToken)
    {
        var active = await db.AppraisalCycles.AsNoTracking()
            .FirstOrDefaultAsync(cycle => cycle.Status == "Active", cancellationToken);
        if (active is not null)
        {
            return active;
        }

        return await db.AppraisalCycles.AsNoTracking()
            .OrderByDescending(cycle => cycle.StartDate)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private async Task EnsureEmployeeExistsAsync(string employeeId, CancellationToken cancellationToken)
    {
        var exists = await db.Employees.AnyAsync(employee => employee.Id == employeeId, cancellationToken);
        if (!exists)
        {
            throw ApiException.BadRequest("Please choose a valid employee.", "invalid_employee");
        }
    }
}
