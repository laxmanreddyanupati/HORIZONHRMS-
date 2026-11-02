using HorizonHRMS.Api.Contracts;
using HorizonHRMS.Api.Models;

namespace HorizonHRMS.Api.Infrastructure;

public static class Mapping
{
    public static SystemUserDto ToDto(this AppUser user) => new()
    {
        Id = user.Id,
        EmployeeId = user.EmployeeId,
        Name = user.Name,
        Email = user.Email,
        Role = user.Role,
        Status = user.Status,
        LastActive = user.LastActive is null ? "—" : user.LastActive.Value.ToString("yyyy-MM-ddTHH:mm:ss"),
        MfaEnabled = user.MfaEnabled,
    };

    public static AuditLogDto ToDto(this AuditLog log) => new()
    {
        Id = log.Id,
        Actor = log.Actor,
        ActorRole = log.ActorRole,
        Action = log.Action,
        Module = log.Module,
        Target = log.Target,
        Timestamp = log.Timestamp,
        IpAddress = log.IpAddress,
    };

    public static AddressDto ToDto(this Address address) => new()
    {
        Line1 = address.Line1,
        City = address.City,
        State = address.State,
        PostalCode = address.PostalCode,
        Country = address.Country,
    };

    public static BankInfoDto? ToDto(this BankInfo? bank) => bank is null ? null : new BankInfoDto
    {
        BankName = bank.BankName,
        AccountNumber = bank.AccountNumber,
        Ifsc = bank.Ifsc,
        Branch = bank.Branch,
        AccountType = bank.AccountType,
    };

    public static StatutoryInfoDto? ToDto(this StatutoryInfo? statutory) => statutory is null ? null : new StatutoryInfoDto
    {
        Pan = statutory.Pan,
        Aadhaar = statutory.Aadhaar,
        Uan = statutory.Uan,
        PfNumber = statutory.PfNumber,
        EsiNumber = statutory.EsiNumber,
    };

    public static EmployeeDto ToDto(this Employee employee) => new()
    {
        Id = employee.Id,
        FirstName = employee.FirstName,
        LastName = employee.LastName,
        Email = employee.Email,
        PersonalEmail = employee.PersonalEmail,
        Phone = employee.Phone,
        Gender = employee.Gender,
        DateOfBirth = employee.DateOfBirth,
        MaritalStatus = employee.MaritalStatus,
        BloodGroup = employee.BloodGroup,
        About = employee.About,
        DepartmentId = employee.DepartmentId,
        DesignationId = employee.DesignationId,
        BranchId = employee.BranchId,
        ManagerId = employee.ManagerId,
        EmploymentType = employee.EmploymentType,
        Status = employee.Status,
        DateOfJoining = employee.DateOfJoining,
        DateOfConfirmation = employee.DateOfConfirmation,
        WorkLocation = employee.WorkLocation,
        ShiftId = employee.ShiftId,
        Address = employee.Address.ToDto(),
        EmergencyContacts = employee.EmergencyContacts
            .Select(contact => new EmergencyContactDto
            {
                Id = contact.Id,
                Name = contact.Name,
                Relationship = contact.Relationship,
                Phone = contact.Phone,
            })
            .ToList(),
        Bank = employee.Bank.ToDto(),
        Statutory = employee.Statutory.ToDto(),
        Documents = employee.Documents
            .Select(document => new EmployeeDocumentDto
            {
                Id = document.Id,
                Name = document.Name,
                Category = document.Category,
                UploadedOn = document.UploadedOn,
                Size = document.Size,
                Status = document.Status,
            })
            .ToList(),
        EmploymentHistory = employee.EmploymentHistory
            .OrderByDescending(history => history.EffectiveFrom)
            .Select(history => new EmploymentHistoryDto
            {
                Id = history.Id,
                Title = history.Title,
                Department = history.Department,
                EffectiveFrom = history.EffectiveFrom,
                EffectiveTo = history.EffectiveTo,
                Type = history.Type,
            })
            .ToList(),
        Skills = employee.Skills.ToList(),
        IsDetailed = employee.IsDetailed,
    };

    public static void ApplyTo(this Employee employee, EmployeeUpsertRequest request, string normalizedEmail)
    {
        employee.FirstName = request.FirstName.Trim();
        employee.LastName = request.LastName.Trim();
        employee.Email = normalizedEmail;
        employee.PersonalEmail = request.PersonalEmail.Trim().ToLowerInvariant();
        employee.Phone = request.Phone.Trim();
        employee.Gender = request.Gender;
        employee.DateOfBirth = request.DateOfBirth;
        employee.MaritalStatus = request.MaritalStatus;
        employee.BloodGroup = request.BloodGroup.Trim();
        employee.DepartmentId = request.DepartmentId;
        employee.DesignationId = request.DesignationId;
        employee.BranchId = request.BranchId;
        employee.ManagerId = string.IsNullOrWhiteSpace(request.ManagerId) ? null : request.ManagerId;
        employee.EmploymentType = request.EmploymentType;
        employee.Status = request.Status;
        employee.DateOfJoining = request.DateOfJoining;
        employee.DateOfConfirmation = request.Status == EmployeeStatuses.Probation ? null : request.DateOfJoining;
        employee.WorkLocation = request.WorkLocation.Trim();
        employee.Address = new Address
        {
            Line1 = request.Address.Line1.Trim(),
            City = request.Address.City.Trim(),
            State = request.Address.State.Trim(),
            PostalCode = request.Address.PostalCode.Trim(),
            Country = request.Address.Country.Trim(),
        };
        if (request.Bank is not null)
        {
            employee.Bank = new BankInfo
            {
                BankName = request.Bank.BankName,
                AccountNumber = request.Bank.AccountNumber,
                Ifsc = request.Bank.Ifsc,
                Branch = request.Bank.Branch,
                AccountType = request.Bank.AccountType,
            };
        }

        if (request.Statutory is not null)
        {
            employee.Statutory = new StatutoryInfo
            {
                Pan = request.Statutory.Pan,
                Aadhaar = request.Statutory.Aadhaar,
                Uan = request.Statutory.Uan,
                PfNumber = request.Statutory.PfNumber,
                EsiNumber = request.Statutory.EsiNumber,
            };
        }

        if (request.Skills is not null)
        {
            employee.Skills = request.Skills.Where(skill => !string.IsNullOrWhiteSpace(skill)).Distinct().ToList();
        }

        employee.UpdatedAt = DateTime.UtcNow;
    }

    public static DepartmentDto ToDto(this Department department, int employeeCount = 0, int openRoles = 0) => new()
    {
        Id = department.Id,
        Name = department.Name,
        Code = department.Code,
        Description = department.Description,
        HeadId = department.HeadId,
        ParentId = department.ParentId,
        Location = department.Location,
        Email = department.Email,
        CreatedAt = department.CreatedAt,
        EmployeeCount = employeeCount,
        OpenRoles = openRoles,
    };

    public static DesignationDto ToDto(this Designation designation, int employeeCount = 0) => new()
    {
        Id = designation.Id,
        Title = designation.Title,
        DepartmentId = designation.DepartmentId,
        Level = designation.Level,
        Grade = designation.Grade,
        EmployeeCount = employeeCount,
    };

    public static BranchDto ToDto(this Branch branch, int employeeCount = 0) => new()
    {
        Id = branch.Id,
        Name = branch.Name,
        Address = branch.Address,
        City = branch.City,
        State = branch.State,
        Phone = branch.Phone,
        HeadId = branch.HeadId,
        IsHeadquarters = branch.IsHeadquarters,
        EmployeeCount = employeeCount,
    };

    public static AttendanceRecordDto ToDto(this AttendanceRecord record, EmployeeDto? employee = null) => new()
    {
        Id = record.Id,
        EmployeeId = record.EmployeeId,
        Date = record.Date,
        CheckIn = record.CheckIn,
        CheckOut = record.CheckOut,
        Status = record.Status,
        WorkedHours = record.WorkedHours,
        ShiftId = record.ShiftId,
        Note = record.Note,
        Employee = employee,
    };

    public static ShiftDto ToDto(this Shift shift) => new()
    {
        Id = shift.Id,
        Name = shift.Name,
        StartTime = shift.StartTime,
        EndTime = shift.EndTime,
        GraceMinutes = shift.GraceMinutes,
        AssignedCount = shift.AssignedCount,
        Days = shift.Days,
    };

    public static HolidayDto ToDto(this Holiday holiday) => new()
    {
        Id = holiday.Id,
        Name = holiday.Name,
        Date = holiday.Date,
        Type = holiday.Type,
    };

    public static AttendanceCorrectionDto ToDto(this AttendanceCorrection correction) => new()
    {
        Id = correction.Id,
        EmployeeId = correction.EmployeeId,
        Date = correction.Date,
        CurrentStatus = correction.CurrentStatus,
        RequestedStatus = correction.RequestedStatus,
        Reason = correction.Reason,
        RequestedOn = correction.RequestedOn,
        Status = correction.Status,
        DecidedBy = correction.DecidedBy,
        DecidedOn = correction.DecidedOn,
        Note = correction.Note,
    };

    public static LeaveTypeDto ToDto(this LeaveType type) => new()
    {
        Id = type.Id,
        Name = type.Name,
        Code = type.Code,
        Color = type.Color,
        AnnualQuota = type.AnnualQuota,
        CarryForward = type.CarryForward,
        RequiresDocument = type.RequiresDocument,
        Description = type.Description,
    };

    public static LeavePolicyDto ToDto(this LeavePolicy policy) => new()
    {
        LeaveTypeId = policy.LeaveTypeId,
        Accrual = policy.Accrual,
        MaxConsecutiveDays = policy.MaxConsecutiveDays,
        NoticePeriodDays = policy.NoticePeriodDays,
        AllowHalfDay = policy.AllowHalfDay,
        Policy = policy.Policy,
    };

    public static LeaveBalanceDto ToDto(this LeaveBalance balance) => new()
    {
        EmployeeId = balance.EmployeeId,
        LeaveTypeId = balance.LeaveTypeId,
        Allocated = balance.Allocated,
        Used = balance.Used,
        Pending = balance.Pending,
    };

    public static LeaveRequestDto ToDto(this LeaveRequest request) => new()
    {
        Id = request.Id,
        EmployeeId = request.EmployeeId,
        LeaveTypeId = request.LeaveTypeId,
        FromDate = request.FromDate,
        ToDate = request.ToDate,
        Days = request.Days,
        Reason = request.Reason,
        AppliedOn = request.AppliedOn,
        Status = request.Status,
        ApproverId = request.ApproverId,
        DecidedOn = request.DecidedOn,
        Note = request.Note,
    };

    public static SalaryComponentDto ToDto(this SalaryComponent component) => new()
    {
        Id = component.Id,
        Name = component.Name,
        Type = component.Type,
        Amount = component.Amount,
        Statutory = component.Statutory,
    };

    public static SalaryStructureDto ToDto(this SalaryStructure structure) => new()
    {
        EmployeeId = structure.EmployeeId,
        EffectiveFrom = structure.EffectiveFrom,
        AnnualCtc = structure.AnnualCtc,
        Earnings = structure.Earnings.Select(ToDto).ToList(),
        Deductions = structure.Deductions.Select(ToDto).ToList(),
    };

    public static PayrollRunDto ToDto(this PayrollRun run) => new()
    {
        Id = run.Id,
        Month = run.Month,
        Year = run.Year,
        PeriodLabel = run.PeriodLabel,
        Status = run.Status,
        EmployeeCount = run.EmployeeCount,
        GrossTotal = run.GrossTotal,
        DeductionsTotal = run.DeductionsTotal,
        NetTotal = run.NetTotal,
        ProcessedOn = run.ProcessedOn,
    };

    public static PayslipDto ToDto(this Payslip slip) => new()
    {
        Id = slip.Id,
        EmployeeId = slip.EmployeeId,
        PayrollRunId = slip.PayrollRunId,
        Month = slip.Month,
        Year = slip.Year,
        Earnings = slip.Earnings.Select(ToDto).ToList(),
        Deductions = slip.Deductions.Select(ToDto).ToList(),
        Gross = slip.Gross,
        TotalDeductions = slip.TotalDeductions,
        Net = slip.Net,
        WorkingDays = slip.WorkingDays,
        PaidDays = slip.PaidDays,
        Lop = slip.Lop,
        Status = slip.Status,
    };

    public static JobOpeningDto ToDto(this JobOpening job) => new()
    {
        Id = job.Id,
        Title = job.Title,
        DepartmentId = job.DepartmentId,
        Location = job.Location,
        EmploymentType = job.EmploymentType,
        ExperienceMin = job.ExperienceMin,
        ExperienceMax = job.ExperienceMax,
        Openings = job.Openings,
        Status = job.Status,
        PostedOn = job.PostedOn,
        HiringManagerId = job.HiringManagerId,
        Description = job.Description,
        SalaryRange = job.SalaryRange,
        Skills = job.Skills.ToList(),
    };

    public static CandidateDto ToDto(this Candidate candidate) => new()
    {
        Id = candidate.Id,
        JobId = candidate.JobId,
        FirstName = candidate.FirstName,
        LastName = candidate.LastName,
        Email = candidate.Email,
        Phone = candidate.Phone,
        Location = candidate.Location,
        Source = candidate.Source,
        Stage = candidate.Stage,
        AppliedOn = candidate.AppliedOn,
        ExperienceYears = candidate.ExperienceYears,
        CurrentCompany = candidate.CurrentCompany,
        ExpectedCtc = candidate.ExpectedCtc,
        Rating = candidate.Rating,
        Notes = candidate.Notes,
    };

    public static InterviewDto ToDto(this Interview interview) => new()
    {
        Id = interview.Id,
        CandidateId = interview.CandidateId,
        JobId = interview.JobId,
        Round = interview.Round,
        Date = interview.Date,
        Time = interview.Time,
        Mode = interview.Mode,
        Interviewer = interview.Interviewer,
        Status = interview.Status,
        Feedback = interview.Feedback,
    };

    public static AppraisalCycleDto ToDto(this AppraisalCycle cycle) => new()
    {
        Id = cycle.Id,
        Name = cycle.Name,
        Period = cycle.Period,
        StartDate = cycle.StartDate,
        EndDate = cycle.EndDate,
        Status = cycle.Status,
    };

    public static GoalDto ToDto(this Goal goal) => new()
    {
        Id = goal.Id,
        EmployeeId = goal.EmployeeId,
        Title = goal.Title,
        Description = goal.Description,
        Category = goal.Category,
        Weight = goal.Weight,
        Target = goal.Target,
        Progress = goal.Progress,
        DueDate = goal.DueDate,
        Status = goal.Status,
    };

    public static ReviewDto ToDto(this Review review) => new()
    {
        Id = review.Id,
        EmployeeId = review.EmployeeId,
        CycleId = review.CycleId,
        ReviewerId = review.ReviewerId,
        Type = review.Type,
        Rating = review.Rating,
        Status = review.Status,
        SubmittedOn = review.SubmittedOn,
        Summary = review.Summary,
    };

    public static FeedbackDto ToDto(this Feedback feedback) => new()
    {
        Id = feedback.Id,
        EmployeeId = feedback.EmployeeId,
        FromId = feedback.FromId,
        Date = feedback.Date,
        Type = feedback.Type,
        Message = feedback.Message,
        Rating = feedback.Rating,
    };

    public static ExpenseCategoryDto ToDto(this ExpenseCategory category) => new()
    {
        Id = category.Id,
        Name = category.Name,
        Limit = category.Limit,
        Description = category.Description,
    };

    public static ExpenseClaimDto ToDto(this ExpenseClaim claim) => new()
    {
        Id = claim.Id,
        EmployeeId = claim.EmployeeId,
        CategoryId = claim.CategoryId,
        Title = claim.Title,
        Amount = claim.Amount,
        Date = claim.Date,
        SubmittedOn = claim.SubmittedOn,
        Status = claim.Status,
        Description = claim.Description,
        ReceiptName = claim.ReceiptName,
        ApprovedBy = claim.ApprovedBy,
        ReimbursedOn = claim.ReimbursedOn,
    };

    public static NotificationPreferenceDto ToDto(this NotificationPreference preference) => new()
    {
        Id = preference.Id,
        Label = preference.Label,
        Email = preference.Email,
        InApp = preference.InApp,
    };

    public static CompanyProfileDto ToDto(this CompanySetting setting) => new()
    {
        LegalName = setting.LegalName,
        DisplayName = setting.DisplayName,
        Domain = setting.Domain,
        Industry = setting.Industry,
        Headquarters = setting.Headquarters,
        Email = setting.Email,
        Phone = setting.Phone,
        Website = setting.Website,
        Gstin = setting.Gstin,
        Pan = setting.Pan,
        Cin = setting.Cin,
        Currency = setting.Currency,
        Timezone = setting.Timezone,
        FinancialYear = setting.FinancialYear,
        PayrollFrequency = setting.PayrollFrequency,
    };

    public static AttendanceSettingsDto ToDto(this AttendanceSetting setting) => new()
    {
        WorkWeek = setting.WorkWeek,
        ShiftStart = setting.ShiftStart,
        ShiftEnd = setting.ShiftEnd,
        GraceMinutes = setting.GraceMinutes,
        HalfDayHours = setting.HalfDayHours,
        FullDayHours = setting.FullDayHours,
        AutoMarkAbsent = setting.AutoMarkAbsent,
        RequireLocation = setting.RequireLocation,
        AllowCorrections = setting.AllowCorrections,
        CorrectionWindowDays = setting.CorrectionWindowDays,
    };

    public static PayrollSettingsDto ToDto(this PayrollSetting setting) => new()
    {
        PayDay = setting.PayDay,
        InputCutoffDay = setting.InputCutoffDay,
        ApprovalRequired = setting.ApprovalRequired,
        PayslipRelease = setting.PayslipRelease,
        BankFileFormat = setting.BankFileFormat,
        StatutoryProfile = setting.StatutoryProfile,
        EffectiveFrom = setting.EffectiveFrom,
        PfRate = setting.PfRate,
        EsiRate = setting.EsiRate,
        ProfessionalTax = setting.ProfessionalTax,
        TdsMethod = setting.TdsMethod,
        Disclaimer = setting.Disclaimer,
    };

    public static StatutorySettingDto ToDto(this StatutorySetting setting) => new()
    {
        Label = setting.Label,
        EffectiveFrom = setting.EffectiveFrom,
        PfEmployeeRate = setting.PfEmployeeRate,
        EsiEmployeeRate = setting.EsiEmployeeRate,
        EsiGrossThreshold = setting.EsiGrossThreshold,
        ProfessionalTaxMonthly = setting.ProfessionalTaxMonthly,
        IllustrativeTdsRate = setting.IllustrativeTdsRate,
        TdsThresholdMonthly = setting.TdsThresholdMonthly,
        Description = setting.Description,
    };
}
