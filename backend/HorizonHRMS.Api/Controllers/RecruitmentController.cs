using HorizonHRMS.Api.Contracts;
using HorizonHRMS.Api.Data;
using HorizonHRMS.Api.Infrastructure;
using HorizonHRMS.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HorizonHRMS.Api.Controllers;

[ApiController]
[Route("api/recruitment")]
[Authorize]
public sealed class RecruitmentController(HrmsDbContext db, AuditService audit, DemoClock clock) : ControllerBase
{
    private static readonly string[] JobStatuses = ["Open", "On Hold", "Closed"];
    private static readonly string[] CandidateStages = ["Applied", "Screening", "Interview", "Offer", "Hired", "Rejected"];
    private static readonly string[] CandidateSources = ["LinkedIn", "Referral", "Naukri", "Career Site", "Agency"];
    private static readonly string[] InterviewModes = ["Video", "In person", "Phone"];
    private static readonly string[] InterviewStatuses = ["Scheduled", "Completed", "Cancelled"];

    [HttpGet("jobs")]
    public async Task<ActionResult<List<JobOpeningDto>>> Jobs(CancellationToken cancellationToken)
    {
        var jobs = await db.JobOpenings.AsNoTracking()
            .OrderByDescending(job => job.PostedOn)
            .ThenBy(job => job.Title)
            .ToListAsync(cancellationToken);
        return Ok(jobs.Select(job => job.ToDto()).ToList());
    }

    [HttpGet("jobs/{id}")]
    public async Task<ActionResult<JobOpeningDto>> Job(string id, CancellationToken cancellationToken)
    {
        var job = await db.JobOpenings.AsNoTracking().FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw ApiException.NotFound("Job opening not found.");
        return Ok(job.ToDto());
    }

    [HttpPost("jobs")]
    [Authorize(Policy = Policies.RecruitmentEdit)]
    public async Task<ActionResult<JobOpeningDto>> CreateJob(JobRequest request, CancellationToken cancellationToken)
    {
        await ValidateJobAsync(request, cancellationToken);

        var ids = await db.JobOpenings.AsNoTracking().Select(job => job.Id).ToListAsync(cancellationToken);
        var max = ids
            .Select(id => int.TryParse(id.Replace("JOB-", string.Empty), out var value) ? value : 0)
            .DefaultIfEmpty(1000)
            .Max();

        var department = await db.Departments.AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == request.DepartmentId, cancellationToken)
            ?? throw ApiException.BadRequest("Please choose a valid department.", "invalid_department");

        var job = new JobOpening
        {
            Id = $"JOB-{max + 1}",
            PostedOn = clock.Today,
            Status = string.IsNullOrWhiteSpace(request.Status) ? "Open" : request.Status,
            HiringManagerId = ResolveHiringManager(request.HiringManagerId, department.HeadId),
        };
        Apply(job, request);

        db.JobOpenings.Add(job);
        audit.Record(User, HttpContext, "Published job opening", "Recruitment", $"{job.Title} ({job.Id})");
        await db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(Job), new { id = job.Id }, job.ToDto());
    }

    [HttpPut("jobs/{id}")]
    [Authorize(Policy = Policies.RecruitmentEdit)]
    public async Task<ActionResult<JobOpeningDto>> UpdateJob(string id, JobRequest request, CancellationToken cancellationToken)
    {
        var job = await db.JobOpenings.FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw ApiException.NotFound("Job opening not found.");

        await ValidateJobAsync(request, cancellationToken);

        Apply(job, request);
        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            job.Status = request.Status;
        }

        if (!string.IsNullOrWhiteSpace(request.HiringManagerId))
        {
            job.HiringManagerId = request.HiringManagerId;
        }

        if (request.Skills.Count > 0)
        {
            job.Skills = request.Skills.Where(skill => !string.IsNullOrWhiteSpace(skill)).Distinct().ToList();
        }

        audit.Record(User, HttpContext, "Updated job opening", "Recruitment", $"{job.Title} ({job.Id})");
        await db.SaveChangesAsync(cancellationToken);
        return Ok(job.ToDto());
    }

    [HttpPatch("jobs/{id}/status")]
    [Authorize(Policy = Policies.RecruitmentEdit)]
    public async Task<ActionResult<JobOpeningDto>> UpdateJobStatus(string id, JobStatusRequest request, CancellationToken cancellationToken)
    {
        if (!JobStatuses.Contains(request.Status))
        {
            throw ApiException.BadRequest($"Status must be one of: {string.Join(", ", JobStatuses)}.", "invalid_job_status");
        }

        var job = await db.JobOpenings.FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw ApiException.NotFound("Job opening not found.");

        job.Status = request.Status;
        audit.Record(User, HttpContext, $"Marked job {request.Status.ToLowerInvariant()}", "Recruitment", $"{job.Title} ({job.Id})");
        await db.SaveChangesAsync(cancellationToken);
        return Ok(job.ToDto());
    }

    [HttpGet("candidates")]
    public async Task<ActionResult<List<CandidateDto>>> Candidates(
        [FromQuery] string? jobId,
        [FromQuery] string? stage,
        [FromQuery] string? search,
        CancellationToken cancellationToken)
    {
        var query = db.Candidates.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(jobId) && jobId != "all")
        {
            query = query.Where(candidate => candidate.JobId == jobId);
        }

        if (!string.IsNullOrWhiteSpace(stage) && stage != "all")
        {
            query = query.Where(candidate => candidate.Stage == stage);
        }

        var candidates = await query
            .OrderByDescending(candidate => candidate.AppliedOn)
            .ThenBy(candidate => candidate.FirstName)
            .ToListAsync(cancellationToken);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            candidates = candidates.Where(candidate =>
                $"{candidate.FirstName} {candidate.LastName}".ToLowerInvariant().Contains(term) ||
                candidate.Email.ToLowerInvariant().Contains(term) ||
                candidate.CurrentCompany.ToLowerInvariant().Contains(term)).ToList();
        }

        return Ok(candidates.Select(candidate => candidate.ToDto()).ToList());
    }

    [HttpPatch("candidates/{id}")]
    [Authorize(Policy = Policies.RecruitmentEdit)]
    public async Task<ActionResult<CandidateDto>> UpdateCandidate(string id, CandidateUpdateRequest request, CancellationToken cancellationToken)
    {
        var candidate = await db.Candidates.FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw ApiException.NotFound("Candidate not found.");

        if (!string.IsNullOrWhiteSpace(request.Stage))
        {
            if (!CandidateStages.Contains(request.Stage))
            {
                throw ApiException.BadRequest($"Stage must be one of: {string.Join(", ", CandidateStages)}.", "invalid_candidate_stage");
            }

            candidate.Stage = request.Stage;
        }

        if (request.Rating is not null)
        {
            candidate.Rating = request.Rating.Value;
        }

        if (request.Notes is not null)
        {
            candidate.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();
        }

        audit.Record(User, HttpContext, "Updated candidate", "Recruitment", $"{candidate.FirstName} {candidate.LastName} ({candidate.Id})");
        await db.SaveChangesAsync(cancellationToken);
        return Ok(candidate.ToDto());
    }

    [HttpGet("interviews")]
    public async Task<ActionResult<List<InterviewDto>>> Interviews(CancellationToken cancellationToken)
    {
        var interviews = await db.Interviews.AsNoTracking()
            .OrderBy(interview => interview.Date)
            .ThenBy(interview => interview.Time)
            .ToListAsync(cancellationToken);
        return Ok(interviews.Select(interview => interview.ToDto()).ToList());
    }

    [HttpPost("interviews")]
    [Authorize(Policy = Policies.RecruitmentEdit)]
    public async Task<ActionResult<InterviewDto>> ScheduleInterview(InterviewRequest request, CancellationToken cancellationToken)
    {
        var candidate = await db.Candidates.FirstOrDefaultAsync(item => item.Id == request.CandidateId, cancellationToken)
            ?? throw ApiException.NotFound("Candidate not found.");

        if (!InterviewModes.Contains(request.Mode))
        {
            throw ApiException.BadRequest($"Mode must be one of: {string.Join(", ", InterviewModes)}.", "invalid_interview_mode");
        }

        var jobId = string.IsNullOrWhiteSpace(request.JobId) ? candidate.JobId : request.JobId;
        var jobExists = await db.JobOpenings.AnyAsync(job => job.Id == jobId, cancellationToken);
        if (!jobExists)
        {
            throw ApiException.BadRequest("Please choose a valid job opening.", "invalid_job");
        }

        var ids = await db.Interviews.AsNoTracking().Select(interview => interview.Id).ToListAsync(cancellationToken);
        var max = ids
            .Select(id => int.TryParse(id.Replace("INT-", string.Empty), out var value) ? value : 0)
            .DefaultIfEmpty(3000)
            .Max();

        var interview = new Interview
        {
            Id = $"INT-{max + 1}",
            CandidateId = candidate.Id,
            JobId = jobId,
            Round = request.Round.Trim(),
            Date = request.Date,
            Time = request.Time,
            Mode = request.Mode,
            Interviewer = request.Interviewer.Trim(),
            Status = string.IsNullOrWhiteSpace(request.Status) ? "Scheduled" : request.Status,
            Feedback = string.IsNullOrWhiteSpace(request.Feedback) ? null : request.Feedback.Trim(),
        };

        if (candidate.Stage is "Applied" or "Screening")
        {
            candidate.Stage = "Interview";
        }

        db.Interviews.Add(interview);
        audit.Record(User, HttpContext, "Scheduled interview", "Recruitment", $"{candidate.FirstName} {candidate.LastName} · {interview.Round} on {interview.Date:yyyy-MM-dd}");
        await db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(Interviews), null, interview.ToDto());
    }

    [HttpPatch("interviews/{id}")]
    [Authorize(Policy = Policies.RecruitmentEdit)]
    public async Task<ActionResult<InterviewDto>> UpdateInterview(string id, InterviewUpdateRequest request, CancellationToken cancellationToken)
    {
        var interview = await db.Interviews.FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw ApiException.NotFound("Interview not found.");

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            if (!InterviewStatuses.Contains(request.Status))
            {
                throw ApiException.BadRequest($"Status must be one of: {string.Join(", ", InterviewStatuses)}.", "invalid_interview_status");
            }

            interview.Status = request.Status;
        }

        if (request.Feedback is not null)
        {
            interview.Feedback = string.IsNullOrWhiteSpace(request.Feedback) ? null : request.Feedback.Trim();
        }

        if (request.Date is not null)
        {
            interview.Date = request.Date.Value;
        }

        if (!string.IsNullOrWhiteSpace(request.Time))
        {
            interview.Time = request.Time;
        }

        if (!string.IsNullOrWhiteSpace(request.Interviewer))
        {
            interview.Interviewer = request.Interviewer.Trim();
        }

        audit.Record(User, HttpContext, "Updated interview", "Recruitment", $"{interview.Id} is {interview.Status}");
        await db.SaveChangesAsync(cancellationToken);
        return Ok(interview.ToDto());
    }

    [HttpGet("summary")]
    public async Task<ActionResult<RecruitmentSummaryDto>> Summary(CancellationToken cancellationToken)
    {
        var jobs = await db.JobOpenings.AsNoTracking().ToListAsync(cancellationToken);
        var candidates = await db.Candidates.AsNoTracking().ToListAsync(cancellationToken);
        var interviews = await db.Interviews.AsNoTracking().ToListAsync(cancellationToken);

        return Ok(new RecruitmentSummaryDto
        {
            OpenJobs = jobs.Count(job => job.Status == "Open"),
            OpenPositions = jobs.Where(job => job.Status == "Open").Sum(job => job.Openings),
            Candidates = candidates.Count,
            InterviewsScheduled = interviews.Count(interview => interview.Status == "Scheduled"),
            Offers = candidates.Count(candidate => candidate.Stage == "Offer"),
            Hired = candidates.Count(candidate => candidate.Stage == "Hired"),
            Pipeline = CandidateStages.Take(5)
                .Select(stage => new PipelineStageDto
                {
                    Stage = stage,
                    Count = candidates.Count(candidate => candidate.Stage == stage),
                })
                .ToList(),
        });
    }

    private async Task ValidateJobAsync(JobRequest request, CancellationToken cancellationToken)
    {
        if (request.ExperienceMax < request.ExperienceMin)
        {
            throw ApiException.BadRequest("Maximum experience cannot be lower than the minimum.", "invalid_experience_range");
        }

        if (!EmploymentTypes.All.Contains(request.EmploymentType))
        {
            throw ApiException.BadRequest(
                $"Employment type must be one of: {string.Join(", ", EmploymentTypes.All)}.", "invalid_employment_type");
        }

        if (!string.IsNullOrWhiteSpace(request.Status) && !JobStatuses.Contains(request.Status))
        {
            throw ApiException.BadRequest($"Status must be one of: {string.Join(", ", JobStatuses)}.", "invalid_job_status");
        }

        var departmentExists = await db.Departments.AnyAsync(
            department => department.Id == request.DepartmentId, cancellationToken);
        if (!departmentExists)
        {
            throw ApiException.BadRequest("Please choose a valid department.", "invalid_department");
        }
    }

    private string ResolveHiringManager(string? requested, string? departmentHeadId)
    {
        if (!string.IsNullOrWhiteSpace(requested))
        {
            return requested;
        }

        if (!string.IsNullOrWhiteSpace(departmentHeadId))
        {
            return departmentHeadId;
        }

        return User.GetEmployeeId() ?? string.Empty;
    }

    private static void Apply(JobOpening job, JobRequest request)
    {
        job.Title = request.Title.Trim();
        job.DepartmentId = request.DepartmentId;
        job.Location = request.Location.Trim();
        job.EmploymentType = request.EmploymentType;
        job.ExperienceMin = request.ExperienceMin;
        job.ExperienceMax = request.ExperienceMax;
        job.Openings = request.Openings;
        job.Description = request.Description.Trim();
        job.SalaryRange = request.SalaryRange.Trim();
        if (request.Skills.Count > 0)
        {
            job.Skills = request.Skills.Where(skill => !string.IsNullOrWhiteSpace(skill)).Distinct().ToList();
        }
    }
}
