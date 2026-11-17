namespace HorizonHRMS.Api.Infrastructure;

/// <summary>
/// Seeded demos use the configured snapshot. Workspaces with seeding disabled
/// use the current India date so attendance and date validation remain current.
/// </summary>
public sealed class DemoClock(IConfiguration configuration)
{
    private readonly DateOnly? _snapshot = configuration.GetValue("Seed:Enabled", true)
        && DateOnly.TryParse(configuration["Demo:SnapshotDate"], out var parsed) ? parsed : null;
    private static readonly TimeZoneInfo WorkspaceZone = TimeZoneInfo.FindSystemTimeZoneById("Asia/Kolkata");

    public DateOnly Today => _snapshot ?? DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, WorkspaceZone));

    public DateTime Now => _snapshot is { } snapshot
        ? snapshot.ToDateTime(TimeOnly.FromTimeSpan(TimeSpan.FromHours(9)))
        : TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, WorkspaceZone);
}
