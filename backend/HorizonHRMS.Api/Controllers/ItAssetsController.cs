using HorizonHRMS.Api.Contracts;
using HorizonHRMS.Api.Data;
using HorizonHRMS.Api.Infrastructure;
using HorizonHRMS.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HorizonHRMS.Api.Controllers;

[ApiController]
[Route("api/it-assets")]
[Authorize(Policy = Policies.SuperAdmin)]
public sealed class ItAssetsController(HrmsDbContext db, AuditService audit, DemoClock clock) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<ItAssetDto>>> List(
        [FromQuery] string? q,
        [FromQuery] string? status,
        [FromQuery] string? type,
        [FromQuery] string? employeeId,
        CancellationToken cancellationToken)
    {
        var query = db.ItAssets.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim().ToLowerInvariant();
            query = query.Where(a => a.AssetId.ToLower().Contains(term) ||
                                     a.SerialNumber.ToLower().Contains(term) ||
                                     a.Name.ToLower().Contains(term) ||
                                     (a.EmployeeName != null && a.EmployeeName.ToLower().Contains(term)));
        }
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(a => a.Status == status);
        if (!string.IsNullOrWhiteSpace(type)) query = query.Where(a => a.Type == type);
        if (!string.IsNullOrWhiteSpace(employeeId)) query = query.Where(a => a.EmployeeId == employeeId);
        var assets = await query.OrderBy(a => a.AssetId).ToListAsync(cancellationToken);
        return Ok(assets.Select(ToDto).ToList());
    }

    [HttpGet("stats")]
    public async Task<ActionResult<Dictionary<string, int>>> Stats(CancellationToken cancellationToken)
    {
        var assets = await db.ItAssets.AsNoTracking().ToListAsync(cancellationToken);
        return Ok(new Dictionary<string, int>
        {
            ["total"] = assets.Count,
            ["available"] = assets.Count(a => a.Status == "AVAILABLE"),
            ["allocated"] = assets.Count(a => a.Status == "ALLOCATED"),
            ["returned"] = assets.Count(a => a.Status == "RETURNED"),
            ["underRepair"] = assets.Count(a => a.Status == "UNDER_REPAIR"),
        });
    }

    [HttpPost]
    public async Task<ActionResult<ItAssetDto>> Register(ItAssetRegisterRequest request, CancellationToken cancellationToken)
    {
        var assetId = request.AssetId.Trim().ToUpperInvariant();
        var serial = request.SerialNumber.Trim().ToUpperInvariant();
        if (await db.ItAssets.AnyAsync(a => a.AssetId == assetId, cancellationToken))
            throw ApiException.Conflict("An asset with this ID already exists.", "duplicate_asset_id");
        if (await db.ItAssets.AnyAsync(a => a.SerialNumber == serial, cancellationToken))
            throw ApiException.Conflict("An asset with this serial number already exists.", "duplicate_serial");

        var asset = new ItAsset
        {
            Id = $"AST-{Guid.NewGuid():N}",
            AssetId = assetId,
            SerialNumber = serial,
            Name = request.Name.Trim(),
            Type = request.Type,
            Status = "AVAILABLE",
            Condition = request.Condition,
            Remarks = request.Remarks,
            Version = 1,
        };
        db.ItAssets.Add(asset);
        db.ItAssetEvents.Add(new ItAssetEvent
        {
            Id = $"AE-{Guid.NewGuid():N}",
            AssetId = asset.Id,
            Action = "REGISTERED",
            Date = clock.Today,
            Condition = request.Condition,
            Remarks = request.Remarks,
            ActorId = User.GetUserId(),
            RecordedAt = DateTime.UtcNow,
        });
        audit.Record(User, HttpContext, "Registered asset", "IT Assets", $"{asset.AssetId} ({asset.Id})");
        await db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = asset.Id }, ToDto(asset));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ItAssetDto>> Get(string id, CancellationToken cancellationToken)
    {
        var asset = await db.ItAssets.AsNoTracking().FirstOrDefaultAsync(a => a.Id == id, cancellationToken)
            ?? throw ApiException.NotFound("Asset not found.");
        return Ok(ToDto(asset));
    }

    [HttpGet("{id}/history")]
    public async Task<ActionResult<List<ItAssetEventDto>>> History(string id, CancellationToken cancellationToken)
    {
        var events = await db.ItAssetEvents.AsNoTracking()
            .Where(e => e.AssetId == id)
            .OrderByDescending(e => e.RecordedAt)
            .ToListAsync(cancellationToken);
        return Ok(events.Select(ToEventDto).ToList());
    }

    [HttpPost("{id}/actions")]
    public async Task<ActionResult<ItAssetDto>> Action(string id, ItAssetActionRequest request, CancellationToken cancellationToken)
    {
        var asset = await db.ItAssets.Include(a => a.History).FirstOrDefaultAsync(a => a.Id == id, cancellationToken)
            ?? throw ApiException.NotFound("Asset not found.");

        if (asset.Version != request.Version)
            throw ApiException.Conflict("The asset was modified by another user. Refresh and retry.", "stale_version");

        var today = clock.Today;
        if (request.Date > today)
            throw ApiException.BadRequest("Date cannot be in the future.", "invalid_date");
        if (asset.History.Any() && request.Date < asset.History.Max(e => e.Date))
            throw ApiException.BadRequest("Date cannot be before the preceding event.", "invalid_date");

        var action = request.Action.ToUpperInvariant();
        switch (action)
        {
            case "ALLOCATE":
            case "TRANSFER":
                {
                    var employee = await ResolveEmployeeAsync(request, cancellationToken);
                    if (asset.Status != "AVAILABLE" && asset.Status != "RETURNED")
                        throw ApiException.Conflict("Asset is not available for allocation.", "invalid_status");
                    asset.Status = "ALLOCATED";
                    asset.EmployeeId = employee.Id;
                    asset.EmployeeCode = employee.Id;
                    asset.EmployeeName = $"{employee.FirstName} {employee.LastName}";
                    asset.AllocationDate = request.Date;
                    asset.Condition = request.Condition;
                    asset.Remarks = request.Remarks;
                    db.ItAssetEvents.Add(new ItAssetEvent
                    {
                        Id = $"AE-{Guid.NewGuid():N}",
                        AssetId = asset.Id,
                        Action = action,
                        EmployeeId = employee.Id,
                        EmployeeCode = employee.Id,
                        EmployeeName = $"{employee.FirstName} {employee.LastName}",
                        Date = request.Date,
                        Condition = request.Condition,
                        Remarks = request.Remarks,
                        ActorId = User.GetUserId(),
                        RecordedAt = DateTime.UtcNow,
                    });
                    break;
                }
            case "RETURN":
                {
                    if (asset.Status != "ALLOCATED")
                        throw ApiException.Conflict("Asset is not currently allocated.", "invalid_status");
                    var prevEmpId = asset.EmployeeId;
                    var prevEmpName = asset.EmployeeName;
                    asset.Status = "RETURNED";
                    asset.EmployeeId = null;
                    asset.EmployeeCode = null;
                    asset.EmployeeName = null;
                    asset.AllocationDate = null;
                    asset.Condition = request.Condition;
                    asset.Remarks = request.Remarks;
                    db.ItAssetEvents.Add(new ItAssetEvent
                    {
                        Id = $"AE-{Guid.NewGuid():N}",
                        AssetId = asset.Id,
                        Action = "RETURN",
                        EmployeeId = prevEmpId,
                        EmployeeCode = prevEmpId,
                        EmployeeName = prevEmpName,
                        Date = request.Date,
                        Condition = request.Condition,
                        Remarks = request.Remarks,
                        ActorId = User.GetUserId(),
                        RecordedAt = DateTime.UtcNow,
                    });
                    break;
                }
            case "REPAIR":
                {
                    if (asset.Status == "ALLOCATED")
                        throw ApiException.Conflict("Return the asset before sending for repair.", "invalid_status");
                    asset.Status = "UNDER_REPAIR";
                    asset.Condition = request.Condition;
                    asset.Remarks = request.Remarks;
                    db.ItAssetEvents.Add(new ItAssetEvent
                    {
                        Id = $"AE-{Guid.NewGuid():N}",
                        AssetId = asset.Id,
                        Action = "REPAIR",
                        Date = request.Date,
                        Condition = request.Condition,
                        Remarks = request.Remarks,
                        ActorId = User.GetUserId(),
                        RecordedAt = DateTime.UtcNow,
                    });
                    break;
                }
            case "AVAILABLE":
                {
                    asset.Status = "AVAILABLE";
                    asset.EmployeeId = null;
                    asset.EmployeeCode = null;
                    asset.EmployeeName = null;
                    asset.AllocationDate = null;
                    asset.Condition = request.Condition;
                    asset.Remarks = request.Remarks;
                    db.ItAssetEvents.Add(new ItAssetEvent
                    {
                        Id = $"AE-{Guid.NewGuid():N}",
                        AssetId = asset.Id,
                        Action = "AVAILABLE",
                        Date = request.Date,
                        Condition = request.Condition,
                        Remarks = request.Remarks,
                        ActorId = User.GetUserId(),
                        RecordedAt = DateTime.UtcNow,
                    });
                    break;
                }
            default:
                throw ApiException.BadRequest("Unknown action.", "invalid_action");
        }

        asset.Version++;
        asset.UpdatedAt = DateTime.UtcNow;
        audit.Record(User, HttpContext, $"{action} asset", "IT Assets", $"{asset.AssetId} ({asset.Id})");
        await db.SaveChangesAsync(cancellationToken);
        return Ok(ToDto(asset));
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export(
        [FromQuery] string? q,
        [FromQuery] string? status,
        [FromQuery] string? type,
        [FromQuery] string? employeeId,
        CancellationToken cancellationToken)
    {
        var query = db.ItAssets.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(a => a.Status == status);
        if (!string.IsNullOrWhiteSpace(type)) query = query.Where(a => a.Type == type);
        if (!string.IsNullOrWhiteSpace(employeeId)) query = query.Where(a => a.EmployeeId == employeeId);
        var assets = await query.OrderBy(a => a.AssetId).ToListAsync(cancellationToken);

        var sb = new System.Text.StringBuilder();
        sb.AppendLine("Asset ID,Serial Number,Name,Type,Status,Employee,Condition,Remarks");
        foreach (var a in assets)
        {
            sb.AppendLine($"\"{a.AssetId}\",\"{a.SerialNumber}\",\"{a.Name}\",\"{a.Type}\",\"{a.Status}\",\"{a.EmployeeName ?? ""}\",\"{a.Condition}\",\"{a.Remarks ?? ""}\"");
        }
        var bytes = System.Text.Encoding.UTF8.GetBytes(sb.ToString());
        return File(bytes, "text/csv", "it-assets.csv");
    }

    private async Task<Employee> ResolveEmployeeAsync(ItAssetActionRequest request, CancellationToken cancellationToken)
    {
        Employee? employee = null;
        if (!string.IsNullOrWhiteSpace(request.EmployeeId))
        {
            employee = await db.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.Id == request.EmployeeId, cancellationToken);
        }
        else if (!string.IsNullOrWhiteSpace(request.EmployeeCode))
        {
            employee = await db.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.Id == request.EmployeeCode, cancellationToken);
        }
        if (employee is null || employee.Status == "Inactive")
            throw ApiException.BadRequest("Employee not found or inactive.", "invalid_employee");
        return employee;
    }

    private static ItAssetDto ToDto(ItAsset a) => new()
    {
        Id = a.Id,
        Version = a.Version,
        AssetId = a.AssetId,
        SerialNumber = a.SerialNumber,
        Name = a.Name,
        Type = a.Type,
        Status = a.Status,
        EmployeeId = a.EmployeeId,
        EmployeeCode = a.EmployeeCode,
        EmployeeName = a.EmployeeName,
        AllocationDate = a.AllocationDate,
        Condition = a.Condition,
        Remarks = a.Remarks,
    };

    private static ItAssetEventDto ToEventDto(ItAssetEvent e) => new()
    {
        Id = e.Id,
        Action = e.Action,
        EmployeeId = e.EmployeeId,
        EmployeeCode = e.EmployeeCode,
        EmployeeName = e.EmployeeName,
        Date = e.Date,
        Condition = e.Condition,
        Remarks = e.Remarks,
        ActorId = e.ActorId,
        RecordedAt = e.RecordedAt,
    };
}