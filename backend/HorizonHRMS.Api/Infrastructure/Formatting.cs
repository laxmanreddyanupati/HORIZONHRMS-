using System.Globalization;

namespace HorizonHRMS.Api.Infrastructure;

public static class Formatting
{
    private static readonly CultureInfo Indian = CultureInfo.GetCultureInfo("en-IN");

    /// <summary>Mirrors the frontend's formatCurrency helper, including Indian grouping.</summary>
    public static string Currency(decimal amount, bool compact = false)
    {
        if (compact)
        {
            if (amount >= 10_000_000m)
            {
                return $"₹{(amount / 10_000_000m).ToString("0.00", CultureInfo.InvariantCulture)} Cr";
            }

            if (amount >= 100_000m)
            {
                return $"₹{(amount / 100_000m).ToString("0.0", CultureInfo.InvariantCulture)} L";
            }
        }

        var rounded = Math.Round(amount, 0, MidpointRounding.AwayFromZero);
        return $"₹{rounded.ToString("N0", Indian)}";
    }

    public static string MonthShort(int month) =>
        CultureInfo.InvariantCulture.DateTimeFormat.GetAbbreviatedMonthName(month);

    public static string DayShort(DateOnly date) =>
        CultureInfo.InvariantCulture.DateTimeFormat.GetAbbreviatedDayName(date.DayOfWeek);

    public static string DateLong(DateOnly date) => date.ToString("dd MMM yyyy", CultureInfo.InvariantCulture);
}

public static class SeedOrder
{
    // The demo frontend relied on array order for stable chart colours and
    // report row order. Keep the same deterministic order when reading back
    // from SQL Server.
    public static readonly string[] DepartmentIds =
    [
        "dept-exec",
        "dept-eng",
        "dept-product",
        "dept-design",
        "dept-hr",
        "dept-finance",
        "dept-sales",
        "dept-marketing",
        "dept-cs",
        "dept-itops",
        "dept-legal",
    ];

    public static readonly string[] LeaveTypeIds =
    [
        "lt-casual",
        "lt-sick",
        "lt-earned",
        "lt-unpaid",
        "lt-paternity",
        "lt-comp",
    ];

    public static readonly string[] ChartColors =
    [
        "#2563eb",
        "#0ea5e9",
        "#14b8a6",
        "#f59e0b",
        "#8b5cf6",
        "#f43f5e",
        "#64748b",
    ];

    public static List<T> OrderBySeed<T>(
        IEnumerable<T> items, Func<T, string> idSelector, IReadOnlyList<string> order)
    {
        var rank = order
            .Select((id, index) => new { id, index })
            .ToDictionary(item => item.id, item => item.index, StringComparer.Ordinal);

        return items
            .OrderBy(item => rank.TryGetValue(idSelector(item), out var index) ? index : int.MaxValue)
            .ThenBy(idSelector, StringComparer.Ordinal)
            .ToList();
    }
}
