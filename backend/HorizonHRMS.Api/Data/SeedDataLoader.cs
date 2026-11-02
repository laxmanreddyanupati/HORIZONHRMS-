using System.Text.Json;
using HorizonHRMS.Api.Infrastructure;
using HorizonHRMS.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace HorizonHRMS.Api.Data;

public sealed class SeedOptions
{
    public const string SectionName = "Seed";

    public bool Enabled { get; set; } = true;
    /// <summary>Email -> plaintext password. Required outside Development.</summary>
    public Dictionary<string, string> UserPasswords { get; set; } = new(StringComparer.OrdinalIgnoreCase);
}

public static class SeedDataLoader
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };

    private sealed record SeedUser(
        string Id,
        string? EmployeeId,
        string Name,
        string Email,
        string Role,
        string Status,
        string? LastActive,
        bool MfaEnabled);

    private sealed record SeedMeta(string SnapshotDate, string DemoManagerEmployeeId, string DemoSelfServiceEmployeeId, string CurrentCycleId);

    private sealed record SeedCompanyProfile(
        string LegalName, string DisplayName, string Domain, string Industry, string Headquarters,
        string Email, string Phone, string Website, string Gstin, string Pan, string Cin,
        string Currency, string Timezone, string FinancialYear, string PayrollFrequency);

    private sealed record SeedStatutoryConfig(
        string Label, DateOnly EffectiveFrom, string Description, decimal PfEmployeeRate,
        decimal EsiEmployeeRate, decimal EsiGrossThreshold, decimal ProfessionalTaxMonthly,
        decimal IllustrativeTdsRate, decimal TdsThresholdMonthly);

    public static async Task SeedAsync(
        HrmsDbContext db,
        SeedOptions options,
        IWebHostEnvironment environment,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        if (!options.Enabled)
        {
            logger.LogInformation("Database seeding is disabled.");
            return;
        }

        if (await db.Users.AnyAsync(cancellationToken) || await db.Employees.AnyAsync(cancellationToken))
        {
            logger.LogInformation("Database already contains HRMS data; skipping seed.");
            return;
        }

        var seedDirectory = Path.Combine(environment.ContentRootPath, "Data", "Seed");
        if (!Directory.Exists(seedDirectory))
        {
            logger.LogWarning("Seed directory {Directory} was not found; skipping seed.", seedDirectory);
            return;
        }

        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        logger.LogInformation("Seeding HRMS database from {Directory}", seedDirectory);

        T[] Load<T>(string file) where T : class
        {
            var path = Path.Combine(seedDirectory, file);
            if (!File.Exists(path))
            {
                logger.LogWarning("Seed file {File} was not found; using an empty set.", file);
                return [];
            }

            using var stream = File.OpenRead(path);
            return JsonSerializer.Deserialize<T[]>(stream, JsonOptions) ?? [];
        }

        T? LoadSingle<T>(string file) where T : class
        {
            var path = Path.Combine(seedDirectory, file);
            if (!File.Exists(path))
            {
                logger.LogWarning("Seed file {File} was not found.", file);
                return null;
            }

            using var stream = File.OpenRead(path);
            return JsonSerializer.Deserialize<T>(stream, JsonOptions);
        }

        var meta = JsonSerializer.Deserialize<SeedMeta>(
            await File.ReadAllTextAsync(Path.Combine(seedDirectory, "meta.json"), cancellationToken), JsonOptions);

        // Reference data first; EF inserts dependants after the principal rows.
        db.Branches.AddRange(Load<Branch>("branches.json"));
        db.Departments.AddRange(Load<Department>("departments.json"));
        db.Designations.AddRange(Load<Designation>("designations.json"));
        db.Shifts.AddRange(Load<Shift>("shifts.json"));
        db.Holidays.AddRange(Load<Holiday>("holidays.json"));

        var employees = Load<Employee>("employees.json");
        var usedContactIds = new HashSet<string>(StringComparer.Ordinal);
        var usedDocumentIds = new HashSet<string>(StringComparer.Ordinal);
        var usedHistoryIds = new HashSet<string>(StringComparer.Ordinal);
        foreach (var employee in employees)
        {
            employee.Address ??= new Address();
            employee.Skills ??= [];
            employee.EmergencyContacts ??= [];
            employee.Documents ??= [];
            employee.EmploymentHistory ??= [];
            employee.Email = employee.Email.Trim().ToLowerInvariant();
            employee.PersonalEmail = employee.PersonalEmail.Trim().ToLowerInvariant();
            employee.CreatedAt = DateTime.UtcNow;
            employee.UpdatedAt = DateTime.UtcNow;

            foreach (var contact in employee.EmergencyContacts)
            {
                contact.EmployeeId = employee.Id;
                if (!usedContactIds.Add(contact.Id))
                {
                    contact.Id = $"{employee.Id}-{contact.Id}";
                }
            }

            foreach (var document in employee.Documents)
            {
                document.EmployeeId = employee.Id;
                if (!usedDocumentIds.Add(document.Id))
                {
                    document.Id = $"{employee.Id}-{document.Id}";
                }
            }

            foreach (var history in employee.EmploymentHistory)
            {
                history.EmployeeId = employee.Id;
                if (!usedHistoryIds.Add(history.Id))
                {
                    history.Id = $"{employee.Id}-{history.Id}";
                }
            }
        }

        db.Employees.AddRange(employees);

        db.AttendanceRecords.AddRange(Load<AttendanceRecord>("attendance-records.json"));
        db.AttendanceCorrections.AddRange(Load<AttendanceCorrection>("attendance-corrections.json"));
        db.LeaveTypes.AddRange(Load<LeaveType>("leave-types.json"));
        db.LeavePolicies.AddRange(Load<LeavePolicy>("leave-policies.json"));
        db.LeaveBalances.AddRange(Load<LeaveBalance>("leave-balances.json"));
        db.LeaveRequests.AddRange(Load<LeaveRequest>("leave-requests.json"));
        db.SalaryStructures.AddRange(Load<SalaryStructure>("salary-structures.json"));
        db.PayrollRuns.AddRange(Load<PayrollRun>("payroll-runs.json"));
        db.Payslips.AddRange(Load<Payslip>("payslips.json"));
        db.JobOpenings.AddRange(Load<JobOpening>("job-openings.json"));
        db.Candidates.AddRange(Load<Candidate>("candidates.json"));
        db.Interviews.AddRange(Load<Interview>("interviews.json"));
        db.AppraisalCycles.AddRange(Load<AppraisalCycle>("appraisal-cycles.json"));
        db.Goals.AddRange(Load<Goal>("goals.json"));
        db.Reviews.AddRange(Load<Review>("reviews.json"));
        db.Feedback.AddRange(Load<Feedback>("feedback.json"));
        db.ExpenseCategories.AddRange(Load<ExpenseCategory>("expense-categories.json"));
        db.ExpenseClaims.AddRange(Load<ExpenseClaim>("expense-claims.json"));
        db.AuditLogs.AddRange(Load<AuditLog>("audit-logs.json"));
        db.NotificationPreferences.AddRange(Load<NotificationPreference>("notification-preferences.json"));

        var company = JsonSerializer.Deserialize<SeedCompanyProfile>(
            await File.ReadAllTextAsync(Path.Combine(seedDirectory, "company-profile.json"), cancellationToken), JsonOptions);
        if (company is not null)
        {
            db.CompanySettings.Add(new CompanySetting
            {
                Id = 1,
                LegalName = company.LegalName,
                DisplayName = company.DisplayName,
                Domain = company.Domain,
                Industry = company.Industry,
                Headquarters = company.Headquarters,
                Email = company.Email,
                Phone = company.Phone,
                Website = company.Website,
                Gstin = company.Gstin,
                Pan = company.Pan,
                Cin = company.Cin,
                Currency = company.Currency,
                Timezone = company.Timezone,
                FinancialYear = company.FinancialYear,
                PayrollFrequency = company.PayrollFrequency,
            });
        }

        var attendanceSettings = LoadSingle<AttendanceSetting>("attendance-settings.json");
        if (attendanceSettings is not null)
        {
            attendanceSettings.Id = 1;
            db.AttendanceSettings.Add(attendanceSettings);
        }

        var payrollSettings = LoadSingle<PayrollSetting>("payroll-settings.json");
        if (payrollSettings is not null)
        {
            payrollSettings.Id = 1;
            db.PayrollSettings.Add(payrollSettings);
        }

        var statutory = JsonSerializer.Deserialize<SeedStatutoryConfig>(
            await File.ReadAllTextAsync(Path.Combine(seedDirectory, "statutory-config.json"), cancellationToken), JsonOptions);
        if (statutory is not null)
        {
            db.StatutorySettings.Add(new StatutorySetting
            {
                Id = 1,
                Label = statutory.Label,
                EffectiveFrom = statutory.EffectiveFrom,
                Description = statutory.Description,
                PfEmployeeRate = statutory.PfEmployeeRate,
                EsiEmployeeRate = statutory.EsiEmployeeRate,
                EsiGrossThreshold = statutory.EsiGrossThreshold,
                ProfessionalTaxMonthly = statutory.ProfessionalTaxMonthly,
                IllustrativeTdsRate = statutory.IllustrativeTdsRate,
                TdsThresholdMonthly = statutory.TdsThresholdMonthly,
            });
        }

        var seedUsers = Load<SeedUser>("system-users.json");
        var generatedPasswords = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var seedUser in seedUsers)
        {
            var email = seedUser.Email.Trim().ToLowerInvariant();
            if (!options.UserPasswords.TryGetValue(email, out var password) || string.IsNullOrWhiteSpace(password))
            {
                if (!environment.IsDevelopment())
                {
                    throw new InvalidOperationException(
                        $"No seed password configured for {email}. Set Seed:UserPasswords:{email} (or the environment variable) before seeding outside Development.");
                }

                password = GenerateDevelopmentPassword();
                generatedPasswords[email] = password;
            }

            DateTime? lastActive = DateTime.TryParse(seedUser.LastActive, out var parsed) ? parsed : null;
            db.Users.Add(new AppUser
            {
                Id = seedUser.Id,
                EmployeeId = string.IsNullOrWhiteSpace(seedUser.EmployeeId) ? null : seedUser.EmployeeId,
                Name = seedUser.Name,
                Email = email,
                PasswordHash = PasswordService.Hash(password),
                Role = seedUser.Role,
                Status = seedUser.Status,
                LastActive = lastActive,
                MfaEnabled = seedUser.MfaEnabled,
            });
        }

        if (generatedPasswords.Count > 0)
        {
            var credentialsPath = Path.Combine(environment.ContentRootPath, ".seed-credentials.dev.txt");
            await File.WriteAllLinesAsync(
                credentialsPath,
                generatedPasswords.Select(pair => $"{pair.Key}={pair.Value}"),
                cancellationToken);
            logger.LogWarning(
                "Generated {Count} development-only seed passwords at {Path}. Do not use these credentials outside local development.",
                generatedPasswords.Count,
                credentialsPath);
        }

        await db.SaveChangesAsync(cancellationToken);
        stopwatch.Stop();
        logger.LogInformation(
            "Seed complete in {Elapsed:n1}s: {Employees} employees, {Users} users, {Records} attendance records, {Slips} payslips. Snapshot {Snapshot}.",
            stopwatch.Elapsed.TotalSeconds,
            employees.Length,
            seedUsers.Length,
            db.AttendanceRecords.Local.Count,
            db.Payslips.Local.Count,
            meta?.SnapshotDate ?? "unknown");
    }

    private static string GenerateDevelopmentPassword()
    {
        // 24 chars, no ambiguous characters, unique per user.
        const string alphabet = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
        var buffer = new char[24];
        for (var index = 0; index < buffer.Length; index++)
        {
            buffer[index] = alphabet[Random.Shared.Next(alphabet.Length)];
        }

        return new string(buffer);
    }
}
