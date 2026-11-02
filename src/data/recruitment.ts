import type { Candidate, Interview, JobOpening } from '@/types'
import { addDays, format } from 'date-fns'

export const jobOpenings: JobOpening[] = [
  {
    id: 'JOB-1001',
    title: 'Senior Software Engineer',
    departmentId: 'dept-eng',
    location: 'Hyderabad',
    employmentType: 'Full-time',
    experienceMin: 5,
    experienceMax: 8,
    openings: 3,
    status: 'Open',
    postedOn: '2026-09-18',
    hiringManagerId: 'HZT-0003',
    description: 'Build and scale the Horizon platform across web and API surfaces. You will own features end to end, mentor engineers and improve platform reliability.',
    salaryRange: '₹28L – ₹38L',
    skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
  },
  {
    id: 'JOB-1002',
    title: 'Product Manager',
    departmentId: 'dept-product',
    location: 'Bengaluru',
    employmentType: 'Full-time',
    experienceMin: 4,
    experienceMax: 7,
    openings: 1,
    status: 'Open',
    postedOn: '2026-09-25',
    hiringManagerId: 'HZT-0051',
    description: 'Own the HRMS product roadmap for mid-market customers. Partner with design and engineering to ship measurable outcomes.',
    salaryRange: '₹24L – ₹32L',
    skills: ['Product Strategy', 'B2B SaaS', 'Analytics'],
  },
  {
    id: 'JOB-1003',
    title: 'Product Designer',
    departmentId: 'dept-design',
    location: 'Pune',
    employmentType: 'Full-time',
    experienceMin: 3,
    experienceMax: 6,
    openings: 1,
    status: 'Open',
    postedOn: '2026-10-01',
    hiringManagerId: 'HZT-0004',
    description: 'Design intuitive enterprise workflows and contribute to the Horizon design system.',
    salaryRange: '₹18L – ₹26L',
    skills: ['Figma', 'Design Systems', 'User Research'],
  },
  {
    id: 'JOB-1004',
    title: 'HR Executive',
    departmentId: 'dept-hr',
    location: 'Hyderabad',
    employmentType: 'Full-time',
    experienceMin: 2,
    experienceMax: 4,
    openings: 1,
    status: 'On Hold',
    postedOn: '2026-09-12',
    hiringManagerId: 'HZT-0002',
    description: 'Support onboarding, employee lifecycle and engagement initiatives across India offices.',
    salaryRange: '₹7L – ₹10L',
    skills: ['HR Operations', 'Onboarding', 'Engagement'],
  },
  {
    id: 'JOB-1005',
    title: 'Enterprise Account Executive',
    departmentId: 'dept-sales',
    location: 'Bengaluru',
    employmentType: 'Full-time',
    experienceMin: 5,
    experienceMax: 9,
    openings: 4,
    status: 'Open',
    postedOn: '2026-09-05',
    hiringManagerId: 'HZT-0009',
    description: 'Own enterprise pipeline and close strategic HRMS deals across India.',
    salaryRange: '₹20L – ₹30L + variable',
    skills: ['Enterprise Sales', 'SaaS', 'Negotiation'],
  },
  {
    id: 'JOB-1006',
    title: 'Content Specialist',
    departmentId: 'dept-marketing',
    location: 'Bengaluru',
    employmentType: 'Full-time',
    experienceMin: 2,
    experienceMax: 5,
    openings: 2,
    status: 'Open',
    postedOn: '2026-10-06',
    hiringManagerId: 'HZT-0010',
    description: 'Create product-led content, customer stories and demand generation assets.',
    salaryRange: '₹9L – ₹14L',
    skills: ['Content Marketing', 'SEO', 'B2B Writing'],
  },
  {
    id: 'JOB-1007',
    title: 'Customer Success Executive',
    departmentId: 'dept-cs',
    location: 'Hyderabad',
    employmentType: 'Full-time',
    experienceMin: 2,
    experienceMax: 5,
    openings: 3,
    status: 'Open',
    postedOn: '2026-10-09',
    hiringManagerId: 'HZT-0109',
    description: 'Drive product adoption, renewals and customer health for enterprise accounts.',
    salaryRange: '₹8L – ₹13L',
    skills: ['Customer Success', 'Account Management', 'CRM'],
  },
  {
    id: 'JOB-1008',
    title: 'DevOps Engineer',
    departmentId: 'dept-eng',
    location: 'Hyderabad',
    employmentType: 'Full-time',
    experienceMin: 3,
    experienceMax: 6,
    openings: 1,
    status: 'Open',
    postedOn: '2026-10-12',
    hiringManagerId: 'HZT-0003',
    description: 'Own CI/CD, cloud infrastructure and observability for the Horizon platform.',
    salaryRange: '₹18L – ₹26L',
    skills: ['AWS', 'Kubernetes', 'Terraform'],
  },
  {
    id: 'JOB-1009',
    title: 'Payroll Specialist',
    departmentId: 'dept-finance',
    location: 'Chennai',
    employmentType: 'Full-time',
    experienceMin: 2,
    experienceMax: 5,
    openings: 1,
    status: 'Closed',
    postedOn: '2026-08-02',
    hiringManagerId: 'HZT-0007',
    description: 'Support monthly payroll inputs, reconciliations and employee payroll queries.',
    salaryRange: '₹7L – ₹11L',
    skills: ['Payroll', 'Excel', 'Compliance'],
  },
]

interface CandidateSpec {
  first: string
  last: string
  jobId: string
  stage: Candidate['stage']
  source: Candidate['source']
  exp: number
  company: string
  rating: number
}

const candidateSpecs: CandidateSpec[] = [
  { first: 'Nikhil', last: 'Bhatia', jobId: 'JOB-1001', stage: 'Interview', source: 'LinkedIn', exp: 6, company: 'Infosys', rating: 4 },
  { first: 'Tanvi', last: 'Mehta', jobId: 'JOB-1001', stage: 'Offer', source: 'Referral', exp: 7, company: 'Zoho', rating: 5 },
  { first: 'Siddharth', last: 'Kulkarni', jobId: 'JOB-1001', stage: 'Screening', source: 'Naukri', exp: 5, company: 'Persistent Systems', rating: 3 },
  { first: 'Rhea', last: 'Sen', jobId: 'JOB-1001', stage: 'Applied', source: 'Career Site', exp: 5, company: 'TCS', rating: 3 },
  { first: 'Kabir', last: 'Malhotra', jobId: 'JOB-1001', stage: 'Rejected', source: 'Agency', exp: 4, company: 'Wipro', rating: 2 },

  { first: 'Nandini', last: 'Rao', jobId: 'JOB-1002', stage: 'Interview', source: 'LinkedIn', exp: 6, company: 'Freshworks', rating: 4 },
  { first: 'Varun', last: 'Shetty', jobId: 'JOB-1002', stage: 'Screening', source: 'Referral', exp: 5, company: 'Darwinbox', rating: 4 },
  { first: 'Pooja', last: 'Agarwal', jobId: 'JOB-1002', stage: 'Applied', source: 'Career Site', exp: 4, company: 'Razorpay', rating: 3 },

  { first: 'Devika', last: 'Pillai', jobId: 'JOB-1003', stage: 'Interview', source: 'LinkedIn', exp: 5, company: 'ThoughtWorks', rating: 5 },
  { first: 'Aman', last: 'Chopra', jobId: 'JOB-1003', stage: 'Screening', source: 'Referral', exp: 3, company: 'Zeta', rating: 3 },
  { first: 'Leela', last: 'Krishnan', jobId: 'JOB-1003', stage: 'Offer', source: 'Career Site', exp: 4, company: 'Atlassian', rating: 5 },

  { first: 'Ritesh', last: 'Das', jobId: 'JOB-1004', stage: 'Screening', source: 'Naukri', exp: 3, company: 'Byju’s', rating: 3 },
  { first: 'Maya', last: 'Bose', jobId: 'JOB-1004', stage: 'Applied', source: 'Career Site', exp: 2, company: 'Accenture', rating: 2 },

  { first: 'Rahul', last: 'Chauhan', jobId: 'JOB-1005', stage: 'Interview', source: 'LinkedIn', exp: 8, company: 'Darwinbox', rating: 5 },
  { first: 'Shreya', last: 'Kapoor', jobId: 'JOB-1005', stage: 'Offer', source: 'Referral', exp: 7, company: 'Salesforce', rating: 5 },
  { first: 'Vivek', last: 'Nair', jobId: 'JOB-1005', stage: 'Screening', source: 'Naukri', exp: 6, company: 'Zoho', rating: 4 },
  { first: 'Anjali', last: 'Singh', jobId: 'JOB-1005', stage: 'Applied', source: 'Career Site', exp: 5, company: 'Adobe', rating: 3 },
  { first: 'Manish', last: 'Yadav', jobId: 'JOB-1005', stage: 'Hired', source: 'Referral', exp: 9, company: 'SAP', rating: 5 },
  { first: 'Ira', last: 'Banerjee', jobId: 'JOB-1005', stage: 'Rejected', source: 'Agency', exp: 4, company: 'Oracle', rating: 2 },

  { first: 'Karan', last: 'Tiwari', jobId: 'JOB-1006', stage: 'Interview', source: 'LinkedIn', exp: 4, company: 'CleverTap', rating: 4 },
  { first: 'Naina', last: 'Joshi', jobId: 'JOB-1006', stage: 'Screening', source: 'Career Site', exp: 3, company: 'MoEngage', rating: 4 },
  { first: 'Arnav', last: 'Pandey', jobId: 'JOB-1006', stage: 'Applied', source: 'Naukri', exp: 2, company: 'HCL', rating: 3 },

  { first: 'Sanya', last: 'Mukherjee', jobId: 'JOB-1007', stage: 'Interview', source: 'LinkedIn', exp: 4, company: 'Chargebee', rating: 4 },
  { first: 'Harsh', last: 'Patil', jobId: 'JOB-1007', stage: 'Screening', source: 'Referral', exp: 3, company: 'Zycus', rating: 4 },
  { first: 'Roshni', last: 'Iyer', jobId: 'JOB-1007', stage: 'Applied', source: 'Career Site', exp: 2, company: 'Wipro', rating: 3 },
  { first: 'Deepak', last: 'Ghosh', jobId: 'JOB-1007', stage: 'Hired', source: 'Naukri', exp: 3, company: 'TCS', rating: 5 },

  { first: 'Yash', last: 'Saxena', jobId: 'JOB-1008', stage: 'Interview', source: 'LinkedIn', exp: 5, company: 'Nutanix', rating: 4 },
  { first: 'Mitali', last: 'Reddy', jobId: 'JOB-1008', stage: 'Screening', source: 'Referral', exp: 4, company: 'Druva', rating: 4 },
  { first: 'Pranay', last: 'Verma', jobId: 'JOB-1008', stage: 'Applied', source: 'Career Site', exp: 3, company: 'Infosys', rating: 3 },

  { first: 'Bhavna', last: 'Shah', jobId: 'JOB-1009', stage: 'Hired', source: 'Referral', exp: 4, company: 'ADP', rating: 5 },
  { first: 'Tejas', last: 'Hegde', jobId: 'JOB-1009', stage: 'Rejected', source: 'Naukri', exp: 3, company: 'PayrollCo', rating: 2 },
]

export const candidates: Candidate[] = candidateSpecs.map((spec, index) => ({
  id: `CND-${2001 + index}`,
  jobId: spec.jobId,
  firstName: spec.first,
  lastName: spec.last,
  email: `${spec.first.toLowerCase()}.${spec.last.toLowerCase()}@examplemail.example`,
  phone: `+91 9${String(810000000 + index * 311).slice(0, 9)}`,
  location: ['Hyderabad', 'Bengaluru', 'Pune', 'Chennai', 'Mumbai', 'Delhi NCR'][index % 6],
  source: spec.source,
  stage: spec.stage,
  appliedOn: format(addDays(new Date(2026, 9, 20), -(index % 28)), 'yyyy-MM-dd'),
  experienceYears: spec.exp,
  currentCompany: spec.company,
  expectedCtc: 800000 + spec.exp * 200000 + (index % 5) * 50000,
  rating: spec.rating,
  notes:
    spec.stage === 'Offer'
      ? 'Offer discussion in progress. Awaiting candidate response on compensation and joining date.'
      : spec.stage === 'Interview'
        ? 'Strong technical signal. Panel feedback pending from the second round.'
        : undefined,
}))

const interviewCandidates = candidates.filter((candidate) => candidate.stage === 'Interview').slice(0, 6)

export const interviews: Interview[] = interviewCandidates.map((candidate, index) => {
  return {
    id: `INT-${3001 + index}`,
    candidateId: candidate.id,
    jobId: candidate.jobId,
    round: index % 3 === 0 ? 'Technical Round 2' : index % 3 === 1 ? 'Hiring Manager Round' : 'Culture & Values Round',
    date: format(addDays(new Date(2026, 9, 30), (index % 5) + 1), 'yyyy-MM-dd'),
    time: ['10:00 AM', '11:30 AM', '02:00 PM', '03:30 PM', '04:00 PM'][index % 5],
    mode: index % 2 === 0 ? 'Video' : 'In person',
    interviewer: index % 2 === 0 ? 'Rohan Iyer' : 'Priya Menon',
    status: index === 5 ? 'Completed' : 'Scheduled',
    feedback: index === 5 ? 'Solid communication and strong domain depth. Recommended for the next round.' : undefined,
  }
})

export function getJobById(id: string): JobOpening | undefined {
  return jobOpenings.find((job) => job.id === id)
}

export function getCandidateById(id: string): Candidate | undefined {
  return candidates.find((candidate) => candidate.id === id)
}

export const PIPELINE_STAGES: Candidate['stage'][] = [
  'Applied',
  'Screening',
  'Interview',
  'Offer',
  'Hired',
  'Rejected',
]
