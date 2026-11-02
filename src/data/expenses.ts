import type { ExpenseCategory, ExpenseClaim } from '@/types'
import { employees } from './employees'
import { addDays, format } from 'date-fns'

export const expenseCategories: ExpenseCategory[] = [
  { id: 'exp-travel', name: 'Travel', limit: 25000, description: 'Airfare, rail, cabs and local transport for approved business travel.' },
  { id: 'exp-accommodation', name: 'Accommodation', limit: 12000, description: 'Hotel stays for approved business travel.' },
  { id: 'exp-meals', name: 'Meals', limit: 2500, description: 'Meals during business travel or approved overtime.' },
  { id: 'exp-client', name: 'Client Entertainment', limit: 15000, description: 'Customer meetings and approved business entertainment.' },
  { id: 'exp-telecom', name: 'Telecom & Internet', limit: 3000, description: 'Monthly mobile or home internet reimbursement.' },
  { id: 'exp-software', name: 'Software & Tools', limit: 20000, description: 'Approved productivity or development tools.' },
  { id: 'exp-supplies', name: 'Office Supplies', limit: 5000, description: 'Work-from-home equipment and office supplies.' },
  { id: 'exp-training', name: 'Training & Certification', limit: 40000, description: 'Approved courses, certifications and conferences.' },
]

interface ClaimSpec {
  employeeIndex: number
  categoryId: string
  title: string
  amount: number
  status: ExpenseClaim['status']
  receipt?: string
  description: string
  day: number
}

const claimSpecs: ClaimSpec[] = [
  { employeeIndex: 8, categoryId: 'exp-travel', title: 'Client visit — Mumbai', amount: 12480, status: 'Reimbursed', receipt: 'mumbai_airfare_receipt.pdf', description: 'Return airfare and airport transfer for the Q3 enterprise renewal meeting.', day: 2 },
  { employeeIndex: 12, categoryId: 'exp-client', title: 'Customer dinner — Bengaluru', amount: 6840, status: 'Approved', receipt: 'customer_dinner.jpg', description: 'Business dinner with the evaluation committee for the Meridian account.', day: 6 },
  { employeeIndex: 18, categoryId: 'exp-software', title: 'Figma annual subscription', amount: 9600, status: 'Pending', receipt: 'figma_invoice.pdf', description: 'Annual design seat renewal for the product design team.', day: 12 },
  { employeeIndex: 22, categoryId: 'exp-meals', title: 'Team lunch — release celebration', amount: 3200, status: 'Approved', receipt: 'team_lunch_receipt.pdf', description: 'Team lunch following the successful October platform release.', day: 14 },
  { employeeIndex: 27, categoryId: 'exp-telecom', title: 'October broadband reimbursement', amount: 1499, status: 'Reimbursed', receipt: 'broadband_bill_oct.pdf', description: 'Monthly home internet reimbursement for remote work.', day: 3 },
  { employeeIndex: 31, categoryId: 'exp-accommodation', title: 'Hyderabad stay — onboarding', amount: 8700, status: 'Pending', receipt: 'hotel_invoice.pdf', description: 'Two-night stay during the new-hire onboarding programme.', day: 20 },
  { employeeIndex: 36, categoryId: 'exp-training', title: 'AWS Solutions Architect exam', amount: 15000, status: 'Approved', receipt: 'aws_exam_receipt.pdf', description: 'Certification exam fee for the platform engineering team.', day: 9 },
  { employeeIndex: 41, categoryId: 'exp-supplies', title: 'Ergonomic keyboard and mouse', amount: 4250, status: 'Rejected', receipt: 'keyboard_invoice.pdf', description: 'Ergonomic peripherals for the Bengaluru workstation.', day: 8 },
  { employeeIndex: 47, categoryId: 'exp-travel', title: 'Pune to Hyderabad — candidate interviews', amount: 7350, status: 'Approved', receipt: 'rail_ticket.pdf', description: 'Travel for the engineering hiring drive at the Hyderabad office.', day: 11 },
  { employeeIndex: 53, categoryId: 'exp-meals', title: 'Late-night release support meals', amount: 1860, status: 'Pending', receipt: 'meal_bill.jpg', description: 'Dinner for the on-call team during the October release window.', day: 21 },
  { employeeIndex: 58, categoryId: 'exp-client', title: 'Customer workshop — Chennai', amount: 11200, status: 'Reimbursed', receipt: 'workshop_receipt.pdf', description: 'Venue and refreshments for the customer success workshop.', day: 4 },
  { employeeIndex: 64, categoryId: 'exp-software', title: 'Postman Team plan', amount: 7200, status: 'Approved', receipt: 'postman_invoice.pdf', description: 'API tooling subscription for the engineering team.', day: 13 },
  { employeeIndex: 69, categoryId: 'exp-supplies', title: 'Home office chair', amount: 8900, status: 'Pending', receipt: 'chair_invoice.pdf', description: 'Approved work-from-home furniture allowance.', day: 22 },
  { employeeIndex: 74, categoryId: 'exp-telecom', title: 'Mobile reimbursement — September', amount: 1200, status: 'Reimbursed', receipt: 'mobile_bill_sep.pdf', description: 'Monthly mobile reimbursement.', day: 1 },
  { employeeIndex: 79, categoryId: 'exp-travel', title: 'Recruitment drive travel', amount: 5480, status: 'Approved', receipt: 'cab_receipts.pdf', description: 'Local transport during the campus hiring drive.', day: 16 },
  { employeeIndex: 84, categoryId: 'exp-training', title: 'Design leadership workshop', amount: 22000, status: 'Pending', receipt: 'workshop_invoice.pdf', description: 'Two-day design leadership programme in Mumbai.', day: 19 },
  { employeeIndex: 89, categoryId: 'exp-client', title: 'Prospect lunch — Gurugram', amount: 4350, status: 'Pending', receipt: 'lunch_receipt.jpg', description: 'Business development lunch with a prospective enterprise customer.', day: 23 },
  { employeeIndex: 95, categoryId: 'exp-meals', title: 'Customer visit refreshments', amount: 980, status: 'Approved', receipt: 'cafe_receipt.jpg', description: 'Refreshments for an on-site customer review.', day: 17 },
  { employeeIndex: 101, categoryId: 'exp-accommodation', title: 'Bengaluru offsite stay', amount: 10400, status: 'Pending', receipt: 'offsite_hotel.pdf', description: 'Accommodation for the marketing planning offsite.', day: 24 },
  { employeeIndex: 107, categoryId: 'exp-supplies', title: 'Whiteboard and stationery', amount: 2100, status: 'Approved', receipt: 'stationery_bill.pdf', description: 'Planning supplies for the customer success team room.', day: 10 },
  { employeeIndex: 112, categoryId: 'exp-software', title: 'Analytics dashboard tool', amount: 12500, status: 'Pending', receipt: 'analytics_invoice.pdf', description: 'Monthly analytics platform subscription for the support team.', day: 25 },
  { employeeIndex: 118, categoryId: 'exp-travel', title: 'Office visit — Hyderabad HQ', amount: 3980, status: 'Approved', receipt: 'train_ticket.pdf', description: 'Quarterly in-person planning at the headquarters.', day: 7 },
]

export const expenseClaims: ExpenseClaim[] = claimSpecs.map((spec, index) => {
  const employee = employees[spec.employeeIndex % employees.length]
  const submitted = addDays(new Date(2026, 9, 26), -spec.day)
  const category = expenseCategories.find((c) => c.id === spec.categoryId)
  return {
    id: `EXP-${5001 + index}`,
    employeeId: employee.id,
    categoryId: spec.categoryId,
    title: spec.title,
    amount: spec.amount,
    date: format(addDays(submitted, -2), 'yyyy-MM-dd'),
    submittedOn: format(submitted, 'yyyy-MM-dd'),
    status: spec.status,
    description: spec.description,
    receiptName: spec.receipt ?? (category ? `${category.id.replace('exp-', '')}_receipt.pdf` : undefined),
    approvedBy: spec.status === 'Approved' || spec.status === 'Reimbursed' ? employee.managerId ?? 'HZT-0002' : undefined,
    reimbursedOn: spec.status === 'Reimbursed' ? format(addDays(submitted, 6), 'yyyy-MM-dd') : undefined,
  }
})

export function getCategoryById(id: string): ExpenseCategory | undefined {
  return expenseCategories.find((category) => category.id === id)
}

export function getCategoryName(id: string): string {
  return getCategoryById(id)?.name ?? '—'
}

export function getEmployeeExpenses(employeeId: string): ExpenseClaim[] {
  return expenseClaims.filter((claim) => claim.employeeId === employeeId)
}
