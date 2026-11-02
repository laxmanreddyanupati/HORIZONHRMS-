using System.Text.Json;
using HorizonHRMS.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace HorizonHRMS.Api.Data;

public class HrmsDbContext(DbContextOptions<HrmsDbContext> options) : DbContext(options)
{
    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<Designation> Designations => Set<Designation>();
    public DbSet<Branch> Branches => Set<Branch>();
    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<EmergencyContact> EmergencyContacts => Set<EmergencyContact>();
    public DbSet<EmployeeDocument> EmployeeDocuments => Set<EmployeeDocument>();
    public DbSet<EmploymentHistoryItem> EmploymentHistory => Set<EmploymentHistoryItem>();
    public DbSet<Shift> Shifts => Set<Shift>();
    public DbSet<Holiday> Holidays => Set<Holiday>();
    public DbSet<AttendanceRecord> AttendanceRecords => Set<AttendanceRecord>();
    public DbSet<AttendanceCorrection> AttendanceCorrections => Set<AttendanceCorrection>();
    public DbSet<LeaveType> LeaveTypes => Set<LeaveType>();
    public DbSet<LeavePolicy> LeavePolicies => Set<LeavePolicy>();
    public DbSet<LeaveBalance> LeaveBalances => Set<LeaveBalance>();
    public DbSet<LeaveRequest> LeaveRequests => Set<LeaveRequest>();
    public DbSet<SalaryStructure> SalaryStructures => Set<SalaryStructure>();
    public DbSet<PayrollRun> PayrollRuns => Set<PayrollRun>();
    public DbSet<Payslip> Payslips => Set<Payslip>();
    public DbSet<StatutorySetting> StatutorySettings => Set<StatutorySetting>();
    public DbSet<JobOpening> JobOpenings => Set<JobOpening>();
    public DbSet<Candidate> Candidates => Set<Candidate>();
    public DbSet<Interview> Interviews => Set<Interview>();
    public DbSet<AppraisalCycle> AppraisalCycles => Set<AppraisalCycle>();
    public DbSet<Goal> Goals => Set<Goal>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<Feedback> Feedback => Set<Feedback>();
    public DbSet<ExpenseCategory> ExpenseCategories => Set<ExpenseCategory>();
    public DbSet<ExpenseClaim> ExpenseClaims => Set<ExpenseClaim>();
    public DbSet<CompanySetting> CompanySettings => Set<CompanySetting>();
    public DbSet<AttendanceSetting> AttendanceSettings => Set<AttendanceSetting>();
    public DbSet<PayrollSetting> PayrollSettings => Set<PayrollSetting>();
    public DbSet<NotificationPreference> NotificationPreferences => Set<NotificationPreference>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var stringListConverter = new ValueConverter<List<string>, string>(
            value => JsonSerializer.Serialize(value, (JsonSerializerOptions?)null),
            value => JsonSerializer.Deserialize<List<string>>(value, (JsonSerializerOptions?)null) ?? new List<string>());

        var stringListComparer = new ValueComparer<List<string>>(
            (left, right) => left != null && right != null && left.SequenceEqual(right),
            value => value.Aggregate(0, (hash, item) => HashCode.Combine(hash, item.GetHashCode())),
            value => value.ToList());

        var componentListConverter = new ValueConverter<List<SalaryComponent>, string>(
            value => JsonSerializer.Serialize(value, (JsonSerializerOptions?)null),
            value => JsonSerializer.Deserialize<List<SalaryComponent>>(value, (JsonSerializerOptions?)null) ?? new List<SalaryComponent>());

        var componentListComparer = new ValueComparer<List<SalaryComponent>>(
            (left, right) => left != null && right != null && left.Count == right.Count &&
                             left.Zip(right).All(pair => pair.First.Id == pair.Second.Id &&
                                                          pair.First.Name == pair.Second.Name &&
                                                          pair.First.Type == pair.Second.Type &&
                                                          pair.First.Amount == pair.Second.Amount),
            value => value.Aggregate(0, (hash, item) => HashCode.Combine(hash, item.Id, item.Name, item.Amount)),
            value => value.ToList());

        modelBuilder.Entity<AppUser>(entity =>
        {
            entity.HasKey(user => user.Id);
            entity.Property(user => user.Id).HasMaxLength(32);
            entity.Property(user => user.Name).HasMaxLength(160).IsRequired();
            entity.Property(user => user.Email).HasMaxLength(256).IsRequired();
            entity.HasIndex(user => user.Email).IsUnique();
            entity.Property(user => user.Role).HasMaxLength(32).IsRequired();
            entity.Property(user => user.Status).HasMaxLength(24).IsRequired();
            entity.HasMany(user => user.RefreshTokens)
                .WithOne(token => token.User)
                .HasForeignKey(token => token.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(token => token.Id);
            entity.Property(token => token.Id).HasMaxLength(64);
            entity.Property(token => token.TokenHash).HasMaxLength(128).IsRequired();
            entity.HasIndex(token => token.TokenHash).IsUnique();
            entity.Property(token => token.ReplacedByTokenHash).HasMaxLength(128);
        });

        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(log => log.Id);
            entity.Property(log => log.Id).HasMaxLength(64);
            entity.Property(log => log.Actor).HasMaxLength(160);
            entity.Property(log => log.ActorRole).HasMaxLength(32);
            entity.Property(log => log.Action).HasMaxLength(120);
            entity.Property(log => log.Module).HasMaxLength(64);
            entity.Property(log => log.Target).HasMaxLength(240);
            entity.Property(log => log.IpAddress).HasMaxLength(64);
            entity.HasIndex(log => log.Timestamp);
        });

        modelBuilder.Entity<Department>(entity =>
        {
            entity.HasKey(department => department.Id);
            entity.Property(department => department.Id).HasMaxLength(32);
            entity.Property(department => department.Name).HasMaxLength(160).IsRequired();
            entity.Property(department => department.Code).HasMaxLength(24).IsRequired();
            entity.HasIndex(department => department.Code).IsUnique();
            entity.Property(department => department.Email).HasMaxLength(256);
        });

        modelBuilder.Entity<Designation>(entity =>
        {
            entity.HasKey(designation => designation.Id);
            entity.Property(designation => designation.Id).HasMaxLength(32);
            entity.Property(designation => designation.Title).HasMaxLength(160).IsRequired();
            entity.Property(designation => designation.Level).HasMaxLength(8);
            entity.Property(designation => designation.Grade).HasMaxLength(16);
        });

        modelBuilder.Entity<Branch>(entity =>
        {
            entity.HasKey(branch => branch.Id);
            entity.Property(branch => branch.Id).HasMaxLength(32);
            entity.Property(branch => branch.Name).HasMaxLength(160).IsRequired();
            entity.Property(branch => branch.City).HasMaxLength(80);
            entity.Property(branch => branch.State).HasMaxLength(80);
        });

        modelBuilder.Entity<Employee>(entity =>
        {
            entity.HasKey(employee => employee.Id);
            entity.Property(employee => employee.Id).HasMaxLength(32);
            entity.Property(employee => employee.FirstName).HasMaxLength(80).IsRequired();
            entity.Property(employee => employee.LastName).HasMaxLength(80).IsRequired();
            entity.Property(employee => employee.Email).HasMaxLength(256).IsRequired();
            entity.HasIndex(employee => employee.Email).IsUnique();
            entity.Property(employee => employee.PersonalEmail).HasMaxLength(256);
            entity.Property(employee => employee.Phone).HasMaxLength(32);
            entity.Property(employee => employee.Gender).HasMaxLength(16);
            entity.Property(employee => employee.MaritalStatus).HasMaxLength(16);
            entity.Property(employee => employee.BloodGroup).HasMaxLength(8);
            entity.Property(employee => employee.EmploymentType).HasMaxLength(24);
            entity.Property(employee => employee.Status).HasMaxLength(24);
            entity.Property(employee => employee.WorkLocation).HasMaxLength(120);
            entity.Property(employee => employee.ShiftId).HasMaxLength(32);
            entity.Property(employee => employee.Skills)
                .HasConversion(stringListConverter)
                .Metadata.SetValueComparer(stringListComparer);
            entity.HasIndex(employee => employee.DepartmentId);
            entity.HasIndex(employee => employee.ManagerId);

            entity.OwnsOne(employee => employee.Address, address =>
            {
                address.Property(item => item.Line1).HasColumnName("AddressLine1").HasMaxLength(240);
                address.Property(item => item.City).HasColumnName("AddressCity").HasMaxLength(80);
                address.Property(item => item.State).HasColumnName("AddressState").HasMaxLength(80);
                address.Property(item => item.PostalCode).HasColumnName("AddressPostalCode").HasMaxLength(16);
                address.Property(item => item.Country).HasColumnName("AddressCountry").HasMaxLength(80);
            });

            entity.OwnsOne(employee => employee.Bank, bank =>
            {
                bank.Property(item => item.BankName).HasColumnName("BankName").HasMaxLength(120);
                bank.Property(item => item.AccountNumber).HasColumnName("BankAccountNumber").HasMaxLength(40);
                bank.Property(item => item.Ifsc).HasColumnName("BankIfsc").HasMaxLength(16);
                bank.Property(item => item.Branch).HasColumnName("BankBranch").HasMaxLength(120);
                bank.Property(item => item.AccountType).HasColumnName("BankAccountType").HasMaxLength(32);
            });

            entity.OwnsOne(employee => employee.Statutory, statutory =>
            {
                statutory.Property(item => item.Pan).HasColumnName("StatutoryPan").HasMaxLength(16);
                statutory.Property(item => item.Aadhaar).HasColumnName("StatutoryAadhaar").HasMaxLength(24);
                statutory.Property(item => item.Uan).HasColumnName("StatutoryUan").HasMaxLength(24);
                statutory.Property(item => item.PfNumber).HasColumnName("StatutoryPfNumber").HasMaxLength(40);
                statutory.Property(item => item.EsiNumber).HasColumnName("StatutoryEsiNumber").HasMaxLength(40);
            });

            entity.HasMany(employee => employee.EmergencyContacts)
                .WithOne()
                .HasForeignKey(contact => contact.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(employee => employee.Documents)
                .WithOne()
                .HasForeignKey(document => document.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(employee => employee.EmploymentHistory)
                .WithOne()
                .HasForeignKey(history => history.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<EmergencyContact>(entity =>
        {
            entity.HasKey(contact => contact.Id);
            entity.Property(contact => contact.Id).HasMaxLength(48);
            entity.Property(contact => contact.Name).HasMaxLength(120);
            entity.Property(contact => contact.Relationship).HasMaxLength(64);
            entity.Property(contact => contact.Phone).HasMaxLength(32);
        });

        modelBuilder.Entity<EmployeeDocument>(entity =>
        {
            entity.HasKey(document => document.Id);
            entity.Property(document => document.Id).HasMaxLength(48);
            entity.Property(document => document.Name).HasMaxLength(240);
            entity.Property(document => document.Category).HasMaxLength(64);
            entity.Property(document => document.Size).HasMaxLength(32);
            entity.Property(document => document.Status).HasMaxLength(24);
        });

        modelBuilder.Entity<EmploymentHistoryItem>(entity =>
        {
            entity.HasKey(history => history.Id);
            entity.Property(history => history.Id).HasMaxLength(48);
            entity.Property(history => history.Title).HasMaxLength(160);
            entity.Property(history => history.Department).HasMaxLength(160);
            entity.Property(history => history.Type).HasMaxLength(32);
        });

        modelBuilder.Entity<Shift>(entity =>
        {
            entity.HasKey(shift => shift.Id);
            entity.Property(shift => shift.Id).HasMaxLength(32);
            entity.Property(shift => shift.Name).HasMaxLength(80);
            entity.Property(shift => shift.StartTime).HasMaxLength(8);
            entity.Property(shift => shift.EndTime).HasMaxLength(8);
            entity.Property(shift => shift.Days).HasMaxLength(80);
        });

        modelBuilder.Entity<Holiday>(entity =>
        {
            entity.HasKey(holiday => holiday.Id);
            entity.Property(holiday => holiday.Id).HasMaxLength(32);
            entity.Property(holiday => holiday.Name).HasMaxLength(120);
            entity.Property(holiday => holiday.Type).HasMaxLength(24);
            entity.HasIndex(holiday => holiday.Date);
        });

        modelBuilder.Entity<AttendanceRecord>(entity =>
        {
            entity.HasKey(record => record.Id);
            entity.Property(record => record.Id).HasMaxLength(64);
            entity.Property(record => record.EmployeeId).HasMaxLength(32);
            entity.Property(record => record.CheckIn).HasMaxLength(8);
            entity.Property(record => record.CheckOut).HasMaxLength(8);
            entity.Property(record => record.Status).HasMaxLength(24);
            entity.Property(record => record.ShiftId).HasMaxLength(32);
            entity.Property(record => record.WorkedHours).HasPrecision(5, 2);
            entity.Property(record => record.Note).HasMaxLength(240);
            entity.HasIndex(record => new { record.EmployeeId, record.Date }).IsUnique();
            entity.HasIndex(record => record.Date);
        });

        modelBuilder.Entity<AttendanceCorrection>(entity =>
        {
            entity.HasKey(correction => correction.Id);
            entity.Property(correction => correction.Id).HasMaxLength(64);
            entity.Property(correction => correction.EmployeeId).HasMaxLength(32);
            entity.Property(correction => correction.CurrentStatus).HasMaxLength(24);
            entity.Property(correction => correction.RequestedStatus).HasMaxLength(24);
            entity.Property(correction => correction.Reason).HasMaxLength(500);
            entity.Property(correction => correction.Status).HasMaxLength(24);
            entity.Property(correction => correction.Note).HasMaxLength(500);
        });

        modelBuilder.Entity<LeaveType>(entity =>
        {
            entity.HasKey(type => type.Id);
            entity.Property(type => type.Id).HasMaxLength(32);
            entity.Property(type => type.Name).HasMaxLength(80);
            entity.Property(type => type.Code).HasMaxLength(16);
            entity.HasIndex(type => type.Code).IsUnique();
            entity.Property(type => type.Color).HasMaxLength(16);
        });

        modelBuilder.Entity<LeavePolicy>(entity =>
        {
            entity.HasKey(policy => policy.LeaveTypeId);
            entity.Property(policy => policy.LeaveTypeId).HasMaxLength(32);
            entity.Property(policy => policy.Accrual).HasMaxLength(120);
            entity.Property(policy => policy.Policy).HasMaxLength(1000);
        });

        modelBuilder.Entity<LeaveBalance>(entity =>
        {
            entity.HasKey(balance => new { balance.EmployeeId, balance.LeaveTypeId });
            entity.Property(balance => balance.EmployeeId).HasMaxLength(32);
            entity.Property(balance => balance.LeaveTypeId).HasMaxLength(32);
            entity.Property(balance => balance.Allocated).HasPrecision(6, 1);
            entity.Property(balance => balance.Used).HasPrecision(6, 1);
            entity.Property(balance => balance.Pending).HasPrecision(6, 1);
        });

        modelBuilder.Entity<LeaveRequest>(entity =>
        {
            entity.HasKey(request => request.Id);
            entity.Property(request => request.Id).HasMaxLength(32);
            entity.Property(request => request.EmployeeId).HasMaxLength(32);
            entity.Property(request => request.LeaveTypeId).HasMaxLength(32);
            entity.Property(request => request.Days).HasPrecision(6, 1);
            entity.Property(request => request.Reason).HasMaxLength(500);
            entity.Property(request => request.Status).HasMaxLength(24);
            entity.Property(request => request.Note).HasMaxLength(500);
            entity.HasIndex(request => request.EmployeeId);
            entity.HasIndex(request => request.Status);
        });

        modelBuilder.Entity<SalaryStructure>(entity =>
        {
            entity.HasKey(structure => structure.EmployeeId);
            entity.Property(structure => structure.EmployeeId).HasMaxLength(32);
            entity.Property(structure => structure.AnnualCtc).HasPrecision(18, 2);
            entity.Property(structure => structure.Earnings)
                .HasConversion(componentListConverter)
                .Metadata.SetValueComparer(componentListComparer);
            entity.Property(structure => structure.Deductions)
                .HasConversion(componentListConverter)
                .Metadata.SetValueComparer(componentListComparer);
        });

        modelBuilder.Entity<PayrollRun>(entity =>
        {
            entity.HasKey(run => run.Id);
            entity.Property(run => run.Id).HasMaxLength(32);
            entity.Property(run => run.PeriodLabel).HasMaxLength(48);
            entity.Property(run => run.Status).HasMaxLength(24);
            entity.Property(run => run.GrossTotal).HasPrecision(18, 2);
            entity.Property(run => run.DeductionsTotal).HasPrecision(18, 2);
            entity.Property(run => run.NetTotal).HasPrecision(18, 2);
            entity.HasIndex(run => new { run.Year, run.Month }).IsUnique();
        });

        modelBuilder.Entity<Payslip>(entity =>
        {
            entity.HasKey(slip => slip.Id);
            entity.Property(slip => slip.Id).HasMaxLength(48);
            entity.Property(slip => slip.EmployeeId).HasMaxLength(32);
            entity.Property(slip => slip.PayrollRunId).HasMaxLength(32);
            entity.Property(slip => slip.Status).HasMaxLength(24);
            entity.Property(slip => slip.Gross).HasPrecision(18, 2);
            entity.Property(slip => slip.TotalDeductions).HasPrecision(18, 2);
            entity.Property(slip => slip.Net).HasPrecision(18, 2);
            entity.Property(slip => slip.Earnings)
                .HasConversion(componentListConverter)
                .Metadata.SetValueComparer(componentListComparer);
            entity.Property(slip => slip.Deductions)
                .HasConversion(componentListConverter)
                .Metadata.SetValueComparer(componentListComparer);
            entity.HasIndex(slip => new { slip.EmployeeId, slip.PayrollRunId }).IsUnique();
        });

        modelBuilder.Entity<StatutorySetting>(entity =>
        {
            entity.HasKey(setting => setting.Id);
            entity.Property(setting => setting.Id).ValueGeneratedNever();
            entity.Property(setting => setting.Label).HasMaxLength(120);
            entity.Property(setting => setting.Description).HasMaxLength(1000);
            entity.Property(setting => setting.PfEmployeeRate).HasPrecision(6, 4);
            entity.Property(setting => setting.EsiEmployeeRate).HasPrecision(6, 4);
            entity.Property(setting => setting.EsiGrossThreshold).HasPrecision(18, 2);
            entity.Property(setting => setting.ProfessionalTaxMonthly).HasPrecision(18, 2);
            entity.Property(setting => setting.IllustrativeTdsRate).HasPrecision(6, 4);
            entity.Property(setting => setting.TdsThresholdMonthly).HasPrecision(18, 2);
        });

        modelBuilder.Entity<JobOpening>(entity =>
        {
            entity.HasKey(job => job.Id);
            entity.Property(job => job.Id).HasMaxLength(32);
            entity.Property(job => job.Title).HasMaxLength(160);
            entity.Property(job => job.DepartmentId).HasMaxLength(32);
            entity.Property(job => job.Location).HasMaxLength(120);
            entity.Property(job => job.EmploymentType).HasMaxLength(24);
            entity.Property(job => job.Status).HasMaxLength(24);
            entity.Property(job => job.HiringManagerId).HasMaxLength(32);
            entity.Property(job => job.SalaryRange).HasMaxLength(80);
            entity.Property(job => job.Skills)
                .HasConversion(stringListConverter)
                .Metadata.SetValueComparer(stringListComparer);
        });

        modelBuilder.Entity<Candidate>(entity =>
        {
            entity.HasKey(candidate => candidate.Id);
            entity.Property(candidate => candidate.Id).HasMaxLength(32);
            entity.Property(candidate => candidate.JobId).HasMaxLength(32);
            entity.Property(candidate => candidate.FirstName).HasMaxLength(80);
            entity.Property(candidate => candidate.LastName).HasMaxLength(80);
            entity.Property(candidate => candidate.Email).HasMaxLength(256);
            entity.Property(candidate => candidate.Phone).HasMaxLength(32);
            entity.Property(candidate => candidate.Location).HasMaxLength(120);
            entity.Property(candidate => candidate.Source).HasMaxLength(32);
            entity.Property(candidate => candidate.Stage).HasMaxLength(24);
            entity.Property(candidate => candidate.CurrentCompany).HasMaxLength(160);
            entity.Property(candidate => candidate.ExpectedCtc).HasPrecision(18, 2);
            entity.Property(candidate => candidate.ExperienceYears).HasPrecision(4, 1);
            entity.Property(candidate => candidate.Rating).HasPrecision(3, 1);
            entity.HasIndex(candidate => candidate.Email);
        });

        modelBuilder.Entity<Interview>(entity =>
        {
            entity.HasKey(interview => interview.Id);
            entity.Property(interview => interview.Id).HasMaxLength(32);
            entity.Property(interview => interview.CandidateId).HasMaxLength(32);
            entity.Property(interview => interview.JobId).HasMaxLength(32);
            entity.Property(interview => interview.Round).HasMaxLength(80);
            entity.Property(interview => interview.Time).HasMaxLength(8);
            entity.Property(interview => interview.Mode).HasMaxLength(24);
            entity.Property(interview => interview.Interviewer).HasMaxLength(160);
            entity.Property(interview => interview.Status).HasMaxLength(24);
        });

        modelBuilder.Entity<AppraisalCycle>(entity =>
        {
            entity.HasKey(cycle => cycle.Id);
            entity.Property(cycle => cycle.Id).HasMaxLength(32);
            entity.Property(cycle => cycle.Name).HasMaxLength(120);
            entity.Property(cycle => cycle.Period).HasMaxLength(64);
            entity.Property(cycle => cycle.Status).HasMaxLength(24);
        });

        modelBuilder.Entity<Goal>(entity =>
        {
            entity.HasKey(goal => goal.Id);
            entity.Property(goal => goal.Id).HasMaxLength(64);
            entity.Property(goal => goal.EmployeeId).HasMaxLength(32);
            entity.Property(goal => goal.Title).HasMaxLength(160);
            entity.Property(goal => goal.Category).HasMaxLength(64);
            entity.Property(goal => goal.Target).HasMaxLength(240);
            entity.Property(goal => goal.Status).HasMaxLength(24);
            entity.HasIndex(goal => goal.EmployeeId);
        });

        modelBuilder.Entity<Review>(entity =>
        {
            entity.HasKey(review => review.Id);
            entity.Property(review => review.Id).HasMaxLength(32);
            entity.Property(review => review.EmployeeId).HasMaxLength(32);
            entity.Property(review => review.CycleId).HasMaxLength(32);
            entity.Property(review => review.ReviewerId).HasMaxLength(32);
            entity.Property(review => review.Type).HasMaxLength(24);
            entity.Property(review => review.Status).HasMaxLength(24);
            entity.Property(review => review.Rating).HasPrecision(3, 1);
        });

        modelBuilder.Entity<Feedback>(entity =>
        {
            entity.HasKey(feedback => feedback.Id);
            entity.Property(feedback => feedback.Id).HasMaxLength(32);
            entity.Property(feedback => feedback.EmployeeId).HasMaxLength(32);
            entity.Property(feedback => feedback.FromId).HasMaxLength(32);
            entity.Property(feedback => feedback.Type).HasMaxLength(24);
            entity.Property(feedback => feedback.Message).HasMaxLength(1000);
            entity.Property(feedback => feedback.Rating).HasPrecision(3, 1);
        });

        modelBuilder.Entity<ExpenseCategory>(entity =>
        {
            entity.HasKey(category => category.Id);
            entity.Property(category => category.Id).HasMaxLength(32);
            entity.Property(category => category.Name).HasMaxLength(120);
            entity.Property(category => category.Limit).HasPrecision(18, 2);
            entity.Property(category => category.Description).HasMaxLength(500);
        });

        modelBuilder.Entity<ExpenseClaim>(entity =>
        {
            entity.HasKey(claim => claim.Id);
            entity.Property(claim => claim.Id).HasMaxLength(32);
            entity.Property(claim => claim.EmployeeId).HasMaxLength(32);
            entity.Property(claim => claim.CategoryId).HasMaxLength(32);
            entity.Property(claim => claim.Title).HasMaxLength(160);
            entity.Property(claim => claim.Amount).HasPrecision(18, 2);
            entity.Property(claim => claim.Status).HasMaxLength(24);
            entity.Property(claim => claim.Description).HasMaxLength(1000);
            entity.Property(claim => claim.ReceiptName).HasMaxLength(240);
            entity.Property(claim => claim.ReceiptPath).HasMaxLength(500);
            entity.HasIndex(claim => claim.EmployeeId);
            entity.HasIndex(claim => claim.Status);
        });

        modelBuilder.Entity<CompanySetting>(entity =>
        {
            entity.HasKey(setting => setting.Id);
            entity.Property(setting => setting.Id).ValueGeneratedNever();
            entity.Property(setting => setting.LegalName).HasMaxLength(200);
            entity.Property(setting => setting.DisplayName).HasMaxLength(160);
            entity.Property(setting => setting.Domain).HasMaxLength(120);
            entity.Property(setting => setting.Email).HasMaxLength(256);
        });

        modelBuilder.Entity<AttendanceSetting>(entity =>
        {
            entity.HasKey(setting => setting.Id);
            entity.Property(setting => setting.Id).ValueGeneratedNever();
            entity.Property(setting => setting.WorkWeek).HasMaxLength(80);
            entity.Property(setting => setting.ShiftStart).HasMaxLength(8);
            entity.Property(setting => setting.ShiftEnd).HasMaxLength(8);
            entity.Property(setting => setting.HalfDayHours).HasPrecision(4, 1);
            entity.Property(setting => setting.FullDayHours).HasPrecision(4, 1);
        });

        modelBuilder.Entity<PayrollSetting>(entity =>
        {
            entity.HasKey(setting => setting.Id);
            entity.Property(setting => setting.Id).ValueGeneratedNever();
            entity.Property(setting => setting.PayslipRelease).HasMaxLength(120);
            entity.Property(setting => setting.BankFileFormat).HasMaxLength(64);
            entity.Property(setting => setting.StatutoryProfile).HasMaxLength(120);
            entity.Property(setting => setting.TdsMethod).HasMaxLength(120);
            entity.Property(setting => setting.Disclaimer).HasMaxLength(1000);
            entity.Property(setting => setting.PfRate).HasPrecision(6, 2);
            entity.Property(setting => setting.EsiRate).HasPrecision(6, 2);
            entity.Property(setting => setting.ProfessionalTax).HasPrecision(18, 2);
        });

        modelBuilder.Entity<NotificationPreference>(entity =>
        {
            entity.HasKey(preference => preference.Id);
            entity.Property(preference => preference.Id).HasMaxLength(32);
            entity.Property(preference => preference.Label).HasMaxLength(160);
        });
    }
}
