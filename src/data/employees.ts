import type {
  Address,
  BankInfo,
  Employee,
  EmployeeDocument,
  EmploymentHistoryItem,
  EmploymentStatus,
  StatutoryInfo,
} from '@/types'
import { mulberry32 } from '@/lib/utils'

const seed = mulberry32(20261030)

const pick = <T,>(items: T[]): T => items[Math.floor(seed() * items.length)]
const pad = (n: number, size = 4) => String(n).padStart(size, '0')

const branchCities = [
  { id: 'br-hyd', city: 'Hyderabad', state: 'Telangana', pin: '500081' },
  { id: 'br-blr', city: 'Bengaluru', state: 'Karnataka', pin: '560103' },
  { id: 'br-pune', city: 'Pune', state: 'Maharashtra', pin: '411057' },
  { id: 'br-che', city: 'Chennai', state: 'Tamil Nadu', pin: '600096' },
  { id: 'br-remote', city: 'Hyderabad', state: 'Telangana', pin: '500032' },
]

const streets = [
  'Road No. 12, Banjara Hills',
  'Hitech City Main Road',
  'Financial District, Nanakramguda',
  'MG Road, Indiranagar',
  'Koramangala 5th Block',
  'Baner Road',
  'Hinjewadi Phase 2',
  'OMR, Thoraipakkam',
  'Adyar Main Road',
  'Kondapur Main Road',
]

function makeAddress(city: string, state: string, pin: string): Address {
  return {
    line1: `${Math.floor(seed() * 180) + 1}, ${pick(streets)}`,
    city,
    state,
    postalCode: pin,
    country: 'India',
  }
}

function makeBank(): BankInfo {
  return {
    bankName: pick(['HDFC Bank', 'ICICI Bank', 'Axis Bank', 'State Bank of India', 'Kotak Mahindra Bank']),
    accountNumber: `5010${Math.floor(seed() * 90000000 + 10000000)}`,
    ifsc: pick(['HDFC0001234', 'ICIC0000456', 'UTIB0000789', 'SBIN0004321', 'KKBK0006543']),
    branch: pick(['Madhapur', 'Hitech City', 'Indiranagar', 'Baner', 'Adyar']),
    accountType: 'Savings',
  }
}

function makeStatutory(index: number): StatutoryInfo {
  const letters = 'ABCDEFGHJKLMNPRSTUVWXYZ'
  const pan = `${letters[index % 23]}${letters[(index * 3) % 23]}${letters[(index * 7) % 23]}P${letters[(index * 5) % 23]}${String(1000 + index).slice(-4)}${letters[(index * 11) % 23]}`
  return {
    pan,
    aadhaar: `${String(2000 + (index % 7000)).padStart(4, '0')} ${String(1000 + (index % 8000)).padStart(4, '0')} ${String(3000 + (index % 6000)).padStart(4, '0')}`,
    uan: `101${String(200000000 + index * 731).slice(0, 9)}`,
    pfNumber: `PF/HYD/${String(10234 + index)}/001`,
    esiNumber: index % 4 === 0 ? '—' : `ESI/${String(31004500 + index * 17)}`,
  }
}

function makeDocuments(index: number): EmployeeDocument[] {
  const base = [
    { name: 'Offer Letter.pdf', category: 'Offer Letter' },
    { name: 'Aadhaar Card.pdf', category: 'Identity' },
    { name: 'PAN Card.pdf', category: 'Identity' },
    { name: 'Degree Certificate.pdf', category: 'Education' },
    { name: 'Relieving Letter.pdf', category: 'Experience' },
  ]
  const count = 2 + (index % 4)
  return base.slice(0, count).map((doc, i) => ({
    id: `DOC-${pad(index * 10 + i + 1, 5)}`,
    name: doc.name,
    category: doc.category,
    uploadedOn: `2026-${String(1 + (index % 9)).padStart(2, '0')}-${String(4 + (index % 22)).padStart(2, '0')}`,
    size: `${(0.3 + (index % 9) * 0.17).toFixed(1)} MB`,
    status: i === count - 1 && index % 5 === 0 ? 'Pending' : 'Verified',
  }))
}

const detailedEmployees: Employee[] = [
  {
    id: 'HZT-0001',
    firstName: 'Vikram',
    lastName: 'Rao',
    email: 'vikram.rao@horizontech.example',
    personalEmail: 'vikram.rao@gmail.example',
    phone: '+91 98490 11201',
    gender: 'Male',
    dateOfBirth: '1978-03-14',
    maritalStatus: 'Married',
    bloodGroup: 'B+',
    about: 'Technology leader with 22 years of experience building product engineering organisations. Focused on sustainable growth, engineering excellence and customer outcomes.',
    departmentId: 'dept-exec',
    designationId: 'des-ceo',
    branchId: 'br-hyd',
    managerId: null,
    employmentType: 'Full-time',
    status: 'Active',
    dateOfJoining: '2016-04-01',
    dateOfConfirmation: '2016-04-01',
    workLocation: 'Hyderabad HQ',
    shiftId: 'shift-general',
    address: makeAddress('Hyderabad', 'Telangana', '500033'),
    emergencyContacts: [
      { id: 'EC-0001', name: 'Lakshmi Rao', relationship: 'Spouse', phone: '+91 98490 11202' },
    ],
    bank: { bankName: 'HDFC Bank', accountNumber: '50100123456789', ifsc: 'HDFC0001234', branch: 'Jubilee Hills', accountType: 'Savings' },
    statutory: { pan: 'AKRPR4821L', aadhaar: '4210 7856 9021', uan: '101234567890', pfNumber: 'PF/HYD/10001/001', esiNumber: '—' },
    documents: [
      { id: 'DOC-00001', name: 'Board Appointment.pdf', category: 'Offer Letter', uploadedOn: '2016-04-01', size: '0.8 MB', status: 'Verified' },
      { id: 'DOC-00002', name: 'PAN Card.pdf', category: 'Identity', uploadedOn: '2016-04-01', size: '0.3 MB', status: 'Verified' },
      { id: 'DOC-00003', name: 'Aadhaar Card.pdf', category: 'Identity', uploadedOn: '2016-04-01', size: '0.4 MB', status: 'Verified' },
    ],
    employmentHistory: [
      { id: 'HIS-0001', title: 'Chief Executive Officer', department: 'Executive Office', effectiveFrom: '2016-04-01', type: 'Joining' },
    ],
    skills: ['Executive Leadership', 'Strategy', 'Engineering Management'],
    isDetailed: true,
  },
  {
    id: 'HZT-0002',
    firstName: 'Priya',
    lastName: 'Menon',
    email: 'priya.menon@horizontech.example',
    personalEmail: 'priya.menon@gmail.example',
    phone: '+91 98490 22302',
    gender: 'Female',
    dateOfBirth: '1985-07-22',
    maritalStatus: 'Married',
    bloodGroup: 'O+',
    about: 'People leader with 16 years of HR experience across technology and consulting. Passionate about building inclusive workplaces and scalable people practices.',
    departmentId: 'dept-hr',
    designationId: 'des-hr-head',
    branchId: 'br-hyd',
    managerId: 'HZT-0001',
    employmentType: 'Full-time',
    status: 'Active',
    dateOfJoining: '2017-06-12',
    dateOfConfirmation: '2017-12-12',
    workLocation: 'Hyderabad HQ',
    shiftId: 'shift-general',
    address: makeAddress('Hyderabad', 'Telangana', '500081'),
    emergencyContacts: [
      { id: 'EC-0002', name: 'Suresh Menon', relationship: 'Spouse', phone: '+91 98490 22303' },
      { id: 'EC-0003', name: 'Radha Menon', relationship: 'Mother', phone: '+91 98490 22304' },
    ],
    bank: { bankName: 'ICICI Bank', accountNumber: '002401556781', ifsc: 'ICIC0000456', branch: 'Madhapur', accountType: 'Savings' },
    statutory: { pan: 'BMLPM3927K', aadhaar: '5832 1147 6620', uan: '101234567891', pfNumber: 'PF/HYD/10002/001', esiNumber: '—' },
    documents: [
      { id: 'DOC-00004', name: 'Offer Letter.pdf', category: 'Offer Letter', uploadedOn: '2017-06-12', size: '0.5 MB', status: 'Verified' },
      { id: 'DOC-00005', name: 'Aadhaar Card.pdf', category: 'Identity', uploadedOn: '2017-06-12', size: '0.4 MB', status: 'Verified' },
      { id: 'DOC-00006', name: 'PAN Card.pdf', category: 'Identity', uploadedOn: '2017-06-12', size: '0.3 MB', status: 'Verified' },
      { id: 'DOC-00007', name: 'MBA Certificate.pdf', category: 'Education', uploadedOn: '2017-06-13', size: '0.7 MB', status: 'Verified' },
    ],
    employmentHistory: [
      { id: 'HIS-0002', title: 'Head of Human Resources', department: 'Human Resources', effectiveFrom: '2021-04-01', type: 'Promotion' },
      { id: 'HIS-0003', title: 'Senior HR Manager', department: 'Human Resources', effectiveFrom: '2017-06-12', effectiveTo: '2021-03-31', type: 'Joining' },
    ],
    skills: ['HR Strategy', 'Talent Management', 'Employee Relations', 'HRIS'],
    isDetailed: true,
  },
  {
    id: 'HZT-0003',
    firstName: 'Rohan',
    lastName: 'Iyer',
    email: 'rohan.iyer@horizontech.example',
    personalEmail: 'rohan.iyer@gmail.example',
    phone: '+91 98490 33403',
    gender: 'Male',
    dateOfBirth: '1987-11-09',
    maritalStatus: 'Married',
    bloodGroup: 'A+',
    about: 'Engineering manager leading platform and product teams. Strong background in distributed systems, cloud architecture and engineering mentorship.',
    departmentId: 'dept-eng',
    designationId: 'des-eng-mgr',
    branchId: 'br-hyd',
    managerId: 'HZT-0001',
    employmentType: 'Full-time',
    status: 'Active',
    dateOfJoining: '2018-02-05',
    dateOfConfirmation: '2018-08-05',
    workLocation: 'Hyderabad HQ',
    shiftId: 'shift-general',
    address: makeAddress('Hyderabad', 'Telangana', '500081'),
    emergencyContacts: [
      { id: 'EC-0004', name: 'Divya Iyer', relationship: 'Spouse', phone: '+91 98490 33404' },
    ],
    bank: { bankName: 'Axis Bank', accountNumber: '918020045612378', ifsc: 'UTIB0000789', branch: 'Hitech City', accountType: 'Savings' },
    statutory: { pan: 'CKLPI7714N', aadhaar: '7421 9903 4415', uan: '101234567892', pfNumber: 'PF/HYD/10003/001', esiNumber: '—' },
    documents: [
      { id: 'DOC-00008', name: 'Offer Letter.pdf', category: 'Offer Letter', uploadedOn: '2018-02-05', size: '0.5 MB', status: 'Verified' },
      { id: 'DOC-00009', name: 'Aadhaar Card.pdf', category: 'Identity', uploadedOn: '2018-02-05', size: '0.4 MB', status: 'Verified' },
      { id: 'DOC-00010', name: 'B.Tech Certificate.pdf', category: 'Education', uploadedOn: '2018-02-06', size: '0.6 MB', status: 'Verified' },
    ],
    employmentHistory: [
      { id: 'HIS-0004', title: 'Engineering Manager', department: 'Engineering', effectiveFrom: '2021-10-01', type: 'Promotion' },
      { id: 'HIS-0005', title: 'Senior Software Engineer', department: 'Engineering', effectiveFrom: '2018-02-05', effectiveTo: '2021-09-30', type: 'Joining' },
    ],
    skills: ['System Design', 'React', 'Node.js', 'AWS', 'Team Leadership'],
    isDetailed: true,
  },
  {
    id: 'HZT-0004',
    firstName: 'Ananya',
    lastName: 'Deshpande',
    email: 'ananya.deshpande@horizontech.example',
    personalEmail: 'ananya.d@gmail.example',
    phone: '+91 98490 44504',
    gender: 'Female',
    dateOfBirth: '1992-05-18',
    maritalStatus: 'Single',
    bloodGroup: 'AB+',
    about: 'Product designer with a systems thinking approach. Leads design for the enterprise suite and mentors the design team.',
    departmentId: 'dept-design',
    designationId: 'des-spd',
    branchId: 'br-pune',
    managerId: 'HZT-0001',
    employmentType: 'Full-time',
    status: 'Active',
    dateOfJoining: '2019-08-19',
    dateOfConfirmation: '2020-02-19',
    workLocation: 'Pune',
    shiftId: 'shift-general',
    address: makeAddress('Pune', 'Maharashtra', '411057'),
    emergencyContacts: [
      { id: 'EC-0005', name: 'Ashok Deshpande', relationship: 'Father', phone: '+91 98490 44505' },
    ],
    bank: { bankName: 'Kotak Mahindra Bank', accountNumber: '7311459022', ifsc: 'KKBK0006543', branch: 'Baner', accountType: 'Savings' },
    statutory: { pan: 'DMNPD5812Q', aadhaar: '3321 7784 2210', uan: '101234567893', pfNumber: 'PF/PUN/10004/001', esiNumber: 'ESI/31004612' },
    documents: [
      { id: 'DOC-00011', name: 'Offer Letter.pdf', category: 'Offer Letter', uploadedOn: '2019-08-19', size: '0.5 MB', status: 'Verified' },
      { id: 'DOC-00012', name: 'Aadhaar Card.pdf', category: 'Identity', uploadedOn: '2019-08-19', size: '0.3 MB', status: 'Verified' },
      { id: 'DOC-00013', name: 'Design Portfolio.pdf', category: 'Other', uploadedOn: '2024-03-01', size: '8.2 MB', status: 'Verified' },
    ],
    employmentHistory: [
      { id: 'HIS-0006', title: 'Senior Product Designer', department: 'Design', effectiveFrom: '2022-04-01', type: 'Promotion' },
      { id: 'HIS-0007', title: 'Product Designer', department: 'Design', effectiveFrom: '2019-08-19', effectiveTo: '2022-03-31', type: 'Joining' },
    ],
    skills: ['Product Design', 'Design Systems', 'Figma', 'User Research'],
    isDetailed: true,
  },
  {
    id: 'HZT-0005',
    firstName: 'Arjun',
    lastName: 'Nair',
    email: 'arjun.nair@horizontech.example',
    personalEmail: 'arjun.nair@gmail.example',
    phone: '+91 98490 55605',
    gender: 'Male',
    dateOfBirth: '1993-01-27',
    maritalStatus: 'Single',
    bloodGroup: 'B-',
    about: 'Full-stack engineer working on the core platform. Enjoys developer experience, accessibility and performance engineering.',
    departmentId: 'dept-eng',
    designationId: 'des-sse',
    branchId: 'br-hyd',
    managerId: 'HZT-0003',
    employmentType: 'Full-time',
    status: 'Active',
    dateOfJoining: '2019-11-04',
    dateOfConfirmation: '2020-05-04',
    workLocation: 'Hyderabad HQ',
    shiftId: 'shift-general',
    address: makeAddress('Hyderabad', 'Telangana', '500081'),
    emergencyContacts: [
      { id: 'EC-0006', name: 'Sobha Nair', relationship: 'Mother', phone: '+91 98490 55606' },
    ],
    bank: { bankName: 'State Bank of India', accountNumber: '38291044567231', ifsc: 'SBIN0004321', branch: 'Madhapur', accountType: 'Savings' },
    statutory: { pan: 'EPQPN6219M', aadhaar: '8812 3347 9091', uan: '101234567894', pfNumber: 'PF/HYD/10005/001', esiNumber: '—' },
    documents: [
      { id: 'DOC-00014', name: 'Offer Letter.pdf', category: 'Offer Letter', uploadedOn: '2019-11-04', size: '0.5 MB', status: 'Verified' },
      { id: 'DOC-00015', name: 'Aadhaar Card.pdf', category: 'Identity', uploadedOn: '2019-11-04', size: '0.4 MB', status: 'Verified' },
      { id: 'DOC-00016', name: 'B.Tech Certificate.pdf', category: 'Education', uploadedOn: '2019-11-05', size: '0.6 MB', status: 'Verified' },
      { id: 'DOC-00017', name: 'Relieving Letter.pdf', category: 'Experience', uploadedOn: '2019-11-05', size: '0.2 MB', status: 'Verified' },
    ],
    employmentHistory: [
      { id: 'HIS-0008', title: 'Senior Software Engineer', department: 'Engineering', effectiveFrom: '2023-04-01', type: 'Promotion' },
      { id: 'HIS-0009', title: 'Software Engineer', department: 'Engineering', effectiveFrom: '2019-11-04', effectiveTo: '2023-03-31', type: 'Joining' },
    ],
    skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Testing'],
    isDetailed: true,
  },
  {
    id: 'HZT-0006',
    firstName: 'Sneha',
    lastName: 'Reddy',
    email: 'sneha.reddy@horizontech.example',
    personalEmail: 'sneha.reddy@gmail.example',
    phone: '+91 98490 66706',
    gender: 'Female',
    dateOfBirth: '1995-09-03',
    maritalStatus: 'Single',
    bloodGroup: 'O-',
    about: 'HR generalist supporting onboarding, employee lifecycle and engagement across the Hyderabad and Bengaluru offices.',
    departmentId: 'dept-hr',
    designationId: 'des-hr-exec',
    branchId: 'br-hyd',
    managerId: 'HZT-0002',
    employmentType: 'Full-time',
    status: 'Active',
    dateOfJoining: '2021-03-15',
    dateOfConfirmation: '2021-09-15',
    workLocation: 'Hyderabad HQ',
    shiftId: 'shift-general',
    address: makeAddress('Hyderabad', 'Telangana', '500032'),
    emergencyContacts: [
      { id: 'EC-0007', name: 'Ravi Reddy', relationship: 'Father', phone: '+91 98490 66707' },
    ],
    bank: { bankName: 'HDFC Bank', accountNumber: '50100778899001', ifsc: 'HDFC0001234', branch: 'Kondapur', accountType: 'Savings' },
    statutory: { pan: 'FGHPR8420T', aadhaar: '2210 4589 7763', uan: '101234567895', pfNumber: 'PF/HYD/10006/001', esiNumber: 'ESI/31004587' },
    documents: [
      { id: 'DOC-00018', name: 'Offer Letter.pdf', category: 'Offer Letter', uploadedOn: '2021-03-15', size: '0.5 MB', status: 'Verified' },
      { id: 'DOC-00019', name: 'Aadhaar Card.pdf', category: 'Identity', uploadedOn: '2021-03-15', size: '0.4 MB', status: 'Verified' },
      { id: 'DOC-00020', name: 'MBA Certificate.pdf', category: 'Education', uploadedOn: '2021-03-16', size: '0.7 MB', status: 'Verified' },
    ],
    employmentHistory: [
      { id: 'HIS-0010', title: 'HR Executive', department: 'Human Resources', effectiveFrom: '2021-03-15', type: 'Joining' },
    ],
    skills: ['Onboarding', 'Employee Engagement', 'HR Operations'],
    isDetailed: true,
  },
  {
    id: 'HZT-0007',
    firstName: 'Karthik',
    lastName: 'Subramanian',
    email: 'karthik.subramanian@horizontech.example',
    personalEmail: 'karthik.s@gmail.example',
    phone: '+91 98490 77807',
    gender: 'Male',
    dateOfBirth: '1984-12-11',
    maritalStatus: 'Married',
    bloodGroup: 'A-',
    about: 'Finance leader responsible for controllership, financial planning, payroll governance and commercial operations.',
    departmentId: 'dept-finance',
    designationId: 'des-fin-mgr',
    branchId: 'br-che',
    managerId: 'HZT-0001',
    employmentType: 'Full-time',
    status: 'Active',
    dateOfJoining: '2017-09-01',
    dateOfConfirmation: '2018-03-01',
    workLocation: 'Chennai',
    shiftId: 'shift-general',
    address: makeAddress('Chennai', 'Tamil Nadu', '600096'),
    emergencyContacts: [
      { id: 'EC-0008', name: 'Latha Subramanian', relationship: 'Spouse', phone: '+91 98490 77808' },
    ],
    bank: { bankName: 'ICICI Bank', accountNumber: '002401889302', ifsc: 'ICIC0000456', branch: 'Adyar', accountType: 'Savings' },
    statutory: { pan: 'GHJPS9123R', aadhaar: '6634 1128 4409', uan: '101234567896', pfNumber: 'PF/CHE/10007/001', esiNumber: '—' },
    documents: [
      { id: 'DOC-00021', name: 'Offer Letter.pdf', category: 'Offer Letter', uploadedOn: '2017-09-01', size: '0.5 MB', status: 'Verified' },
      { id: 'DOC-00022', name: 'Aadhaar Card.pdf', category: 'Identity', uploadedOn: '2017-09-01', size: '0.4 MB', status: 'Verified' },
      { id: 'DOC-00023', name: 'CA Certificate.pdf', category: 'Education', uploadedOn: '2017-09-02', size: '0.9 MB', status: 'Verified' },
    ],
    employmentHistory: [
      { id: 'HIS-0011', title: 'Finance Manager', department: 'Finance', effectiveFrom: '2020-04-01', type: 'Promotion' },
      { id: 'HIS-0012', title: 'Senior Accountant', department: 'Finance', effectiveFrom: '2017-09-01', effectiveTo: '2020-03-31', type: 'Joining' },
    ],
    skills: ['Financial Planning', 'Controllership', 'Payroll Governance', 'Taxation'],
    isDetailed: true,
  },
  {
    id: 'HZT-0008',
    firstName: 'Meera',
    lastName: 'Joshi',
    email: 'meera.joshi@horizontech.example',
    personalEmail: 'meera.joshi@gmail.example',
    phone: '+91 98490 88908',
    gender: 'Female',
    dateOfBirth: '1991-04-06',
    maritalStatus: 'Married',
    bloodGroup: 'B+',
    about: 'Payroll specialist managing monthly payroll inputs, statutory documentation and employee payroll queries.',
    departmentId: 'dept-finance',
    designationId: 'des-payroll-spec',
    branchId: 'br-pune',
    managerId: 'HZT-0007',
    employmentType: 'Full-time',
    status: 'Active',
    dateOfJoining: '2020-07-20',
    dateOfConfirmation: '2021-01-20',
    workLocation: 'Pune',
    shiftId: 'shift-general',
    address: makeAddress('Pune', 'Maharashtra', '411045'),
    emergencyContacts: [
      { id: 'EC-0009', name: 'Nikhil Joshi', relationship: 'Spouse', phone: '+91 98490 88909' },
    ],
    bank: { bankName: 'Axis Bank', accountNumber: '918020067845123', ifsc: 'UTIB0000789', branch: 'Baner', accountType: 'Savings' },
    statutory: { pan: 'HKL PJ3845P'.replace(' ', ''), aadhaar: '9912 3345 1187', uan: '101234567897', pfNumber: 'PF/PUN/10008/001', esiNumber: 'ESI/31004631' },
    documents: [
      { id: 'DOC-00024', name: 'Offer Letter.pdf', category: 'Offer Letter', uploadedOn: '2020-07-20', size: '0.5 MB', status: 'Verified' },
      { id: 'DOC-00025', name: 'Aadhaar Card.pdf', category: 'Identity', uploadedOn: '2020-07-20', size: '0.4 MB', status: 'Verified' },
      { id: 'DOC-00026', name: 'B.Com Certificate.pdf', category: 'Education', uploadedOn: '2020-07-21', size: '0.6 MB', status: 'Verified' },
    ],
    employmentHistory: [
      { id: 'HIS-0013', title: 'Payroll Specialist', department: 'Finance', effectiveFrom: '2020-07-20', type: 'Joining' },
    ],
    skills: ['Payroll Processing', 'Statutory Reporting', 'Excel', 'HRIS'],
    isDetailed: true,
  },
  {
    id: 'HZT-0009',
    firstName: 'Aditya',
    lastName: 'Verma',
    email: 'aditya.verma@horizontech.example',
    personalEmail: 'aditya.verma@gmail.example',
    phone: '+91 98490 99009',
    gender: 'Male',
    dateOfBirth: '1986-08-30',
    maritalStatus: 'Married',
    bloodGroup: 'O+',
    about: 'Sales leader for enterprise accounts in India. Builds consultative selling teams and long-term customer relationships.',
    departmentId: 'dept-sales',
    designationId: 'des-sales-mgr',
    branchId: 'br-blr',
    managerId: 'HZT-0001',
    employmentType: 'Full-time',
    status: 'Active',
    dateOfJoining: '2018-05-14',
    dateOfConfirmation: '2018-11-14',
    workLocation: 'Bengaluru',
    shiftId: 'shift-general',
    address: makeAddress('Bengaluru', 'Karnataka', '560103'),
    emergencyContacts: [
      { id: 'EC-0010', name: 'Ritika Verma', relationship: 'Spouse', phone: '+91 98490 99010' },
    ],
    bank: { bankName: 'HDFC Bank', accountNumber: '50100889900112', ifsc: 'HDFC0001234', branch: 'Indiranagar', accountType: 'Savings' },
    statutory: { pan: 'JKLPV6721Q', aadhaar: '7789 1123 5540', uan: '101234567898', pfNumber: 'PF/BLR/10009/001', esiNumber: '—' },
    documents: [
      { id: 'DOC-00027', name: 'Offer Letter.pdf', category: 'Offer Letter', uploadedOn: '2018-05-14', size: '0.5 MB', status: 'Verified' },
      { id: 'DOC-00028', name: 'Aadhaar Card.pdf', category: 'Identity', uploadedOn: '2018-05-14', size: '0.4 MB', status: 'Verified' },
      { id: 'DOC-00029', name: 'MBA Certificate.pdf', category: 'Education', uploadedOn: '2018-05-15', size: '0.7 MB', status: 'Verified' },
    ],
    employmentHistory: [
      { id: 'HIS-0014', title: 'Sales Manager', department: 'Sales', effectiveFrom: '2020-10-01', type: 'Promotion' },
      { id: 'HIS-0015', title: 'Senior Account Executive', department: 'Sales', effectiveFrom: '2018-05-14', effectiveTo: '2020-09-30', type: 'Joining' },
    ],
    skills: ['Enterprise Sales', 'Account Management', 'Negotiation', 'Forecasting'],
    isDetailed: true,
  },
  {
    id: 'HZT-0010',
    firstName: 'Isha',
    lastName: 'Kapoor',
    email: 'isha.kapoor@horizontech.example',
    personalEmail: 'isha.kapoor@gmail.example',
    phone: '+91 98490 10110',
    gender: 'Female',
    dateOfBirth: '1990-02-17',
    maritalStatus: 'Married',
    bloodGroup: 'AB-',
    about: 'Marketing leader across brand, demand generation and product marketing. Data-led approach to growth storytelling.',
    departmentId: 'dept-marketing',
    designationId: 'des-mkt-mgr',
    branchId: 'br-blr',
    managerId: 'HZT-0001',
    employmentType: 'Full-time',
    status: 'Active',
    dateOfJoining: '2019-04-08',
    dateOfConfirmation: '2019-10-08',
    workLocation: 'Bengaluru',
    shiftId: 'shift-general',
    address: makeAddress('Bengaluru', 'Karnataka', '560095'),
    emergencyContacts: [
      { id: 'EC-0011', name: 'Rahul Kapoor', relationship: 'Spouse', phone: '+91 98490 10111' },
    ],
    bank: { bankName: 'Kotak Mahindra Bank', accountNumber: '7311998821', ifsc: 'KKBK0006543', branch: 'Indiranagar', accountType: 'Savings' },
    statutory: { pan: 'MNPKJ4098R', aadhaar: '2214 6637 1190', uan: '101234567899', pfNumber: 'PF/BLR/10010/001', esiNumber: '—' },
    documents: [
      { id: 'DOC-00030', name: 'Offer Letter.pdf', category: 'Offer Letter', uploadedOn: '2019-04-08', size: '0.5 MB', status: 'Verified' },
      { id: 'DOC-00031', name: 'Aadhaar Card.pdf', category: 'Identity', uploadedOn: '2019-04-08', size: '0.4 MB', status: 'Verified' },
      { id: 'DOC-00032', name: 'MBA Certificate.pdf', category: 'Education', uploadedOn: '2019-04-09', size: '0.7 MB', status: 'Verified' },
    ],
    employmentHistory: [
      { id: 'HIS-0016', title: 'Marketing Manager', department: 'Marketing', effectiveFrom: '2021-04-01', type: 'Promotion' },
      { id: 'HIS-0017', title: 'Brand Marketing Lead', department: 'Marketing', effectiveFrom: '2019-04-08', effectiveTo: '2021-03-31', type: 'Joining' },
    ],
    skills: ['Brand Strategy', 'Demand Generation', 'Product Marketing', 'Analytics'],
    isDetailed: true,
  },
]

interface GeneratedSpec {
  departmentId: string
  count: number
  designations: string[]
  skills: string[]
}

const generatedSpecs: GeneratedSpec[] = [
  {
    departmentId: 'dept-eng',
    count: 40,
    designations: [
      'des-staff', 'des-sse', 'des-sse', 'des-sse', 'des-se', 'des-se', 'des-se', 'des-se',
      'des-se', 'des-se', 'des-se', 'des-se', 'des-se', 'des-se', 'des-se', 'des-se',
      'des-se', 'des-se', 'des-se', 'des-jse', 'des-jse', 'des-jse', 'des-jse', 'des-jse',
      'des-qa', 'des-qa', 'des-qa', 'des-devops', 'des-devops', 'des-sse', 'des-se', 'des-se',
      'des-se', 'des-se', 'des-se', 'des-se', 'des-jse', 'des-qa', 'des-se', 'des-staff',
    ],
    skills: ['TypeScript', 'React', 'Node.js', 'AWS', 'Kubernetes', 'Python', 'GraphQL', 'PostgreSQL'],
  },
  {
    departmentId: 'dept-product',
    count: 12,
    designations: [
      'des-prod-mgr', 'des-pm', 'des-pm', 'des-pm', 'des-apm', 'des-apm', 'des-apm', 'des-apm',
      'des-product-analyst', 'des-product-analyst', 'des-product-analyst', 'des-product-analyst',
    ],
    skills: ['Product Strategy', 'Roadmapping', 'Analytics', 'User Research', 'SQL'],
  },
  {
    departmentId: 'dept-design',
    count: 7,
    designations: ['des-design-lead', 'des-spd', 'des-pd', 'des-pd', 'des-pd', 'des-pd', 'des-spd'],
    skills: ['Figma', 'Design Systems', 'Prototyping', 'User Research', 'Accessibility'],
  },
  {
    departmentId: 'dept-hr',
    count: 7,
    designations: ['des-hr-mgr', 'des-hr-exec', 'des-hr-exec', 'des-ta-tl', 'des-ta', 'des-ta', 'des-hr-exec'],
    skills: ['Onboarding', 'Recruitment', 'HR Operations', 'Employee Engagement'],
  },
  {
    departmentId: 'dept-finance',
    count: 6,
    designations: ['des-accountant', 'des-fin-analyst', 'des-accountant', 'des-fin-analyst', 'des-payroll-spec', 'des-accountant'],
    skills: ['Accounting', 'Financial Analysis', 'GST', 'Excel', 'Payroll'],
  },
  {
    departmentId: 'dept-sales',
    count: 17,
    designations: [
      'des-asm', 'des-asm', 'des-ae', 'des-ae', 'des-ae', 'des-ae', 'des-ae', 'des-ae',
      'des-ae', 'des-ae', 'des-sdr', 'des-sdr', 'des-sdr', 'des-sdr', 'des-sdr', 'des-sales-ops',
      'des-sales-ops',
    ],
    skills: ['Enterprise Sales', 'CRM', 'Negotiation', 'Prospecting', 'Forecasting'],
  },
  {
    departmentId: 'dept-marketing',
    count: 9,
    designations: [
      'des-content-lead', 'des-content-spec', 'des-content-spec', 'des-content-spec',
      'des-perf-mkt', 'des-perf-mkt', 'des-perf-mkt', 'des-mkt-assoc', 'des-mkt-assoc',
    ],
    skills: ['Content Marketing', 'SEO', 'Paid Media', 'Brand', 'Marketing Analytics'],
  },
  {
    departmentId: 'dept-cs',
    count: 12,
    designations: [
      'des-cs-mgr', 'des-csm', 'des-csm', 'des-csm', 'des-csm', 'des-csm', 'des-csm', 'des-csm',
      'des-csm', 'des-support', 'des-support', 'des-support',
    ],
    skills: ['Customer Success', 'Account Management', 'Support', 'Product Knowledge'],
  },
  {
    departmentId: 'dept-itops',
    count: 6,
    designations: ['des-it-mgr', 'des-sysadmin', 'des-sysadmin', 'des-sysadmin', 'des-helpdesk', 'des-helpdesk'],
    skills: ['Windows Server', 'Networking', 'Security', 'Endpoint Management', 'Azure'],
  },
  {
    departmentId: 'dept-legal',
    count: 2,
    designations: ['des-legal-mgr', 'des-legal-assoc'],
    skills: ['Corporate Law', 'Contracts', 'Compliance', 'Data Privacy'],
  },
]

const firstNames = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan',
  'Shaurya', 'Atharva', 'Advik', 'Pranav', 'Dhruv', 'Kabir', 'Ritvik', 'Aarush', 'Kayaan', 'Darsh',
  'Ananya', 'Diya', 'Aadhya', 'Saanvi', 'Pari', 'Anika', 'Navya', 'Myra', 'Sara', 'Ira',
  'Riya', 'Aarohi', 'Anvi', 'Prisha', 'Netra', 'Kiara', 'Mira', 'Tara', 'Kavya', 'Nitya',
  'Ishita', 'Saanchi', 'Avni', 'Mahika', 'Zoya', 'Ridhi', 'Trisha', 'Nandini', 'Bhavya', 'Charita',
]

const lastNames = [
  'Sharma', 'Verma', 'Gupta', 'Agarwal', 'Reddy', 'Nair', 'Menon', 'Iyer', 'Rao', 'Krishnan',
  'Subramanian', 'Deshpande', 'Joshi', 'Patil', 'Kulkarni', 'Mehta', 'Shah', 'Chopra', 'Kapoor', 'Malhotra',
  'Bhat', 'Shetty', 'Hegde', 'Pillai', 'Banerjee', 'Chatterjee', 'Das', 'Mukherjee', 'Singh', 'Kaur',
  'Yadav', 'Mishra', 'Pandey', 'Saxena', 'Tiwari', 'Bose', 'Ghosh', 'Rathore', 'Chauhan', 'Bhatt',
]

const detailedNames = new Set(detailedEmployees.map((e) => `${e.firstName} ${e.lastName}`))
const branchIds = ['br-hyd', 'br-hyd', 'br-hyd', 'br-blr', 'br-blr', 'br-pune', 'br-che', 'br-remote']

function nextName(index: number): { firstName: string; lastName: string } {
  let offset = 0
  while (offset < 400) {
    const i = index + offset
    const firstName = firstNames[i % firstNames.length]
    const lastName = lastNames[(i * 7 + 3) % lastNames.length]
    if (!detailedNames.has(`${firstName} ${lastName}`)) return { firstName, lastName }
    offset += 1
  }
  return { firstName: 'Aditi', lastName: `Rao${index}` }
}

const generated: Employee[] = []
let sequence = 11
let nameIndex = 0

for (const spec of generatedSpecs) {
  for (let i = 0; i < spec.count; i += 1) {
    const id = `HZT-${pad(sequence)}`
    const { firstName, lastName } = nextName(nameIndex)
    nameIndex += 1
    const branchId = branchIds[(sequence * 3) % branchIds.length]
    const branch = branchCities.find((b) => b.id === branchId) ?? branchCities[0]
    const designationId = spec.designations[i % spec.designations.length]

    let status: EmploymentStatus = 'Active'
    let dateOfJoining = `20${19 + (sequence % 8)}-${String(1 + (sequence % 12)).padStart(2, '0')}-${String(2 + (sequence % 25)).padStart(2, '0')}`
    if (i === 6 || i === 19 || i === 33) {
      status = 'Probation'
      dateOfJoining = i === 33 ? '2026-09-14' : '2026-08-03'
    }
    if (i === 11) status = 'On Leave'
    if (sequence === 48 || sequence === 91 || sequence === 118 || sequence === 125) status = 'Inactive'

    const isProbation = status === 'Probation'
    const departmentHead =
      spec.departmentId === 'dept-eng'
        ? 'HZT-0003'
        : spec.departmentId === 'dept-design'
          ? 'HZT-0004'
          : spec.departmentId === 'dept-hr'
            ? 'HZT-0002'
            : spec.departmentId === 'dept-finance'
              ? 'HZT-0007'
              : spec.departmentId === 'dept-sales'
                ? 'HZT-0009'
                : spec.departmentId === 'dept-marketing'
                  ? 'HZT-0010'
                  : null

    const isDeptHeadCandidate = i === 0 && departmentHead === null
    const managerId = departmentHead ?? (isDeptHeadCandidate ? 'HZT-0001' : 'HZT-0001')

    const skills = Array.from({ length: 3 + (sequence % 3) }, (_, k) => spec.skills[(sequence + k) % spec.skills.length])
    const doj = new Date(dateOfJoining)
    const joinedYear = doj.getFullYear()
    const history: EmploymentHistoryItem[] = [
      {
        id: `HIS-${pad(1000 + sequence, 4)}`,
        title: 'Current role',
        department: spec.departmentId.replace('dept-', ''),
        effectiveFrom: dateOfJoining,
        type: 'Joining',
      },
    ]
    if (joinedYear < 2024) {
      history.unshift({
        id: `HIS-${pad(2000 + sequence, 4)}`,
        title: 'Role progression',
        department: spec.departmentId.replace('dept-', ''),
        effectiveFrom: `${joinedYear + 2}-04-01`,
        type: 'Promotion',
      })
    }

    generated.push({
      id,
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${sequence}@horizontech.example`,
      personalEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@gmail.example`,
      phone: `+91 9${String(800000000 + sequence * 137).slice(0, 9)}`,
      gender: ['Male', 'Female', 'Female', 'Male', 'Male'][sequence % 5] as Employee['gender'],
      dateOfBirth: `19${80 + (sequence % 18)}-${String(1 + ((sequence * 5) % 12)).padStart(2, '0')}-${String(1 + ((sequence * 7) % 27)).padStart(2, '0')}`,
      maritalStatus: sequence % 3 === 0 ? 'Single' : 'Married',
      bloodGroup: pick(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']),
      about: `Member of the ${spec.departmentId.replace('dept-', '')} team at Horizon Technologies, contributing to ${spec.skills[0].toLowerCase()} and cross-functional delivery.`,
      departmentId: spec.departmentId,
      designationId,
      branchId,
      managerId,
      employmentType: sequence % 17 === 0 ? 'Contract' : 'Full-time',
      status,
      dateOfJoining,
      dateOfConfirmation: isProbation
        ? undefined
        : `${joinedYear}-${String(Math.min(12, doj.getMonth() + 7)).padStart(2, '0')}-${String(doj.getDate()).padStart(2, '0')}`,
      workLocation: branchId === 'br-remote' ? 'Remote — India' : branch.city,
      shiftId: sequence % 9 === 0 ? 'shift-flexible' : 'shift-general',
      address: makeAddress(branch.city, branch.state, branch.pin),
      emergencyContacts: [
        {
          id: `EC-${pad(100 + sequence, 4)}`,
          name: `${pick(firstNames)} ${lastName}`,
          relationship: pick(['Spouse', 'Parent', 'Sibling', 'Guardian']),
          phone: `+91 9${String(700000000 + sequence * 211).slice(0, 9)}`,
        },
      ],
      bank: makeBank(),
      statutory: makeStatutory(sequence),
      documents: makeDocuments(sequence),
      employmentHistory: history,
      skills,
    })
    sequence += 1
  }
}

export const employees: Employee[] = [...detailedEmployees, ...generated]

export function getEmployeeById(id: string): Employee | undefined {
  return employees.find((employee) => employee.id === id)
}

export function getEmployeeName(id: string | null | undefined): string {
  if (!id) return '—'
  const employee = getEmployeeById(id)
  return employee ? `${employee.firstName} ${employee.lastName}` : '—'
}

export const DETAILED_EMPLOYEE_IDS = detailedEmployees.map((e) => e.id)

/** Employee self-service account used by development tooling. */
export const DEMO_SELF_SERVICE_EMPLOYEE_ID = 'HZT-0005'

/** Manager account used by development tooling. */
export const DEMO_MANAGER_EMPLOYEE_ID = 'HZT-0003'
