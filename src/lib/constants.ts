import {
  BarChart3,
  Briefcase,
  Building2,
  CalendarCheck2,
  CalendarDays,
  LayoutDashboard,
  ReceiptText,
  ScrollText,
  Settings,
  ShieldCheck,
  Target,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { Role } from '@/types'

export const COMPANY = {
  name: 'Horizon Technologies Pvt. Ltd.',
  shortName: 'Horizon Technologies',
  tagline: 'Enterprise HRMS',
  industry: 'Information Technology',
  location: 'Hyderabad, Telangana, India',
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  payFrequency: 'Monthly',
  financialYear: 'April – March',
  employeeCapacity: '50–200',
  domain: 'horizontech.example',
}

export const ROLES: Array<{ value: Role; label: string; description: string }> = [
  {
    value: 'super-admin',
    label: 'Super Admin',
    description: 'Full access across all modules and configuration.',
  },
  {
    value: 'hr-admin',
    label: 'HR Admin',
    description: 'People operations, policies, payroll view and reporting.',
  },
  {
    value: 'hr-executive',
    label: 'HR Executive',
    description: 'Recruitment, employee records, attendance and leave.',
  },
  {
    value: 'manager',
    label: 'Manager',
    description: 'Team attendance, leave approvals, performance and expenses.',
  },
  {
    value: 'payroll-admin',
    label: 'Payroll Admin',
    description: 'Payroll processing, salary structures and statutory review.',
  },
  {
    value: 'employee',
    label: 'Employee',
    description: 'Self-service access to attendance, leave and payslips.',
  },
]

export type ModuleKey =
  | 'dashboard'
  | 'employees'
  | 'organization'
  | 'recruitment'
  | 'performance'
  | 'attendance'
  | 'leave'
  | 'payroll'
  | 'expenses'
  | 'reports'
  | 'settings'
  | 'users'
  | 'audit'
  | 'profile'

const ALL_ROLES: Role[] = [
  'super-admin',
  'hr-admin',
  'hr-executive',
  'manager',
  'payroll-admin',
  'employee',
]

export const MODULE_ACCESS: Record<ModuleKey, Role[]> = {
  dashboard: ALL_ROLES,
  employees: ['super-admin', 'hr-admin', 'hr-executive', 'manager', 'payroll-admin'],
  organization: ['super-admin', 'hr-admin', 'hr-executive', 'manager'],
  recruitment: ['super-admin', 'hr-admin', 'hr-executive'],
  performance: ['super-admin', 'hr-admin', 'hr-executive', 'manager', 'employee'],
  attendance: ALL_ROLES,
  leave: ALL_ROLES,
  payroll: ['super-admin', 'hr-admin', 'payroll-admin', 'employee'],
  expenses: ALL_ROLES,
  reports: ['super-admin', 'hr-admin', 'hr-executive', 'manager', 'payroll-admin'],
  settings: ['super-admin', 'hr-admin', 'payroll-admin'],
  users: ['super-admin', 'hr-admin'],
  audit: ['super-admin', 'hr-admin'],
  profile: ALL_ROLES,
}

export const SENSITIVE_ROLES: Role[] = ['super-admin', 'hr-admin', 'payroll-admin']
export const APPROVAL_ROLES: Role[] = ['super-admin', 'hr-admin', 'hr-executive', 'manager']
export const PAYROLL_EDIT_ROLES: Role[] = ['super-admin', 'payroll-admin']
export const EMPLOYEE_EDIT_ROLES: Role[] = ['super-admin', 'hr-admin', 'hr-executive']
export const ORGANIZATION_EDIT_ROLES: Role[] = ['super-admin', 'hr-admin', 'hr-executive']
export const RECRUITMENT_EDIT_ROLES: Role[] = ['super-admin', 'hr-admin', 'hr-executive']
export const PERFORMANCE_EDIT_ROLES: Role[] = ['super-admin', 'hr-admin', 'hr-executive', 'manager']
export const EXPENSE_REVIEW_ROLES: Role[] = ['super-admin', 'hr-admin', 'hr-executive', 'manager', 'payroll-admin']

export function canAccess(role: Role, moduleKey: ModuleKey): boolean {
  return MODULE_ACCESS[moduleKey].includes(role)
}

export function canViewSensitive(role: Role): boolean {
  return SENSITIVE_ROLES.includes(role)
}

export function canApprove(role: Role): boolean {
  return APPROVAL_ROLES.includes(role)
}

export function canManagePayroll(role: Role): boolean {
  return PAYROLL_EDIT_ROLES.includes(role)
}

export function moduleForPath(pathname: string): ModuleKey {
  if (pathname === '/' || pathname === '') return 'dashboard'
  const segment = pathname.split('/').filter(Boolean)[0] ?? 'dashboard'
  if (segment === 'audit-logs') return 'audit'
  if (segment in MODULE_ACCESS) return segment as ModuleKey
  return 'dashboard'
}

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  module: ModuleKey
  badge?: 'pending-leaves' | 'open-roles' | 'pending-expenses'
}

export interface NavSection {
  label: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', href: '/', icon: LayoutDashboard, module: 'dashboard' }],
  },
  {
    label: 'People',
    items: [
      { label: 'Employees', href: '/employees', icon: Users, module: 'employees' },
      { label: 'Organization', href: '/organization', icon: Building2, module: 'organization' },
      {
        label: 'Recruitment',
        href: '/recruitment',
        icon: Briefcase,
        module: 'recruitment',
        badge: 'open-roles',
      },
      { label: 'Performance', href: '/performance', icon: Target, module: 'performance' },
    ],
  },
  {
    label: 'Time and Payroll',
    items: [
      { label: 'Attendance', href: '/attendance', icon: CalendarCheck2, module: 'attendance' },
      {
        label: 'Leave Management',
        href: '/leave',
        icon: CalendarDays,
        module: 'leave',
        badge: 'pending-leaves',
      },
      { label: 'Payroll', href: '/payroll', icon: Wallet, module: 'payroll' },
      {
        label: 'Expenses',
        href: '/expenses',
        icon: ReceiptText,
        module: 'expenses',
        badge: 'pending-expenses',
      },
    ],
  },
  {
    label: 'Analytics',
    items: [{ label: 'Reports', href: '/reports', icon: BarChart3, module: 'reports' }],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Settings', href: '/settings', icon: Settings, module: 'settings' },
      { label: 'User Management', href: '/users', icon: ShieldCheck, module: 'users' },
      { label: 'Audit Logs', href: '/audit-logs', icon: ScrollText, module: 'audit' },
    ],
  },
]

export const QUICK_LINKS = [
  { label: 'Apply for leave', href: '/leave?action=apply' },
  { label: 'Add employee', href: '/employees/new' },
  { label: 'Run payroll preview', href: '/payroll?tab=preview' },
  { label: 'Post a job opening', href: '/recruitment?action=new-job' },
  { label: 'Submit an expense', href: '/expenses?action=new' },
]

export const SEGMENT_LABELS: Record<string, string> = {
  employees: 'Employees',
  new: 'Add Employee',
  edit: 'Edit Employee',
  organization: 'Organization',
  recruitment: 'Recruitment',
  performance: 'Performance',
  attendance: 'Attendance',
  leave: 'Leave Management',
  payroll: 'Payroll',
  payslip: 'Payslip',
  expenses: 'Expenses',
  reports: 'Reports',
  settings: 'Settings',
  users: 'User Management',
  'audit-logs': 'Audit Logs',
  profile: 'My Profile',
  unauthorized: 'Access Restricted',
}

export const CHART_COLORS = ['#2563eb', '#0ea5e9', '#14b8a6', '#f59e0b', '#8b5cf6', '#f43f5e', '#64748b']

export const DEMO_NOTICE =
  'Environment notice — people, payroll and performance records are stored by the HRMS database. Statutory rates are illustrative.'
