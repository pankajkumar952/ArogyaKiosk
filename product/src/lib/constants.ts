// ─── Language Configuration ─────────────────────────────────────
// All 22 scheduled languages + English for ArogyaKiosk
// ISO 639-1 codes aligned with Bhashini ULCA API language codes

export interface Language {
  code: string;        // Bhashini/ISO code
  name: string;        // Native script name
  nameEn: string;      // English name
  script: string;      // Writing script
  rtl?: boolean;       // Right-to-left
  tier: 1 | 2;         // 1 = production TTS, 2 = beta TTS
}

export const LANGUAGES: Language[] = [
  // Tier 1 — Full production ASR + NMT + TTS
  { code: "hi", name: "हिंदी",    nameEn: "Hindi",      script: "Devanagari", tier: 1 },
  { code: "en", name: "English",  nameEn: "English",     script: "Latin",      tier: 1 },
  { code: "bn", name: "বাংলা",    nameEn: "Bengali",     script: "Bengali",    tier: 1 },
  { code: "ta", name: "தமிழ்",    nameEn: "Tamil",       script: "Tamil",      tier: 1 },
  { code: "te", name: "తెలుగు",   nameEn: "Telugu",      script: "Telugu",     tier: 1 },
  { code: "mr", name: "मराठी",    nameEn: "Marathi",     script: "Devanagari", tier: 1 },
  { code: "gu", name: "ગુજરાતી",  nameEn: "Gujarati",    script: "Gujarati",   tier: 1 },
  { code: "kn", name: "ಕನ್ನಡ",    nameEn: "Kannada",     script: "Kannada",    tier: 1 },
  { code: "ml", name: "മലയാളം",   nameEn: "Malayalam",   script: "Malayalam",  tier: 1 },
  { code: "or", name: "ଓଡ଼ିଆ",    nameEn: "Odia",        script: "Odia",       tier: 1 },
  { code: "pa", name: "ਪੰਜਾਬੀ",   nameEn: "Punjabi",     script: "Gurmukhi",   tier: 1 },
  { code: "as", name: "অসমীয়া",  nameEn: "Assamese",    script: "Assamese",   tier: 1 },
  { code: "ur", name: "اردو",      nameEn: "Urdu",        script: "Perso-Arabic", rtl: true, tier: 1 },
  // Tier 2 — Beta TTS
  { code: "sa", name: "संस्कृत",  nameEn: "Sanskrit",    script: "Devanagari", tier: 2 },
  { code: "mai", name: "मैथिली",  nameEn: "Maithili",    script: "Devanagari", tier: 2 },
  { code: "ne", name: "नेपाली",   nameEn: "Nepali",      script: "Devanagari", tier: 2 },
  { code: "kok", name: "कोंकणी",  nameEn: "Konkani",     script: "Devanagari", tier: 2 },
  { code: "doi", name: "डोगरी",   nameEn: "Dogri",       script: "Devanagari", tier: 2 },
  { code: "mni", name: "মৈতৈলোন্",nameEn: "Manipuri",   script: "Meitei",     tier: 2 },
  { code: "brx", name: "बड़ो",     nameEn: "Bodo",        script: "Devanagari", tier: 2 },
  { code: "sat", name: "ᱥᱟᱱᱛᱟᱲᱤ",nameEn: "Santali",   script: "Ol Chiki",   tier: 2 },
  { code: "ks", name: "کٲشُر",    nameEn: "Kashmiri",    script: "Perso-Arabic", rtl: true, tier: 2 },
  { code: "sd", name: "سنڌي",     nameEn: "Sindhi",      script: "Perso-Arabic", rtl: true, tier: 2 },
];

/** Tier-1 languages shown on the primary language picker */
export const PRIMARY_LANGUAGES = LANGUAGES.filter((l) => l.tier === 1);

export function getLanguage(code: string): Language | undefined {
  return LANGUAGES.find((l) => l.code === code);
}

// ─── Session State ──────────────────────────────────────────────
export type SessionMode = "allopathic" | "ayush" | "integrated";
export type SessionStatus =
  | "language_selection"
  | "login"
  | "consent"
  | "history"
  | "scanning"
  | "summary"
  | "complete"
  | "emergency";

export interface ConsentFlags {
  dataCapture: boolean;
  doctorShare: boolean;
  abhaLink: boolean;
  audioRecording: boolean;
}

export interface PatientProfile {
  abhaNumber?: string;
  abhaAddress?: string;
  name?: string;
  gender?: "male" | "female" | "other";
  yearOfBirth?: number;
  photo?: string;   // base64
  mobile?: string;
}

export interface SessionState {
  id: string;
  language: string;
  mode: SessionMode;
  status: SessionStatus;
  patient?: PatientProfile;
  consent?: ConsentFlags;
  department?: string;
  startedAt: number;  // epoch ms
}

// ─── History Section Definitions ───────────────────────────────
export const HISTORY_SECTIONS = [
  {
    id: "chief_complaint",
    label: "मुख्य शिकायत",
    labelEn: "Chief Complaint",
    icon: "🩺",
    order: 1,
  },
  {
    id: "hpi",
    label: "वर्तमान बीमारी",
    labelEn: "History of Present Illness",
    icon: "📋",
    order: 2,
  },
  {
    id: "past_medical",
    label: "पुरानी बीमारियां",
    labelEn: "Past Medical History",
    icon: "🏥",
    order: 3,
  },
  {
    id: "drug_history",
    label: "दवाइयां",
    labelEn: "Drug History",
    icon: "💊",
    order: 4,
  },
  {
    id: "allergy",
    label: "एलर्जी",
    labelEn: "Allergy History",
    icon: "⚠️",
    order: 5,
  },
  {
    id: "family_history",
    label: "परिवार की बीमारियां",
    labelEn: "Family History",
    icon: "👨‍👩‍👧",
    order: 6,
  },
] as const;

export type HistorySectionId = (typeof HISTORY_SECTIONS)[number]["id"];

// ─── Common Symptoms (Touch Mode Options) ──────────────────────
export const COMMON_SYMPTOMS = [
  { id: "fever",     icon: "🌡️", labelHi: "बुखार",           labelEn: "Fever" },
  { id: "headache",  icon: "🤕", labelHi: "सिरदर्द",          labelEn: "Headache" },
  { id: "cough",     icon: "😮‍💨",labelHi: "खांसी",            labelEn: "Cough" },
  { id: "chest",     icon: "💔", labelHi: "सीने में दर्द",    labelEn: "Chest Pain" },
  { id: "stomach",   icon: "🤢", labelHi: "पेट दर्द",         labelEn: "Stomach Pain" },
  { id: "breathing", icon: "😮‍💨",labelHi: "सांस की तकलीफ",   labelEn: "Breathing Difficulty" },
  { id: "weakness",  icon: "😔", labelHi: "कमज़ोरी",           labelEn: "Weakness / Fatigue" },
  { id: "vomiting",  icon: "🤮", labelHi: "उल्टी",             labelEn: "Vomiting / Nausea" },
  { id: "joints",    icon: "🦴", labelHi: "जोड़ों का दर्द",   labelEn: "Joint Pain" },
  { id: "skin",      icon: "🩹", labelHi: "चमड़ी की समस्या",  labelEn: "Skin Problem" },
  { id: "eyes",      icon: "👁️", labelHi: "आंखों की समस्या", labelEn: "Eye Problem" },
  { id: "other",     icon: "📝", labelHi: "अन्य",             labelEn: "Other..." },
];
