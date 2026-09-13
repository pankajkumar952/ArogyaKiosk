

export interface SandboxPatient {
  id: string;
  abhaNumber: string; // 14-digit ABDM format: XX-XXXX-XXXX-XXXX
  abhaAddress: string; // e.g. ramesh.kumar@sbx
  aadhaar: string; // 12-digit masked: XXXX-XXXX-1234
  name: string;
  gender: "M" | "F" | "O";
  dob: string;
  age: number;
  mobile: string;
  state: string;
  district: string;
  prakriti: "Vata-Pitta" | "Pitta-Kapha" | "Vata-Kapha" | "Tridosha" | "Kapha-Pradhana";
  chronicConditions: string[];
  currentMedications: string[];
  allergies: string[];
  recentLabReport?: {
    test: string;
    date: string;
    result: string;
    status: "Normal" | "Elevated" | "Low";
  };
}

// ── Names & Locations generators for diverse Indian demographics ──
const FIRST_NAMES_M = [
  "Ramesh", "Suresh", "Amit", "Rajesh", "Vijay", "Manoj", "Dinesh", "Arun",
  "Gurpreet", "Manpreet", "Harpreet", "Balwinder", "Deepak", "Vikram", "Sunil",
  "Mohammed", "Abdul", "Imran", "Farhan", "Ravi", "Karthik", "Senthil", "Murugan",
  "Anand", "Pradeep", "Ashok", "Sanjay", "Mahesh", "Gopal", "Prakash"
];

const FIRST_NAMES_F = [
  "Sunita", "Anita", "Pooja", "Rekha", "Geeta", "Suman", "Shashi", "Kavita",
  "Jaspreet", "Simran", "Amanpreet", "Kiran", "Meena", "Rani", "Pushpa",
  "Fatima", "Ayesha", "Zainab", "Priya", "Lakshmi", "Devi", "Meenakshi",
  "Ananya", "Shweta", "Sneha", "Kalyani", "Savita", "Vidya", "Usha", "Manju"
];

const LAST_NAMES = [
  "Kumar", "Sharma", "Singh", "Yadav", "Verma", "Gupta", "Patel", "Mishra",
  "Kaur", "Gill", "Sandhu", "Reddy", "Nair", "Pillai", "Iyer", "Rao",
  "Khan", "Ansari", "Shaikh", "Joshi", "Bose", "Das", "Chatterjee", "Banerjee",
  "Choudhary", "Jat", "Thakur", "Rathore", "Deshmukh", "Patil"
];

const LOCATIONS = [
  { state: "Uttar Pradesh", district: "Varanasi" },
  { state: "Uttar Pradesh", district: "Lucknow" },
  { state: "Bihar", district: "Patna" },
  { state: "Madhya Pradesh", district: "Bhopal" },
  { state: "Maharashtra", district: "Pune" },
  { state: "Maharashtra", district: "Nagpur" },
  { state: "Punjab", district: "Amritsar" },
  { state: "Rajasthan", district: "Jaipur" },
  { state: "Gujarat", district: "Ahmedabad" },
  { state: "Tamil Nadu", district: "Madurai" },
  { state: "Karnataka", district: "Mysuru" },
  { state: "Kerala", district: "Thrissur" },
  { state: "West Bengal", district: "Kolkata" },
  { state: "Odisha", district: "Bhubaneswar" },
  { state: "Assam", district: "Guwahati" },
];

const PRAKRITI_LIST: SandboxPatient["prakriti"][] = [
  "Vata-Pitta", "Pitta-Kapha", "Vata-Kapha", "Tridosha", "Kapha-Pradhana"
];

const CHRONIC_OPTIONS = [
  ["Hypertension"],
  ["Type 2 Diabetes Mellitus"],
  ["Hypertension", "Type 2 Diabetes Mellitus"],
  ["Asthma / Bronchial Hyperreactivity"],
  ["Osteoarthritis / Sandhivata"],
  ["Dyslipidemia"],
  ["GERD / Amlapitta"],
  ["Hypothyroidism"],
  [],
];

const MEDICATION_OPTIONS = [
  ["Amlodipine 5mg OD", "Telmisartan 40mg OD"],
  ["Metformin 500mg BD", "Glimepiride 1mg OD"],
  ["Salbutamol Inhaler SOS", "Budesonide 200mcg BD"],
  ["Ashwagandha Churna 3g BD", "Shallaki 500mg BD"],
  ["Pantoprazole 40mg OD AC"],
  ["Levothyroxine 50mcg OD"],
  [],
];

const LAB_OPTIONS = [
  { test: "Fasting Blood Sugar", date: "15/08/2026", result: "148 mg/dL", status: "Elevated" as const },
  { test: "HbA1c", date: "10/08/2026", result: "7.4%", status: "Elevated" as const },
  { test: "Serum Creatinine", date: "02/08/2026", result: "0.9 mg/dL", status: "Normal" as const },
  { test: "Complete Blood Count (Platelets)", date: "24/08/2026", result: "1.9 Lakh/cumm", status: "Normal" as const },
  { test: "Lipid Profile (Total Cholesterol)", date: "18/07/2026", result: "230 mg/dL", status: "Elevated" as const },
  { test: "Hemoglobin", date: "28/08/2026", result: "10.4 g/dL", status: "Low" as const },
];

// ── Deterministic 100 Patient Generator ───────────────────────────
function generate100Patients(): SandboxPatient[] {
  const patients: SandboxPatient[] = [];

  for (let i = 1; i <= 100; i++) {
    const isMale = i % 2 !== 0;
    const firstNames = isMale ? FIRST_NAMES_M : FIRST_NAMES_F;
    const firstName = firstNames[(i * 7) % firstNames.length];
    const lastName = LAST_NAMES[(i * 11) % LAST_NAMES.length];
    const loc = LOCATIONS[i % LOCATIONS.length];
    const age = 18 + ((i * 13) % 65);
    const birthYear = 2026 - age;

    // Pad ABHA format: 91-XXXX-XXXX-XXXX
    const p1 = String(1000 + ((i * 83) % 9000));
    const p2 = String(1000 + ((i * 127) % 9000));
    const p3 = String(1000 + ((i * 241) % 9000));
    const abhaNumber = `91-${p1}-${p2}-${p3}`;

    const aadhaarLast4 = String(1000 + ((i * 97) % 9000));
    const aadhaar = `XXXX-XXXX-${aadhaarLast4}`;
    const abhaAddress = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@sbx`;
    const mobile = `98${String(10000000 + (i * 98765)).slice(0, 8)}`;

    patients.push({
      id: `sbx-patient-${String(i).padStart(3, "0")}`,
      abhaNumber,
      abhaAddress,
      aadhaar,
      name: `${firstName} ${lastName}`,
      gender: isMale ? "M" : "F",
      dob: `15/06/${birthYear}`,
      age,
      mobile,
      state: loc.state,
      district: loc.district,
      prakriti: PRAKRITI_LIST[i % PRAKRITI_LIST.length],
      chronicConditions: CHRONIC_OPTIONS[i % CHRONIC_OPTIONS.length],
      currentMedications: MEDICATION_OPTIONS[i % MEDICATION_OPTIONS.length],
      allergies: i % 7 === 0 ? ["Penicillin / Sulfa drugs"] : ["None reported"],
      recentLabReport: LAB_OPTIONS[i % LAB_OPTIONS.length],
    });
  }

  return patients;
}

export const VIRTUAL_SANDBOX_PATIENTS = generate100Patients();

// ── Helper to find patient by Aadhaar or ABHA ─────────────────────
export function findSandboxPatient(query: string): SandboxPatient | undefined {
  const clean = query.replace(/[\s-]/g, "").toLowerCase();
  return VIRTUAL_SANDBOX_PATIENTS.find((p) => {
    const pAbha = p.abhaNumber.replace(/[\s-]/g, "").toLowerCase();
    const pAadhaar = p.aadhaar.replace(/[\s-X]/g, "").toLowerCase();
    const pAddress = p.abhaAddress.toLowerCase();
    return (
      pAbha.includes(clean) ||
      clean.includes(pAbha) ||
      pAddress.includes(clean) ||
      (clean.length >= 4 && pAadhaar.endsWith(clean.slice(-4)))
    );
  });
}
