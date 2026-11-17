using HorizonHRMS.Api.Contracts;
using HorizonHRMS.Api.Data;
using HorizonHRMS.Api.Infrastructure;
using HorizonHRMS.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HorizonHRMS.Api.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public sealed class NotificationsController(HrmsDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<NotificationDto>>> List(
        [FromQuery] bool? unreadOnly,
        [FromQuery] int page = 0,
        [FromQuery] int size = 20,
        CancellationToken cancellationToken = default)
    {
        var userId = User.GetUserId();
        var query = db.Notifications.AsNoTracking().Where(n => n.UserId == userId);
        if (unreadOnly == true) query = query.Where(n => !n.IsRead);
        var items = await query.OrderByDescending(n => n.CreatedAt)
            .Skip(page * size).Take(size).ToListAsync(cancellationToken);
        return Ok(items.Select(ToDto).ToList());
    }

    [HttpGet("unread-count")]
    public async Task<ActionResult<UnreadCountDto>> UnreadCount(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        var count = await db.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead, cancellationToken);
        return Ok(new UnreadCountDto { Count = count });
    }

    [HttpPost("{id}/read")]
    public async Task<ActionResult<NotificationDto>> MarkRead(string id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        var notification = await db.Notifications.FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId, cancellationToken)
            ?? throw ApiException.NotFound("Notification not found.");
        if (!notification.IsRead)
        {
            notification.IsRead = true;
            notification.ReadAt = DateTime.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
        }
        return Ok(ToDto(notification));
    }

    [HttpPost("read-all")]
    public async Task<ActionResult<Dictionary<string, long>>> MarkAllRead(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        var unread = await db.Notifications.Where(n => n.UserId == userId && !n.IsRead).ToListAsync(cancellationToken);
        foreach (var n in unread)
        {
            n.IsRead = true;
            n.ReadAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync(cancellationToken);
        return Ok(new Dictionary<string, long> { ["marked"] = unread.Count });
    }

    public static async Task CreateAsync(HrmsDbContext db, string userId, string title, string message, string module, string? target = null)
    {
        db.Notifications.Add(new Notification
        {
            Id = $"NTF-{Guid.NewGuid():N}",
            UserId = userId,
            Title = title,
            Message = message,
            Module = module,
            Target = target,
            IsRead = false,
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
    }

    private static NotificationDto ToDto(Notification n) => new()
    {
        Id = n.Id,
        Title = n.Title,
        Message = n.Message,
        Module = n.Module,
        Target = n.Target,
        IsRead = n.IsRead,
        CreatedAt = n.CreatedAt,
        ReadAt = n.ReadAt,
    };
}