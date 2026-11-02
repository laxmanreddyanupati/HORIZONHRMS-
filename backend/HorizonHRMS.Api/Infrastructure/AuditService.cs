using System.Security.Claims;
using HorizonHRMS.Api.Data;
using HorizonHRMS.Api.Models;

namespace HorizonHRMS.Api.Infrastructure;

public sealed class AuditService(HrmsDbContext db)
{
    public void Record(ClaimsPrincipal user, HttpContext context, string action, string module, string target)
    {
        db.AuditLogs.Add(new AuditLog
        {
            Id = $"AUD-{Guid.NewGuid():N}",
            Actor = user.GetDisplayName(),
            ActorRole = user.GetRole(),
            Action = action,
            Module = module,
            Target = target,
            Timestamp = DateTime.UtcNow,
            IpAddress = context.ClientIp(),
        });
    }
}
