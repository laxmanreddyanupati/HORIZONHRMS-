using HorizonHRMS.Api.Contracts;
using HorizonHRMS.Api.Data;
using HorizonHRMS.Api.Infrastructure;
using HorizonHRMS.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HorizonHRMS.Api.Controllers;

[ApiController]
[Route("api/projects")]
[Authorize]
public sealed class ProjectsController(HrmsDbContext db, AuditService audit) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<ProjectDto>>> List(CancellationToken cancellationToken)
    {
        var projects = await db.Projects.AsNoTracking()
            .Include(p => p.Members)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync(cancellationToken);
        return Ok(projects.Select(ToDto).ToList());
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ProjectDto>> Get(string id, CancellationToken cancellationToken)
    {
        var project = await db.Projects.AsNoTracking()
            .Include(p => p.Members)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken)
            ?? throw ApiException.NotFound("Project not found.");
        return Ok(ToDto(project));
    }

    [HttpPost]
    [Authorize(Policy = Policies.HrStaff)]
    public async Task<ActionResult<ProjectDto>> Create(ProjectRequest request, CancellationToken cancellationToken)
    {
        var project = new Project
        {
            Id = $"PRJ-{Guid.NewGuid():N}".Substring(0, 12).ToUpperInvariant(),
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            Status = request.Status,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Budget = request.Budget,
            ManagerId = request.ManagerId ?? string.Empty,
            DepartmentId = request.DepartmentId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Projects.Add(project);
        foreach (var memberId in request.MemberIds.Distinct())
        {
            db.ProjectMembers.Add(new ProjectMember
            {
                Id = $"PM-{Guid.NewGuid():N}",
                ProjectId = project.Id,
                EmployeeId = memberId,
                Role = "Member",
                JoinedOn = request.StartDate,
            });
        }
        audit.Record(User, HttpContext, "Created project", "Projects", $"{project.Title} ({project.Id})");
        await db.SaveChangesAsync(cancellationToken);
        var saved = await db.Projects.AsNoTracking().Include(p => p.Members).FirstAsync(p => p.Id == project.Id, cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = project.Id }, ToDto(saved));
    }

    [HttpPut("{id}")]
    [Authorize(Policy = Policies.HrStaff)]
    public async Task<ActionResult<ProjectDto>> Update(string id, ProjectRequest request, CancellationToken cancellationToken)
    {
        var project = await db.Projects.Include(p => p.Members).FirstOrDefaultAsync(p => p.Id == id, cancellationToken)
            ?? throw ApiException.NotFound("Project not found.");
        project.Title = request.Title.Trim();
        project.Description = request.Description.Trim();
        project.Status = request.Status;
        project.StartDate = request.StartDate;
        project.EndDate = request.EndDate;
        project.Budget = request.Budget;
        project.ManagerId = request.ManagerId ?? string.Empty;
        project.DepartmentId = request.DepartmentId;
        project.UpdatedAt = DateTime.UtcNow;

        // sync members
        var existing = project.Members.Select(m => m.EmployeeId).ToHashSet();
        var desired = request.MemberIds.ToHashSet();
        foreach (var m in project.Members.Where(m => !desired.Contains(m.EmployeeId)).ToList())
            db.ProjectMembers.Remove(m);
        foreach (var memberId in desired.Where(m => !existing.Contains(m)))
        {
            db.ProjectMembers.Add(new ProjectMember
            {
                Id = $"PM-{Guid.NewGuid():N}",
                ProjectId = project.Id,
                EmployeeId = memberId,
                Role = "Member",
                JoinedOn = DateOnly.FromDateTime(DateTime.UtcNow),
            });
        }

        audit.Record(User, HttpContext, "Updated project", "Projects", $"{project.Title} ({project.Id})");
        await db.SaveChangesAsync(cancellationToken);
        var saved = await db.Projects.AsNoTracking().Include(p => p.Members).FirstAsync(p => p.Id == project.Id, cancellationToken);
        return Ok(ToDto(saved));
    }

    [HttpPatch("{id}/status")]
    [Authorize(Policy = Policies.HrStaff)]
    public async Task<ActionResult<ProjectDto>> SetStatus(string id, ProjectStatusRequest request, CancellationToken cancellationToken)
    {
        var project = await db.Projects.Include(p => p.Members).FirstOrDefaultAsync(p => p.Id == id, cancellationToken)
            ?? throw ApiException.NotFound("Project not found.");
        project.Status = request.Status;
        project.UpdatedAt = DateTime.UtcNow;
        audit.Record(User, HttpContext, $"Set project status to {request.Status}", "Projects", $"{project.Title} ({project.Id})");
        await db.SaveChangesAsync(cancellationToken);
        return Ok(ToDto(project));
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = Policies.HrStaff)]
    public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
    {
        var project = await db.Projects.FirstOrDefaultAsync(p => p.Id == id, cancellationToken)
            ?? throw ApiException.NotFound("Project not found.");
        db.Projects.Remove(project);
        audit.Record(User, HttpContext, "Deleted project", "Projects", $"{project.Title} ({project.Id})");
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private static ProjectDto ToDto(Project p) => new()
    {
        Id = p.Id,
        Title = p.Title,
        Description = p.Description,
        Status = p.Status,
        StartDate = p.StartDate,
        EndDate = p.EndDate,
        Budget = p.Budget,
        ManagerId = p.ManagerId,
        DepartmentId = p.DepartmentId,
        MemberIds = p.Members.Select(m => m.EmployeeId).ToList(),
    };
}