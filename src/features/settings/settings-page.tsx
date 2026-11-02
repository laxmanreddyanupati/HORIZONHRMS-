import {
  Bell,
  Building2,
  CalendarDays,
  Clock3,
  ShieldCheck,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { DemoNotice } from '@/components/common/demo-notice'
import { PageHeader } from '@/components/common/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRole } from '@/contexts/role-context'
import {
  AttendanceSettings,
  CompanySettings,
  HolidaysSettings,
  LeavePoliciesSettings,
  NotificationSettings,
  PayrollSettings,
  RolesSettings,
} from './settings-forms'

interface SettingsTab {
  value: string
  label: string
  icon: LucideIcon
  payrollAdminVisible?: boolean
}

const SETTINGS_TABS: SettingsTab[] = [
  { value: 'company', label: 'Company', icon: Building2 },
  { value: 'attendance', label: 'Attendance', icon: Clock3 },
  { value: 'payroll', label: 'Payroll', icon: Wallet, payrollAdminVisible: true },
  { value: 'leave-policies', label: 'Leave policies', icon: CalendarDays },
  { value: 'holidays', label: 'Holidays', icon: CalendarDays, payrollAdminVisible: true },
  { value: 'notifications', label: 'Notifications', icon: Bell },
  { value: 'roles', label: 'Roles', icon: ShieldCheck },
]

function renderTabContent(value: string) {
  switch (value) {
    case 'company':
      return <CompanySettings />
    case 'attendance':
      return <AttendanceSettings />
    case 'payroll':
      return <PayrollSettings />
    case 'leave-policies':
      return <LeavePoliciesSettings />
    case 'holidays':
      return <HolidaysSettings />
    case 'notifications':
      return <NotificationSettings />
    case 'roles':
      return <RolesSettings />
    default:
      return null
  }
}

export function SettingsPage() {
  const { role, roleLabel } = useRole()
  const isPayrollAdmin = role === 'payroll-admin'
  const visibleTabs = isPayrollAdmin
    ? SETTINGS_TABS.filter((tab) => tab.payrollAdminVisible)
    : SETTINGS_TABS
  const defaultTab = isPayrollAdmin ? 'payroll' : 'company'

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Administration"
        title="Settings"
        description={`Workspace configuration for the ${roleLabel} role. Changes are saved to the HRMS database.`}
      />

      <DemoNotice>
        Configuration on this page is persisted by the HRMS API. Access to each tab follows your signed-in role and is
        enforced by the server.
        {isPayrollAdmin
          ? ' Payroll Admin only sees the Payroll and Holidays tabs; company, attendance, leave, notification and role configuration is hidden for this role.'
          : ''}
      </DemoNotice>

      <Tabs defaultValue={defaultTab} key={role}>
        <TabsList>
          {visibleTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              <tab.icon className="size-3.5" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {visibleTabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            {renderTabContent(tab.value)}
          </TabsContent>
        ))}
      </Tabs>

      <p className="text-[10.5px] leading-relaxed text-slate-400">
        Statutory identifiers, rates and payroll settings are illustrative and are not legal, tax or payroll advice.
        Changes are stored by the HRMS API.
      </p>
    </div>
  )
}
