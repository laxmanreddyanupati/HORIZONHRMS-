namespace HorizonHRMS.Api.Models;

public static class Roles
{
    public const string SuperAdmin = "super-admin";
    public const string HrAdmin = "hr-admin";
    public const string HrExecutive = "hr-executive";
    public const string Manager = "manager";
    public const string PayrollAdmin = "payroll-admin";
    public const string Employee = "employee";

    public static readonly string[] All =
        [SuperAdmin, HrAdmin, HrExecutive, Manager, PayrollAdmin, Employee];

    public static readonly string[] HrStaff = [SuperAdmin, HrAdmin, HrExecutive];
    public static readonly string[] PeopleManagers = [SuperAdmin, HrAdmin, HrExecutive, Manager];
    public static readonly string[] Admins = [SuperAdmin, HrAdmin];
    public static readonly string[] PayrollStaff = [SuperAdmin, HrAdmin, PayrollAdmin];
}

public static class EmployeeStatuses
{
    public const string Active = "Active";
    public const string Probation = "Probation";
    public const string OnLeave = "On Leave";
    public const string Inactive = "Inactive";
    public static readonly string[] All = [Active, Probation, OnLeave, Inactive];
}

public static class EmploymentTypes
{
    public const string FullTime = "Full-time";
    public const string Contract = "Contract";
    public const string Internship = "Internship";
    public static readonly string[] All = [FullTime, Contract, Internship];
}

public static class AttendanceStatuses
{
    public const string Present = "Present";
    public const string Absent = "Absent";
    public const string Late = "Late";
    public const string HalfDay = "Half Day";
    public const string OnLeave = "On Leave";
    public const string Holiday = "Holiday";
    public const string Weekend = "Weekend";
    public static readonly string[] All = [Present, Absent, Late, HalfDay, OnLeave, Holiday, Weekend];
}

public static class LeaveStatuses
{
    public const string Pending = "Pending";
    public const string Approved = "Approved";
    public const string Rejected = "Rejected";
    public const string Cancelled = "Cancelled";
}

public static class PayrollStatuses
{
    public const string Draft = "Draft";
    public const string Processing = "Processing";
    public const string Processed = "Processed";
    public const string Paid = "Paid";
}

public static class ExpenseStatuses
{
    public const string Pending = "Pending";
    public const string Approved = "Approved";
    public const string Rejected = "Rejected";
    public const string Reimbursed = "Reimbursed";
}

public class AppUser
{
    public string Id { get; set; } = string.Empty;
    public string? EmployeeId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = Roles.Employee;
    public string Status { get; set; } = "Active";
    public DateTime? LastActive { get; set; }
    public bool MfaEnabled { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<RefreshToken> RefreshTokens { get; set; } = [];
}

public class RefreshToken
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string TokenHash { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }
    public DateTime? RevokedAt { get; set; }
    public string? ReplacedByTokenHash { get; set; }
    public AppUser? User { get; set; }
}

public class AuditLog
{
    public string Id { get; set; } = string.Empty;
    public string Actor { get; set; } = string.Empty;
    public string ActorRole { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string Module { get; set; } = string.Empty;
    public string Target { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string IpAddress { get; set; } = string.Empty;
}

public class Department
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? HeadId { get; set; }
    public string? ParentId { get; set; }
    public string Location { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public DateOnly CreatedAt { get; set; }
}

public class Designation
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string DepartmentId { get; set; } = string.Empty;
    public string Level { get; set; } = "L1";
    public string Grade { get; set; } = string.Empty;
}

public class Branch
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? HeadId { get; set; }
    public bool IsHeadquarters { get; set; }
}

public class Address
{
    public string Line1 { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;
    public string Country { get; set; } = "India";
}

public class BankInfo
{
    public string BankName { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string Ifsc { get; set; } = string.Empty;
    public string Branch { get; set; } = string.Empty;
    public string AccountType { get; set; } = string.Empty;
}

public class StatutoryInfo
{
    public string Pan { get; set; } = string.Empty;
    public string Aadhaar { get; set; } = string.Empty;
    public string Uan { get; set; } = string.Empty;
    public string PfNumber { get; set; } = string.Empty;
    public string EsiNumber { get; set; } = string.Empty;
}

public class Employee
{
    public string Id { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PersonalEmail { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Gender { get; set; } = "Other";
    public DateOnly DateOfBirth { get; set; }
    public string MaritalStatus { get; set; } = "Single";
    public string BloodGroup { get; set; } = string.Empty;
    public string? About { get; set; }
    public string DepartmentId { get; set; } = string.Empty;
    public string DesignationId { get; set; } = string.Empty;
    public string BranchId { get; set; } = string.Empty;
    public string? ManagerId { get; set; }
    public string EmploymentType { get; set; } = EmploymentTypes.FullTime;
    public string Status { get; set; } = EmployeeStatuses.Active;
    public DateOnly DateOfJoining { get; set; }
    public DateOnly? DateOfConfirmation { get; set; }
    public string WorkLocation { get; set; } = string.Empty;
    public string ShiftId { get; set; } = "shift-general";
    public Address Address { get; set; } = new();
    public BankInfo? Bank { get; set; }
    public StatutoryInfo? Statutory { get; set; }
    public List<string> Skills { get; set; } = [];
    public bool IsDetailed { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<EmergencyContact> EmergencyContacts { get; set; } = [];
    public ICollection<EmployeeDocument> Documents { get; set; } = [];
    public ICollection<EmploymentHistoryItem> EmploymentHistory { get; set; } = [];
}

public class EmergencyContact
{
    public string Id { get; set; } = string.Empty;
    public string EmployeeId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Relationship { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
}

public class EmployeeDocument
{
    public string Id { get; set; } = string.Empty;
    public string EmployeeId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public DateOnly UploadedOn { get; set; }
    public string Size { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending";
}

public class EmploymentHistoryItem
{
    public string Id { get; set; } = string.Empty;
    public string EmployeeId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public DateOnly EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
    public string Type { get; set; } = "Joining";
}

public class Shift
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string StartTime { get; set; } = "09:00";
    public string EndTime { get; set; } = "18:00";
    public int GraceMinutes { get; set; }
    public int AssignedCount { get; set; }
    public string Days { get; set; } = "Monday to Friday";
}

public class Holiday
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public string Type { get; set; } = "Public";
}

public class AttendanceRecord
{
    public string Id { get; set; } = string.Empty;
    public string EmployeeId { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public string? CheckIn { get; set; }
    public string? CheckOut { get; set; }
    public string Status { get; set; } = AttendanceStatuses.Present;
    public decimal? WorkedHours { get; set; }
    public string ShiftId { get; set; } = "shift-general";
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class AttendanceCorrection
{
    public string Id { get; set; } = string.Empty;
    public string EmployeeId { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public string CurrentStatus { get; set; } = AttendanceStatuses.Absent;
    public string RequestedStatus { get; set; } = AttendanceStatuses.Present;
    public string Reason { get; set; } = string.Empty;
    public DateOnly RequestedOn { get; set; }
    public string Status { get; set; } = "Pending";
    public string? DecidedBy { get; set; }
    public DateOnly? DecidedOn { get; set; }
    public string? Note { get; set; }
}

public class LeaveType
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Color { get; set; } = "#2563eb";
    public int AnnualQuota { get; set; }
    public bool CarryForward { get; set; }
    public bool RequiresDocument { get; set; }
    public string Description { get; set; } = string.Empty;
}

public class LeavePolicy
{
    public string LeaveTypeId { get; set; } = string.Empty;
    public string Accrual { get; set; } = string.Empty;
    public int MaxConsecutiveDays { get; set; }
    public int NoticePeriodDays { get; set; }
    public bool AllowHalfDay { get; set; }
    public string Policy { get; set; } = string.Empty;
}

public class LeaveBalance
{
    public string EmployeeId { get; set; } = string.Empty;
    public string LeaveTypeId { get; set; } = string.Empty;
    public decimal Allocated { get; set; }
    public decimal Used { get; set; }
    public decimal Pending { get; set; }
}

public class LeaveRequest
{
    public string Id { get; set; } = string.Empty;
    public string EmployeeId { get; set; } = string.Empty;
    public string LeaveTypeId { get; set; } = string.Empty;
    public DateOnly FromDate { get; set; }
    public DateOnly ToDate { get; set; }
    public decimal Days { get; set; }
    public string Reason { get; set; } = string.Empty;
    public DateOnly AppliedOn { get; set; }
    public string Status { get; set; } = LeaveStatuses.Pending;
    public string? ApproverId { get; set; }
    public DateOnly? DecidedOn { get; set; }
    public string? Note { get; set; }
}

public class SalaryComponent
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = "earning";
    public decimal Amount { get; set; }
    public bool Statutory { get; set; }
}

public class SalaryStructure
{
    public string EmployeeId { get; set; } = string.Empty;
    public DateOnly EffectiveFrom { get; set; }
    public decimal AnnualCtc { get; set; }
    public List<SalaryComponent> Earnings { get; set; } = [];
    public List<SalaryComponent> Deductions { get; set; } = [];
}

public class PayrollRun
{
    public string Id { get; set; } = string.Empty;
    public int Month { get; set; }
    public int Year { get; set; }
    public string PeriodLabel { get; set; } = string.Empty;
    public string Status { get; set; } = PayrollStatuses.Draft;
    public int EmployeeCount { get; set; }
    public decimal GrossTotal { get; set; }
    public decimal DeductionsTotal { get; set; }
    public decimal NetTotal { get; set; }
    public DateOnly? ProcessedOn { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Payslip
{
    public string Id { get; set; } = string.Empty;
    public string EmployeeId { get; set; } = string.Empty;
    public string PayrollRunId { get; set; } = string.Empty;
    public int Month { get; set; }
    public int Year { get; set; }
    public List<SalaryComponent> Earnings { get; set; } = [];
    public List<SalaryComponent> Deductions { get; set; } = [];
    public decimal Gross { get; set; }
    public decimal TotalDeductions { get; set; }
    public decimal Net { get; set; }
    public int WorkingDays { get; set; }
    public int PaidDays { get; set; }
    public int Lop { get; set; }
    public string Status { get; set; } = PayrollStatuses.Draft;
}

public class StatutorySetting
{
    public int Id { get; set; } = 1;
    public string Label { get; set; } = "Demo statutory profile";
    public DateOnly EffectiveFrom { get; set; }
    public decimal PfEmployeeRate { get; set; }
    public decimal EsiEmployeeRate { get; set; }
    public decimal EsiGrossThreshold { get; set; }
    public decimal ProfessionalTaxMonthly { get; set; }
    public decimal IllustrativeTdsRate { get; set; }
    public decimal TdsThresholdMonthly { get; set; }
    public string Description { get; set; } = string.Empty;
}

public class JobOpening
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string DepartmentId { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string EmploymentType { get; set; } = EmploymentTypes.FullTime;
    public int ExperienceMin { get; set; }
    public int ExperienceMax { get; set; }
    public int Openings { get; set; }
    public string Status { get; set; } = "Open";
    public DateOnly PostedOn { get; set; }
    public string HiringManagerId { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string SalaryRange { get; set; } = string.Empty;
    public List<string> Skills { get; set; } = [];
}

public class Candidate
{
    public string Id { get; set; } = string.Empty;
    public string JobId { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Source { get; set; } = "Career Site";
    public string Stage { get; set; } = "Applied";
    public DateOnly AppliedOn { get; set; }
    public decimal ExperienceYears { get; set; }
    public string CurrentCompany { get; set; } = string.Empty;
    public decimal ExpectedCtc { get; set; }
    public decimal Rating { get; set; }
    public string? Notes { get; set; }
}

public class Interview
{
    public string Id { get; set; } = string.Empty;
    public string CandidateId { get; set; } = string.Empty;
    public string JobId { get; set; } = string.Empty;
    public string Round { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public string Time { get; set; } = "10:00";
    public string Mode { get; set; } = "Video";
    public string Interviewer { get; set; } = string.Empty;
    public string Status { get; set; } = "Scheduled";
    public string? Feedback { get; set; }
}

public class AppraisalCycle
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Period { get; set; } = string.Empty;
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public string Status { get; set; } = "Draft";
}

public class Goal
{
    public string Id { get; set; } = string.Empty;
    public string EmployeeId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int Weight { get; set; }
    public string Target { get; set; } = string.Empty;
    public int Progress { get; set; }
    public DateOnly DueDate { get; set; }
    public string Status { get; set; } = "Not Started";
}

public class Review
{
    public string Id { get; set; } = string.Empty;
    public string EmployeeId { get; set; } = string.Empty;
    public string CycleId { get; set; } = string.Empty;
    public string ReviewerId { get; set; } = string.Empty;
    public string Type { get; set; } = "Manager";
    public decimal Rating { get; set; }
    public string Status { get; set; } = "Pending";
    public DateOnly? SubmittedOn { get; set; }
    public string? Summary { get; set; }
}

public class Feedback
{
    public string Id { get; set; } = string.Empty;
    public string EmployeeId { get; set; } = string.Empty;
    public string FromId { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public string Type { get; set; } = "Praise";
    public string Message { get; set; } = string.Empty;
    public decimal? Rating { get; set; }
}

public class ExpenseCategory
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal Limit { get; set; }
    public string Description { get; set; } = string.Empty;
}

public class ExpenseClaim
{
    public string Id { get; set; } = string.Empty;
    public string EmployeeId { get; set; } = string.Empty;
    public string CategoryId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateOnly Date { get; set; }
    public DateOnly SubmittedOn { get; set; }
    public string Status { get; set; } = ExpenseStatuses.Pending;
    public string Description { get; set; } = string.Empty;
    public string? ReceiptName { get; set; }
    public string? ReceiptPath { get; set; }
    public string? ApprovedBy { get; set; }
    public DateOnly? ReimbursedOn { get; set; }
}

public class CompanySetting
{
    public int Id { get; set; } = 1;
    public string LegalName { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Domain { get; set; } = string.Empty;
    public string Industry { get; set; } = string.Empty;
    public string Headquarters { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Website { get; set; } = string.Empty;
    public string Gstin { get; set; } = string.Empty;
    public string Pan { get; set; } = string.Empty;
    public string Cin { get; set; } = string.Empty;
    public string Currency { get; set; } = string.Empty;
    public string Timezone { get; set; } = string.Empty;
    public string FinancialYear { get; set; } = string.Empty;
    public string PayrollFrequency { get; set; } = string.Empty;
}

public class AttendanceSetting
{
    public int Id { get; set; } = 1;
    public string WorkWeek { get; set; } = "Monday to Friday";
    public string ShiftStart { get; set; } = "09:00";
    public string ShiftEnd { get; set; } = "18:00";
    public int GraceMinutes { get; set; } = 15;
    public decimal HalfDayHours { get; set; } = 4;
    public decimal FullDayHours { get; set; } = 8;
    public bool AutoMarkAbsent { get; set; } = true;
    public bool RequireLocation { get; set; }
    public bool AllowCorrections { get; set; } = true;
    public int CorrectionWindowDays { get; set; } = 7;
}

public class PayrollSetting
{
    public int Id { get; set; } = 1;
    public int PayDay { get; set; } = 28;
    public int InputCutoffDay { get; set; } = 22;
    public bool ApprovalRequired { get; set; } = true;
    public string PayslipRelease { get; set; } = "On payroll processing";
    public string BankFileFormat { get; set; } = "Demo CSV";
    public string StatutoryProfile { get; set; } = "Demo statutory profile FY 2026-27";
    public DateOnly EffectiveFrom { get; set; }
    public decimal PfRate { get; set; }
    public decimal EsiRate { get; set; }
    public decimal ProfessionalTax { get; set; }
    public string TdsMethod { get; set; } = "Illustrative flat-rate demo";
    public string Disclaimer { get; set; } = string.Empty;
}

public class NotificationPreference
{
    public string Id { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public bool Email { get; set; }
    public bool InApp { get; set; }
}
