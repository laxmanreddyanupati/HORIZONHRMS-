export type Role =
  | 'super-admin'
  | 'hr-admin'
  | 'hr-executive'
  | 'manager'
  | 'payroll-admin'
  | 'employee'

export type EmploymentStatus = 'Active' | 'Probation' | 'On Leave' | 'Inactive'
export type EmploymentType = 'Full-time' | 'Contract' | 'Internship'

export interface Address {
  line1: string
  city: string
  state: string
  postalCode: string
  country: string
}

export interface EmergencyContact {
  id: string
  name: string
  relationship: string
  phone: string
}

export interface BankInfo {
  bankName: string
  accountNumber: string
  ifsc: string
  branch: string
  accountType: string
}

export interface StatutoryInfo {
  pan: string
  aadhaar: string
  uan: string
  pfNumber: string
  esiNumber: string
}

export interface EmployeeDocument {
  id: string
  name: string
  category: string
  uploadedOn: string
  size: string
  status: 'Verified' | 'Pending'
}

export type HistoryEventType =
  | 'Joining'
  | 'Promotion'
  | 'Transfer'
  | 'Confirmation'
  | 'Salary Revision'

export interface EmploymentHistoryItem {
  id: string
  title: string
  department: string
  effectiveFrom: string
  effectiveTo?: string
  type: HistoryEventType
}

export interface Employee {
  id: string
  firstName: string
  lastName: string
  email: string
  personalEmail: string
  phone: string
  gender: 'Male' | 'Female' | 'Other'
  dateOfBirth: string
  maritalStatus: 'Single' | 'Married'
  bloodGroup: string
  about?: string
  departmentId: string
  designationId: string
  branchId: string
  managerId: string | null
  employmentType: EmploymentType
  status: EmploymentStatus
  dateOfJoining: string
  dateOfConfirmation?: string
  workLocation: string
  shiftId: string
  address: Address
  emergencyContacts: EmergencyContact[]
  bank?: BankInfo
  statutory?: StatutoryInfo
  documents: EmployeeDocument[]
  employmentHistory: EmploymentHistoryItem[]
  skills: string[]
  isDetailed?: boolean
}

export interface Department {
  id: string
  name: string
  code: string
  description: string
  headId: string
  parentId: string | null
  location: string
  email: string
  createdAt: string
}

export interface Designation {
  id: string
  title: string
  departmentId: string
  level: 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6'
  grade: string
}

export interface Branch {
  id: string
  name: string
  address: string
  city: string
  state: string
  phone: string
  headId: string | null
  isHeadquarters: boolean
}

export interface OrgNode {
  employee: Employee
  children: OrgNode[]
}

export type AttendanceStatus =
  | 'Present'
  | 'Absent'
  | 'Late'
  | 'Half Day'
  | 'On Leave'
  | 'Holiday'
  | 'Weekend'

export interface AttendanceRecord {
  id: string
  employeeId: string
  date: string
  checkIn: string | null
  checkOut: string | null
  status: AttendanceStatus
  workedHours: number | null
  shiftId: string
  note?: string
}

export interface Shift {
  id: string
  name: string
  startTime: string
  endTime: string
  graceMinutes: number
  assignedCount: number
  days: string
}

export interface Holiday {
  id: string
  name: string
  date: string
  type: 'Public' | 'Optional' | 'Company'
}

export interface AttendanceCorrection {
  id: string
  employeeId: string
  date: string
  currentStatus: AttendanceStatus
  requestedStatus: AttendanceStatus
  reason: string
  requestedOn: string
  status: 'Pending' | 'Approved' | 'Rejected'
}

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled'

export interface LeaveType {
  id: string
  name: string
  code: string
  color: string
  annualQuota: number
  carryForward: boolean
  requiresDocument: boolean
  description: string
}

export interface LeaveBalance {
  employeeId: string
  leaveTypeId: string
  allocated: number
  used: number
  pending: number
}

export interface LeaveRequest {
  id: string
  employeeId: string
  leaveTypeId: string
  fromDate: string
  toDate: string
  days: number
  reason: string
  appliedOn: string
  status: LeaveStatus
  approverId?: string
  decidedOn?: string
  note?: string
}

export interface LeavePolicy {
  leaveTypeId: string
  accrual: string
  maxConsecutiveDays: number
  noticePeriodDays: number
  allowHalfDay: boolean
  policy: string
}

export type PayrollStatus = 'Draft' | 'Processing' | 'Processed' | 'Paid'

export interface SalaryComponent {
  id: string
  name: string
  type: 'earning' | 'deduction'
  amount: number
  statutory?: boolean
}

export interface SalaryStructure {
  employeeId: string
  effectiveFrom: string
  annualCtc: number
  earnings: SalaryComponent[]
  deductions: SalaryComponent[]
}

export interface PayrollRun {
  id: string
  month: number
  year: number
  periodLabel: string
  status: PayrollStatus
  employeeCount: number
  grossTotal: number
  deductionsTotal: number
  netTotal: number
  processedOn?: string
}

export interface Payslip {
  id: string
  employeeId: string
  payrollRunId: string
  month: number
  year: number
  earnings: SalaryComponent[]
  deductions: SalaryComponent[]
  gross: number
  totalDeductions: number
  net: number
  workingDays: number
  paidDays: number
  lop: number
  status: PayrollStatus
}

export type JobStatus = 'Open' | 'On Hold' | 'Closed'
export type CandidateStage =
  | 'Applied'
  | 'Screening'
  | 'Interview'
  | 'Offer'
  | 'Hired'
  | 'Rejected'

export interface JobOpening {
  id: string
  title: string
  departmentId: string
  location: string
  employmentType: EmploymentType
  experienceMin: number
  experienceMax: number
  openings: number
  status: JobStatus
  postedOn: string
  hiringManagerId: string
  description: string
  salaryRange: string
  skills: string[]
}

export interface Candidate {
  id: string
  jobId: string
  firstName: string
  lastName: string
  email: string
  phone: string
  location: string
  source: 'LinkedIn' | 'Referral' | 'Naukri' | 'Career Site' | 'Agency'
  stage: CandidateStage
  appliedOn: string
  experienceYears: number
  currentCompany: string
  expectedCtc: number
  rating: number
  notes?: string
}

export interface Interview {
  id: string
  candidateId: string
  jobId: string
  round: string
  date: string
  time: string
  mode: 'Video' | 'In person' | 'Phone'
  interviewer: string
  status: 'Scheduled' | 'Completed' | 'Cancelled'
  feedback?: string
}

export type GoalStatus = 'Not Started' | 'On Track' | 'At Risk' | 'Completed'

export interface Goal {
  id: string
  employeeId: string
  title: string
  description: string
  category: string
  weight: number
  target: string
  progress: number
  dueDate: string
  status: GoalStatus
}

export type ReviewType = 'Self' | 'Manager' | 'Peer' | 'HR'

export interface Review {
  id: string
  employeeId: string
  cycleId: string
  reviewerId: string
  type: ReviewType
  rating: number
  status: 'Pending' | 'In Progress' | 'Completed'
  submittedOn?: string
  summary?: string
}

export interface AppraisalCycle {
  id: string
  name: string
  period: string
  startDate: string
  endDate: string
  status: 'Draft' | 'Active' | 'Completed'
}

export interface Feedback {
  id: string
  employeeId: string
  fromId: string
  date: string
  type: 'Praise' | 'Constructive' | 'Check-in'
  message: string
  rating?: number
}

export type ExpenseStatus = 'Pending' | 'Approved' | 'Rejected' | 'Reimbursed'

export interface ExpenseCategory {
  id: string
  name: string
  limit: number
  description: string
}

export interface ExpenseClaim {
  id: string
  employeeId: string
  categoryId: string
  title: string
  amount: number
  date: string
  submittedOn: string
  status: ExpenseStatus
  description: string
  receiptName?: string
  approvedBy?: string
  reimbursedOn?: string
}

export interface NotificationItem {
  id: string
  title: string
  message: string
  time: string
  type: 'leave' | 'payroll' | 'attendance' | 'recruitment' | 'system'
  read: boolean
  href?: string
}

export interface AuditLog {
  id: string
  actor: string
  actorRole: string
  action: string
  module: string
  target: string
  timestamp: string
  ipAddress: string
}

export interface SystemUser {
  id: string
  employeeId: string | null
  name: string
  email: string
  role: Role
  status: 'Active' | 'Invited' | 'Suspended'
  lastActive: string
  mfaEnabled: boolean
}

export interface DashboardStats {
  totalEmployees: number
  activeEmployees: number
  presentToday: number
  onLeaveToday: number
  pendingLeaveRequests: number
  newHiresThisMonth: number
  attritionRate: number
  openPositions: number
  attendanceRate: number
  payrollMonthLabel: string
  monthlyPayroll: number
}

export interface EmployeeFilterParams {
  search?: string
  departmentId?: string
  status?: string
  designationId?: string
  branchId?: string
  managerId?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortDir?: 'asc' | 'desc'
}

export interface EmployeeFormInput {
  firstName: string
  lastName: string
  email: string
  personalEmail: string
  phone: string
  gender: Employee['gender']
  dateOfBirth: string
  maritalStatus: Employee['maritalStatus']
  bloodGroup: string
  departmentId: string
  designationId: string
  branchId: string
  managerId?: string | null
  employmentType: EmploymentType
  status: EmploymentStatus
  dateOfJoining: string
  workLocation: string
  address: Address
  emergencyContactName: string
  emergencyContactRelationship: string
  emergencyContactPhone: string
}

export interface LeaveApplicationInput {
  employeeId: string
  leaveTypeId: string
  fromDate: string
  toDate: string
  reason: string
}

export interface ExpenseFormInput {
  employeeId: string
  categoryId: string
  title: string
  amount: number
  date: string
  description: string
  receiptName?: string
}

export interface JobFormInput {
  title: string
  departmentId: string
  location: string
  employmentType: EmploymentType
  experienceMin: number
  experienceMax: number
  openings: number
  salaryRange: string
  description: string
}

export interface GoalFormInput {
  employeeId: string
  title: string
  description: string
  category: string
  target: string
  weight: number
  dueDate: string
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
