import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import "clsx";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
// src/lib/utils.ts
var DEMO_SNAPSHOT_DATE = new Date(2026, 9, 30);
/** Deterministic pseudo-random generator so demo data stays stable between reloads. */
function mulberry32(seed) {
	let a = seed;
	return () => {
		a |= 0;
		a = a + 1831565813 | 0;
		let t = Math.imul(a ^ a >>> 15, 1 | a);
		t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}
function isoDate(date) {
	return date.toISOString().slice(0, 10);
}
// src/data/employees.ts
var seed = mulberry32(20261030);
var pick = (items) => items[Math.floor(seed() * items.length)];
var pad = (n, size = 4) => String(n).padStart(size, "0");
var branchCities = [
	{
		id: "br-hyd",
		city: "Hyderabad",
		state: "Telangana",
		pin: "500081"
	},
	{
		id: "br-blr",
		city: "Bengaluru",
		state: "Karnataka",
		pin: "560103"
	},
	{
		id: "br-pune",
		city: "Pune",
		state: "Maharashtra",
		pin: "411057"
	},
	{
		id: "br-che",
		city: "Chennai",
		state: "Tamil Nadu",
		pin: "600096"
	},
	{
		id: "br-remote",
		city: "Hyderabad",
		state: "Telangana",
		pin: "500032"
	}
];
var streets = [
	"Road No. 12, Banjara Hills",
	"Hitech City Main Road",
	"Financial District, Nanakramguda",
	"MG Road, Indiranagar",
	"Koramangala 5th Block",
	"Baner Road",
	"Hinjewadi Phase 2",
	"OMR, Thoraipakkam",
	"Adyar Main Road",
	"Kondapur Main Road"
];
function makeAddress(city, state, pin) {
	return {
		line1: `${Math.floor(seed() * 180) + 1}, ${pick(streets)}`,
		city,
		state,
		postalCode: pin,
		country: "India"
	};
}
function makeBank() {
	return {
		bankName: pick([
			"HDFC Bank",
			"ICICI Bank",
			"Axis Bank",
			"State Bank of India",
			"Kotak Mahindra Bank"
		]),
		accountNumber: `5010${Math.floor(seed() * 9e7 + 1e7)}`,
		ifsc: pick([
			"HDFC0001234",
			"ICIC0000456",
			"UTIB0000789",
			"SBIN0004321",
			"KKBK0006543"
		]),
		branch: pick([
			"Madhapur",
			"Hitech City",
			"Indiranagar",
			"Baner",
			"Adyar"
		]),
		accountType: "Savings"
	};
}
function makeStatutory(index) {
	const letters = "ABCDEFGHJKLMNPRSTUVWXYZ";
	return {
		pan: `${letters[index % 23]}${letters[index * 3 % 23]}${letters[index * 7 % 23]}P${letters[index * 5 % 23]}${String(1e3 + index).slice(-4)}${letters[index * 11 % 23]}`,
		aadhaar: `${String(2e3 + index % 7e3).padStart(4, "0")} ${String(1e3 + index % 8e3).padStart(4, "0")} ${String(3e3 + index % 6e3).padStart(4, "0")}`,
		uan: `101${String(2e8 + index * 731).slice(0, 9)}`,
		pfNumber: `PF/HYD/${String(10234 + index)}/001`,
		esiNumber: index % 4 === 0 ? "—" : `ESI/${String(31004500 + index * 17)}`
	};
}
function makeDocuments(index) {
	const base = [
		{
			name: "Offer Letter.pdf",
			category: "Offer Letter"
		},
		{
			name: "Aadhaar Card.pdf",
			category: "Identity"
		},
		{
			name: "PAN Card.pdf",
			category: "Identity"
		},
		{
			name: "Degree Certificate.pdf",
			category: "Education"
		},
		{
			name: "Relieving Letter.pdf",
			category: "Experience"
		}
	];
	const count = 2 + index % 4;
	return base.slice(0, count).map((doc, i) => ({
		id: `DOC-${pad(index * 10 + i + 1, 5)}`,
		name: doc.name,
		category: doc.category,
		uploadedOn: `2026-${String(1 + index % 9).padStart(2, "0")}-${String(4 + index % 22).padStart(2, "0")}`,
		size: `${(.3 + index % 9 * .17).toFixed(1)} MB`,
		status: i === count - 1 && index % 5 === 0 ? "Pending" : "Verified"
	}));
}
var detailedEmployees = [
	{
		id: "HZT-0001",
		firstName: "Vikram",
		lastName: "Rao",
		email: "vikram.rao@horizontech.example",
		personalEmail: "vikram.rao@gmail.example",
		phone: "+91 98490 11201",
		gender: "Male",
		dateOfBirth: "1978-03-14",
		maritalStatus: "Married",
		bloodGroup: "B+",
		about: "Technology leader with 22 years of experience building product engineering organisations. Focused on sustainable growth, engineering excellence and customer outcomes.",
		departmentId: "dept-exec",
		designationId: "des-ceo",
		branchId: "br-hyd",
		managerId: null,
		employmentType: "Full-time",
		status: "Active",
		dateOfJoining: "2016-04-01",
		dateOfConfirmation: "2016-04-01",
		workLocation: "Hyderabad HQ",
		shiftId: "shift-general",
		address: makeAddress("Hyderabad", "Telangana", "500033"),
		emergencyContacts: [{
			id: "EC-0001",
			name: "Lakshmi Rao",
			relationship: "Spouse",
			phone: "+91 98490 11202"
		}],
		bank: {
			bankName: "HDFC Bank",
			accountNumber: "50100123456789",
			ifsc: "HDFC0001234",
			branch: "Jubilee Hills",
			accountType: "Savings"
		},
		statutory: {
			pan: "AKRPR4821L",
			aadhaar: "4210 7856 9021",
			uan: "101234567890",
			pfNumber: "PF/HYD/10001/001",
			esiNumber: "—"
		},
		documents: [
			{
				id: "DOC-00001",
				name: "Board Appointment.pdf",
				category: "Offer Letter",
				uploadedOn: "2016-04-01",
				size: "0.8 MB",
				status: "Verified"
			},
			{
				id: "DOC-00002",
				name: "PAN Card.pdf",
				category: "Identity",
				uploadedOn: "2016-04-01",
				size: "0.3 MB",
				status: "Verified"
			},
			{
				id: "DOC-00003",
				name: "Aadhaar Card.pdf",
				category: "Identity",
				uploadedOn: "2016-04-01",
				size: "0.4 MB",
				status: "Verified"
			}
		],
		employmentHistory: [{
			id: "HIS-0001",
			title: "Chief Executive Officer",
			department: "Executive Office",
			effectiveFrom: "2016-04-01",
			type: "Joining"
		}],
		skills: [
			"Executive Leadership",
			"Strategy",
			"Engineering Management"
		],
		isDetailed: true
	},
	{
		id: "HZT-0002",
		firstName: "Priya",
		lastName: "Menon",
		email: "priya.menon@horizontech.example",
		personalEmail: "priya.menon@gmail.example",
		phone: "+91 98490 22302",
		gender: "Female",
		dateOfBirth: "1985-07-22",
		maritalStatus: "Married",
		bloodGroup: "O+",
		about: "People leader with 16 years of HR experience across technology and consulting. Passionate about building inclusive workplaces and scalable people practices.",
		departmentId: "dept-hr",
		designationId: "des-hr-head",
		branchId: "br-hyd",
		managerId: "HZT-0001",
		employmentType: "Full-time",
		status: "Active",
		dateOfJoining: "2017-06-12",
		dateOfConfirmation: "2017-12-12",
		workLocation: "Hyderabad HQ",
		shiftId: "shift-general",
		address: makeAddress("Hyderabad", "Telangana", "500081"),
		emergencyContacts: [{
			id: "EC-0002",
			name: "Suresh Menon",
			relationship: "Spouse",
			phone: "+91 98490 22303"
		}, {
			id: "EC-0003",
			name: "Radha Menon",
			relationship: "Mother",
			phone: "+91 98490 22304"
		}],
		bank: {
			bankName: "ICICI Bank",
			accountNumber: "002401556781",
			ifsc: "ICIC0000456",
			branch: "Madhapur",
			accountType: "Savings"
		},
		statutory: {
			pan: "BMLPM3927K",
			aadhaar: "5832 1147 6620",
			uan: "101234567891",
			pfNumber: "PF/HYD/10002/001",
			esiNumber: "—"
		},
		documents: [
			{
				id: "DOC-00004",
				name: "Offer Letter.pdf",
				category: "Offer Letter",
				uploadedOn: "2017-06-12",
				size: "0.5 MB",
				status: "Verified"
			},
			{
				id: "DOC-00005",
				name: "Aadhaar Card.pdf",
				category: "Identity",
				uploadedOn: "2017-06-12",
				size: "0.4 MB",
				status: "Verified"
			},
			{
				id: "DOC-00006",
				name: "PAN Card.pdf",
				category: "Identity",
				uploadedOn: "2017-06-12",
				size: "0.3 MB",
				status: "Verified"
			},
			{
				id: "DOC-00007",
				name: "MBA Certificate.pdf",
				category: "Education",
				uploadedOn: "2017-06-13",
				size: "0.7 MB",
				status: "Verified"
			}
		],
		employmentHistory: [{
			id: "HIS-0002",
			title: "Head of Human Resources",
			department: "Human Resources",
			effectiveFrom: "2021-04-01",
			type: "Promotion"
		}, {
			id: "HIS-0003",
			title: "Senior HR Manager",
			department: "Human Resources",
			effectiveFrom: "2017-06-12",
			effectiveTo: "2021-03-31",
			type: "Joining"
		}],
		skills: [
			"HR Strategy",
			"Talent Management",
			"Employee Relations",
			"HRIS"
		],
		isDetailed: true
	},
	{
		id: "HZT-0003",
		firstName: "Rohan",
		lastName: "Iyer",
		email: "rohan.iyer@horizontech.example",
		personalEmail: "rohan.iyer@gmail.example",
		phone: "+91 98490 33403",
		gender: "Male",
		dateOfBirth: "1987-11-09",
		maritalStatus: "Married",
		bloodGroup: "A+",
		about: "Engineering manager leading platform and product teams. Strong background in distributed systems, cloud architecture and engineering mentorship.",
		departmentId: "dept-eng",
		designationId: "des-eng-mgr",
		branchId: "br-hyd",
		managerId: "HZT-0001",
		employmentType: "Full-time",
		status: "Active",
		dateOfJoining: "2018-02-05",
		dateOfConfirmation: "2018-08-05",
		workLocation: "Hyderabad HQ",
		shiftId: "shift-general",
		address: makeAddress("Hyderabad", "Telangana", "500081"),
		emergencyContacts: [{
			id: "EC-0004",
			name: "Divya Iyer",
			relationship: "Spouse",
			phone: "+91 98490 33404"
		}],
		bank: {
			bankName: "Axis Bank",
			accountNumber: "918020045612378",
			ifsc: "UTIB0000789",
			branch: "Hitech City",
			accountType: "Savings"
		},
		statutory: {
			pan: "CKLPI7714N",
			aadhaar: "7421 9903 4415",
			uan: "101234567892",
			pfNumber: "PF/HYD/10003/001",
			esiNumber: "—"
		},
		documents: [
			{
				id: "DOC-00008",
				name: "Offer Letter.pdf",
				category: "Offer Letter",
				uploadedOn: "2018-02-05",
				size: "0.5 MB",
				status: "Verified"
			},
			{
				id: "DOC-00009",
				name: "Aadhaar Card.pdf",
				category: "Identity",
				uploadedOn: "2018-02-05",
				size: "0.4 MB",
				status: "Verified"
			},
			{
				id: "DOC-00010",
				name: "B.Tech Certificate.pdf",
				category: "Education",
				uploadedOn: "2018-02-06",
				size: "0.6 MB",
				status: "Verified"
			}
		],
		employmentHistory: [{
			id: "HIS-0004",
			title: "Engineering Manager",
			department: "Engineering",
			effectiveFrom: "2021-10-01",
			type: "Promotion"
		}, {
			id: "HIS-0005",
			title: "Senior Software Engineer",
			department: "Engineering",
			effectiveFrom: "2018-02-05",
			effectiveTo: "2021-09-30",
			type: "Joining"
		}],
		skills: [
			"System Design",
			"React",
			"Node.js",
			"AWS",
			"Team Leadership"
		],
		isDetailed: true
	},
	{
		id: "HZT-0004",
		firstName: "Ananya",
		lastName: "Deshpande",
		email: "ananya.deshpande@horizontech.example",
		personalEmail: "ananya.d@gmail.example",
		phone: "+91 98490 44504",
		gender: "Female",
		dateOfBirth: "1992-05-18",
		maritalStatus: "Single",
		bloodGroup: "AB+",
		about: "Product designer with a systems thinking approach. Leads design for the enterprise suite and mentors the design team.",
		departmentId: "dept-design",
		designationId: "des-spd",
		branchId: "br-pune",
		managerId: "HZT-0001",
		employmentType: "Full-time",
		status: "Active",
		dateOfJoining: "2019-08-19",
		dateOfConfirmation: "2020-02-19",
		workLocation: "Pune",
		shiftId: "shift-general",
		address: makeAddress("Pune", "Maharashtra", "411057"),
		emergencyContacts: [{
			id: "EC-0005",
			name: "Ashok Deshpande",
			relationship: "Father",
			phone: "+91 98490 44505"
		}],
		bank: {
			bankName: "Kotak Mahindra Bank",
			accountNumber: "7311459022",
			ifsc: "KKBK0006543",
			branch: "Baner",
			accountType: "Savings"
		},
		statutory: {
			pan: "DMNPD5812Q",
			aadhaar: "3321 7784 2210",
			uan: "101234567893",
			pfNumber: "PF/PUN/10004/001",
			esiNumber: "ESI/31004612"
		},
		documents: [
			{
				id: "DOC-00011",
				name: "Offer Letter.pdf",
				category: "Offer Letter",
				uploadedOn: "2019-08-19",
				size: "0.5 MB",
				status: "Verified"
			},
			{
				id: "DOC-00012",
				name: "Aadhaar Card.pdf",
				category: "Identity",
				uploadedOn: "2019-08-19",
				size: "0.3 MB",
				status: "Verified"
			},
			{
				id: "DOC-00013",
				name: "Design Portfolio.pdf",
				category: "Other",
				uploadedOn: "2024-03-01",
				size: "8.2 MB",
				status: "Verified"
			}
		],
		employmentHistory: [{
			id: "HIS-0006",
			title: "Senior Product Designer",
			department: "Design",
			effectiveFrom: "2022-04-01",
			type: "Promotion"
		}, {
			id: "HIS-0007",
			title: "Product Designer",
			department: "Design",
			effectiveFrom: "2019-08-19",
			effectiveTo: "2022-03-31",
			type: "Joining"
		}],
		skills: [
			"Product Design",
			"Design Systems",
			"Figma",
			"User Research"
		],
		isDetailed: true
	},
	{
		id: "HZT-0005",
		firstName: "Arjun",
		lastName: "Nair",
		email: "arjun.nair@horizontech.example",
		personalEmail: "arjun.nair@gmail.example",
		phone: "+91 98490 55605",
		gender: "Male",
		dateOfBirth: "1993-01-27",
		maritalStatus: "Single",
		bloodGroup: "B-",
		about: "Full-stack engineer working on the core platform. Enjoys developer experience, accessibility and performance engineering.",
		departmentId: "dept-eng",
		designationId: "des-sse",
		branchId: "br-hyd",
		managerId: "HZT-0003",
		employmentType: "Full-time",
		status: "Active",
		dateOfJoining: "2019-11-04",
		dateOfConfirmation: "2020-05-04",
		workLocation: "Hyderabad HQ",
		shiftId: "shift-general",
		address: makeAddress("Hyderabad", "Telangana", "500081"),
		emergencyContacts: [{
			id: "EC-0006",
			name: "Sobha Nair",
			relationship: "Mother",
			phone: "+91 98490 55606"
		}],
		bank: {
			bankName: "State Bank of India",
			accountNumber: "38291044567231",
			ifsc: "SBIN0004321",
			branch: "Madhapur",
			accountType: "Savings"
		},
		statutory: {
			pan: "EPQPN6219M",
			aadhaar: "8812 3347 9091",
			uan: "101234567894",
			pfNumber: "PF/HYD/10005/001",
			esiNumber: "—"
		},
		documents: [
			{
				id: "DOC-00014",
				name: "Offer Letter.pdf",
				category: "Offer Letter",
				uploadedOn: "2019-11-04",
				size: "0.5 MB",
				status: "Verified"
			},
			{
				id: "DOC-00015",
				name: "Aadhaar Card.pdf",
				category: "Identity",
				uploadedOn: "2019-11-04",
				size: "0.4 MB",
				status: "Verified"
			},
			{
				id: "DOC-00016",
				name: "B.Tech Certificate.pdf",
				category: "Education",
				uploadedOn: "2019-11-05",
				size: "0.6 MB",
				status: "Verified"
			},
			{
				id: "DOC-00017",
				name: "Relieving Letter.pdf",
				category: "Experience",
				uploadedOn: "2019-11-05",
				size: "0.2 MB",
				status: "Verified"
			}
		],
		employmentHistory: [{
			id: "HIS-0008",
			title: "Senior Software Engineer",
			department: "Engineering",
			effectiveFrom: "2023-04-01",
			type: "Promotion"
		}, {
			id: "HIS-0009",
			title: "Software Engineer",
			department: "Engineering",
			effectiveFrom: "2019-11-04",
			effectiveTo: "2023-03-31",
			type: "Joining"
		}],
		skills: [
			"TypeScript",
			"React",
			"Node.js",
			"PostgreSQL",
			"Testing"
		],
		isDetailed: true
	},
	{
		id: "HZT-0006",
		firstName: "Sneha",
		lastName: "Reddy",
		email: "sneha.reddy@horizontech.example",
		personalEmail: "sneha.reddy@gmail.example",
		phone: "+91 98490 66706",
		gender: "Female",
		dateOfBirth: "1995-09-03",
		maritalStatus: "Single",
		bloodGroup: "O-",
		about: "HR generalist supporting onboarding, employee lifecycle and engagement across the Hyderabad and Bengaluru offices.",
		departmentId: "dept-hr",
		designationId: "des-hr-exec",
		branchId: "br-hyd",
		managerId: "HZT-0002",
		employmentType: "Full-time",
		status: "Active",
		dateOfJoining: "2021-03-15",
		dateOfConfirmation: "2021-09-15",
		workLocation: "Hyderabad HQ",
		shiftId: "shift-general",
		address: makeAddress("Hyderabad", "Telangana", "500032"),
		emergencyContacts: [{
			id: "EC-0007",
			name: "Ravi Reddy",
			relationship: "Father",
			phone: "+91 98490 66707"
		}],
		bank: {
			bankName: "HDFC Bank",
			accountNumber: "50100778899001",
			ifsc: "HDFC0001234",
			branch: "Kondapur",
			accountType: "Savings"
		},
		statutory: {
			pan: "FGHPR8420T",
			aadhaar: "2210 4589 7763",
			uan: "101234567895",
			pfNumber: "PF/HYD/10006/001",
			esiNumber: "ESI/31004587"
		},
		documents: [
			{
				id: "DOC-00018",
				name: "Offer Letter.pdf",
				category: "Offer Letter",
				uploadedOn: "2021-03-15",
				size: "0.5 MB",
				status: "Verified"
			},
			{
				id: "DOC-00019",
				name: "Aadhaar Card.pdf",
				category: "Identity",
				uploadedOn: "2021-03-15",
				size: "0.4 MB",
				status: "Verified"
			},
			{
				id: "DOC-00020",
				name: "MBA Certificate.pdf",
				category: "Education",
				uploadedOn: "2021-03-16",
				size: "0.7 MB",
				status: "Verified"
			}
		],
		employmentHistory: [{
			id: "HIS-0010",
			title: "HR Executive",
			department: "Human Resources",
			effectiveFrom: "2021-03-15",
			type: "Joining"
		}],
		skills: [
			"Onboarding",
			"Employee Engagement",
			"HR Operations"
		],
		isDetailed: true
	},
	{
		id: "HZT-0007",
		firstName: "Karthik",
		lastName: "Subramanian",
		email: "karthik.subramanian@horizontech.example",
		personalEmail: "karthik.s@gmail.example",
		phone: "+91 98490 77807",
		gender: "Male",
		dateOfBirth: "1984-12-11",
		maritalStatus: "Married",
		bloodGroup: "A-",
		about: "Finance leader responsible for controllership, financial planning, payroll governance and commercial operations.",
		departmentId: "dept-finance",
		designationId: "des-fin-mgr",
		branchId: "br-che",
		managerId: "HZT-0001",
		employmentType: "Full-time",
		status: "Active",
		dateOfJoining: "2017-09-01",
		dateOfConfirmation: "2018-03-01",
		workLocation: "Chennai",
		shiftId: "shift-general",
		address: makeAddress("Chennai", "Tamil Nadu", "600096"),
		emergencyContacts: [{
			id: "EC-0008",
			name: "Latha Subramanian",
			relationship: "Spouse",
			phone: "+91 98490 77808"
		}],
		bank: {
			bankName: "ICICI Bank",
			accountNumber: "002401889302",
			ifsc: "ICIC0000456",
			branch: "Adyar",
			accountType: "Savings"
		},
		statutory: {
			pan: "GHJPS9123R",
			aadhaar: "6634 1128 4409",
			uan: "101234567896",
			pfNumber: "PF/CHE/10007/001",
			esiNumber: "—"
		},
		documents: [
			{
				id: "DOC-00021",
				name: "Offer Letter.pdf",
				category: "Offer Letter",
				uploadedOn: "2017-09-01",
				size: "0.5 MB",
				status: "Verified"
			},
			{
				id: "DOC-00022",
				name: "Aadhaar Card.pdf",
				category: "Identity",
				uploadedOn: "2017-09-01",
				size: "0.4 MB",
				status: "Verified"
			},
			{
				id: "DOC-00023",
				name: "CA Certificate.pdf",
				category: "Education",
				uploadedOn: "2017-09-02",
				size: "0.9 MB",
				status: "Verified"
			}
		],
		employmentHistory: [{
			id: "HIS-0011",
			title: "Finance Manager",
			department: "Finance",
			effectiveFrom: "2020-04-01",
			type: "Promotion"
		}, {
			id: "HIS-0012",
			title: "Senior Accountant",
			department: "Finance",
			effectiveFrom: "2017-09-01",
			effectiveTo: "2020-03-31",
			type: "Joining"
		}],
		skills: [
			"Financial Planning",
			"Controllership",
			"Payroll Governance",
			"Taxation"
		],
		isDetailed: true
	},
	{
		id: "HZT-0008",
		firstName: "Meera",
		lastName: "Joshi",
		email: "meera.joshi@horizontech.example",
		personalEmail: "meera.joshi@gmail.example",
		phone: "+91 98490 88908",
		gender: "Female",
		dateOfBirth: "1991-04-06",
		maritalStatus: "Married",
		bloodGroup: "B+",
		about: "Payroll specialist managing monthly payroll inputs, statutory documentation and employee payroll queries.",
		departmentId: "dept-finance",
		designationId: "des-payroll-spec",
		branchId: "br-pune",
		managerId: "HZT-0007",
		employmentType: "Full-time",
		status: "Active",
		dateOfJoining: "2020-07-20",
		dateOfConfirmation: "2021-01-20",
		workLocation: "Pune",
		shiftId: "shift-general",
		address: makeAddress("Pune", "Maharashtra", "411045"),
		emergencyContacts: [{
			id: "EC-0009",
			name: "Nikhil Joshi",
			relationship: "Spouse",
			phone: "+91 98490 88909"
		}],
		bank: {
			bankName: "Axis Bank",
			accountNumber: "918020067845123",
			ifsc: "UTIB0000789",
			branch: "Baner",
			accountType: "Savings"
		},
		statutory: {
			pan: "HKL PJ3845P".replace(" ", ""),
			aadhaar: "9912 3345 1187",
			uan: "101234567897",
			pfNumber: "PF/PUN/10008/001",
			esiNumber: "ESI/31004631"
		},
		documents: [
			{
				id: "DOC-00024",
				name: "Offer Letter.pdf",
				category: "Offer Letter",
				uploadedOn: "2020-07-20",
				size: "0.5 MB",
				status: "Verified"
			},
			{
				id: "DOC-00025",
				name: "Aadhaar Card.pdf",
				category: "Identity",
				uploadedOn: "2020-07-20",
				size: "0.4 MB",
				status: "Verified"
			},
			{
				id: "DOC-00026",
				name: "B.Com Certificate.pdf",
				category: "Education",
				uploadedOn: "2020-07-21",
				size: "0.6 MB",
				status: "Verified"
			}
		],
		employmentHistory: [{
			id: "HIS-0013",
			title: "Payroll Specialist",
			department: "Finance",
			effectiveFrom: "2020-07-20",
			type: "Joining"
		}],
		skills: [
			"Payroll Processing",
			"Statutory Reporting",
			"Excel",
			"HRIS"
		],
		isDetailed: true
	},
	{
		id: "HZT-0009",
		firstName: "Aditya",
		lastName: "Verma",
		email: "aditya.verma@horizontech.example",
		personalEmail: "aditya.verma@gmail.example",
		phone: "+91 98490 99009",
		gender: "Male",
		dateOfBirth: "1986-08-30",
		maritalStatus: "Married",
		bloodGroup: "O+",
		about: "Sales leader for enterprise accounts in India. Builds consultative selling teams and long-term customer relationships.",
		departmentId: "dept-sales",
		designationId: "des-sales-mgr",
		branchId: "br-blr",
		managerId: "HZT-0001",
		employmentType: "Full-time",
		status: "Active",
		dateOfJoining: "2018-05-14",
		dateOfConfirmation: "2018-11-14",
		workLocation: "Bengaluru",
		shiftId: "shift-general",
		address: makeAddress("Bengaluru", "Karnataka", "560103"),
		emergencyContacts: [{
			id: "EC-0010",
			name: "Ritika Verma",
			relationship: "Spouse",
			phone: "+91 98490 99010"
		}],
		bank: {
			bankName: "HDFC Bank",
			accountNumber: "50100889900112",
			ifsc: "HDFC0001234",
			branch: "Indiranagar",
			accountType: "Savings"
		},
		statutory: {
			pan: "JKLPV6721Q",
			aadhaar: "7789 1123 5540",
			uan: "101234567898",
			pfNumber: "PF/BLR/10009/001",
			esiNumber: "—"
		},
		documents: [
			{
				id: "DOC-00027",
				name: "Offer Letter.pdf",
				category: "Offer Letter",
				uploadedOn: "2018-05-14",
				size: "0.5 MB",
				status: "Verified"
			},
			{
				id: "DOC-00028",
				name: "Aadhaar Card.pdf",
				category: "Identity",
				uploadedOn: "2018-05-14",
				size: "0.4 MB",
				status: "Verified"
			},
			{
				id: "DOC-00029",
				name: "MBA Certificate.pdf",
				category: "Education",
				uploadedOn: "2018-05-15",
				size: "0.7 MB",
				status: "Verified"
			}
		],
		employmentHistory: [{
			id: "HIS-0014",
			title: "Sales Manager",
			department: "Sales",
			effectiveFrom: "2020-10-01",
			type: "Promotion"
		}, {
			id: "HIS-0015",
			title: "Senior Account Executive",
			department: "Sales",
			effectiveFrom: "2018-05-14",
			effectiveTo: "2020-09-30",
			type: "Joining"
		}],
		skills: [
			"Enterprise Sales",
			"Account Management",
			"Negotiation",
			"Forecasting"
		],
		isDetailed: true
	},
	{
		id: "HZT-0010",
		firstName: "Isha",
		lastName: "Kapoor",
		email: "isha.kapoor@horizontech.example",
		personalEmail: "isha.kapoor@gmail.example",
		phone: "+91 98490 10110",
		gender: "Female",
		dateOfBirth: "1990-02-17",
		maritalStatus: "Married",
		bloodGroup: "AB-",
		about: "Marketing leader across brand, demand generation and product marketing. Data-led approach to growth storytelling.",
		departmentId: "dept-marketing",
		designationId: "des-mkt-mgr",
		branchId: "br-blr",
		managerId: "HZT-0001",
		employmentType: "Full-time",
		status: "Active",
		dateOfJoining: "2019-04-08",
		dateOfConfirmation: "2019-10-08",
		workLocation: "Bengaluru",
		shiftId: "shift-general",
		address: makeAddress("Bengaluru", "Karnataka", "560095"),
		emergencyContacts: [{
			id: "EC-0011",
			name: "Rahul Kapoor",
			relationship: "Spouse",
			phone: "+91 98490 10111"
		}],
		bank: {
			bankName: "Kotak Mahindra Bank",
			accountNumber: "7311998821",
			ifsc: "KKBK0006543",
			branch: "Indiranagar",
			accountType: "Savings"
		},
		statutory: {
			pan: "MNPKJ4098R",
			aadhaar: "2214 6637 1190",
			uan: "101234567899",
			pfNumber: "PF/BLR/10010/001",
			esiNumber: "—"
		},
		documents: [
			{
				id: "DOC-00030",
				name: "Offer Letter.pdf",
				category: "Offer Letter",
				uploadedOn: "2019-04-08",
				size: "0.5 MB",
				status: "Verified"
			},
			{
				id: "DOC-00031",
				name: "Aadhaar Card.pdf",
				category: "Identity",
				uploadedOn: "2019-04-08",
				size: "0.4 MB",
				status: "Verified"
			},
			{
				id: "DOC-00032",
				name: "MBA Certificate.pdf",
				category: "Education",
				uploadedOn: "2019-04-09",
				size: "0.7 MB",
				status: "Verified"
			}
		],
		employmentHistory: [{
			id: "HIS-0016",
			title: "Marketing Manager",
			department: "Marketing",
			effectiveFrom: "2021-04-01",
			type: "Promotion"
		}, {
			id: "HIS-0017",
			title: "Brand Marketing Lead",
			department: "Marketing",
			effectiveFrom: "2019-04-08",
			effectiveTo: "2021-03-31",
			type: "Joining"
		}],
		skills: [
			"Brand Strategy",
			"Demand Generation",
			"Product Marketing",
			"Analytics"
		],
		isDetailed: true
	}
];
var generatedSpecs = [
	{
		departmentId: "dept-eng",
		count: 40,
		designations: [
			"des-staff",
			"des-sse",
			"des-sse",
			"des-sse",
			"des-se",
			"des-se",
			"des-se",
			"des-se",
			"des-se",
			"des-se",
			"des-se",
			"des-se",
			"des-se",
			"des-se",
			"des-se",
			"des-se",
			"des-se",
			"des-se",
			"des-se",
			"des-jse",
			"des-jse",
			"des-jse",
			"des-jse",
			"des-jse",
			"des-qa",
			"des-qa",
			"des-qa",
			"des-devops",
			"des-devops",
			"des-sse",
			"des-se",
			"des-se",
			"des-se",
			"des-se",
			"des-se",
			"des-se",
			"des-jse",
			"des-qa",
			"des-se",
			"des-staff"
		],
		skills: [
			"TypeScript",
			"React",
			"Node.js",
			"AWS",
			"Kubernetes",
			"Python",
			"GraphQL",
			"PostgreSQL"
		]
	},
	{
		departmentId: "dept-product",
		count: 12,
		designations: [
			"des-prod-mgr",
			"des-pm",
			"des-pm",
			"des-pm",
			"des-apm",
			"des-apm",
			"des-apm",
			"des-apm",
			"des-product-analyst",
			"des-product-analyst",
			"des-product-analyst",
			"des-product-analyst"
		],
		skills: [
			"Product Strategy",
			"Roadmapping",
			"Analytics",
			"User Research",
			"SQL"
		]
	},
	{
		departmentId: "dept-design",
		count: 7,
		designations: [
			"des-design-lead",
			"des-spd",
			"des-pd",
			"des-pd",
			"des-pd",
			"des-pd",
			"des-spd"
		],
		skills: [
			"Figma",
			"Design Systems",
			"Prototyping",
			"User Research",
			"Accessibility"
		]
	},
	{
		departmentId: "dept-hr",
		count: 7,
		designations: [
			"des-hr-mgr",
			"des-hr-exec",
			"des-hr-exec",
			"des-ta-tl",
			"des-ta",
			"des-ta",
			"des-hr-exec"
		],
		skills: [
			"Onboarding",
			"Recruitment",
			"HR Operations",
			"Employee Engagement"
		]
	},
	{
		departmentId: "dept-finance",
		count: 6,
		designations: [
			"des-accountant",
			"des-fin-analyst",
			"des-accountant",
			"des-fin-analyst",
			"des-payroll-spec",
			"des-accountant"
		],
		skills: [
			"Accounting",
			"Financial Analysis",
			"GST",
			"Excel",
			"Payroll"
		]
	},
	{
		departmentId: "dept-sales",
		count: 17,
		designations: [
			"des-asm",
			"des-asm",
			"des-ae",
			"des-ae",
			"des-ae",
			"des-ae",
			"des-ae",
			"des-ae",
			"des-ae",
			"des-ae",
			"des-sdr",
			"des-sdr",
			"des-sdr",
			"des-sdr",
			"des-sdr",
			"des-sales-ops",
			"des-sales-ops"
		],
		skills: [
			"Enterprise Sales",
			"CRM",
			"Negotiation",
			"Prospecting",
			"Forecasting"
		]
	},
	{
		departmentId: "dept-marketing",
		count: 9,
		designations: [
			"des-content-lead",
			"des-content-spec",
			"des-content-spec",
			"des-content-spec",
			"des-perf-mkt",
			"des-perf-mkt",
			"des-perf-mkt",
			"des-mkt-assoc",
			"des-mkt-assoc"
		],
		skills: [
			"Content Marketing",
			"SEO",
			"Paid Media",
			"Brand",
			"Marketing Analytics"
		]
	},
	{
		departmentId: "dept-cs",
		count: 12,
		designations: [
			"des-cs-mgr",
			"des-csm",
			"des-csm",
			"des-csm",
			"des-csm",
			"des-csm",
			"des-csm",
			"des-csm",
			"des-csm",
			"des-support",
			"des-support",
			"des-support"
		],
		skills: [
			"Customer Success",
			"Account Management",
			"Support",
			"Product Knowledge"
		]
	},
	{
		departmentId: "dept-itops",
		count: 6,
		designations: [
			"des-it-mgr",
			"des-sysadmin",
			"des-sysadmin",
			"des-sysadmin",
			"des-helpdesk",
			"des-helpdesk"
		],
		skills: [
			"Windows Server",
			"Networking",
			"Security",
			"Endpoint Management",
			"Azure"
		]
	},
	{
		departmentId: "dept-legal",
		count: 2,
		designations: ["des-legal-mgr", "des-legal-assoc"],
		skills: [
			"Corporate Law",
			"Contracts",
			"Compliance",
			"Data Privacy"
		]
	}
];
var firstNames = [
	"Aarav",
	"Vivaan",
	"Aditya",
	"Vihaan",
	"Arjun",
	"Sai",
	"Reyansh",
	"Ayaan",
	"Krishna",
	"Ishaan",
	"Shaurya",
	"Atharva",
	"Advik",
	"Pranav",
	"Dhruv",
	"Kabir",
	"Ritvik",
	"Aarush",
	"Kayaan",
	"Darsh",
	"Ananya",
	"Diya",
	"Aadhya",
	"Saanvi",
	"Pari",
	"Anika",
	"Navya",
	"Myra",
	"Sara",
	"Ira",
	"Riya",
	"Aarohi",
	"Anvi",
	"Prisha",
	"Netra",
	"Kiara",
	"Mira",
	"Tara",
	"Kavya",
	"Nitya",
	"Ishita",
	"Saanchi",
	"Avni",
	"Mahika",
	"Zoya",
	"Ridhi",
	"Trisha",
	"Nandini",
	"Bhavya",
	"Charita"
];
var lastNames = [
	"Sharma",
	"Verma",
	"Gupta",
	"Agarwal",
	"Reddy",
	"Nair",
	"Menon",
	"Iyer",
	"Rao",
	"Krishnan",
	"Subramanian",
	"Deshpande",
	"Joshi",
	"Patil",
	"Kulkarni",
	"Mehta",
	"Shah",
	"Chopra",
	"Kapoor",
	"Malhotra",
	"Bhat",
	"Shetty",
	"Hegde",
	"Pillai",
	"Banerjee",
	"Chatterjee",
	"Das",
	"Mukherjee",
	"Singh",
	"Kaur",
	"Yadav",
	"Mishra",
	"Pandey",
	"Saxena",
	"Tiwari",
	"Bose",
	"Ghosh",
	"Rathore",
	"Chauhan",
	"Bhatt"
];
var detailedNames = new Set(detailedEmployees.map((e) => `${e.firstName} ${e.lastName}`));
var branchIds = [
	"br-hyd",
	"br-hyd",
	"br-hyd",
	"br-blr",
	"br-blr",
	"br-pune",
	"br-che",
	"br-remote"
];
function nextName(index) {
	let offset = 0;
	while (offset < 400) {
		const i = index + offset;
		const firstName = firstNames[i % firstNames.length];
		const lastName = lastNames[(i * 7 + 3) % lastNames.length];
		if (!detailedNames.has(`${firstName} ${lastName}`)) return {
			firstName,
			lastName
		};
		offset += 1;
	}
	return {
		firstName: "Aditi",
		lastName: `Rao${index}`
	};
}
var generated = [];
var sequence = 11;
var nameIndex = 0;
for (const spec of generatedSpecs) for (let i = 0; i < spec.count; i += 1) {
	const id = `HZT-${pad(sequence)}`;
	const { firstName, lastName } = nextName(nameIndex);
	nameIndex += 1;
	const branchId = branchIds[sequence * 3 % branchIds.length];
	const branch = branchCities.find((b) => b.id === branchId) ?? branchCities[0];
	const designationId = spec.designations[i % spec.designations.length];
	let status = "Active";
	let dateOfJoining = `20${19 + sequence % 8}-${String(1 + sequence % 12).padStart(2, "0")}-${String(2 + sequence % 25).padStart(2, "0")}`;
	if (i === 6 || i === 19 || i === 33) {
		status = "Probation";
		dateOfJoining = i === 33 ? "2026-09-14" : "2026-08-03";
	}
	if (i === 11) status = "On Leave";
	if (sequence === 48 || sequence === 91 || sequence === 118 || sequence === 125) status = "Inactive";
	const isProbation = status === "Probation";
	const departmentHead = spec.departmentId === "dept-eng" ? "HZT-0003" : spec.departmentId === "dept-design" ? "HZT-0004" : spec.departmentId === "dept-hr" ? "HZT-0002" : spec.departmentId === "dept-finance" ? "HZT-0007" : spec.departmentId === "dept-sales" ? "HZT-0009" : spec.departmentId === "dept-marketing" ? "HZT-0010" : null;
	const managerId = departmentHead ?? (i === 0 && departmentHead === null ? "HZT-0001" : "HZT-0001");
	const skills = Array.from({ length: 3 + sequence % 3 }, (_, k) => spec.skills[(sequence + k) % spec.skills.length]);
	const doj = new Date(dateOfJoining);
	const joinedYear = doj.getFullYear();
	const history = [{
		id: `HIS-${pad(1e3 + sequence, 4)}`,
		title: "Current role",
		department: spec.departmentId.replace("dept-", ""),
		effectiveFrom: dateOfJoining,
		type: "Joining"
	}];
	if (joinedYear < 2024) history.unshift({
		id: `HIS-${pad(2e3 + sequence, 4)}`,
		title: "Role progression",
		department: spec.departmentId.replace("dept-", ""),
		effectiveFrom: `${joinedYear + 2}-04-01`,
		type: "Promotion"
	});
	generated.push({
		id,
		firstName,
		lastName,
		email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${sequence}@horizontech.example`,
		personalEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@gmail.example`,
		phone: `+91 9${String(8e8 + sequence * 137).slice(0, 9)}`,
		gender: [
			"Male",
			"Female",
			"Female",
			"Male",
			"Male"
		][sequence % 5],
		dateOfBirth: `19${80 + sequence % 18}-${String(1 + sequence * 5 % 12).padStart(2, "0")}-${String(1 + sequence * 7 % 27).padStart(2, "0")}`,
		maritalStatus: sequence % 3 === 0 ? "Single" : "Married",
		bloodGroup: pick([
			"A+",
			"A-",
			"B+",
			"B-",
			"O+",
			"O-",
			"AB+",
			"AB-"
		]),
		about: `Member of the ${spec.departmentId.replace("dept-", "")} team at Horizon Technologies, contributing to ${spec.skills[0].toLowerCase()} and cross-functional delivery.`,
		departmentId: spec.departmentId,
		designationId,
		branchId,
		managerId,
		employmentType: sequence % 17 === 0 ? "Contract" : "Full-time",
		status,
		dateOfJoining,
		dateOfConfirmation: isProbation ? void 0 : `${joinedYear}-${String(Math.min(12, doj.getMonth() + 7)).padStart(2, "0")}-${String(doj.getDate()).padStart(2, "0")}`,
		workLocation: branchId === "br-remote" ? "Remote — India" : branch.city,
		shiftId: sequence % 9 === 0 ? "shift-flexible" : "shift-general",
		address: makeAddress(branch.city, branch.state, branch.pin),
		emergencyContacts: [{
			id: `EC-${pad(100 + sequence, 4)}`,
			name: `${pick(firstNames)} ${lastName}`,
			relationship: pick([
				"Spouse",
				"Parent",
				"Sibling",
				"Guardian"
			]),
			phone: `+91 9${String(7e8 + sequence * 211).slice(0, 9)}`
		}],
		bank: makeBank(),
		statutory: makeStatutory(sequence),
		documents: makeDocuments(sequence),
		employmentHistory: history,
		skills
	});
	sequence += 1;
}
var employees = [...detailedEmployees, ...generated];
detailedEmployees.map((e) => e.id);
/** The signed-in demo persona for the Employee self-service role. */
var DEMO_SELF_SERVICE_EMPLOYEE_ID = "HZT-0005";
/** The signed-in demo persona for the Manager role. */
var DEMO_MANAGER_EMPLOYEE_ID = "HZT-0003";
// src/data/organization.ts
var branches = [
	{
		id: "br-hyd",
		name: "Hyderabad Headquarters",
		address: "Level 8, Horizon Tower, Hitech City, Madhapur",
		city: "Hyderabad",
		state: "Telangana",
		phone: "+91 40 6789 1200",
		headId: "HZT-0001",
		isHeadquarters: true
	},
	{
		id: "br-blr",
		name: "Bengaluru Office",
		address: "4th Floor, Prestige Tech Park, Kadubeesanahalli",
		city: "Bengaluru",
		state: "Karnataka",
		phone: "+91 80 4567 8900",
		headId: "HZT-0009",
		isHeadquarters: false
	},
	{
		id: "br-pune",
		name: "Pune Office",
		address: "Unit 302, Panchshil Business Park, Baner",
		city: "Pune",
		state: "Maharashtra",
		phone: "+91 20 6712 4400",
		headId: "HZT-0004",
		isHeadquarters: false
	},
	{
		id: "br-che",
		name: "Chennai Office",
		address: "6th Floor, Olympia Cyberspace, Guindy",
		city: "Chennai",
		state: "Tamil Nadu",
		phone: "+91 44 4850 3300",
		headId: "HZT-0007",
		isHeadquarters: false
	},
	{
		id: "br-remote",
		name: "Remote — India",
		address: "Distributed workforce across India",
		city: "Hyderabad",
		state: "Telangana",
		phone: "+91 40 6789 1299",
		headId: null,
		isHeadquarters: false
	}
];
var departments = [
	{
		id: "dept-exec",
		name: "Executive Office",
		code: "EXEC",
		description: "Company strategy, governance and executive leadership.",
		headId: "HZT-0001",
		parentId: null,
		location: "Hyderabad HQ",
		email: "executive.office@horizontech.example",
		createdAt: "2016-04-01"
	},
	{
		id: "dept-eng",
		name: "Engineering",
		code: "ENG",
		description: "Platform engineering, product development, QA and infrastructure.",
		headId: "HZT-0003",
		parentId: null,
		location: "Hyderabad HQ",
		email: "engineering@horizontech.example",
		createdAt: "2016-04-01"
	},
	{
		id: "dept-product",
		name: "Product",
		code: "PRD",
		description: "Product strategy, discovery, roadmap and business analysis.",
		headId: "HZT-0051",
		parentId: null,
		location: "Bengaluru",
		email: "product@horizontech.example",
		createdAt: "2017-01-15"
	},
	{
		id: "dept-design",
		name: "Design",
		code: "DES",
		description: "Product design, design systems, research and brand experience.",
		headId: "HZT-0004",
		parentId: null,
		location: "Pune",
		email: "design@horizontech.example",
		createdAt: "2018-06-04"
	},
	{
		id: "dept-hr",
		name: "Human Resources",
		code: "HR",
		description: "People strategy, talent acquisition, HR operations and engagement.",
		headId: "HZT-0002",
		parentId: null,
		location: "Hyderabad HQ",
		email: "people@horizontech.example",
		createdAt: "2016-04-01"
	},
	{
		id: "dept-finance",
		name: "Finance",
		code: "FIN",
		description: "Controllership, payroll, FP&A, taxation and commercial operations.",
		headId: "HZT-0007",
		parentId: null,
		location: "Chennai",
		email: "finance@horizontech.example",
		createdAt: "2016-05-10"
	},
	{
		id: "dept-sales",
		name: "Sales",
		code: "SLS",
		description: "Enterprise and mid-market revenue across India.",
		headId: "HZT-0009",
		parentId: null,
		location: "Bengaluru",
		email: "sales@horizontech.example",
		createdAt: "2016-07-01"
	},
	{
		id: "dept-marketing",
		name: "Marketing",
		code: "MKT",
		description: "Brand, content, demand generation and product marketing.",
		headId: "HZT-0010",
		parentId: null,
		location: "Bengaluru",
		email: "marketing@horizontech.example",
		createdAt: "2017-02-20"
	},
	{
		id: "dept-cs",
		name: "Customer Success",
		code: "CS",
		description: "Onboarding, adoption, support and renewals for enterprise customers.",
		headId: "HZT-0109",
		parentId: null,
		location: "Hyderabad HQ",
		email: "customer.success@horizontech.example",
		createdAt: "2017-08-12"
	},
	{
		id: "dept-itops",
		name: "IT Operations",
		code: "ITO",
		description: "Corporate IT, infrastructure, security and workplace technology.",
		headId: "HZT-0121",
		parentId: null,
		location: "Hyderabad HQ",
		email: "it.operations@horizontech.example",
		createdAt: "2016-06-15"
	},
	{
		id: "dept-legal",
		name: "Legal & Compliance",
		code: "LGL",
		description: "Contracts, corporate legal, privacy and regulatory compliance.",
		headId: "HZT-0127",
		parentId: null,
		location: "Hyderabad HQ",
		email: "legal@horizontech.example",
		createdAt: "2019-03-01"
	}
];
// src/data/designations.ts
var designations = [
	{
		id: "des-ceo",
		title: "Chief Executive Officer",
		departmentId: "dept-exec",
		level: "L6",
		grade: "E1"
	},
	{
		id: "des-eng-mgr",
		title: "Engineering Manager",
		departmentId: "dept-eng",
		level: "L5",
		grade: "M3"
	},
	{
		id: "des-staff",
		title: "Staff Engineer",
		departmentId: "dept-eng",
		level: "L5",
		grade: "IC5"
	},
	{
		id: "des-sse",
		title: "Senior Software Engineer",
		departmentId: "dept-eng",
		level: "L4",
		grade: "IC4"
	},
	{
		id: "des-se",
		title: "Software Engineer",
		departmentId: "dept-eng",
		level: "L3",
		grade: "IC3"
	},
	{
		id: "des-jse",
		title: "Junior Software Engineer",
		departmentId: "dept-eng",
		level: "L2",
		grade: "IC2"
	},
	{
		id: "des-qa",
		title: "QA Engineer",
		departmentId: "dept-eng",
		level: "L3",
		grade: "IC3"
	},
	{
		id: "des-devops",
		title: "DevOps Engineer",
		departmentId: "dept-eng",
		level: "L3",
		grade: "IC3"
	},
	{
		id: "des-prod-mgr",
		title: "Senior Product Manager",
		departmentId: "dept-product",
		level: "L5",
		grade: "M2"
	},
	{
		id: "des-pm",
		title: "Product Manager",
		departmentId: "dept-product",
		level: "L4",
		grade: "IC4"
	},
	{
		id: "des-apm",
		title: "Associate Product Manager",
		departmentId: "dept-product",
		level: "L3",
		grade: "IC3"
	},
	{
		id: "des-product-analyst",
		title: "Product Analyst",
		departmentId: "dept-product",
		level: "L2",
		grade: "IC2"
	},
	{
		id: "des-design-lead",
		title: "Design Lead",
		departmentId: "dept-design",
		level: "L5",
		grade: "M2"
	},
	{
		id: "des-spd",
		title: "Senior Product Designer",
		departmentId: "dept-design",
		level: "L4",
		grade: "IC4"
	},
	{
		id: "des-pd",
		title: "Product Designer",
		departmentId: "dept-design",
		level: "L3",
		grade: "IC3"
	},
	{
		id: "des-hr-head",
		title: "Head of Human Resources",
		departmentId: "dept-hr",
		level: "L6",
		grade: "M4"
	},
	{
		id: "des-hr-mgr",
		title: "HR Manager",
		departmentId: "dept-hr",
		level: "L5",
		grade: "M3"
	},
	{
		id: "des-hr-exec",
		title: "HR Executive",
		departmentId: "dept-hr",
		level: "L3",
		grade: "IC3"
	},
	{
		id: "des-ta-tl",
		title: "Talent Acquisition Lead",
		departmentId: "dept-hr",
		level: "L4",
		grade: "M2"
	},
	{
		id: "des-ta",
		title: "Talent Acquisition Specialist",
		departmentId: "dept-hr",
		level: "L3",
		grade: "IC3"
	},
	{
		id: "des-fin-mgr",
		title: "Finance Manager",
		departmentId: "dept-finance",
		level: "L5",
		grade: "M3"
	},
	{
		id: "des-payroll-spec",
		title: "Payroll Specialist",
		departmentId: "dept-finance",
		level: "L3",
		grade: "IC3"
	},
	{
		id: "des-accountant",
		title: "Accountant",
		departmentId: "dept-finance",
		level: "L3",
		grade: "IC3"
	},
	{
		id: "des-fin-analyst",
		title: "Financial Analyst",
		departmentId: "dept-finance",
		level: "L3",
		grade: "IC3"
	},
	{
		id: "des-sales-mgr",
		title: "Sales Manager",
		departmentId: "dept-sales",
		level: "L5",
		grade: "M3"
	},
	{
		id: "des-asm",
		title: "Senior Account Executive",
		departmentId: "dept-sales",
		level: "L4",
		grade: "IC4"
	},
	{
		id: "des-ae",
		title: "Account Executive",
		departmentId: "dept-sales",
		level: "L3",
		grade: "IC3"
	},
	{
		id: "des-sdr",
		title: "Sales Development Representative",
		departmentId: "dept-sales",
		level: "L2",
		grade: "IC2"
	},
	{
		id: "des-sales-ops",
		title: "Sales Operations Analyst",
		departmentId: "dept-sales",
		level: "L3",
		grade: "IC3"
	},
	{
		id: "des-mkt-mgr",
		title: "Marketing Manager",
		departmentId: "dept-marketing",
		level: "L5",
		grade: "M3"
	},
	{
		id: "des-content-lead",
		title: "Content Lead",
		departmentId: "dept-marketing",
		level: "L4",
		grade: "M2"
	},
	{
		id: "des-content-spec",
		title: "Content Specialist",
		departmentId: "dept-marketing",
		level: "L3",
		grade: "IC3"
	},
	{
		id: "des-perf-mkt",
		title: "Performance Marketing Specialist",
		departmentId: "dept-marketing",
		level: "L3",
		grade: "IC3"
	},
	{
		id: "des-mkt-assoc",
		title: "Marketing Associate",
		departmentId: "dept-marketing",
		level: "L2",
		grade: "IC2"
	},
	{
		id: "des-cs-mgr",
		title: "Customer Success Manager",
		departmentId: "dept-cs",
		level: "L5",
		grade: "M3"
	},
	{
		id: "des-csm",
		title: "Customer Success Executive",
		departmentId: "dept-cs",
		level: "L3",
		grade: "IC3"
	},
	{
		id: "des-support",
		title: "Support Specialist",
		departmentId: "dept-cs",
		level: "L2",
		grade: "IC2"
	},
	{
		id: "des-it-mgr",
		title: "IT Operations Manager",
		departmentId: "dept-itops",
		level: "L5",
		grade: "M3"
	},
	{
		id: "des-sysadmin",
		title: "Systems Administrator",
		departmentId: "dept-itops",
		level: "L3",
		grade: "IC3"
	},
	{
		id: "des-helpdesk",
		title: "Helpdesk Engineer",
		departmentId: "dept-itops",
		level: "L2",
		grade: "IC2"
	},
	{
		id: "des-legal-mgr",
		title: "Legal & Compliance Manager",
		departmentId: "dept-legal",
		level: "L5",
		grade: "M3"
	},
	{
		id: "des-legal-assoc",
		title: "Legal Associate",
		departmentId: "dept-legal",
		level: "L3",
		grade: "IC3"
	}
];
function getDesignationById(id) {
	return designations.find((designation) => designation.id === id);
}
// src/data/leaves.ts
var leaveTypes = [
	{
		id: "lt-casual",
		name: "Casual Leave",
		code: "CL",
		color: "#2563eb",
		annualQuota: 12,
		carryForward: false,
		requiresDocument: false,
		description: "Short planned absences for personal matters. Applied at least two days in advance."
	},
	{
		id: "lt-sick",
		name: "Sick Leave",
		code: "SL",
		color: "#f59e0b",
		annualQuota: 10,
		carryForward: true,
		requiresDocument: true,
		description: "Absence due to illness. A medical certificate is required for three or more consecutive days."
	},
	{
		id: "lt-earned",
		name: "Earned Leave",
		code: "EL",
		color: "#14b8a6",
		annualQuota: 18,
		carryForward: true,
		requiresDocument: false,
		description: "Planned annual leave accrued monthly. Up to 10 days may be carried forward."
	},
	{
		id: "lt-unpaid",
		name: "Leave Without Pay",
		code: "LWP",
		color: "#64748b",
		annualQuota: 0,
		carryForward: false,
		requiresDocument: false,
		description: "Unpaid leave used when paid balances are exhausted. Requires manager and HR approval."
	},
	{
		id: "lt-paternity",
		name: "Paternity Leave",
		code: "PL",
		color: "#8b5cf6",
		annualQuota: 10,
		carryForward: false,
		requiresDocument: true,
		description: "Paid leave for employees on the birth or adoption of a child, taken within six months."
	},
	{
		id: "lt-comp",
		name: "Compensatory Off",
		code: "CO",
		color: "#0ea5e9",
		annualQuota: 5,
		carryForward: false,
		requiresDocument: false,
		description: "Time off earned for approved weekend or public holiday work. Expires in 90 days."
	}
];
var leavePolicies = [
	{
		leaveTypeId: "lt-casual",
		accrual: "Credited annually (January)",
		maxConsecutiveDays: 4,
		noticePeriodDays: 2,
		allowHalfDay: true,
		policy: "Casual leave is intended for short personal errands. Requests above four consecutive days require HR approval."
	},
	{
		leaveTypeId: "lt-sick",
		accrual: "Credited annually (January)",
		maxConsecutiveDays: 10,
		noticePeriodDays: 0,
		allowHalfDay: true,
		policy: "Inform your manager on the first day of absence. Medical documentation is required beyond three consecutive days."
	},
	{
		leaveTypeId: "lt-earned",
		accrual: "1.5 days per completed month",
		maxConsecutiveDays: 15,
		noticePeriodDays: 14,
		allowHalfDay: true,
		policy: "Earned leave should be planned with your manager at least two weeks in advance. Carry forward up to 10 days."
	},
	{
		leaveTypeId: "lt-unpaid",
		accrual: "Not accrued",
		maxConsecutiveDays: 10,
		noticePeriodDays: 7,
		allowHalfDay: false,
		policy: "Leave without pay may be approved after paid balances are exhausted. Salary is pro-rated for unpaid days."
	},
	{
		leaveTypeId: "lt-paternity",
		accrual: "Credited on event",
		maxConsecutiveDays: 10,
		noticePeriodDays: 7,
		allowHalfDay: false,
		policy: "Supporting documentation is required. Leave must be completed within six months of the event."
	},
	{
		leaveTypeId: "lt-comp",
		accrual: "Earned per approved holiday work",
		maxConsecutiveDays: 2,
		noticePeriodDays: 2,
		allowHalfDay: true,
		policy: "Compensatory off must be used within 90 days of being credited and cannot be encashed."
	}
];
var leaveStatusCycle = [
	"Approved",
	"Approved",
	"Pending",
	"Approved",
	"Rejected",
	"Approved",
	"Pending",
	"Approved",
	"Approved",
	"Rejected",
	"Approved",
	"Pending",
	"Approved",
	"Approved"
];
var leaveReasons = [
	"Family function at native place.",
	"Medical consultation and recovery.",
	"Planned vacation with family.",
	"Personal errand and home maintenance.",
	"Attending a family wedding.",
	"Fever and throat infection — doctor advised rest.",
	"Childcare and school admission.",
	"Extended weekend trip.",
	"Relocation to a new apartment.",
	"Annual family holiday.",
	"Minor dental procedure.",
	"Parent’s health check-up."
];
function makeRequest(index, employeeId, startOffset, length, forcedStatus) {
	const start = addDays(new Date(2026, 8, 7), startOffset);
	const end = addDays(start, length - 1);
	const type = leaveTypes[index % leaveTypes.length];
	const status = forcedStatus ?? leaveStatusCycle[index % leaveStatusCycle.length];
	const applied = addDays(start, -Math.max(3, 5 + index % 8));
	return {
		id: `LV-${String(1001 + index)}`,
		employeeId,
		leaveTypeId: type.id,
		fromDate: format(start, "yyyy-MM-dd"),
		toDate: format(end, "yyyy-MM-dd"),
		days: differenceInCalendarDays(end, start) + 1,
		reason: leaveReasons[index % leaveReasons.length],
		appliedOn: format(applied, "yyyy-MM-dd"),
		status,
		approverId: status === "Pending" ? void 0 : status === "Rejected" ? "HZT-0002" : "HZT-0003",
		decidedOn: status === "Pending" ? void 0 : format(addDays(applied, 1), "yyyy-MM-dd"),
		note: status === "Rejected" ? "Team coverage unavailable during the requested period." : void 0
	};
}
var leaveRequests = [
	...[
		24,
		55,
		83,
		101,
		118
	].map((empIndex, i) => makeRequest(i, employees[empIndex].id, -3 + i, 3 + i % 3, "Approved")),
	...Array.from({ length: 30 }, (_, i) => {
		const employee = employees[(i * 7 + 12) % employees.length];
		return makeRequest(i + 10, employee.id, 2 + i * 2, 1 + i % 4);
	}),
	...Array.from({ length: 8 }, (_, i) => {
		const employee = employees[(i * 11 + 31) % employees.length];
		return makeRequest(i + 45, employee.id, 42 + i * 2, 1 + i % 3, "Pending");
	})
];
function computeLeaveBalances() {
	const balances = [];
	employees.forEach((employee, index) => {
		leaveTypes.forEach((type, typeIndex) => {
			if (type.id === "lt-unpaid") {
				balances.push({
					employeeId: employee.id,
					leaveTypeId: type.id,
					allocated: 0,
					used: 0,
					pending: 0
				});
				return;
			}
			const baseAllocated = type.id === "lt-paternity" ? employee.gender === "Male" ? 10 : 0 : type.annualQuota;
			const used = typeIndex === 0 ? index * 3 % 7 : typeIndex === 1 ? index * 2 % 5 : index * 5 % 11;
			balances.push({
				employeeId: employee.id,
				leaveTypeId: type.id,
				allocated: baseAllocated,
				used: Math.min(used, baseAllocated),
				pending: 0
			});
		});
	});
	leaveRequests.forEach((request) => {
		const balance = balances.find((b) => b.employeeId === request.employeeId && b.leaveTypeId === request.leaveTypeId);
		if (!balance) return;
		if (request.status === "Approved") balance.used = Math.min(balance.allocated, balance.used + request.days);
		if (request.status === "Pending") balance.pending += request.days;
	});
	return balances;
}
var leaveBalances = computeLeaveBalances();
function isEmployeeOnLeave(employeeId, date) {
	const target = parseISO(date);
	return leaveRequests.some((request) => request.employeeId === employeeId && request.status === "Approved" && parseISO(request.fromDate) <= target && parseISO(request.toDate) >= target);
}
// src/data/attendance.ts
var shifts = [
	{
		id: "shift-general",
		name: "General Shift",
		startTime: "09:00",
		endTime: "18:00",
		graceMinutes: 15,
		assignedCount: 0,
		days: "Monday – Friday"
	},
	{
		id: "shift-flexible",
		name: "Flexible Shift",
		startTime: "10:00",
		endTime: "19:00",
		graceMinutes: 30,
		assignedCount: 0,
		days: "Monday – Friday"
	},
	{
		id: "shift-early",
		name: "Early Support",
		startTime: "07:30",
		endTime: "16:30",
		graceMinutes: 15,
		assignedCount: 0,
		days: "Monday – Saturday"
	}
];
var holidays = [
	{
		id: "HOL-01",
		name: "New Year's Day",
		date: "2026-01-01",
		type: "Public"
	},
	{
		id: "HOL-02",
		name: "Makar Sankranti",
		date: "2026-01-15",
		type: "Optional"
	},
	{
		id: "HOL-03",
		name: "Republic Day",
		date: "2026-01-26",
		type: "Public"
	},
	{
		id: "HOL-04",
		name: "Holi",
		date: "2026-03-04",
		type: "Public"
	},
	{
		id: "HOL-05",
		name: "Eid-ul-Fitr",
		date: "2026-03-21",
		type: "Optional"
	},
	{
		id: "HOL-06",
		name: "Good Friday",
		date: "2026-04-03",
		type: "Optional"
	},
	{
		id: "HOL-07",
		name: "Tamil New Year",
		date: "2026-04-14",
		type: "Optional"
	},
	{
		id: "HOL-08",
		name: "May Day",
		date: "2026-05-01",
		type: "Public"
	},
	{
		id: "HOL-09",
		name: "Horizon Foundation Day",
		date: "2026-06-19",
		type: "Company"
	},
	{
		id: "HOL-10",
		name: "Independence Day",
		date: "2026-08-15",
		type: "Public"
	},
	{
		id: "HOL-11",
		name: "Gandhi Jayanti",
		date: "2026-10-02",
		type: "Public"
	},
	{
		id: "HOL-12",
		name: "Dussehra",
		date: "2026-10-20",
		type: "Public"
	},
	{
		id: "HOL-13",
		name: "Diwali",
		date: "2026-11-08",
		type: "Public"
	},
	{
		id: "HOL-14",
		name: "Christmas Day",
		date: "2026-12-25",
		type: "Public"
	},
	{
		id: "HOL-15",
		name: "Year-end Shutdown",
		date: "2026-12-31",
		type: "Company"
	},
	{
		id: "HOL-16",
		name: "New Year's Day",
		date: "2027-01-01",
		type: "Public"
	},
	{
		id: "HOL-17",
		name: "Republic Day",
		date: "2027-01-26",
		type: "Public"
	},
	{
		id: "HOL-18",
		name: "Holi",
		date: "2027-03-22",
		type: "Public"
	}
];
var holidayDates = new Map(holidays.map((h) => [h.date, h]));
var shiftAssignment = /* @__PURE__ */ new Map();
employees.forEach((employee, index) => {
	const shiftId = index % 17 === 0 ? "shift-early" : employee.shiftId;
	shiftAssignment.set(employee.id, shiftId);
	const shift = shifts.find((s) => s.id === shiftId);
	if (shift) shift.assignedCount += 1;
});
function timeFromMinutes(minutes) {
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function generateRecords() {
	const records = [];
	const start = new Date(2026, 7, 3);
	const end = DEMO_SNAPSHOT_DATE;
	const dates = [];
	for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) dates.push(new Date(d));
	employees.forEach((employee, empIndex) => {
		if (employee.status === "Inactive") return;
		const shiftId = shiftAssignment.get(employee.id) ?? "shift-general";
		const [startHour, startMinute] = (shifts.find((s) => s.id === shiftId) ?? shifts[0]).startTime.split(":").map(Number);
		const shiftStart = startHour * 60 + startMinute;
		dates.forEach((date) => {
			const dateStr = format(date, "yyyy-MM-dd");
			const day = date.getDay();
			let status = "Present";
			let checkIn = null;
			let checkOut = null;
			let workedHours = null;
			let note;
			if (day === 0 || day === 6) status = "Weekend";
			else if (holidayDates.has(dateStr)) status = "Holiday";
			else if (isEmployeeOnLeave(employee.id, dateStr)) status = "On Leave";
			else {
				const rand = mulberry32(empIndex * 7919 + date.getDate() * 131 + date.getMonth() * 977)();
				if (rand < .035) {
					status = "Absent";
					note = "No attendance recorded";
				} else if (rand < .075) {
					status = "Late";
					const minutes = shiftStart + 45 + Math.floor(rand * 400) % 40;
					checkIn = timeFromMinutes(minutes);
					checkOut = timeFromMinutes(minutes + 480 + Math.floor(rand * 100) % 40);
					workedHours = Number(((minutes + 480 - minutes) / 60).toFixed(1));
				} else if (rand < .095) {
					status = "Half Day";
					const minutes = shiftStart + Math.floor(rand * 20);
					checkIn = timeFromMinutes(minutes);
					checkOut = timeFromMinutes(minutes + 240);
					workedHours = 4;
				} else {
					const offset = Math.floor(rand * 100) % 26;
					const minutes = shiftStart - 12 + offset;
					checkIn = timeFromMinutes(minutes);
					const work = 485 + Math.floor(rand * 100) % 45;
					checkOut = timeFromMinutes(minutes + work);
					workedHours = Number((work / 60).toFixed(1));
				}
			}
			records.push({
				id: `ATT-${employee.id}-${dateStr}`,
				employeeId: employee.id,
				date: dateStr,
				checkIn,
				checkOut,
				status,
				workedHours,
				shiftId,
				note
			});
		});
	});
	return records;
}
var attendanceRecords = generateRecords();
var attendanceCorrections = [
	{
		id: "ACR-1001",
		employeeId: "HZT-0018",
		date: "2026-10-27",
		currentStatus: "Absent",
		requestedStatus: "Present",
		reason: "Biometric device at the Bengaluru office was offline. I was present and completed a full day.",
		requestedOn: "2026-10-28",
		status: "Pending"
	},
	{
		id: "ACR-1002",
		employeeId: "HZT-0042",
		date: "2026-10-23",
		currentStatus: "Late",
		requestedStatus: "Present",
		reason: "Cab delay due to a road closure. Check-in was recorded at 09:52.",
		requestedOn: "2026-10-24",
		status: "Pending"
	},
	{
		id: "ACR-1003",
		employeeId: "HZT-0067",
		date: "2026-10-21",
		currentStatus: "Half Day",
		requestedStatus: "Present",
		reason: "Approved half day was cancelled. I returned to work after lunch.",
		requestedOn: "2026-10-22",
		status: "Approved"
	},
	{
		id: "ACR-1004",
		employeeId: "HZT-0094",
		date: "2026-10-15",
		currentStatus: "Absent",
		requestedStatus: "On Leave",
		reason: "Approved sick leave was not reflected in attendance.",
		requestedOn: "2026-10-16",
		status: "Approved"
	},
	{
		id: "ACR-1005",
		employeeId: "HZT-0112",
		date: "2026-10-09",
		currentStatus: "Late",
		requestedStatus: "Present",
		reason: "Client call ran late the previous night; shift timings were adjusted by the manager.",
		requestedOn: "2026-10-10",
		status: "Rejected"
	},
	{
		id: "ACR-1006",
		employeeId: "HZT-0037",
		date: "2026-10-28",
		currentStatus: "Absent",
		requestedStatus: "Present",
		reason: "Forgot to tap out; access logs confirm presence.",
		requestedOn: "2026-10-29",
		status: "Pending"
	}
];
// src/data/payroll.ts
/**
* Illustrative payroll configuration for the demo.
*
* These values are NOT current statutory rates and must not be treated as
* legal or tax advice. In a production build this profile would be supplied
* by an effective-dated statutory rules service, versioned by financial year
* and state, with payroll calculations performed server-side.
*/
var statutoryConfig = {
	label: "Demo statutory profile",
	effectiveFrom: "2026-04-01",
	description: "Illustrative percentages used only to populate demonstration payslips.",
	pfEmployeeRate: .12,
	esiEmployeeRate: .0075,
	esiGrossThreshold: 21e3,
	professionalTaxMonthly: 200,
	illustrativeTdsRate: .1,
	tdsThresholdMonthly: 5e4
};
var levelBase = {
	L6: 6e6,
	L5: 36e5,
	L4: 24e5,
	L3: 14e5,
	L2: 75e4
};
var levelSpread = {
	L6: 28e5,
	L5: 16e5,
	L4: 8e5,
	L3: 4e5,
	L2: 2e5
};
function buildStructure(employeeId, annualCtc, effectiveFrom) {
	const monthlyGross = Math.round(annualCtc / 12 / 100) * 100;
	const basic = Math.round(monthlyGross * .4);
	const hra = Math.round(monthlyGross * .2);
	const conveyance = Math.round(monthlyGross * .05);
	const special = monthlyGross - basic - hra - conveyance;
	const earnings = [
		{
			id: `${employeeId}-basic`,
			name: "Basic Salary",
			type: "earning",
			amount: basic
		},
		{
			id: `${employeeId}-hra`,
			name: "House Rent Allowance",
			type: "earning",
			amount: hra
		},
		{
			id: `${employeeId}-special`,
			name: "Special Allowance",
			type: "earning",
			amount: special
		},
		{
			id: `${employeeId}-conveyance`,
			name: "Conveyance Allowance",
			type: "earning",
			amount: conveyance
		}
	];
	const pf = Math.round(basic * statutoryConfig.pfEmployeeRate);
	const esi = monthlyGross <= statutoryConfig.esiGrossThreshold ? Math.round(monthlyGross * statutoryConfig.esiEmployeeRate) : 0;
	const tds = monthlyGross > statutoryConfig.tdsThresholdMonthly ? Math.round(monthlyGross * statutoryConfig.illustrativeTdsRate) : 0;
	return {
		employeeId,
		annualCtc,
		effectiveFrom,
		earnings,
		deductions: [
			{
				id: `${employeeId}-pf`,
				name: "Provident Fund (Employee)",
				type: "deduction",
				amount: pf,
				statutory: true
			},
			{
				id: `${employeeId}-esi`,
				name: "ESI (Employee)",
				type: "deduction",
				amount: esi,
				statutory: true
			},
			{
				id: `${employeeId}-pt`,
				name: "Professional Tax",
				type: "deduction",
				amount: statutoryConfig.professionalTaxMonthly,
				statutory: true
			},
			{
				id: `${employeeId}-tds`,
				name: "TDS (Illustrative)",
				type: "deduction",
				amount: tds,
				statutory: true
			}
		]
	};
}
var salaryStructures = employees.map((employee, index) => {
	const level = getDesignationById(employee.designationId)?.level ?? "L3";
	const rand = mulberry32(index * 191 + 41)();
	const annualCtc = Math.round((levelBase[level] + rand * levelSpread[level]) / 1e3) * 1e3;
	const effectiveFrom = employee.dateOfJoining > "2026-04-01" ? employee.dateOfJoining : "2026-04-01";
	return buildStructure(employee.id, annualCtc, effectiveFrom);
});
function getSalaryStructure(employeeId) {
	return salaryStructures.find((structure) => structure.employeeId === employeeId);
}
var runPeriods = [
	{
		month: 4,
		year: 2026,
		status: "Paid",
		processedOn: "2026-04-30"
	},
	{
		month: 5,
		year: 2026,
		status: "Paid",
		processedOn: "2026-05-29"
	},
	{
		month: 6,
		year: 2026,
		status: "Paid",
		processedOn: "2026-06-30"
	},
	{
		month: 7,
		year: 2026,
		status: "Paid",
		processedOn: "2026-07-31"
	},
	{
		month: 8,
		year: 2026,
		status: "Paid",
		processedOn: "2026-08-31"
	},
	{
		month: 9,
		year: 2026,
		status: "Paid",
		processedOn: "2026-09-30"
	},
	{
		month: 10,
		year: 2026,
		status: "Draft"
	}
];
function makePayslip(employeeId, run, index) {
	const structure = getSalaryStructure(employeeId);
	const earnings = structure?.earnings.map((item) => ({ ...item })) ?? [];
	const deductions = structure?.deductions.map((item) => ({ ...item })) ?? [];
	const gross = earnings.reduce((sum, item) => sum + item.amount, 0);
	const totalDeductions = deductions.reduce((sum, item) => sum + item.amount, 0);
	return {
		id: `PAY-${run.id}-${employeeId}`,
		employeeId,
		payrollRunId: run.id,
		month: run.month,
		year: run.year,
		earnings,
		deductions,
		gross,
		totalDeductions,
		net: gross - totalDeductions,
		workingDays: 22,
		paidDays: 22 - (index % 7 === 0 ? 1 : 0),
		lop: index % 7 === 0 ? 1 : 0,
		status: run.status
	};
}
var payrollRuns = runPeriods.map((period) => {
	const label = format(new Date(period.year, period.month - 1, 1), "MMMM yyyy");
	return {
		id: `PR-${period.year}-${String(period.month).padStart(2, "0")}`,
		month: period.month,
		year: period.year,
		periodLabel: label,
		status: period.status,
		employeeCount: employees.filter((e) => e.status !== "Inactive").length,
		grossTotal: 0,
		deductionsTotal: 0,
		netTotal: 0,
		processedOn: period.processedOn
	};
});
var payslips = payrollRuns.flatMap((run) => employees.filter((employee) => employee.status !== "Inactive").map((employee, index) => makePayslip(employee.id, run, index)));
payrollRuns.forEach((run) => {
	const slips = payslips.filter((slip) => slip.payrollRunId === run.id);
	run.grossTotal = slips.reduce((sum, slip) => sum + slip.gross, 0);
	run.deductionsTotal = slips.reduce((sum, slip) => sum + slip.totalDeductions, 0);
	run.netTotal = slips.reduce((sum, slip) => sum + slip.net, 0);
});
payrollRuns[payrollRuns.length - 1];
// src/data/recruitment.ts
var jobOpenings = [
	{
		id: "JOB-1001",
		title: "Senior Software Engineer",
		departmentId: "dept-eng",
		location: "Hyderabad",
		employmentType: "Full-time",
		experienceMin: 5,
		experienceMax: 8,
		openings: 3,
		status: "Open",
		postedOn: "2026-09-18",
		hiringManagerId: "HZT-0003",
		description: "Build and scale the Horizon platform across web and API surfaces. You will own features end to end, mentor engineers and improve platform reliability.",
		salaryRange: "₹28L – ₹38L",
		skills: [
			"TypeScript",
			"React",
			"Node.js",
			"PostgreSQL"
		]
	},
	{
		id: "JOB-1002",
		title: "Product Manager",
		departmentId: "dept-product",
		location: "Bengaluru",
		employmentType: "Full-time",
		experienceMin: 4,
		experienceMax: 7,
		openings: 1,
		status: "Open",
		postedOn: "2026-09-25",
		hiringManagerId: "HZT-0051",
		description: "Own the HRMS product roadmap for mid-market customers. Partner with design and engineering to ship measurable outcomes.",
		salaryRange: "₹24L – ₹32L",
		skills: [
			"Product Strategy",
			"B2B SaaS",
			"Analytics"
		]
	},
	{
		id: "JOB-1003",
		title: "Product Designer",
		departmentId: "dept-design",
		location: "Pune",
		employmentType: "Full-time",
		experienceMin: 3,
		experienceMax: 6,
		openings: 1,
		status: "Open",
		postedOn: "2026-10-01",
		hiringManagerId: "HZT-0004",
		description: "Design intuitive enterprise workflows and contribute to the Horizon design system.",
		salaryRange: "₹18L – ₹26L",
		skills: [
			"Figma",
			"Design Systems",
			"User Research"
		]
	},
	{
		id: "JOB-1004",
		title: "HR Executive",
		departmentId: "dept-hr",
		location: "Hyderabad",
		employmentType: "Full-time",
		experienceMin: 2,
		experienceMax: 4,
		openings: 1,
		status: "On Hold",
		postedOn: "2026-09-12",
		hiringManagerId: "HZT-0002",
		description: "Support onboarding, employee lifecycle and engagement initiatives across India offices.",
		salaryRange: "₹7L – ₹10L",
		skills: [
			"HR Operations",
			"Onboarding",
			"Engagement"
		]
	},
	{
		id: "JOB-1005",
		title: "Enterprise Account Executive",
		departmentId: "dept-sales",
		location: "Bengaluru",
		employmentType: "Full-time",
		experienceMin: 5,
		experienceMax: 9,
		openings: 4,
		status: "Open",
		postedOn: "2026-09-05",
		hiringManagerId: "HZT-0009",
		description: "Own enterprise pipeline and close strategic HRMS deals across India.",
		salaryRange: "₹20L – ₹30L + variable",
		skills: [
			"Enterprise Sales",
			"SaaS",
			"Negotiation"
		]
	},
	{
		id: "JOB-1006",
		title: "Content Specialist",
		departmentId: "dept-marketing",
		location: "Bengaluru",
		employmentType: "Full-time",
		experienceMin: 2,
		experienceMax: 5,
		openings: 2,
		status: "Open",
		postedOn: "2026-10-06",
		hiringManagerId: "HZT-0010",
		description: "Create product-led content, customer stories and demand generation assets.",
		salaryRange: "₹9L – ₹14L",
		skills: [
			"Content Marketing",
			"SEO",
			"B2B Writing"
		]
	},
	{
		id: "JOB-1007",
		title: "Customer Success Executive",
		departmentId: "dept-cs",
		location: "Hyderabad",
		employmentType: "Full-time",
		experienceMin: 2,
		experienceMax: 5,
		openings: 3,
		status: "Open",
		postedOn: "2026-10-09",
		hiringManagerId: "HZT-0109",
		description: "Drive product adoption, renewals and customer health for enterprise accounts.",
		salaryRange: "₹8L – ₹13L",
		skills: [
			"Customer Success",
			"Account Management",
			"CRM"
		]
	},
	{
		id: "JOB-1008",
		title: "DevOps Engineer",
		departmentId: "dept-eng",
		location: "Hyderabad",
		employmentType: "Full-time",
		experienceMin: 3,
		experienceMax: 6,
		openings: 1,
		status: "Open",
		postedOn: "2026-10-12",
		hiringManagerId: "HZT-0003",
		description: "Own CI/CD, cloud infrastructure and observability for the Horizon platform.",
		salaryRange: "₹18L – ₹26L",
		skills: [
			"AWS",
			"Kubernetes",
			"Terraform"
		]
	},
	{
		id: "JOB-1009",
		title: "Payroll Specialist",
		departmentId: "dept-finance",
		location: "Chennai",
		employmentType: "Full-time",
		experienceMin: 2,
		experienceMax: 5,
		openings: 1,
		status: "Closed",
		postedOn: "2026-08-02",
		hiringManagerId: "HZT-0007",
		description: "Support monthly payroll inputs, reconciliations and employee payroll queries.",
		salaryRange: "₹7L – ₹11L",
		skills: [
			"Payroll",
			"Excel",
			"Compliance"
		]
	}
];
var candidates = [
	{
		first: "Nikhil",
		last: "Bhatia",
		jobId: "JOB-1001",
		stage: "Interview",
		source: "LinkedIn",
		exp: 6,
		company: "Infosys",
		rating: 4
	},
	{
		first: "Tanvi",
		last: "Mehta",
		jobId: "JOB-1001",
		stage: "Offer",
		source: "Referral",
		exp: 7,
		company: "Zoho",
		rating: 5
	},
	{
		first: "Siddharth",
		last: "Kulkarni",
		jobId: "JOB-1001",
		stage: "Screening",
		source: "Naukri",
		exp: 5,
		company: "Persistent Systems",
		rating: 3
	},
	{
		first: "Rhea",
		last: "Sen",
		jobId: "JOB-1001",
		stage: "Applied",
		source: "Career Site",
		exp: 5,
		company: "TCS",
		rating: 3
	},
	{
		first: "Kabir",
		last: "Malhotra",
		jobId: "JOB-1001",
		stage: "Rejected",
		source: "Agency",
		exp: 4,
		company: "Wipro",
		rating: 2
	},
	{
		first: "Nandini",
		last: "Rao",
		jobId: "JOB-1002",
		stage: "Interview",
		source: "LinkedIn",
		exp: 6,
		company: "Freshworks",
		rating: 4
	},
	{
		first: "Varun",
		last: "Shetty",
		jobId: "JOB-1002",
		stage: "Screening",
		source: "Referral",
		exp: 5,
		company: "Darwinbox",
		rating: 4
	},
	{
		first: "Pooja",
		last: "Agarwal",
		jobId: "JOB-1002",
		stage: "Applied",
		source: "Career Site",
		exp: 4,
		company: "Razorpay",
		rating: 3
	},
	{
		first: "Devika",
		last: "Pillai",
		jobId: "JOB-1003",
		stage: "Interview",
		source: "LinkedIn",
		exp: 5,
		company: "ThoughtWorks",
		rating: 5
	},
	{
		first: "Aman",
		last: "Chopra",
		jobId: "JOB-1003",
		stage: "Screening",
		source: "Referral",
		exp: 3,
		company: "Zeta",
		rating: 3
	},
	{
		first: "Leela",
		last: "Krishnan",
		jobId: "JOB-1003",
		stage: "Offer",
		source: "Career Site",
		exp: 4,
		company: "Atlassian",
		rating: 5
	},
	{
		first: "Ritesh",
		last: "Das",
		jobId: "JOB-1004",
		stage: "Screening",
		source: "Naukri",
		exp: 3,
		company: "Byju’s",
		rating: 3
	},
	{
		first: "Maya",
		last: "Bose",
		jobId: "JOB-1004",
		stage: "Applied",
		source: "Career Site",
		exp: 2,
		company: "Accenture",
		rating: 2
	},
	{
		first: "Rahul",
		last: "Chauhan",
		jobId: "JOB-1005",
		stage: "Interview",
		source: "LinkedIn",
		exp: 8,
		company: "Darwinbox",
		rating: 5
	},
	{
		first: "Shreya",
		last: "Kapoor",
		jobId: "JOB-1005",
		stage: "Offer",
		source: "Referral",
		exp: 7,
		company: "Salesforce",
		rating: 5
	},
	{
		first: "Vivek",
		last: "Nair",
		jobId: "JOB-1005",
		stage: "Screening",
		source: "Naukri",
		exp: 6,
		company: "Zoho",
		rating: 4
	},
	{
		first: "Anjali",
		last: "Singh",
		jobId: "JOB-1005",
		stage: "Applied",
		source: "Career Site",
		exp: 5,
		company: "Adobe",
		rating: 3
	},
	{
		first: "Manish",
		last: "Yadav",
		jobId: "JOB-1005",
		stage: "Hired",
		source: "Referral",
		exp: 9,
		company: "SAP",
		rating: 5
	},
	{
		first: "Ira",
		last: "Banerjee",
		jobId: "JOB-1005",
		stage: "Rejected",
		source: "Agency",
		exp: 4,
		company: "Oracle",
		rating: 2
	},
	{
		first: "Karan",
		last: "Tiwari",
		jobId: "JOB-1006",
		stage: "Interview",
		source: "LinkedIn",
		exp: 4,
		company: "CleverTap",
		rating: 4
	},
	{
		first: "Naina",
		last: "Joshi",
		jobId: "JOB-1006",
		stage: "Screening",
		source: "Career Site",
		exp: 3,
		company: "MoEngage",
		rating: 4
	},
	{
		first: "Arnav",
		last: "Pandey",
		jobId: "JOB-1006",
		stage: "Applied",
		source: "Naukri",
		exp: 2,
		company: "HCL",
		rating: 3
	},
	{
		first: "Sanya",
		last: "Mukherjee",
		jobId: "JOB-1007",
		stage: "Interview",
		source: "LinkedIn",
		exp: 4,
		company: "Chargebee",
		rating: 4
	},
	{
		first: "Harsh",
		last: "Patil",
		jobId: "JOB-1007",
		stage: "Screening",
		source: "Referral",
		exp: 3,
		company: "Zycus",
		rating: 4
	},
	{
		first: "Roshni",
		last: "Iyer",
		jobId: "JOB-1007",
		stage: "Applied",
		source: "Career Site",
		exp: 2,
		company: "Wipro",
		rating: 3
	},
	{
		first: "Deepak",
		last: "Ghosh",
		jobId: "JOB-1007",
		stage: "Hired",
		source: "Naukri",
		exp: 3,
		company: "TCS",
		rating: 5
	},
	{
		first: "Yash",
		last: "Saxena",
		jobId: "JOB-1008",
		stage: "Interview",
		source: "LinkedIn",
		exp: 5,
		company: "Nutanix",
		rating: 4
	},
	{
		first: "Mitali",
		last: "Reddy",
		jobId: "JOB-1008",
		stage: "Screening",
		source: "Referral",
		exp: 4,
		company: "Druva",
		rating: 4
	},
	{
		first: "Pranay",
		last: "Verma",
		jobId: "JOB-1008",
		stage: "Applied",
		source: "Career Site",
		exp: 3,
		company: "Infosys",
		rating: 3
	},
	{
		first: "Bhavna",
		last: "Shah",
		jobId: "JOB-1009",
		stage: "Hired",
		source: "Referral",
		exp: 4,
		company: "ADP",
		rating: 5
	},
	{
		first: "Tejas",
		last: "Hegde",
		jobId: "JOB-1009",
		stage: "Rejected",
		source: "Naukri",
		exp: 3,
		company: "PayrollCo",
		rating: 2
	}
].map((spec, index) => ({
	id: `CND-${2001 + index}`,
	jobId: spec.jobId,
	firstName: spec.first,
	lastName: spec.last,
	email: `${spec.first.toLowerCase()}.${spec.last.toLowerCase()}@examplemail.example`,
	phone: `+91 9${String(81e7 + index * 311).slice(0, 9)}`,
	location: [
		"Hyderabad",
		"Bengaluru",
		"Pune",
		"Chennai",
		"Mumbai",
		"Delhi NCR"
	][index % 6],
	source: spec.source,
	stage: spec.stage,
	appliedOn: format(addDays(new Date(2026, 9, 20), -(index % 28)), "yyyy-MM-dd"),
	experienceYears: spec.exp,
	currentCompany: spec.company,
	expectedCtc: 8e5 + spec.exp * 2e5 + index % 5 * 5e4,
	rating: spec.rating,
	notes: spec.stage === "Offer" ? "Offer discussion in progress. Awaiting candidate response on compensation and joining date." : spec.stage === "Interview" ? "Strong technical signal. Panel feedback pending from the second round." : void 0
}));
var interviews = candidates.filter((candidate) => candidate.stage === "Interview").slice(0, 6).map((candidate, index) => {
	return {
		id: `INT-${3001 + index}`,
		candidateId: candidate.id,
		jobId: candidate.jobId,
		round: index % 3 === 0 ? "Technical Round 2" : index % 3 === 1 ? "Hiring Manager Round" : "Culture & Values Round",
		date: format(addDays(new Date(2026, 9, 30), index % 5 + 1), "yyyy-MM-dd"),
		time: [
			"10:00 AM",
			"11:30 AM",
			"02:00 PM",
			"03:30 PM",
			"04:00 PM"
		][index % 5],
		mode: index % 2 === 0 ? "Video" : "In person",
		interviewer: index % 2 === 0 ? "Rohan Iyer" : "Priya Menon",
		status: index === 5 ? "Completed" : "Scheduled",
		feedback: index === 5 ? "Solid communication and strong domain depth. Recommended for the next round." : void 0
	};
});
// src/data/performance.ts
var appraisalCycles = [
	{
		id: "CYC-2026-H1",
		name: "H1 2026 Performance Review",
		period: "Apr 2026 – Sep 2026",
		startDate: "2026-04-01",
		endDate: "2026-09-30",
		status: "Completed"
	},
	{
		id: "CYC-2026-H2",
		name: "H2 2026 Performance Review",
		period: "Oct 2026 – Mar 2027",
		startDate: "2026-10-01",
		endDate: "2027-03-31",
		status: "Active"
	},
	{
		id: "CYC-2027-H1",
		name: "H1 2027 Performance Review",
		period: "Apr 2027 – Sep 2027",
		startDate: "2027-04-01",
		endDate: "2027-09-30",
		status: "Draft"
	}
];
var goalTemplates = [
	{
		title: "Deliver quarterly roadmap commitments",
		description: "Ship all committed roadmap milestones for the active quarter with agreed quality gates.",
		category: "Delivery",
		target: "100% of committed milestones"
	},
	{
		title: "Improve customer satisfaction score",
		description: "Increase the account-level CSAT through proactive engagement and faster resolution.",
		category: "Customer",
		target: "CSAT ≥ 4.5 / 5"
	},
	{
		title: "Reduce release cycle time",
		description: "Shorten the median time from code complete to production using pipeline improvements.",
		category: "Engineering",
		target: "Median ≤ 3 days"
	},
	{
		title: "Complete certification or learning path",
		description: "Finish the agreed professional certification and share learnings with the team.",
		category: "Learning",
		target: "Certification completed"
	},
	{
		title: "Mentor two team members",
		description: "Run structured mentoring with clear development plans and monthly check-ins.",
		category: "People",
		target: "2 mentees with documented plans"
	},
	{
		title: "Improve process documentation coverage",
		description: "Document critical workflows and ensure the team can operate without key-person dependency.",
		category: "Process",
		target: "All critical flows documented"
	},
	{
		title: "Drive cost optimisation initiative",
		description: "Identify and implement measurable savings within the assigned function.",
		category: "Business",
		target: "₹5L annualised savings"
	},
	{
		title: "Increase qualified pipeline",
		description: "Build a healthy top-of-funnel pipeline for the assigned territory and segment.",
		category: "Revenue",
		target: "₹4Cr qualified pipeline"
	}
];
var goalStatuses = [
	"On Track",
	"On Track",
	"Completed",
	"At Risk",
	"Not Started",
	"On Track"
];
var goals = employees.flatMap((employee, employeeIndex) => {
	if (employeeIndex >= 40) return [];
	const count = 2 + employeeIndex % 3;
	return Array.from({ length: count }, (_, goalIndex) => {
		const template = goalTemplates[(employeeIndex + goalIndex) % goalTemplates.length];
		const progress = [
			25,
			45,
			60,
			75,
			90,
			100
		][(employeeIndex + goalIndex * 2) % 6];
		return {
			id: `GOAL-${employee.id}-${goalIndex + 1}`,
			employeeId: employee.id,
			title: template.title,
			description: template.description,
			category: template.category,
			weight: count === 2 ? 50 : goalIndex === 0 ? 40 : 30,
			target: template.target,
			progress,
			dueDate: `2027-03-31`,
			status: progress === 100 ? "Completed" : goalStatuses[(employeeIndex + goalIndex) % goalStatuses.length]
		};
	});
});
var reviewSummaries = [
	"Consistently delivers high-quality work and is a strong collaborator across teams.",
	"Exceeded delivery targets this cycle. Next focus area is broader stakeholder communication.",
	"Solid technical contribution with visible growth in ownership. Continue building mentoring capability.",
	"Reliable execution and strong customer empathy. Recommend increasing scope in the next cycle.",
	"Strong people leadership and clear prioritisation. Continue improving cross-functional planning.",
	"Good progress on individual goals. Recommend sharper focus on measurable outcomes next cycle."
];
var reviews = employees.slice(0, 24).flatMap((employee, index) => {
	const selfStatus = index % 4 === 0 ? "Pending" : "Completed";
	const managerStatus = index % 3 === 0 ? "In Progress" : "Completed";
	return [{
		id: `REV-SELF-${employee.id}`,
		employeeId: employee.id,
		cycleId: "CYC-2026-H2",
		reviewerId: employee.id,
		type: "Self",
		rating: 3 + index % 3,
		status: selfStatus,
		submittedOn: selfStatus === "Completed" ? "2026-10-24" : void 0,
		summary: selfStatus === "Completed" ? "Shared progress against goals and areas where I would like more support." : void 0
	}, {
		id: `REV-MGR-${employee.id}`,
		employeeId: employee.id,
		cycleId: "CYC-2026-H2",
		reviewerId: employee.managerId ?? "HZT-0001",
		type: "Manager",
		rating: 3 + (index + 1) % 3,
		status: managerStatus,
		submittedOn: managerStatus === "Completed" ? "2026-10-27" : void 0,
		summary: managerStatus === "Completed" ? reviewSummaries[index % reviewSummaries.length] : void 0
	}];
});
var feedback = [
	{
		id: "FB-4001",
		employeeId: "HZT-0005",
		fromId: "HZT-0003",
		date: "2026-10-24",
		type: "Praise",
		message: "Great work leading the accessibility audit. The resulting fixes were shipped ahead of schedule and improved the platform for every customer.",
		rating: 5
	},
	{
		id: "FB-4002",
		employeeId: "HZT-0006",
		fromId: "HZT-0002",
		date: "2026-10-21",
		type: "Praise",
		message: "The October onboarding cohort was one of our smoothest yet. Clear communication with every stakeholder involved.",
		rating: 5
	},
	{
		id: "FB-4003",
		employeeId: "HZT-0004",
		fromId: "HZT-0001",
		date: "2026-10-18",
		type: "Check-in",
		message: "Let us review the design system roadmap next week and align on the Q3 priorities."
	},
	{
		id: "FB-4004",
		employeeId: "HZT-0018",
		fromId: "HZT-0003",
		date: "2026-10-15",
		type: "Constructive",
		message: "Good progress on the API migration. Please include rollout risks earlier in the design review so the team can plan dependencies.",
		rating: 3
	},
	{
		id: "FB-4005",
		employeeId: "HZT-0094",
		fromId: "HZT-0009",
		date: "2026-10-12",
		type: "Praise",
		message: "Excellent recovery on the enterprise renewal conversation. The customer specifically called out your preparation and follow-through.",
		rating: 5
	},
	{
		id: "FB-4006",
		employeeId: "HZT-0051",
		fromId: "HZT-0003",
		date: "2026-10-08",
		type: "Check-in",
		message: "Monthly product-engineering sync is working well. Let us add a short customer signal review to the agenda."
	},
	{
		id: "FB-4007",
		employeeId: "HZT-0022",
		fromId: "HZT-0004",
		date: "2026-10-04",
		type: "Constructive",
		message: "Strong visual craft. Tighten the handoff notes so engineering can estimate without additional clarification cycles.",
		rating: 3
	}
];
var currentCycle = appraisalCycles[1];
// src/data/expenses.ts
var expenseCategories = [
	{
		id: "exp-travel",
		name: "Travel",
		limit: 25e3,
		description: "Airfare, rail, cabs and local transport for approved business travel."
	},
	{
		id: "exp-accommodation",
		name: "Accommodation",
		limit: 12e3,
		description: "Hotel stays for approved business travel."
	},
	{
		id: "exp-meals",
		name: "Meals",
		limit: 2500,
		description: "Meals during business travel or approved overtime."
	},
	{
		id: "exp-client",
		name: "Client Entertainment",
		limit: 15e3,
		description: "Customer meetings and approved business entertainment."
	},
	{
		id: "exp-telecom",
		name: "Telecom & Internet",
		limit: 3e3,
		description: "Monthly mobile or home internet reimbursement."
	},
	{
		id: "exp-software",
		name: "Software & Tools",
		limit: 2e4,
		description: "Approved productivity or development tools."
	},
	{
		id: "exp-supplies",
		name: "Office Supplies",
		limit: 5e3,
		description: "Work-from-home equipment and office supplies."
	},
	{
		id: "exp-training",
		name: "Training & Certification",
		limit: 4e4,
		description: "Approved courses, certifications and conferences."
	}
];
var expenseClaims = [
	{
		employeeIndex: 8,
		categoryId: "exp-travel",
		title: "Client visit — Mumbai",
		amount: 12480,
		status: "Reimbursed",
		receipt: "mumbai_airfare_receipt.pdf",
		description: "Return airfare and airport transfer for the Q3 enterprise renewal meeting.",
		day: 2
	},
	{
		employeeIndex: 12,
		categoryId: "exp-client",
		title: "Customer dinner — Bengaluru",
		amount: 6840,
		status: "Approved",
		receipt: "customer_dinner.jpg",
		description: "Business dinner with the evaluation committee for the Meridian account.",
		day: 6
	},
	{
		employeeIndex: 18,
		categoryId: "exp-software",
		title: "Figma annual subscription",
		amount: 9600,
		status: "Pending",
		receipt: "figma_invoice.pdf",
		description: "Annual design seat renewal for the product design team.",
		day: 12
	},
	{
		employeeIndex: 22,
		categoryId: "exp-meals",
		title: "Team lunch — release celebration",
		amount: 3200,
		status: "Approved",
		receipt: "team_lunch_receipt.pdf",
		description: "Team lunch following the successful October platform release.",
		day: 14
	},
	{
		employeeIndex: 27,
		categoryId: "exp-telecom",
		title: "October broadband reimbursement",
		amount: 1499,
		status: "Reimbursed",
		receipt: "broadband_bill_oct.pdf",
		description: "Monthly home internet reimbursement for remote work.",
		day: 3
	},
	{
		employeeIndex: 31,
		categoryId: "exp-accommodation",
		title: "Hyderabad stay — onboarding",
		amount: 8700,
		status: "Pending",
		receipt: "hotel_invoice.pdf",
		description: "Two-night stay during the new-hire onboarding programme.",
		day: 20
	},
	{
		employeeIndex: 36,
		categoryId: "exp-training",
		title: "AWS Solutions Architect exam",
		amount: 15e3,
		status: "Approved",
		receipt: "aws_exam_receipt.pdf",
		description: "Certification exam fee for the platform engineering team.",
		day: 9
	},
	{
		employeeIndex: 41,
		categoryId: "exp-supplies",
		title: "Ergonomic keyboard and mouse",
		amount: 4250,
		status: "Rejected",
		receipt: "keyboard_invoice.pdf",
		description: "Ergonomic peripherals for the Bengaluru workstation.",
		day: 8
	},
	{
		employeeIndex: 47,
		categoryId: "exp-travel",
		title: "Pune to Hyderabad — candidate interviews",
		amount: 7350,
		status: "Approved",
		receipt: "rail_ticket.pdf",
		description: "Travel for the engineering hiring drive at the Hyderabad office.",
		day: 11
	},
	{
		employeeIndex: 53,
		categoryId: "exp-meals",
		title: "Late-night release support meals",
		amount: 1860,
		status: "Pending",
		receipt: "meal_bill.jpg",
		description: "Dinner for the on-call team during the October release window.",
		day: 21
	},
	{
		employeeIndex: 58,
		categoryId: "exp-client",
		title: "Customer workshop — Chennai",
		amount: 11200,
		status: "Reimbursed",
		receipt: "workshop_receipt.pdf",
		description: "Venue and refreshments for the customer success workshop.",
		day: 4
	},
	{
		employeeIndex: 64,
		categoryId: "exp-software",
		title: "Postman Team plan",
		amount: 7200,
		status: "Approved",
		receipt: "postman_invoice.pdf",
		description: "API tooling subscription for the engineering team.",
		day: 13
	},
	{
		employeeIndex: 69,
		categoryId: "exp-supplies",
		title: "Home office chair",
		amount: 8900,
		status: "Pending",
		receipt: "chair_invoice.pdf",
		description: "Approved work-from-home furniture allowance.",
		day: 22
	},
	{
		employeeIndex: 74,
		categoryId: "exp-telecom",
		title: "Mobile reimbursement — September",
		amount: 1200,
		status: "Reimbursed",
		receipt: "mobile_bill_sep.pdf",
		description: "Monthly mobile reimbursement.",
		day: 1
	},
	{
		employeeIndex: 79,
		categoryId: "exp-travel",
		title: "Recruitment drive travel",
		amount: 5480,
		status: "Approved",
		receipt: "cab_receipts.pdf",
		description: "Local transport during the campus hiring drive.",
		day: 16
	},
	{
		employeeIndex: 84,
		categoryId: "exp-training",
		title: "Design leadership workshop",
		amount: 22e3,
		status: "Pending",
		receipt: "workshop_invoice.pdf",
		description: "Two-day design leadership programme in Mumbai.",
		day: 19
	},
	{
		employeeIndex: 89,
		categoryId: "exp-client",
		title: "Prospect lunch — Gurugram",
		amount: 4350,
		status: "Pending",
		receipt: "lunch_receipt.jpg",
		description: "Business development lunch with a prospective enterprise customer.",
		day: 23
	},
	{
		employeeIndex: 95,
		categoryId: "exp-meals",
		title: "Customer visit refreshments",
		amount: 980,
		status: "Approved",
		receipt: "cafe_receipt.jpg",
		description: "Refreshments for an on-site customer review.",
		day: 17
	},
	{
		employeeIndex: 101,
		categoryId: "exp-accommodation",
		title: "Bengaluru offsite stay",
		amount: 10400,
		status: "Pending",
		receipt: "offsite_hotel.pdf",
		description: "Accommodation for the marketing planning offsite.",
		day: 24
	},
	{
		employeeIndex: 107,
		categoryId: "exp-supplies",
		title: "Whiteboard and stationery",
		amount: 2100,
		status: "Approved",
		receipt: "stationery_bill.pdf",
		description: "Planning supplies for the customer success team room.",
		day: 10
	},
	{
		employeeIndex: 112,
		categoryId: "exp-software",
		title: "Analytics dashboard tool",
		amount: 12500,
		status: "Pending",
		receipt: "analytics_invoice.pdf",
		description: "Monthly analytics platform subscription for the support team.",
		day: 25
	},
	{
		employeeIndex: 118,
		categoryId: "exp-travel",
		title: "Office visit — Hyderabad HQ",
		amount: 3980,
		status: "Approved",
		receipt: "train_ticket.pdf",
		description: "Quarterly in-person planning at the headquarters.",
		day: 7
	}
].map((spec, index) => {
	const employee = employees[spec.employeeIndex % employees.length];
	const submitted = addDays(new Date(2026, 9, 26), -spec.day);
	const category = expenseCategories.find((c) => c.id === spec.categoryId);
	return {
		id: `EXP-${5001 + index}`,
		employeeId: employee.id,
		categoryId: spec.categoryId,
		title: spec.title,
		amount: spec.amount,
		date: format(addDays(submitted, -2), "yyyy-MM-dd"),
		submittedOn: format(submitted, "yyyy-MM-dd"),
		status: spec.status,
		description: spec.description,
		receiptName: spec.receipt ?? (category ? `${category.id.replace("exp-", "")}_receipt.pdf` : void 0),
		approvedBy: spec.status === "Approved" || spec.status === "Reimbursed" ? employee.managerId ?? "HZT-0002" : void 0,
		reimbursedOn: spec.status === "Reimbursed" ? format(addDays(submitted, 6), "yyyy-MM-dd") : void 0
	};
});
// src/data/audit.ts
var auditLogs = [
	{
		id: "AUD-9001",
		actor: "Priya Menon",
		actorRole: "HR Admin",
		action: "Approved leave request",
		module: "Leave",
		target: "LV-1012 · Aditi Sharma",
		timestamp: "2026-10-30T09:51:00",
		ipAddress: "10.24.8.14"
	},
	{
		id: "AUD-9002",
		actor: "Meera Joshi",
		actorRole: "Payroll Admin",
		action: "Generated payroll preview",
		module: "Payroll",
		target: "October 2026 payroll run",
		timestamp: "2026-10-30T08:20:00",
		ipAddress: "10.24.11.32"
	},
	{
		id: "AUD-9003",
		actor: "Sneha Reddy",
		actorRole: "HR Executive",
		action: "Updated employee record",
		module: "Employees",
		target: "HZT-0067 · Ananya Deshpande",
		timestamp: "2026-10-29T18:04:00",
		ipAddress: "10.24.8.27"
	},
	{
		id: "AUD-9004",
		actor: "Rohan Iyer",
		actorRole: "Manager",
		action: "Submitted performance feedback",
		module: "Performance",
		target: "HZT-0005 · Arjun Nair",
		timestamp: "2026-10-29T16:45:00",
		ipAddress: "10.24.9.61"
	},
	{
		id: "AUD-9005",
		actor: "Kavita Rao",
		actorRole: "Super Admin",
		action: "Updated permission matrix",
		module: "Administration",
		target: "Role · HR Executive",
		timestamp: "2026-10-29T15:12:00",
		ipAddress: "10.24.2.8"
	},
	{
		id: "AUD-9006",
		actor: "Priya Menon",
		actorRole: "HR Admin",
		action: "Created job opening",
		module: "Recruitment",
		target: "JOB-1008 · DevOps Engineer",
		timestamp: "2026-10-29T12:30:00",
		ipAddress: "10.24.8.14"
	},
	{
		id: "AUD-9007",
		actor: "Aditya Verma",
		actorRole: "Manager",
		action: "Rejected expense claim",
		module: "Expenses",
		target: "EXP-5008 · ₹4,250",
		timestamp: "2026-10-29T11:16:00",
		ipAddress: "10.24.12.44"
	},
	{
		id: "AUD-9008",
		actor: "System",
		actorRole: "Automation",
		action: "Sent payroll reminder",
		module: "Payroll",
		target: "12 pending inputs",
		timestamp: "2026-10-29T07:00:00",
		ipAddress: "—"
	},
	{
		id: "AUD-9009",
		actor: "Kavita Rao",
		actorRole: "Super Admin",
		action: "Invited system user",
		module: "User Management",
		target: "dev.patel@horizontech.example",
		timestamp: "2026-10-28T17:40:00",
		ipAddress: "10.24.2.8"
	},
	{
		id: "AUD-9010",
		actor: "Priya Menon",
		actorRole: "HR Admin",
		action: "Deactivated employee",
		module: "Employees",
		target: "HZT-0048 · Sahil Bhatt",
		timestamp: "2026-10-28T14:22:00",
		ipAddress: "10.24.8.14"
	},
	{
		id: "AUD-9011",
		actor: "Meera Joshi",
		actorRole: "Payroll Admin",
		action: "Exported bank transfer file (demo)",
		module: "Payroll",
		target: "September 2026 payroll run",
		timestamp: "2026-10-28T11:05:00",
		ipAddress: "10.24.11.32"
	},
	{
		id: "AUD-9012",
		actor: "Sneha Reddy",
		actorRole: "HR Executive",
		action: "Scheduled interview",
		module: "Recruitment",
		target: "CND-2010 · Devika Pillai",
		timestamp: "2026-10-28T10:14:00",
		ipAddress: "10.24.8.27"
	},
	{
		id: "AUD-9013",
		actor: "Rohan Iyer",
		actorRole: "Manager",
		action: "Approved attendance correction",
		module: "Attendance",
		target: "ACR-1003 · HZT-0067",
		timestamp: "2026-10-27T17:32:00",
		ipAddress: "10.24.9.61"
	},
	{
		id: "AUD-9014",
		actor: "Priya Menon",
		actorRole: "HR Admin",
		action: "Updated leave policy",
		module: "Settings",
		target: "Earned Leave · carry forward",
		timestamp: "2026-10-27T15:48:00",
		ipAddress: "10.24.8.14"
	},
	{
		id: "AUD-9015",
		actor: "System",
		actorRole: "Automation",
		action: "Created work anniversary digest",
		module: "Dashboard",
		target: "5 employees this week",
		timestamp: "2026-10-27T06:30:00",
		ipAddress: "—"
	},
	{
		id: "AUD-9016",
		actor: "Karthik Subramanian",
		actorRole: "Manager",
		action: "Approved expense claim",
		module: "Expenses",
		target: "EXP-5002 · ₹6,840",
		timestamp: "2026-10-26T18:20:00",
		ipAddress: "10.24.10.19"
	},
	{
		id: "AUD-9017",
		actor: "Sneha Reddy",
		actorRole: "HR Executive",
		action: "Added employee document",
		module: "Employees",
		target: "HZT-0012 · Offer Letter",
		timestamp: "2026-10-26T13:10:00",
		ipAddress: "10.24.8.27"
	},
	{
		id: "AUD-9018",
		actor: "Kavita Rao",
		actorRole: "Super Admin",
		action: "Enabled MFA requirement",
		module: "Administration",
		target: "All admin roles",
		timestamp: "2026-10-25T16:00:00",
		ipAddress: "10.24.2.8"
	},
	{
		id: "AUD-9019",
		actor: "System",
		actorRole: "Automation",
		action: "Archived payroll run",
		module: "Payroll",
		target: "August 2026 payroll run",
		timestamp: "2026-10-25T02:00:00",
		ipAddress: "—"
	},
	{
		id: "AUD-9020",
		actor: "Priya Menon",
		actorRole: "HR Admin",
		action: "Added holiday to calendar",
		module: "Settings",
		target: "Diwali · 8 Nov 2026",
		timestamp: "2026-10-24T12:44:00",
		ipAddress: "10.24.8.14"
	},
	{
		id: "AUD-9021",
		actor: "Rohan Iyer",
		actorRole: "Manager",
		action: "Updated employee goals",
		module: "Performance",
		target: "HZT-0018 · Platform stability",
		timestamp: "2026-10-23T15:25:00",
		ipAddress: "10.24.9.61"
	},
	{
		id: "AUD-9022",
		actor: "Meera Joshi",
		actorRole: "Payroll Admin",
		action: "Viewed salary structure",
		module: "Payroll",
		target: "HZT-0024 · Restricted",
		timestamp: "2026-10-23T10:05:00",
		ipAddress: "10.24.11.32"
	}
];
// src/data/users.ts
var systemUsers = [
	{
		id: "USR-001",
		employeeId: "HZT-0001",
		name: "Vikram Rao",
		email: "vikram.rao@horizontech.example",
		role: "super-admin",
		status: "Active",
		lastActive: "2026-10-30T09:10:00",
		mfaEnabled: true
	},
	{
		id: "USR-002",
		employeeId: "HZT-0002",
		name: "Priya Menon",
		email: "priya.menon@horizontech.example",
		role: "hr-admin",
		status: "Active",
		lastActive: "2026-10-30T09:51:00",
		mfaEnabled: true
	},
	{
		id: "USR-003",
		employeeId: "HZT-0006",
		name: "Sneha Reddy",
		email: "sneha.reddy@horizontech.example",
		role: "hr-executive",
		status: "Active",
		lastActive: "2026-10-29T18:04:00",
		mfaEnabled: true
	},
	{
		id: "USR-004",
		employeeId: "HZT-0003",
		name: "Rohan Iyer",
		email: "rohan.iyer@horizontech.example",
		role: "manager",
		status: "Active",
		lastActive: "2026-10-29T16:45:00",
		mfaEnabled: true
	},
	{
		id: "USR-005",
		employeeId: "HZT-0008",
		name: "Meera Joshi",
		email: "meera.joshi@horizontech.example",
		role: "payroll-admin",
		status: "Active",
		lastActive: "2026-10-30T08:20:00",
		mfaEnabled: true
	},
	{
		id: "USR-006",
		employeeId: "HZT-0005",
		name: "Arjun Nair",
		email: "arjun.nair@horizontech.example",
		role: "employee",
		status: "Active",
		lastActive: "2026-10-30T08:55:00",
		mfaEnabled: false
	},
	{
		id: "USR-007",
		employeeId: "HZT-0009",
		name: "Aditya Verma",
		email: "aditya.verma@horizontech.example",
		role: "manager",
		status: "Active",
		lastActive: "2026-10-29T19:22:00",
		mfaEnabled: true
	},
	{
		id: "USR-008",
		employeeId: null,
		name: "Kavita Rao",
		email: "kavita.rao@horizontech.example",
		role: "super-admin",
		status: "Active",
		lastActive: "2026-10-29T15:12:00",
		mfaEnabled: true
	},
	{
		id: "USR-009",
		employeeId: null,
		name: "Dev Patel",
		email: "dev.patel@horizontech.example",
		role: "hr-executive",
		status: "Invited",
		lastActive: "—",
		mfaEnabled: false
	},
	{
		id: "USR-010",
		employeeId: null,
		name: "Farah Khan",
		email: "farah.khan@horizontech.example",
		role: "payroll-admin",
		status: "Suspended",
		lastActive: "2026-09-14T11:30:00",
		mfaEnabled: false
	}
];
var roleMatrix = [
	{
		module: "Employees",
		superAdmin: "Full",
		hrAdmin: "Full",
		hrExecutive: "Edit",
		manager: "Team view",
		payrollAdmin: "View",
		employee: "Self"
	},
	{
		module: "Organization",
		superAdmin: "Full",
		hrAdmin: "Full",
		hrExecutive: "Edit",
		manager: "View",
		payrollAdmin: "View",
		employee: "View"
	},
	{
		module: "Recruitment",
		superAdmin: "Full",
		hrAdmin: "Full",
		hrExecutive: "Full",
		manager: "View",
		payrollAdmin: "None",
		employee: "None"
	},
	{
		module: "Attendance",
		superAdmin: "Full",
		hrAdmin: "Full",
		hrExecutive: "Edit",
		manager: "Team approvals",
		payrollAdmin: "View",
		employee: "Self"
	},
	{
		module: "Leave",
		superAdmin: "Full",
		hrAdmin: "Full",
		hrExecutive: "Approve",
		manager: "Team approvals",
		payrollAdmin: "View",
		employee: "Self"
	},
	{
		module: "Payroll",
		superAdmin: "Full",
		hrAdmin: "View",
		hrExecutive: "None",
		manager: "None",
		payrollAdmin: "Full",
		employee: "Own payslips"
	},
	{
		module: "Performance",
		superAdmin: "Full",
		hrAdmin: "Full",
		hrExecutive: "Edit",
		manager: "Team reviews",
		payrollAdmin: "None",
		employee: "Self"
	},
	{
		module: "Expenses",
		superAdmin: "Full",
		hrAdmin: "Full",
		hrExecutive: "Approve",
		manager: "Team approvals",
		payrollAdmin: "Approve",
		employee: "Self"
	},
	{
		module: "Reports",
		superAdmin: "Full",
		hrAdmin: "Full",
		hrExecutive: "View",
		manager: "Team view",
		payrollAdmin: "Payroll view",
		employee: "None"
	},
	{
		module: "Settings",
		superAdmin: "Full",
		hrAdmin: "People policies",
		hrExecutive: "None",
		manager: "None",
		payrollAdmin: "Payroll settings",
		employee: "None"
	},
	{
		module: "User Management",
		superAdmin: "Full",
		hrAdmin: "Invite only",
		hrExecutive: "None",
		manager: "None",
		payrollAdmin: "None",
		employee: "None"
	},
	{
		module: "Audit Logs",
		superAdmin: "Full",
		hrAdmin: "View",
		hrExecutive: "None",
		manager: "None",
		payrollAdmin: "None",
		employee: "None"
	}
];
// src/data/notifications.ts
var notifications = [
	{
		id: "NTF-001",
		title: "Leave request awaiting approval",
		message: "Rahul Chauhan requested 3 days of casual leave from 2 Nov 2026.",
		time: "2026-10-30T09:42:00",
		type: "leave",
		read: false,
		href: "/leave?tab=approvals"
	},
	{
		id: "NTF-002",
		title: "October payroll is ready for preview",
		message: "The draft payroll run for October 2026 is ready for review before processing.",
		time: "2026-10-30T08:15:00",
		type: "payroll",
		read: false,
		href: "/payroll?tab=preview"
	},
	{
		id: "NTF-003",
		title: "Attendance correction requested",
		message: "Three attendance corrections are pending review for the Bengaluru office.",
		time: "2026-10-29T17:28:00",
		type: "attendance",
		read: false,
		href: "/attendance?tab=corrections"
	},
	{
		id: "NTF-004",
		title: "Interview scheduled",
		message: "Technical Round 2 for Nikhil Bhatia is scheduled for 31 Oct at 10:00 AM.",
		time: "2026-10-29T15:02:00",
		type: "recruitment",
		read: false,
		href: "/recruitment?tab=interviews"
	},
	{
		id: "NTF-005",
		title: "Expense claim submitted",
		message: "Ira Banerjee submitted a travel claim of ₹5,480 for review.",
		time: "2026-10-29T12:40:00",
		type: "system",
		read: false,
		href: "/expenses"
	},
	{
		id: "NTF-006",
		title: "Performance self-review due",
		message: "Self reviews for the H2 2026 cycle close on 15 November 2026.",
		time: "2026-10-28T10:00:00",
		type: "system",
		read: true,
		href: "/performance?tab=reviews"
	},
	{
		id: "NTF-007",
		title: "New joiner confirmed",
		message: "Deepak Ghosh has accepted the offer for Customer Success Executive.",
		time: "2026-10-27T16:20:00",
		type: "recruitment",
		read: true,
		href: "/recruitment?tab=candidates"
	},
	{
		id: "NTF-008",
		title: "Payroll inputs pending",
		message: "Two employees have pending reimbursement entries for the October payroll.",
		time: "2026-10-27T09:12:00",
		type: "payroll",
		read: true,
		href: "/payroll"
	},
	{
		id: "NTF-009",
		title: "Diwali holiday reminder",
		message: "The Hyderabad and Bengaluru offices will be closed on 8 November 2026.",
		time: "2026-10-26T11:30:00",
		type: "system",
		read: true,
		href: "/attendance?tab=holidays"
	},
	{
		id: "NTF-010",
		title: "Onboarding checklist complete",
		message: "Sneha Reddy completed the October onboarding checklist for 6 new employees.",
		time: "2026-10-25T14:05:00",
		type: "system",
		read: true,
		href: "/employees"
	}
];
notifications.filter((n) => !n.read).length;
// src/services/admin-service.ts
/** Editable demo configuration held in memory for the session. */
var companyProfile = {
	legalName: "Horizon Technologies Private Limited",
	displayName: "Horizon Technologies",
	domain: "horizontech.example",
	industry: "Information Technology",
	headquarters: "Hyderabad, Telangana, India",
	email: "people@horizontech.example",
	phone: "+91 40 6789 1200",
	website: "www.horizontech.example",
	gstin: "36AABCH1234P1ZQ (demo)",
	pan: "AABCH1234P (demo)",
	cin: "U72200TG2016PTC104521 (demo)",
	currency: "INR (₹)",
	timezone: "Asia/Kolkata (IST)",
	financialYear: "April – March",
	payrollFrequency: "Monthly"
};
var notificationPreferences = [
	{
		id: "leave",
		label: "Leave requests and approvals",
		email: true,
		inApp: true
	},
	{
		id: "payroll",
		label: "Payroll processing and payslips",
		email: true,
		inApp: true
	},
	{
		id: "attendance",
		label: "Attendance exceptions and corrections",
		email: false,
		inApp: true
	},
	{
		id: "recruitment",
		label: "Candidate pipeline and interviews",
		email: true,
		inApp: true
	},
	{
		id: "performance",
		label: "Performance review reminders",
		email: true,
		inApp: false
	},
	{
		id: "announcements",
		label: "Company announcements",
		email: true,
		inApp: true
	}
];
var attendanceSettings = {
	workWeek: "Monday to Friday",
	shiftStart: "09:00",
	shiftEnd: "18:00",
	graceMinutes: 15,
	halfDayHours: 4,
	fullDayHours: 8,
	autoMarkAbsent: true,
	requireLocation: false,
	allowCorrections: true,
	correctionWindowDays: 7
};
var payrollSettings = {
	payDay: 28,
	inputCutoffDay: 22,
	approvalRequired: true,
	payslipRelease: "On payroll processing",
	bankFileFormat: "Demo CSV",
	statutoryProfile: "Demo statutory profile FY 2026–27",
	effectiveFrom: "2026-04-01",
	pfRate: 12,
	esiRate: .75,
	professionalTax: 200,
	tdsMethod: "Illustrative flat-rate demo",
	disclaimer: "Payroll values in this demonstration are fictional. Statutory rates are illustrative and are not current legal rates. No salary is disbursed."
};
var rolesConfig = [
	{
		id: "super-admin",
		name: "Super Admin",
		description: "Full platform access and configuration.",
		members: 2
	},
	{
		id: "hr-admin",
		name: "HR Admin",
		description: "People operations, policies and reporting.",
		members: 1
	},
	{
		id: "hr-executive",
		name: "HR Executive",
		description: "Employee records, recruitment and HR operations.",
		members: 2
	},
	{
		id: "manager",
		name: "Manager",
		description: "Team attendance, leave, performance and expenses.",
		members: 2
	},
	{
		id: "payroll-admin",
		name: "Payroll Admin",
		description: "Payroll processing and salary configuration.",
		members: 2
	},
	{
		id: "employee",
		name: "Employee",
		description: "Self-service attendance, leave and payslips.",
		members: 1
	}
];
// scripts/export-seed.ts
/**
* One-off seed exporter.
*
* Bundles the frontend's deterministic demo data modules and writes them to
* backend/HorizonHRMS.Api/Data/Seed/*.json so the API can seed SQL Server with
* exactly the same records the UI previously held in memory.
*
* Run with: npx vite build --ssr scripts/export-seed.ts --outDir scripts/.seed-out --emptyOutDir
*           node scripts/.seed-out/export-seed.js
*/
var outDir = resolve(process.cwd(), "backend/HorizonHRMS.Api/Data/Seed");
mkdirSync(outDir, { recursive: true });
function write(name, value) {
	writeFileSync(resolve(outDir, `${name}.json`), JSON.stringify(value, null, 2), "utf8");
	console.log(`wrote ${name}.json`);
}
write("meta", {
	snapshotDate: isoDate(DEMO_SNAPSHOT_DATE),
	demoManagerEmployeeId: DEMO_MANAGER_EMPLOYEE_ID,
	demoSelfServiceEmployeeId: DEMO_SELF_SERVICE_EMPLOYEE_ID,
	currentCycleId: currentCycle.id
});
write("employees", employees);
write("departments", departments);
write("designations", designations);
write("branches", branches);
write("shifts", shifts);
write("holidays", holidays);
write("attendance-records", attendanceRecords);
write("attendance-corrections", attendanceCorrections);
write("leave-types", leaveTypes);
write("leave-policies", leavePolicies);
write("leave-balances", leaveBalances);
write("leave-requests", leaveRequests);
write("payroll-runs", payrollRuns);
write("payslips", payslips);
write("salary-structures", salaryStructures);
write("statutory-config", statutoryConfig);
write("job-openings", jobOpenings);
write("candidates", candidates);
write("interviews", interviews);
write("appraisal-cycles", appraisalCycles);
write("goals", goals);
write("reviews", reviews);
write("feedback", feedback);
write("expense-categories", expenseCategories);
write("expense-claims", expenseClaims);
write("audit-logs", auditLogs);
write("system-users", systemUsers);
write("notifications", notifications);
write("company-profile", companyProfile);
write("notification-preferences", notificationPreferences);
write("attendance-settings", attendanceSettings);
write("payroll-settings", payrollSettings);
write("roles-config", rolesConfig);
write("role-matrix", roleMatrix);
console.log("Seed export complete.");
export {};
