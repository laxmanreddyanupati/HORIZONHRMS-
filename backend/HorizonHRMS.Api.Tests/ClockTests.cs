using HorizonHRMS.Api.Infrastructure;
using Microsoft.Extensions.Configuration;

namespace HorizonHRMS.Api.Tests;

public class ClockTests
{
    [Fact]
    public void SeededDemo_UsesConfiguredSnapshot()
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Seed:Enabled"] = "true", ["Demo:SnapshotDate"] = "2026-10-30"
        }).Build();
        var clock = new DemoClock(config);
        Assert.Equal(new DateOnly(2026, 10, 30), clock.Today);
    }

    [Fact]
    public void ClearedWorkspace_UsesCurrentIndiaDateInsteadOfDemoSnapshot()
    {
        var zone = TimeZoneInfo.FindSystemTimeZoneById("Asia/Kolkata");
        var before = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, zone));
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Seed:Enabled"] = "false", ["Demo:SnapshotDate"] = "2026-10-30"
        }).Build();
        var clock = new DemoClock(config);
        var actual = clock.Today;
        var after = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, zone));
        Assert.InRange(actual, before, after);
    }
}
