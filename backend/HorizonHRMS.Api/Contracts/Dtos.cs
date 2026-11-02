using System.ComponentModel.DataAnnotations;

namespace HorizonHRMS.Api.Contracts;

public sealed class PagedResult<T>
{
    public List<T> Data { get; set; } = [];
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
}

public sealed class LoginRequest
{
    [Required, EmailAddress, MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required, MinLength(8), MaxLength(128)]
    public string Password { get; set; } = string.Empty;
}

public sealed class RefreshRequest
{
    [Required]
    public string RefreshToken { get; set; } = string.Empty;
}

public sealed class LogoutRequest
{
    [Required]
    public string RefreshToken { get; set; } = string.Empty;
}

public sealed class AuthResponse
{
    public string AccessToken { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public DateTime AccessTokenExpiresAt { get; set; }
    public SystemUserDto User { get; set; } = new();
}

public sealed class SystemUserDto
{
    public string Id { get; set; } = string.Empty;
    public string? EmployeeId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string LastActive { get; set; } = "—";
    public bool MfaEnabled { get; set; }
}

public sealed class AddressDto
{
    public string Line1 { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
}

public sealed class EmergencyContactDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Relationship { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
}

public sealed class BankInfoDto
{
    public string BankName { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string Ifsc { get; set; } = string.Empty;
    public string Branch { get; set; } = string.Empty;
    public string AccountType { get; set; } = string.Empty;
}

public sealed class StatutoryInfoDto
{
    public string Pan { get; set; } = string.Empty;
    public string Aadhaar { get; set; } = string.Empty;
    public string Uan { get; set; } = string.Empty;
    public string PfNumber { get; set; } = string.Empty;
    public string EsiNumber { get; set; } = string.Empty;
}

public sealed class EmployeeDocumentDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public DateOnly UploadedOn { get; set; }
    public string Size { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}

public sealed class EmploymentHistoryDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public DateOnly EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
    public string Type { get; set; } = string.Empty;
}

public sealed class EmployeeDto
{
    public string Id { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PersonalEmail { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Gender { get; set; } = string.Empty;
    public DateOnly DateOfBirth { get; set; }
    public string MaritalStatus { get; set; } = string.Empty;
    public string BloodGroup { get; set; } = string.Empty;
    public string? About { get; set; }
    public string DepartmentId { get; set; } = string.Empty;
    public string DesignationId { get; set; } = string.Empty;
    public string BranchId { get; set; } = string.Empty;
    public string? ManagerId { get; set; }
    public string EmploymentType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateOnly DateOfJoining { get; set; }
    public DateOnly? DateOfConfirmation { get; set; }
    public string WorkLocation { get; set; } = string.Empty;
    public string ShiftId { get; set; } = string.Empty;
    public AddressDto Address { get; set; } = new();
    public List<EmergencyContactDto> EmergencyContacts { get; set; } = [];
    public BankInfoDto? Bank { get; set; }
    public StatutoryInfoDto? Statutory { get; set; }
    public List<EmployeeDocumentDto> Documents { get; set; } = [];
    public List<EmploymentHistoryDto> EmploymentHistory { get; set; } = [];
    public List<string> Skills { get; set; } = [];
    public bool IsDetailed { get; set; }
}

public sealed class EmployeeUpsertRequest
{
    [Required, MinLength(2), MaxLength(80)]
    public string FirstName { get; set; } = string.Empty;

    [Required, MinLength(2), MaxLength(80)]
    public string LastName { get; set; } = string.Empty;

    [Required, EmailAddress, MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required, EmailAddress, MaxLength(256)]
    public string PersonalEmail { get; set; } = string.Empty;

    [Required, MaxLength(32)]
    public string Phone { get; set; } = string.Empty;

    [Required]
    public string Gender { get; set; } = "Other";

    [Required]
    public DateOnly DateOfBirth { get; set; }

    [Required]
    public string MaritalStatus { get; set; } = "Single";

    [Required, MaxLength(8)]
    public string BloodGroup { get; set; } = string.Empty;

    [Required]
    public string DepartmentId { get; set; } = string.Empty;

    [Required]
    public string DesignationId { get; set; } = string.Empty;

    [Required]
    public string BranchId { get; set; } = string.Empty;

    public string? ManagerId { get; set; }

    [Required]
    public string EmploymentType { get; set; } = "Full-time";

    [Required]
    public string Status { get; set; } = "Active";

    [Required]
    public DateOnly DateOfJoining { get; set; }

    [Required, MaxLength(120)]
    public string WorkLocation { get; set; } = string.Empty;

    [Required]
    public AddressInput Address { get; set; } = new();

    [Required, MinLength(2), MaxLength(120)]
    public string EmergencyContactName { get; set; } = string.Empty;

    [Required, MinLength(2), MaxLength(64)]
    public string EmergencyContactRelationship { get; set; } = string.Empty;

    [Required, MaxLength(32)]
    public string EmergencyContactPhone { get; set; } = string.Empty;

    public BankInfoDto? Bank { get; set; }
    public StatutoryInfoDto? Statutory { get; set; }
    public List<string>? Skills { get; set; }
}

public sealed class AddressInput
{
    [Required, MinLength(3), MaxLength(240)]
    public string Line1 { get; set; } = string.Empty;

    [Required, MaxLength(80)]
    public string City { get; set; } = string.Empty;

    [Required, MaxLength(80)]
    public string State { get; set; } = string.Empty;

    [Required, MaxLength(16)]
    public string PostalCode { get; set; } = string.Empty;

    [Required, MaxLength(80)]
    public string Country { get; set; } = "India";
}

public sealed class EmployeeStatusRequest
{
    [Required]
    public string Status { get; set; } = string.Empty;
}

public sealed class DepartmentDto
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
    public int EmployeeCount { get; set; }
    public int OpenRoles { get; set; }
}

public sealed class DepartmentRequest
{
    [Required, MinLength(2), MaxLength(160)]
    public string Name { get; set; } = string.Empty;

    [Required, MinLength(2), MaxLength(24)]
    public string Code { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string Description { get; set; } = string.Empty;

    public string? HeadId { get; set; }
    public string? ParentId { get; set; }

    [MaxLength(120)]
    public string Location { get; set; } = string.Empty;

    [EmailAddress, MaxLength(256)]
    public string Email { get; set; } = string.Empty;
}

public sealed class DesignationDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string DepartmentId { get; set; } = string.Empty;
    public string Level { get; set; } = string.Empty;
    public string Grade { get; set; } = string.Empty;
    public int EmployeeCount { get; set; }
}

public sealed class DesignationRequest
{
    [Required, MinLength(2), MaxLength(160)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string DepartmentId { get; set; } = string.Empty;

    [Required, MaxLength(8)]
    public string Level { get; set; } = "L1";

    [Required, MaxLength(16)]
    public string Grade { get; set; } = string.Empty;
}

public sealed class BranchDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? HeadId { get; set; }
    public bool IsHeadquarters { get; set; }
    public int EmployeeCount { get; set; }
}

public sealed class BranchRequest
{
    [Required, MinLength(2), MaxLength(160)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(240)]
    public string Address { get; set; } = string.Empty;

    [Required, MaxLength(80)]
    public string City { get; set; } = string.Empty;

    [Required, MaxLength(80)]
    public string State { get; set; } = string.Empty;

    [MaxLength(32)]
    public string Phone { get; set; } = string.Empty;

    public string? HeadId { get; set; }
    public bool IsHeadquarters { get; set; }
}

public sealed class OrgNodeDto
{
    public EmployeeDto Employee { get; set; } = new();
    public List<OrgNodeDto> Children { get; set; } = [];
}

public sealed class ReportingLineDto
{
    public EmployeeDto Manager { get; set; } = new();
    public List<EmployeeDto> Reports { get; set; } = [];
}

public sealed class AttendanceRecordDto
{
    public string Id { get; set; } = string.Empty;
    public string EmployeeId { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public string? CheckIn { get; set; }
    public string? CheckOut { get; set; }
    public string Status { get; set; } = string.Empty;
    public decimal? WorkedHours { get; set; }
    public string ShiftId { get; set; } = string.Empty;
    public string? Note { get; set; }
    public EmployeeDto? Employee { get; set; }
}

public sealed class ShiftDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string StartTime { get; set; } = string.Empty;
    public string EndTime { get; set; } = string.Empty;
    public int GraceMinutes { get; set; }
    public int AssignedCount { get; set; }
    public string Days { get; set; } = string.Empty;
}

public sealed class HolidayDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public string Type { get; set; } = string.Empty;
}

public sealed class HolidayRequest
{
    [Required, MinLength(2), MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public DateOnly Date { get; set; }

    [Required]
    public string Type { get; set; } = "Public";
}

public sealed class AttendanceCorrectionDto
{
    public string Id { get; set; } = string.Empty;
    public string EmployeeId { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public string CurrentStatus { get; set; } = string.Empty;
    public string RequestedStatus { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public DateOnly RequestedOn { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? DecidedBy { get; set; }
    public DateOnly? DecidedOn { get; set; }
    public string? Note { get; set; }
}

public sealed class AttendanceCorrectionRequest
{
    public string? EmployeeId { get; set; }

    [Required]
    public DateOnly Date { get; set; }

    [Required]
    public string RequestedStatus { get; set; } = "Present";

    [Required, MinLength(5), MaxLength(500)]
    public string Reason { get; set; } = string.Empty;
}

public sealed class SelfActionRequest
{
    public string? EmployeeId { get; set; }
}

public sealed class DecisionRequest
{
    [Required]
    public string Status { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Note { get; set; }
}

public sealed class AttendanceSummaryDto
{
    public DateOnly Date { get; set; }
    public int Present { get; set; }
    public int Absent { get; set; }
    public int Late { get; set; }
    public int HalfDay { get; set; }
    public int OnLeave { get; set; }
    public int NotMarked { get; set; }
    public int Total { get; set; }
    public decimal Rate { get; set; }
}

public sealed class LeaveTypeDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public int AnnualQuota { get; set; }
    public bool CarryForward { get; set; }
    public bool RequiresDocument { get; set; }
    public string Description { get; set; } = string.Empty;
}

public sealed class LeavePolicyDto
{
    public string LeaveTypeId { get; set; } = string.Empty;
    public string Accrual { get; set; } = string.Empty;
    public int MaxConsecutiveDays { get; set; }
    public int NoticePeriodDays { get; set; }
    public bool AllowHalfDay { get; set; }
    public string Policy { get; set; } = string.Empty;
}

public sealed class LeaveBalanceDto
{
    public string EmployeeId { get; set; } = string.Empty;
    public string LeaveTypeId { get; set; } = string.Empty;
    public decimal Allocated { get; set; }
    public decimal Used { get; set; }
    public decimal Pending { get; set; }
}

public sealed class LeaveRequestDto
{
    public string Id { get; set; } = string.Empty;
    public string EmployeeId { get; set; } = string.Empty;
    public string LeaveTypeId { get; set; } = string.Empty;
    public DateOnly FromDate { get; set; }
    public DateOnly ToDate { get; set; }
    public decimal Days { get; set; }
    public string Reason { get; set; } = string.Empty;
    public DateOnly AppliedOn { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? ApproverId { get; set; }
    public DateOnly? DecidedOn { get; set; }
    public string? Note { get; set; }
}

public sealed class LeaveApplicationRequest
{
    public string? EmployeeId { get; set; }

    [Required]
    public string LeaveTypeId { get; set; } = string.Empty;

    [Required]
    public DateOnly FromDate { get; set; }

    [Required]
    public DateOnly ToDate { get; set; }

    [Required, MinLength(5), MaxLength(500)]
    public string Reason { get; set; } = string.Empty;
}

public sealed class SalaryComponentDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = "earning";
    public decimal Amount { get; set; }
    public bool Statutory { get; set; }
}

public sealed class SalaryStructureDto
{
    public string EmployeeId { get; set; } = string.Empty;
    public DateOnly EffectiveFrom { get; set; }
    public decimal AnnualCtc { get; set; }
    public List<SalaryComponentDto> Earnings { get; set; } = [];
    public List<SalaryComponentDto> Deductions { get; set; } = [];
}

public sealed class PayrollRunDto
{
    public string Id { get; set; } = string.Empty;
    public int Month { get; set; }
    public int Year { get; set; }
    public string PeriodLabel { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int EmployeeCount { get; set; }
    public decimal GrossTotal { get; set; }
    public decimal DeductionsTotal { get; set; }
    public decimal NetTotal { get; set; }
    public DateOnly? ProcessedOn { get; set; }
}

public sealed class PayslipDto
{
    public string Id { get; set; } = string.Empty;
    public string EmployeeId { get; set; } = string.Empty;
    public string PayrollRunId { get; set; } = string.Empty;
    public int Month { get; set; }
    public int Year { get; set; }
    public List<SalaryComponentDto> Earnings { get; set; } = [];
    public List<SalaryComponentDto> Deductions { get; set; } = [];
    public decimal Gross { get; set; }
    public decimal TotalDeductions { get; set; }
    public decimal Net { get; set; }
    public int WorkingDays { get; set; }
    public int PaidDays { get; set; }
    public int Lop { get; set; }
    public string Status { get; set; } = string.Empty;
}

public sealed class PayrollSettingsDto
{
    public int PayDay { get; set; }
    public int InputCutoffDay { get; set; }
    public bool ApprovalRequired { get; set; }
    public string PayslipRelease { get; set; } = string.Empty;
    public string BankFileFormat { get; set; } = string.Empty;
    public string StatutoryProfile { get; set; } = string.Empty;
    public DateOnly EffectiveFrom { get; set; }
    public decimal PfRate { get; set; }
    public decimal EsiRate { get; set; }
    public decimal ProfessionalTax { get; set; }
    public string TdsMethod { get; set; } = string.Empty;
    public string Disclaimer { get; set; } = string.Empty;
}

public sealed class PayrollSettingsRequest
{
    [Range(1, 31)]
    public int PayDay { get; set; }

    [Range(1, 31)]
    public int InputCutoffDay { get; set; }

    public bool ApprovalRequired { get; set; }
    public string PayslipRelease { get; set; } = string.Empty;
    public string BankFileFormat { get; set; } = string.Empty;
    public string StatutoryProfile { get; set; } = string.Empty;
    public DateOnly EffectiveFrom { get; set; }

    [Range(0, 100)]
    public decimal PfRate { get; set; }

    [Range(0, 100)]
    public decimal EsiRate { get; set; }

    [Range(0, 1000000)]
    public decimal ProfessionalTax { get; set; }

    public string TdsMethod { get; set; } = string.Empty;
    public string Disclaimer { get; set; } = string.Empty;
}

public sealed class StatutorySettingDto
{
    public string Label { get; set; } = string.Empty;
    public DateOnly EffectiveFrom { get; set; }
    public decimal PfEmployeeRate { get; set; }
    public decimal EsiEmployeeRate { get; set; }
    public decimal EsiGrossThreshold { get; set; }
    public decimal ProfessionalTaxMonthly { get; set; }
    public decimal IllustrativeTdsRate { get; set; }
    public decimal TdsThresholdMonthly { get; set; }
    public string Description { get; set; } = string.Empty;
}

public sealed class JobOpeningDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string DepartmentId { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string EmploymentType { get; set; } = string.Empty;
    public int ExperienceMin { get; set; }
    public int ExperienceMax { get; set; }
    public int Openings { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateOnly PostedOn { get; set; }
    public string HiringManagerId { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string SalaryRange { get; set; } = string.Empty;
    public List<string> Skills { get; set; } = [];
}

public sealed class JobRequest
{
    [Required, MinLength(2), MaxLength(160)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string DepartmentId { get; set; } = string.Empty;

    [Required, MaxLength(120)]
    public string Location { get; set; } = string.Empty;

    [Required]
    public string EmploymentType { get; set; } = "Full-time";

    [Range(0, 60)]
    public int ExperienceMin { get; set; }

    [Range(0, 60)]
    public int ExperienceMax { get; set; }

    [Range(1, 1000)]
    public int Openings { get; set; } = 1;

    /// <summary>Optional on update; defaults to Open on create.</summary>
    [MaxLength(20)]
    public string? Status { get; set; }

    /// <summary>Optional. Falls back to the department head or the signed-in user's employee record.</summary>
    [MaxLength(40)]
    public string? HiringManagerId { get; set; }

    [Required, MinLength(10), MaxLength(4000)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(80)]
    public string SalaryRange { get; set; } = string.Empty;

    public List<string> Skills { get; set; } = [];
}

public sealed class CandidateDto
{
    public string Id { get; set; } = string.Empty;
    public string JobId { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Source { get; set; } = string.Empty;
    public string Stage { get; set; } = string.Empty;
    public DateOnly AppliedOn { get; set; }
    public decimal ExperienceYears { get; set; }
    public string CurrentCompany { get; set; } = string.Empty;
    public decimal ExpectedCtc { get; set; }
    public decimal Rating { get; set; }
    public string? Notes { get; set; }
}

public sealed class CandidateRequest
{
    [Required]
    public string JobId { get; set; } = string.Empty;

    [Required, MinLength(2), MaxLength(80)]
    public string FirstName { get; set; } = string.Empty;

    [Required, MinLength(2), MaxLength(80)]
    public string LastName { get; set; } = string.Empty;

    [Required, EmailAddress, MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required, MaxLength(32)]
    public string Phone { get; set; } = string.Empty;

    [MaxLength(120)]
    public string Location { get; set; } = string.Empty;

    [Required]
    public string Source { get; set; } = "Career Site";

    [Range(0, 60)]
    public decimal ExperienceYears { get; set; }

    [MaxLength(160)]
    public string CurrentCompany { get; set; } = string.Empty;

    [Range(0, 100000000)]
    public decimal ExpectedCtc { get; set; }

    [Range(0, 5)]
    public decimal Rating { get; set; }

    [MaxLength(2000)]
    public string? Notes { get; set; }
}

public sealed class CandidateStageRequest
{
    [Required]
    public string Stage { get; set; } = string.Empty;
}

public sealed class InterviewDto
{
    public string Id { get; set; } = string.Empty;
    public string CandidateId { get; set; } = string.Empty;
    public string JobId { get; set; } = string.Empty;
    public string Round { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public string Time { get; set; } = string.Empty;
    public string Mode { get; set; } = string.Empty;
    public string Interviewer { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? Feedback { get; set; }
}

public sealed class InterviewRequest
{
    [Required]
    public string CandidateId { get; set; } = string.Empty;

    /// <summary>Optional. Derived from the candidate's job when omitted.</summary>
    [MaxLength(40)]
    public string? JobId { get; set; }

    [Required, MaxLength(80)]
    public string Round { get; set; } = string.Empty;

    [Required]
    public DateOnly Date { get; set; }

    [Required, MaxLength(8)]
    public string Time { get; set; } = "10:00";

    [Required]
    public string Mode { get; set; } = "Video";

    [Required, MaxLength(160)]
    public string Interviewer { get; set; } = string.Empty;

    public string Status { get; set; } = "Scheduled";

    [MaxLength(2000)]
    public string? Feedback { get; set; }
}

public sealed class AppraisalCycleDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Period { get; set; } = string.Empty;
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public string Status { get; set; } = string.Empty;
}

public sealed class GoalDto
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
    public string Status { get; set; } = string.Empty;
}

public sealed class GoalRequest
{
    [Required]
    public string EmployeeId { get; set; } = string.Empty;

    [Required, MinLength(3), MaxLength(160)]
    public string Title { get; set; } = string.Empty;

    [Required, MinLength(5), MaxLength(2000)]
    public string Description { get; set; } = string.Empty;

    [Required, MaxLength(64)]
    public string Category { get; set; } = string.Empty;

    [Range(1, 100)]
    public int Weight { get; set; }

    [Required, MaxLength(240)]
    public string Target { get; set; } = string.Empty;

    [Required]
    public DateOnly DueDate { get; set; }
}

public sealed class GoalProgressRequest
{
    [Range(0, 100)]
    public int Progress { get; set; }
}

public sealed class ReviewDto
{
    public string Id { get; set; } = string.Empty;
    public string EmployeeId { get; set; } = string.Empty;
    public string CycleId { get; set; } = string.Empty;
    public string ReviewerId { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public decimal Rating { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateOnly? SubmittedOn { get; set; }
    public string? Summary { get; set; }
}

public sealed class ReviewSubmitRequest
{
    [Required]
    public string EmployeeId { get; set; } = string.Empty;

    /// <summary>Recorded from the authenticated principal; kept for contract compatibility.</summary>
    [MaxLength(40)]
    public string? ReviewerId { get; set; }

    [Required]
    public string Type { get; set; } = "Self";

    [Range(1, 5)]
    public decimal Rating { get; set; }

    [Required, MinLength(5), MaxLength(4000)]
    public string Summary { get; set; } = string.Empty;
}

public sealed class FeedbackDto
{
    public string Id { get; set; } = string.Empty;
    public string EmployeeId { get; set; } = string.Empty;
    public string FromId { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public decimal? Rating { get; set; }
}

public sealed class ExpenseCategoryDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal Limit { get; set; }
    public string Description { get; set; } = string.Empty;
}

public sealed class ExpenseClaimDto
{
    public string Id { get; set; } = string.Empty;
    public string EmployeeId { get; set; } = string.Empty;
    public string CategoryId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateOnly Date { get; set; }
    public DateOnly SubmittedOn { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? ReceiptName { get; set; }
    public string? ApprovedBy { get; set; }
    public DateOnly? ReimbursedOn { get; set; }
}

public sealed class ExpenseRequest
{
    public string? EmployeeId { get; set; }

    [Required]
    public string CategoryId { get; set; } = string.Empty;

    [Required, MinLength(3), MaxLength(160)]
    public string Title { get; set; } = string.Empty;

    [Range(0.01, 10000000)]
    public decimal Amount { get; set; }

    [Required]
    public DateOnly Date { get; set; }

    [Required, MinLength(5), MaxLength(1000)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(240)]
    public string? ReceiptName { get; set; }
}

public sealed class AuditLogDto
{
    public string Id { get; set; } = string.Empty;
    public string Actor { get; set; } = string.Empty;
    public string ActorRole { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string Module { get; set; } = string.Empty;
    public string Target { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public string IpAddress { get; set; } = string.Empty;
}

public sealed class CompanyProfileDto
{
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

public sealed class CompanyProfileRequest
{
    [Required, MaxLength(200)]
    public string LegalName { get; set; } = string.Empty;

    [Required, MaxLength(160)]
    public string DisplayName { get; set; } = string.Empty;

    [MaxLength(120)]
    public string Domain { get; set; } = string.Empty;

    [MaxLength(120)]
    public string Industry { get; set; } = string.Empty;

    [MaxLength(160)]
    public string Headquarters { get; set; } = string.Empty;

    [EmailAddress, MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(32)]
    public string Phone { get; set; } = string.Empty;

    [MaxLength(160)]
    public string Website { get; set; } = string.Empty;

    [MaxLength(64)]
    public string Gstin { get; set; } = string.Empty;

    [MaxLength(32)]
    public string Pan { get; set; } = string.Empty;

    [MaxLength(64)]
    public string Cin { get; set; } = string.Empty;

    [MaxLength(32)]
    public string Currency { get; set; } = string.Empty;

    [MaxLength(64)]
    public string Timezone { get; set; } = string.Empty;

    [MaxLength(64)]
    public string FinancialYear { get; set; } = string.Empty;

    [MaxLength(32)]
    public string PayrollFrequency { get; set; } = string.Empty;
}

public sealed class AttendanceSettingsDto
{
    public string WorkWeek { get; set; } = string.Empty;
    public string ShiftStart { get; set; } = string.Empty;
    public string ShiftEnd { get; set; } = string.Empty;
    public int GraceMinutes { get; set; }
    public decimal HalfDayHours { get; set; }
    public decimal FullDayHours { get; set; }
    public bool AutoMarkAbsent { get; set; }
    public bool RequireLocation { get; set; }
    public bool AllowCorrections { get; set; }
    public int CorrectionWindowDays { get; set; }
}

public sealed class AttendanceSettingsRequest
{
    [Required, MaxLength(80)]
    public string WorkWeek { get; set; } = string.Empty;

    [Required, MaxLength(8)]
    public string ShiftStart { get; set; } = string.Empty;

    [Required, MaxLength(8)]
    public string ShiftEnd { get; set; } = string.Empty;

    [Range(0, 120)]
    public int GraceMinutes { get; set; }

    [Range(1, 24)]
    public decimal HalfDayHours { get; set; }

    [Range(1, 24)]
    public decimal FullDayHours { get; set; }

    public bool AutoMarkAbsent { get; set; }
    public bool RequireLocation { get; set; }
    public bool AllowCorrections { get; set; }

    [Range(0, 365)]
    public int CorrectionWindowDays { get; set; }
}

public sealed class NotificationPreferenceDto
{
    public string Id { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public bool Email { get; set; }
    public bool InApp { get; set; }
}

public sealed class NotificationPreferenceRequest
{
    public bool Email { get; set; }
    public bool InApp { get; set; }
}

public sealed class RoleConfigDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int Members { get; set; }
}

public sealed class InviteUserRequest
{
    [Required, MinLength(2), MaxLength(160)]
    public string Name { get; set; } = string.Empty;

    [Required, EmailAddress, MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Role { get; set; } = "employee";

    public string? EmployeeId { get; set; }
}

public sealed class UpdateUserRequest
{
    /// <summary>Optional so role and status can be patched independently.</summary>
    [MaxLength(40)]
    public string? Role { get; set; }

    /// <summary>Optional so role and status can be patched independently.</summary>
    [MaxLength(20)]
    public string? Status { get; set; }
}

public sealed class MfaUpdateRequest
{
    public bool MfaEnabled { get; set; }
}

public sealed class DashboardStatsDto
{
    public int TotalEmployees { get; set; }
    public int ActiveEmployees { get; set; }
    public int PresentToday { get; set; }
    public int OnLeaveToday { get; set; }
    public int PendingLeaveRequests { get; set; }
    public int NewHiresThisMonth { get; set; }
    public decimal AttritionRate { get; set; }
    public int OpenPositions { get; set; }
    public decimal AttendanceRate { get; set; }
    public string PayrollMonthLabel { get; set; } = string.Empty;
    public decimal MonthlyPayroll { get; set; }
}

public sealed class ReportColumnDto
{
    public string Key { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string? Align { get; set; }
}

public sealed class ReportDefinitionDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<ReportColumnDto> Columns { get; set; } = [];
    public List<Dictionary<string, object?>> Rows { get; set; } = [];
    public List<Dictionary<string, string>> Summary { get; set; } = [];
    public string? Notice { get; set; }
}

public sealed class JobStatusRequest
{
    [Required]
    public string Status { get; set; } = "Open";
}

public sealed class CandidateUpdateRequest
{
    [MaxLength(40)]
    public string? Stage { get; set; }

    [Range(0, 5)]
    public decimal? Rating { get; set; }

    [MaxLength(2000)]
    public string? Notes { get; set; }
}

public sealed class InterviewUpdateRequest
{
    [MaxLength(40)]
    public string? Status { get; set; }

    [MaxLength(2000)]
    public string? Feedback { get; set; }

    public DateOnly? Date { get; set; }

    [MaxLength(8)]
    public string? Time { get; set; }

    [MaxLength(160)]
    public string? Interviewer { get; set; }
}

public sealed class FeedbackRequest
{
    [Required]
    public string EmployeeId { get; set; } = string.Empty;

    /// <summary>Recorded from the authenticated principal; kept for contract compatibility.</summary>
    [MaxLength(40)]
    public string? FromId { get; set; }

    [Required]
    public string Type { get; set; } = "Praise";

    [Required, MinLength(5), MaxLength(4000)]
    public string Message { get; set; } = string.Empty;

    [Range(0, 5)]
    public decimal? Rating { get; set; }
}

public sealed class LeavePolicyUpdateRequest
{
    [Range(0, 365)]
    public int MaxConsecutiveDays { get; set; }

    [Range(0, 365)]
    public int NoticePeriodDays { get; set; }
}

public sealed class PipelineStageDto
{
    public string Stage { get; set; } = string.Empty;
    public int Count { get; set; }
}

public sealed class RecruitmentSummaryDto
{
    public int OpenJobs { get; set; }
    public int OpenPositions { get; set; }
    public int Candidates { get; set; }
    public int InterviewsScheduled { get; set; }
    public int Offers { get; set; }
    public int Hired { get; set; }
    public List<PipelineStageDto> Pipeline { get; set; } = [];
}

public sealed class PerformanceSummaryDto
{
    public int TotalGoals { get; set; }
    public int OnTrack { get; set; }
    public int AtRisk { get; set; }
    public int Completed { get; set; }
    public int PendingReviews { get; set; }
    public int CompletedReviews { get; set; }
    public decimal AverageRating { get; set; }
}

public sealed class ExpenseSummaryDto
{
    public int TotalClaims { get; set; }
    public decimal TotalAmount { get; set; }
    public int PendingCount { get; set; }
    public decimal PendingAmount { get; set; }
    public decimal ApprovedAmount { get; set; }
    public decimal ReimbursedAmount { get; set; }
}

public sealed class DashboardGrowthPointDto
{
    public string Month { get; set; } = string.Empty;
    public int Headcount { get; set; }
}

public sealed class DashboardDepartmentDto
{
    public string Name { get; set; } = string.Empty;
    public int Value { get; set; }
    public string Color { get; set; } = string.Empty;
}

public sealed class DashboardAttendancePointDto
{
    public string Day { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public int Present { get; set; }
    public int Absent { get; set; }
    public int OnLeave { get; set; }
}

public sealed class DashboardPayrollPointDto
{
    public string Month { get; set; } = string.Empty;
    public decimal Gross { get; set; }
    public decimal Net { get; set; }
    public decimal Deductions { get; set; }
}

public sealed class DashboardEventDto
{
    public EmployeeDto Employee { get; set; } = new();
    public string Date { get; set; } = string.Empty;
    public int DaysAway { get; set; }
    public int? Years { get; set; }
}

public sealed class DashboardOverviewDto
{
    public string Snapshot { get; set; } = string.Empty;
    public DashboardStatsDto Stats { get; set; } = new();
    public List<DashboardGrowthPointDto> Growth { get; set; } = [];
    public List<DashboardDepartmentDto> Departments { get; set; } = [];
    public List<DashboardAttendancePointDto> Attendance { get; set; } = [];
    public List<DashboardPayrollPointDto> Payroll { get; set; } = [];
    public PayrollRunDto? CurrentRun { get; set; }
    public List<DashboardEventDto> Birthdays { get; set; } = [];
    public List<DashboardEventDto> Anniversaries { get; set; } = [];
    public List<AuditLogDto> Activities { get; set; } = [];
    public List<HolidayDto> UpcomingHolidays { get; set; } = [];
    public int PendingExpenses { get; set; }
    public int OpenRoles { get; set; }
}
