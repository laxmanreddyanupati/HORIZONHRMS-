namespace HorizonHRMS.Api.Infrastructure;

/// <summary>
/// The HRMS demo ships with a fixed "today" (2026-10-30) so seeded attendance,
/// payroll and leave data stay coherent. Configure Demo:SnapshotDate to change it.
/// </summary>
public sealed class DemoClock(IConfiguration configuration)
{
    private readonly DateOnly _snapshot = DateOnly.TryParse(configuration["Demo:SnapshotDate"], out var parsed)
        ? parsed
        : DateOnly.FromDateTime(DateTime.UtcNow);

    public DateOnly Today => _snapshot;

    public DateTime Now => _snapshot.ToDateTime(TimeOnly.FromTimeSpan(TimeSpan.FromHours(9)));
}
