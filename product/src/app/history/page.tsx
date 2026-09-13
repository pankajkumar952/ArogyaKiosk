"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  KioskHeader,
  KioskScreen,
  KioskBody,
  KioskFooter,
  AudioWave,
} from "@/components/kiosk/KioskLayout";
import { Button, Card } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { COMMON_SYMPTOMS } from "@/lib/constants";
import { t } from "@/lib/translations";
import { useVoiceSession } from "@/hooks/useVoiceSession";
import type { ChatMessage, StructuredSummary, InterviewMode } from "@/app/api/history/chat/route";

type Stage =
  | "chief_complaint" | "hpi"
  | "past_history" | "drug_allergy"
  | "family_history" | "personal_history" | "review_of_systems"
  | "ayush_prakriti" | "ayush_vikriti" | "ayush_agni"
  | "ayush_koshtha" | "ayush_ahara_vihara" | "ayush_nidana" | "ayush_samprapti"
  | "summary";

// Single combined interview — allopathic clinical + AYUSH Dashavidha Pariksha
const COMBINED_STAGES: Stage[] = [
  "chief_complaint", "hpi",
  "past_history", "drug_allergy",
  "family_history", "personal_history", "review_of_systems",
  "ayush_prakriti", "ayush_vikriti", "ayush_agni",
  "ayush_koshtha", "ayush_ahara_vihara", "ayush_nidana", "ayush_samprapti",
];

// Kept as aliases so API calls still work (chat route accepts mode string)
const ALLOPATHIC_STAGES = COMBINED_STAGES;
const AYUSH_STAGES = COMBINED_STAGES;


// Multilingual stage labels
function getStageLabels(lang: string): Record<Stage, string> {
  const labels: Record<string, Record<Stage, string>> = {
    hi: {
      chief_complaint: "मुख्य शिकायत", hpi: "वर्तमान बीमारी",
      past_history: "पुराना इतिहास", drug_allergy: "दवा/एलर्जी",
      family_history: "पारिवारिक इतिहास", personal_history: "व्यक्तिगत इतिहास",
      review_of_systems: "सिस्टम समीक्षा",
      ayush_prakriti: "प्रकृति", ayush_vikriti: "विकृति", ayush_agni: "अग्नि",
      ayush_koshtha: "कोष्ठ", ayush_ahara_vihara: "आहार-विहार",
      ayush_nidana: "निदान", ayush_samprapti: "सम्प्राप्ति", summary: "सारांश",
    },
    en: {
      chief_complaint: "Problem", hpi: "HPI",
      past_history: "Past History", drug_allergy: "Drug/Allergy",
      family_history: "Family Hx", personal_history: "Personal Hx",
      review_of_systems: "Review of Systems",
      ayush_prakriti: "Prakriti", ayush_vikriti: "Vikriti", ayush_agni: "Agni",
      ayush_koshtha: "Koshtha", ayush_ahara_vihara: "Ahara-Vihara",
      ayush_nidana: "Nidana", ayush_samprapti: "Samprapti", summary: "Summary",
    },
    ta: {
      chief_complaint: "பிரச்சினை", hpi: "நடப்பு நோய்",
      past_history: "முன்வரலாறு", drug_allergy: "மருந்து/ஒவ்வாமை",
      family_history: "குடும்ப வரலாறு", personal_history: "தனிப்பட்ட வரலாறு",
      review_of_systems: "உறுப்பு பரிசோதனை",
      ayush_prakriti: "பிரகிருதி", ayush_vikriti: "விகிருதி", ayush_agni: "அக்னி",
      ayush_koshtha: "கோஷ்ட", ayush_ahara_vihara: "ஆகார-விஹார",
      ayush_nidana: "நிதான", ayush_samprapti: "சம்ப்ராப்தி", summary: "சுருக்கம்",
    },
    te: {
      chief_complaint: "సమస్య", hpi: "ప్రస్తుత అనారోగ్యం",
      past_history: "గత చరిత్ర", drug_allergy: "మందు/అలర్జీ",
      family_history: "కుటుంబ చరిత్ర", personal_history: "వ్యక్తిగత చరిత్ర",
      review_of_systems: "అవయవ సమీక్ష",
      ayush_prakriti: "ప్రకృతి", ayush_vikriti: "వికృతి", ayush_agni: "అగ్ని",
      ayush_koshtha: "కోష్ఠ", ayush_ahara_vihara: "ఆహార-విహార",
      ayush_nidana: "నిదాన", ayush_samprapti: "సంప్రాప్తి", summary: "సారాంశం",
    },
    bn: {
      chief_complaint: "সমস্যা", hpi: "বর্তমান অসুস্থতা",
      past_history: "পূর্ব ইতিহাস", drug_allergy: "ওষুধ/অ্যালার্জি",
      family_history: "পারিবারিক ইতিহাস", personal_history: "ব্যক্তিগত ইতিহাস",
      review_of_systems: "সিস্টেম পর্যালোচনা",
      ayush_prakriti: "প্রকৃতি", ayush_vikriti: "বিকৃতি", ayush_agni: "অগ্নি",
      ayush_koshtha: "কোষ্ঠ", ayush_ahara_vihara: "আহার-বিহার",
      ayush_nidana: "নিদান", ayush_samprapti: "সম্প্রাপ্তি", summary: "সারাংশ",
    },
    mr: {
      chief_complaint: "समस्या", hpi: "सद्य आजार",
      past_history: "जुनी माहिती", drug_allergy: "औषध/ॲलर्जी",
      family_history: "कौटुंबिक इतिहास", personal_history: "वैयक्तिक इतिहास",
      review_of_systems: "अवयव आढावा",
      ayush_prakriti: "प्रकृती", ayush_vikriti: "विकृती", ayush_agni: "अग्नी",
      ayush_koshtha: "कोष्ठ", ayush_ahara_vihara: "आहार-विहार",
      ayush_nidana: "निदान", ayush_samprapti: "संप्राप्ती", summary: "सारांश",
    },
    gu: {
      chief_complaint: "સમસ્યા", hpi: "વર્તમાન બીમારી",
      past_history: "જૂનો ઇતિહાસ", drug_allergy: "દવા/એલર્જી",
      family_history: "કૌટુંબિક ઇતિહાસ", personal_history: "વ્યક્તિગત ઇતિહાસ",
      review_of_systems: "પ્રણાલી સમીક્ષા",
      ayush_prakriti: "પ્રકૃતિ", ayush_vikriti: "વિકૃતિ", ayush_agni: "અગ્નિ",
      ayush_koshtha: "કોષ્ઠ", ayush_ahara_vihara: "આહાર-વિહાર",
      ayush_nidana: "નિદાન", ayush_samprapti: "સંપ્રાપ્તિ", summary: "સારાંશ",
    },
    kn: {
      chief_complaint: "ಸಮಸ್ಯೆ", hpi: "ಪ್ರಸ್ತುತ ಕಾಯಿಲೆ",
      past_history: "ಹಿಂದಿನ ಇತಿಹಾಸ", drug_allergy: "ಔಷಧ/ಅಲರ್ಜಿ",
      family_history: "ಕುಟುಂಬ ಇತಿಹಾಸ", personal_history: "ವ್ಯಕ್ತಿಗತ ಇತಿಹಾಸ",
      review_of_systems: "ಅವಯವ ಸಮೀಕ್ಷೆ",
      ayush_prakriti: "ಪ್ರಕೃತಿ", ayush_vikriti: "ವಿಕೃತಿ", ayush_agni: "ಅಗ್ನಿ",
      ayush_koshtha: "ಕೋಷ್ಠ", ayush_ahara_vihara: "ಆಹಾರ-ವಿಹಾರ",
      ayush_nidana: "ನಿದಾನ", ayush_samprapti: "ಸಂಪ್ರಾಪ್ತಿ", summary: "ಸಾರಾಂಶ",
    },
    ml: {
      chief_complaint: "പ്രശ്നം", hpi: "നിലവിലെ അസുഖം",
      past_history: "മുൻ ചരിത്രം", drug_allergy: "മരുന്ന്/ആലർജി",
      family_history: "കുടുംബ ചരിത്രം", personal_history: "വ്യക്തിഗത ചരിത്രം",
      review_of_systems: "അവയവ അവലോകനം",
      ayush_prakriti: "പ്രകൃതി", ayush_vikriti: "വികൃതി", ayush_agni: "അഗ്നി",
      ayush_koshtha: "കോഷ്ഠ", ayush_ahara_vihara: "ആഹാര-വിഹാര",
      ayush_nidana: "നിദാന", ayush_samprapti: "സംപ്രാപ്തി", summary: "സംഗ്രഹം",
    },
    pa: {
      chief_complaint: "ਸਮੱਸਿਆ", hpi: "ਵਰਤਮਾਨ ਬਿਮਾਰੀ",
      past_history: "ਪੁਰਾਣਾ ਇਤਿਹਾਸ", drug_allergy: "ਦਵਾਈ/ਐਲਰਜੀ",
      family_history: "ਪਰਿਵਾਰਕ ਇਤਿਹਾਸ", personal_history: "ਨਿੱਜੀ ਇਤਿਹਾਸ",
      review_of_systems: "ਅੰਗ ਸਮੀਖਿਆ",
      ayush_prakriti: "ਪ੍ਰਕਿਰਤੀ", ayush_vikriti: "ਵਿਕ੍ਰਿਤੀ", ayush_agni: "ਅਗਨੀ",
      ayush_koshtha: "ਕੋਸ਼ਠ", ayush_ahara_vihara: "ਆਹਾਰ-ਵਿਹਾਰ",
      ayush_nidana: "ਨਿਦਾਨ", ayush_samprapti: "ਸੰਪ੍ਰਾਪਤੀ", summary: "ਸਾਰ",
    },
    ur: {
      chief_complaint: "مسئلہ", hpi: "موجودہ بیماری",
      past_history: "سابقہ تاریخ", drug_allergy: "دوا/الرجی",
      family_history: "خاندانی تاریخ", personal_history: "ذاتی تاریخ",
      review_of_systems: "نظام کا جائزہ",
      ayush_prakriti: "پرکرتی", ayush_vikriti: "وکرتی", ayush_agni: "اگنی",
      ayush_koshtha: "کوشٹھ", ayush_ahara_vihara: "آہار-وہار",
      ayush_nidana: "نیدان", ayush_samprapti: "سمپراپتی", summary: "خلاصہ",
    },
  };
  return labels[lang] ?? labels["hi"];
}

// ── Build summary from raw messages when Gemini is unavailable ───────────────
// Extracts patient answers keyed by stage label and builds StructuredSummary
function buildSummaryFromMessages(messages: ChatMessage[]): StructuredSummary {
  // Get last patient answer per stage
  const byStage = (stg: Stage): string => {
    const msgs = messages.filter((m) => m.role === "patient" && m.stage === stg);
    return msgs.map((m) => m.text).join("; ") || "Not reported";
  };

  const cc = byStage("chief_complaint");
  const hpiRaw = byStage("hpi");
  const past = byStage("past_history");
  const drug = byStage("drug_allergy");
  const family = byStage("family_history");
  const personal = byStage("personal_history");
  const ros = byStage("review_of_systems");
  const prakriti = byStage("ayush_prakriti");
  const vikriti = byStage("ayush_vikriti");
  const agni = byStage("ayush_agni");
  const koshtha = byStage("ayush_koshtha");
  const ahara = byStage("ayush_ahara_vihara");
  const nidana = byStage("ayush_nidana");
  const samprapti = byStage("ayush_samprapti");

  // Simple red flag detection
  const allText = messages.map((m) => m.text).join(" ").toLowerCase();
  const redFlags: string[] = [];
  if (/chest pain|سینہ درد|ਛਾਤੀ ਦਰਦ|흉통|सीने में दर्द/.test(allText)) redFlags.push("Possible cardiac — chest pain reported");
  if (/breathless|breath|सांस/.test(allText)) redFlags.push("Breathlessness — urgent review needed");
  if (/blood|खून|bleeding|ਖੂਨ/.test(allText)) redFlags.push("Bleeding reported — assess urgency");
  if (/unconscious|seizure|बेहोश/.test(allText)) redFlags.push("Altered consciousness — emergency triage");

  const ayushHasData = [prakriti, vikriti, agni, koshtha, ahara, nidana, samprapti]
    .some((v) => v !== "Not reported");

  return {
    chiefComplaint: cc,
    hpi: hpiRaw,
    pastHistory: past,
    drugAllergy: drug,
    familyHistory: family,
    personalHistory: personal,
    reviewOfSystems: ros,
    currentMedications: drug !== "Not reported" ? drug : "None reported",
    suggestedICD10: "",
    redFlags,
    ayushNote: ayushHasData
      ? `Prakriti: ${prakriti}. Vikriti: ${vikriti}. Agni: ${agni}. Koshtha: ${koshtha}. Ahara-Vihara: ${ahara}. Nidana: ${nidana}. Samprapti: ${samprapti}.`
      : "",
    ...(ayushHasData ? {
      prakriti,
      vikriti,
      agniType: agni,
      koshtha,
      aharaVihara: ahara,
      nidana,
      samprapti,
    } : {}),
  };
}

const TOUCH_OPTIONS_L10N: Record<string, Partial<Record<Stage, string[]>>> = {
  hi: {
    chief_complaint: ["बुखार", "दर्द", "उल्टी", "सांस में तकलीफ", "चक्कर", "कमज़ोरी", "खांसी", "पेट दर्द"],
    hpi: ["आज से", "2–3 दिन से", "1 हफ्ते से", "1 महीने से", "जलन", "दबाव", "हल्का", "तेज़"],
    past_history: ["मधुमेह", "बीपी", "हृदय रोग", "टीबी", "ऑपरेशन", "कोई नहीं"],
    drug_allergy: ["हाँ, दवाई लेता हूँ", "नहीं", "पेनिसिलिन", "सल्फा", "एस्पिरिन", "कोई नहीं"],
    family_history: ["मधुमेह", "बीपी", "हृदय रोग", "कैंसर", "टीबी", "कोई नहीं"],
    personal_history: ["धूम्रपान", "शराब", "तंबाकू", "शाकाहारी", "कोई नहीं"],
    review_of_systems: ["आँख", "कान", "छाती", "पेट", "जोड़", "कोई नहीं"],
    ayush_prakriti: ["वात", "पित्त", "कफ", "वात-पित्त", "पित्त-कफ"],
    ayush_vikriti: ["बेचैनी", "गर्मी", "भारीपन"],
    ayush_agni: ["अनियमित", "तेज़", "धीमी"],
    ayush_koshtha: ["नियमित", "कभी-कभी", "कब्ज़"],
    ayush_ahara_vihara: ["गर्म खाना", "तीखा खाना", "देर से सोना"],
    ayush_nidana: ["तनाव", "ठंड लगना", "बासी खाना"],
    ayush_samprapti: ["खाने के बाद", "सुबह", "रात को"],
  },
  en: {
    chief_complaint: ["Fever", "Pain", "Vomiting", "Breathing difficulty", "Dizziness", "Weakness", "Cough", "Stomach pain"],
    hpi: ["Today", "2–3 Days", "1 Week", "1 Month", "Burning", "Pressing", "Mild", "Severe"],
    past_history: ["Diabetes", "High BP", "Heart disease", "TB", "Surgery", "None"],
    drug_allergy: ["Yes, on medication", "No", "Penicillin", "Sulfa", "Aspirin", "None"],
    family_history: ["Diabetes", "High BP", "Heart disease", "Cancer", "TB", "None"],
    personal_history: ["Smoking", "Alcohol", "Tobacco", "Vegetarian", "None"],
    review_of_systems: ["Eyes", "Ears", "Chest", "Stomach", "Joints", "None"],
    ayush_prakriti: ["Vata", "Pitta", "Kapha", "Vata-Pitta", "Pitta-Kapha"],
    ayush_vikriti: ["Anxious/Restless", "Hot/Inflamed", "Heavy/Sluggish"],
    ayush_agni: ["Irregular appetite", "Strong appetite", "Weak appetite"],
    ayush_koshtha: ["Regular bowels", "Occasional", "Constipated"],
    ayush_ahara_vihara: ["Hot food", "Spicy food", "Late sleep"],
    ayush_nidana: ["Stress", "Cold exposure", "Stale food"],
    ayush_samprapti: ["After eating", "Morning", "Night"],
  },
  bn: {
    chief_complaint: ["জ্বর", "ব্যথা", "বমি", "শ্বাসকষ্ট", "মাথা ঘোরা", "দুর্বলতা", "কাশি", "পেট ব্যথা"],
    hpi: ["আজ থেকে", "২–৩ দিন", "১ সপ্তাহ", "১ মাস", "জ্বালাপোড়া", "চাপ", "হালকা", "তীব্র"],
    past_history: ["ডায়াবেটিস", "উচ্চ রক্তচাপ", "হৃদরোগ", "যক্ষ্মা", "অপারেশন", "কোনোটি নয়"],
    drug_allergy: ["হ্যাঁ, ওষুধ খাই", "না", "পেনিসিলিন", "সালফা", "অ্যাসপিরিন", "কোনোটি নয়"],
    family_history: ["ডায়াবেটিস", "উচ্চ রক্তচাপ", "হৃদরোগ", "ক্যান্সার", "যক্ষ্মা", "কোনোটি নয়"],
    personal_history: ["ধূমপান", "মদ্যপান", "তামাক", "নিরামিষ", "কোনোটি নয়"],
    review_of_systems: ["চোখ", "কান", "বুক", "পেট", "জয়েন্ট", "কোনোটি নয়"],
    ayush_prakriti: ["বাত", "পিত্ত", "কফ", "বাত-পিত্ত", "পিত্ত-কফ"],
    ayush_vikriti: ["অস্থিরতা", "গরম/প্রদাহ", "ভারীভাব"],
    ayush_agni: ["অনিয়মিত ক্ষুধা", "তীব্র ক্ষুধা", "দুর্বল ক্ষুধা"],
    ayush_koshtha: ["নিয়মিত", "মাঝেমধ্যে", "কোষ্ঠকাঠিন্য"],
    ayush_ahara_vihara: ["গরম খাবার", "ঝাল খাবার", "দেরিতে ঘুমানো"],
    ayush_nidana: ["মানসিক চাপ", "ঠান্ডা লাগা", "বাসি খাবার"],
    ayush_samprapti: ["খাওয়ার পরে", "সকালে", "রাতে"],
  },
  ta: {
    chief_complaint: ["காய்ச்சல்", "வலி", "வாந்தி", "மூச்சுத்திணறல்", "தலைசுற்றல்", "சோர்வு", "இருமல்", "வயிற்றுவலி"],
    hpi: ["இன்று", "2–3 நாட்கள்", "1 வாரம்", "1 மாதம்", "எரிச்சல்", "அழுத்தம்", "மிதமானது", "தீவிரம்"],
    past_history: ["நீரிழிவு", "உயர் ரத்த அழுத்தம்", "இதய நோய்", "காசநோய்", "அறுவை சிகிச்சை", "எதுவும் இல்லை"],
    drug_allergy: ["ஆம், மருந்து உட்கொள்கிறேன்", "இல்லை", "பெனிசிலின்", "சல்பா", "அஸ்பிரின்", "எதுவும் இல்லை"],
    family_history: ["நீரிழிவு", "உயர் ரத்த அழுத்தம்", "இதய நோய்", "புற்றுநோய்", "காசநோய்", "எதுவும் இல்லை"],
    personal_history: ["புகைப்பிடித்தல்", "மது", "புகையிலை", "சைவம்", "எதுவும் இல்லை"],
    review_of_systems: ["கண்கள்", "காதுகள்", "நெஞ்சு", "வயிறு", "மூட்டுகள்", "எதுவும் இல்லை"],
    ayush_prakriti: ["வாத", "பித்த", "கப", "வாத-பித்த", "பித்த-கப"],
    ayush_vikriti: ["பதட்டம்", "வெப்பம்/அழற்சி", "கனமான உணர்வு"],
    ayush_agni: ["ஒழுங்கற்ற பசி", "வலுவான பசி", "பலவீனமான பசி"],
    ayush_koshtha: ["சீரான மலம்", "அவ்வப்போது", "மலச்சிக்கல்"],
    ayush_ahara_vihara: ["சூடான உணவு", "காரமான உணவு", "தாமதமாக தூக்கம்"],
    ayush_nidana: ["மன அழுத்தம்", "குளிரில் இருத்தல்", "கெட்ட உணவு"],
    ayush_samprapti: ["சாப்பிட்ட பிறகு", "காலையில்", "இரவில்"],
  },
  te: {
    chief_complaint: ["జ్వరం", "నొప్పి", "వాంతులు", "శ్వాస ఇబ్బంది", "తల తిరగడం", "బలహీనత", "దగ్గు", "పొట్ట నొప్పి"],
    hpi: ["ఈరోజు", "2–3 రోజులు", "1 వారం", "1 నెల", "మంట", "ఒత్తిడి", "తేలికగా", "తీవ్రంగా"],
    past_history: ["మధుమేహం", "అధిక BP", "గుండె జబ్బు", "టీబీ", "ఆపరేషన్", "ఏదీ లేదు"],
    drug_allergy: ["అవును, మందులు వాడుతున్నాను", "లేదు", "పెనిసిలిన్", "సల్ఫా", "ఆస్పిరిన్", "ఏదీ లేదు"],
    family_history: ["మధుమేహం", "అధిక BP", "గుండె జబ్బు", "కేన్సర్", "టీబీ", "ఏదీ లేదు"],
    personal_history: ["ధూమపానం", "మద్యపానం", "పొగాకు", "శాకాహారి", "ఏదీ లేదు"],
    review_of_systems: ["కళ్ళు", "చెవులు", "గుండె/ఛాతీ", "పొట్ట", "కీళ్ళు", "ఏదీ లేదు"],
    ayush_prakriti: ["వాత", "పిత్త", "కఫ", "వాత-పిత్త", "పిత్త-కఫ"],
    ayush_vikriti: ["ఆందోళన", "వేడి/వాపు", "భారంగా అనిపించడం"],
    ayush_agni: ["అనిత్య ఆకలి", "బలమైన ఆకలి", "బలహీన ఆకలి"],
    ayush_koshtha: ["సక్రమ మలం", "అప్పుడప్పుడు", "మలబద్ధకం"],
    ayush_ahara_vihara: ["వేడి ఆహారం", "కారంగా", "ఆలస్యంగా నిద్ర"],
    ayush_nidana: ["ఒత్తిడి", "చలి", "పాత ఆహారం"],
    ayush_samprapti: ["తిన్న తర్వాత", "ఉదయం", "రాత్రి"],
  },
  mr: {
    chief_complaint: ["ताप", "दुखणे", "उलटी", "श्वास घेणे कठीण", "चक्कर", "अशक्तपणा", "खोकला", "पोटदुखी"],
    hpi: ["आजपासून", "2–3 दिवसांपासून", "1 आठवड्यापासून", "1 महिन्यापासून", "जळजळ", "दाब", "सौम्य", "तीव्र"],
    past_history: ["मधुमेह", "उच्च रक्तदाब", "हृदयरोग", "क्षयरोग", "शस्त्रक्रिया", "काहीही नाही"],
    drug_allergy: ["हो, औषधे घेतो", "नाही", "पेनिसिलिन", "सल्फा", "अॅस्पिरिन", "काहीही नाही"],
    family_history: ["मधुमेह", "उच्च रक्तदाब", "हृदयरोग", "कर्करोग", "क्षयरोग", "काहीही नाही"],
    personal_history: ["धूम्रपान", "मद्यपान", "तंबाखू", "शाकाहारी", "काहीही नाही"],
    review_of_systems: ["डोळे", "कान", "छाती", "पोट", "सांधे", "काहीही नाही"],
    ayush_prakriti: ["वात", "पित्त", "कफ", "वात-पित्त", "पित्त-कफ"],
    ayush_vikriti: ["अस्वस्थता", "उष्णता", "जडपणा"],
    ayush_agni: ["अनियमित भूक", "तीव्र भूक", "कमी भूक"],
    ayush_koshtha: ["नियमित", "अधूनमधून", "बद्धकोष्ठता"],
    ayush_ahara_vihara: ["गरम अन्न", "मसालेदार", "उशिरा झोप"],
    ayush_nidana: ["ताण", "थंडी", "शिळे अन्न"],
    ayush_samprapti: ["जेवणानंतर", "सकाळी", "रात्री"],
  },
  gu: {
    chief_complaint: ["તાવ", "દર્દ", "ઉલ્ટી", "શ્વાસ લેવામાં તકલીફ", "ચક્કર", "નબળાઈ", "ઉધરસ", "પેટ દર્દ"],
    hpi: ["આજથી", "2–3 દિવસ", "1 અઠવાડિયું", "1 મહિનો", "બળતરા", "દબાણ", "હળવો", "તીવ્ર"],
    past_history: ["ડાયાબિટીસ", "ઉચ્ચ BP", "હૃદય રોગ", "ટીબી", "ઓપરેશન", "કોઈ નહીં"],
    drug_allergy: ["હા, દવા લઉ છું", "ના", "પેનિસિલિન", "સલ્ફા", "એસ્પિરિન", "કોઈ નહીં"],
    family_history: ["ડાયાબિટીસ", "ઉચ્ચ BP", "હૃદય રોગ", "કેન્સર", "ટીબી", "કોઈ નહીં"],
    personal_history: ["ધૂમ્રપાન", "દારૂ", "તમાકુ", "શાકાહારી", "કોઈ નહીં"],
    review_of_systems: ["આંખ", "કાન", "છાતી", "પેટ", "સાંધા", "કોઈ નહીં"],
    ayush_prakriti: ["વાત", "પિત્ત", "કફ", "વાત-પિત્ત", "પિત્ત-કફ"],
    ayush_vikriti: ["બેચેની", "ગરમી", "ભારેપણું"],
    ayush_agni: ["અનિયમિત ભૂખ", "તીવ્ર ભૂખ", "ઓછી ભૂખ"],
    ayush_koshtha: ["નિયમિત", "ક્યારેક", "કબજિયાત"],
    ayush_ahara_vihara: ["ગરમ ખોરાક", "મસાલેદાર", "મોડે સૂવું"],
    ayush_nidana: ["તણાવ", "ઠંડી", "વાસી ખોરાક"],
    ayush_samprapti: ["ખાધા પછી", "સવારે", "રાત્રે"],
  },
  kn: {
    chief_complaint: ["ಜ್ವರ", "ನೋವು", "ವಾಂತಿ", "ಉಸಿರಾಟ ತೊಂದರೆ", "ತಲೆ ತಿರುಗುವಿಕೆ", "ದೌರ್ಬಲ್ಯ", "ಕೆಮ್ಮು", "ಹೊಟ್ಟೆ ನೋವು"],
    hpi: ["ಇಂದಿನಿಂದ", "2–3 ದಿನ", "1 ವಾರ", "1 ತಿಂಗಳು", "ಉರಿ", "ಒತ್ತಡ", "ಲಘು", "ತೀವ್ರ"],
    past_history: ["ಮಧುಮೇಹ", "ಹೆಚ್ಚಿನ BP", "ಹೃದ್ರೋಗ", "ಕ್ಷಯ", "ಶಸ್ತ್ರಚಿಕಿತ್ಸೆ", "ಯಾವುದೂ ಇಲ್ಲ"],
    drug_allergy: ["ಹೌದು, ಔಷಧ ತೆಗೆದುಕೊಳ್ಳುತ್ತೇನೆ", "ಇಲ್ಲ", "ಪೆನಿಸಿಲಿನ್", "ಸಲ್ಫಾ", "ಆಸ್ಪಿರಿನ್", "ಯಾವುದೂ ಇಲ್ಲ"],
    family_history: ["ಮಧುಮೇಹ", "ಹೆಚ್ಚಿನ BP", "ಹೃದ್ರೋಗ", "ಕ್ಯಾನ್ಸರ್", "ಕ್ಷಯ", "ಯಾವುದೂ ಇಲ್ಲ"],
    personal_history: ["ಧೂಮಪಾನ", "ಮದ್ಯಪಾನ", "ತಂಬಾಕು", "ಸಸ್ಯಾಹಾರ", "ಯಾವುದೂ ಇಲ್ಲ"],
    review_of_systems: ["ಕಣ್ಣು", "ಕಿವಿ", "ಎದೆ", "ಹೊಟ್ಟೆ", "ಕೀಲು", "ಯಾವುದೂ ಇಲ್ಲ"],
    ayush_prakriti: ["ವಾತ", "ಪಿತ್ತ", "ಕಫ", "ವಾತ-ಪಿತ್ತ", "ಪಿತ್ತ-ಕಫ"],
    ayush_vikriti: ["ಆತಂಕ", "ಬಿಸಿ/ಉರಿ", "ಭಾರವಾಗಿ ಅನಿಸುತ್ತದೆ"],
    ayush_agni: ["ಅನಿಯಮಿತ ಹಸಿವು", "ಪ್ರಬಲ ಹಸಿವು", "ದುರ್ಬಲ ಹಸಿವು"],
    ayush_koshtha: ["ನಿಯಮಿತ", "ಆಗಾಗ", "ಮಲಬದ್ಧತೆ"],
    ayush_ahara_vihara: ["ಬಿಸಿ ಆಹಾರ", "ಖಾರ", "ತಡ ನಿದ್ದೆ"],
    ayush_nidana: ["ಒತ್ತಡ", "ಚಳಿ", "ಹಳಸಿದ ಆಹಾರ"],
    ayush_samprapti: ["ತಿಂದ ನಂತರ", "ಬೆಳಗ್ಗೆ", "ರಾತ್ರಿ"],
  },
  ml: {
    chief_complaint: ["പനി", "വേദന", "ഓക്കാനം", "ശ്വാസ ബുദ്ധിമുട്ട്", "തലകറക്കം", "ക്ഷീണം", "ചുമ", "വയറ്റ് വേദന"],
    hpi: ["ഇന്ന് മുതൽ", "2–3 ദിവസം", "1 ആഴ്ച", "1 മാസം", "ജ്വലനം", "സമ്മർദ്ദം", "മൃദുവായ", "ശക്തമായ"],
    past_history: ["പ്രമേഹം", "ഉയർന്ന BP", "ഹൃദ്രോഗം", "ക്ഷയം", "ശസ്ത്രക്രിയ", "ഒന്നും ഇല്ല"],
    drug_allergy: ["അതെ, മരുന്ന് കഴിക്കുന്നു", "ഇല്ല", "പെനിസിലിൻ", "സൾഫ", "ആസ്പിരിൻ", "ഒന്നും ഇല്ല"],
    family_history: ["പ്രമേഹം", "ഉയർന്ന BP", "ഹൃദ്രോഗം", "കാൻസർ", "ക്ഷയം", "ഒന്നും ഇല്ല"],
    personal_history: ["പുകവലി", "മദ്യപാനം", "പുകയില", "സസ്യഭക്ഷി", "ഒന്നും ഇല്ല"],
    review_of_systems: ["കണ്ണ്", "കാത്", "നെഞ്ച്", "വയർ", "സന്ധി", "ഒന്നും ഇല്ല"],
    ayush_prakriti: ["വാത", "പിത്ത", "കഫ", "വാത-പിത്ത", "പിത്ത-കഫ"],
    ayush_vikriti: ["ഉത്കണ്ഠ", "ചൂട്/വീക്കം", "ഭാരം"],
    ayush_agni: ["ക്രമമില്ലാത്ത വിശപ്പ്", "ശക്തമായ വിശപ്പ്", "ദുർബലമായ വിശപ്പ്"],
    ayush_koshtha: ["ക്രമമായ", "ഇടക്കിടെ", "മലബന്ധം"],
    ayush_ahara_vihara: ["ചൂടുള്ള ഭക്ഷണം", "എരിവ്", "വൈകി ഉറങ്ങൽ"],
    ayush_nidana: ["സമ്മർദ്ദം", "തണുപ്പ്", "കേടായ ഭക്ഷണം"],
    ayush_samprapti: ["ഭക്ഷണ ശേഷം", "രാവിലെ", "രാത്രി"],
  },
  pa: {
    chief_complaint: ["ਬੁਖਾਰ", "ਦਰਦ", "ਉਲਟੀ", "ਸਾਹ ਦੀ ਤਕਲੀਫ਼", "ਚੱਕਰ", "ਕਮਜ਼ੋਰੀ", "ਖਾਂਸੀ", "ਪੇਟ ਦਰਦ"],
    hpi: ["ਅੱਜ ਤੋਂ", "2–3 ਦਿਨ", "1 ਹਫ਼ਤਾ", "1 ਮਹੀਨਾ", "ਜਲਨ", "ਦਬਾਅ", "ਹਲਕਾ", "ਤੇਜ਼"],
    past_history: ["ਸ਼ੂਗਰ", "ਉੱਚ BP", "ਦਿਲ ਦੀ ਬਿਮਾਰੀ", "ਟੀਬੀ", "ਆਪਰੇਸ਼ਨ", "ਕੋਈ ਨਹੀਂ"],
    drug_allergy: ["ਹਾਂ, ਦਵਾਈ ਲੈਂਦਾ ਹਾਂ", "ਨਹੀਂ", "ਪੈਨਿਸਿਲਿਨ", "ਸਲਫ਼ਾ", "ਐਸਪਿਰਿਨ", "ਕੋਈ ਨਹੀਂ"],
    family_history: ["ਸ਼ੂਗਰ", "ਉੱਚ BP", "ਦਿਲ ਦੀ ਬਿਮਾਰੀ", "ਕੈਂਸਰ", "ਟੀਬੀ", "ਕੋਈ ਨਹੀਂ"],
    personal_history: ["ਸਿਗਰਟ", "ਸ਼ਰਾਬ", "ਤੰਬਾਕੂ", "ਸ਼ਾਕਾਹਾਰੀ", "ਕੋਈ ਨਹੀਂ"],
    review_of_systems: ["ਅੱਖਾਂ", "ਕੰਨ", "ਛਾਤੀ", "ਪੇਟ", "ਜੋੜ", "ਕੋਈ ਨਹੀਂ"],
    ayush_prakriti: ["ਵਾਤ", "ਪਿੱਤ", "ਕਫ਼", "ਵਾਤ-ਪਿੱਤ", "ਪਿੱਤ-ਕਫ਼"],
    ayush_vikriti: ["ਬੇਚੈਨੀ", "ਗਰਮੀ/ਸੋਜ਼", "ਭਾਰੀਪਣ"],
    ayush_agni: ["ਅਨਿਯਮਿਤ ਭੁੱਖ", "ਤੇਜ਼ ਭੁੱਖ", "ਕਮਜ਼ੋਰ ਭੁੱਖ"],
    ayush_koshtha: ["ਨਿਯਮਿਤ", "ਕਦੇ-ਕਦੇ", "ਕਬਜ਼"],
    ayush_ahara_vihara: ["ਗਰਮ ਖਾਣਾ", "ਮਸਾਲੇਦਾਰ", "ਦੇਰ ਨਾਲ ਸੌਣਾ"],
    ayush_nidana: ["ਤਣਾਅ", "ਠੰਡ", "ਬਾਸੀ ਖਾਣਾ"],
    ayush_samprapti: ["ਖਾਣੇ ਤੋਂ ਬਾਅਦ", "ਸਵੇਰੇ", "ਰਾਤ ਨੂੰ"],
  },
  ur: {
    chief_complaint: ["بخار", "درد", "قے", "سانس لینے میں دشواری", "چکر", "کمزوری", "کھانسی", "پیٹ درد"],
    hpi: ["آج سے", "2–3 دن", "1 ہفتہ", "1 مہینہ", "جلن", "دباؤ", "ہلکا", "شدید"],
    past_history: ["ذیابیطس", "ہائی BP", "دل کی بیماری", "ٹی بی", "آپریشن", "کچھ نہیں"],
    drug_allergy: ["ہاں، دوائی لیتا ہوں", "نہیں", "پینیسیلین", "سلفا", "اسپرین", "کچھ نہیں"],
    family_history: ["ذیابیطس", "ہائی BP", "دل کی بیماری", "کینسر", "ٹی بی", "کچھ نہیں"],
    personal_history: ["سگریٹ نوشی", "شراب", "تمباکو", "سبزی خور", "کچھ نہیں"],
    review_of_systems: ["آنکھیں", "کان", "سینہ", "پیٹ", "جوڑ", "کچھ نہیں"],
    ayush_prakriti: ["وات", "پت", "کف", "وات-پت", "پت-کফ"],
    ayush_vikriti: ["بے چینی", "گرمی/سوزش", "بھاری پن"],
    ayush_agni: ["بے ترتیب بھوک", "تیز بھوک", "کمزور بھوک"],
    ayush_koshtha: ["باقاعدہ", "کبھی کبھی", "قبض"],
    ayush_ahara_vihara: ["گرم کھانا", "مسالے دار", "دیر سے سونا"],
    ayush_nidana: ["تناؤ", "ٹھنڈ", "باسی کھانا"],
    ayush_samprapti: ["کھانے کے بعد", "صبح", "رات"],
  },
};


export default function HistoryPage() {
  const router = useRouter();
  const [lang, setLang] = useState("hi");
  const [interviewMode, setInterviewMode] = useState<InterviewMode>("allopathic");
  const [stage, setStage] = useState<Stage>("chief_complaint");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [patientInput, setPatientInput] = useState("");
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [inputMode, setInputMode] = useState<"voice" | "touch">("voice");
  const [aiLoading, setAiLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [summary, setSummary] = useState<StructuredSummary | null>(null);
  const [voiceError, setVoiceError] = useState("");
  const hasAskedFirst = useRef(false);

  // Always use combined mode (allopathic + AYUSH stages for everyone)
  const STAGES = COMBINED_STAGES;
  const stageIndex = STAGES.indexOf(stage);
  const progress = Math.round(((stageIndex + 1) / (STAGES.length + 1)) * 80) + 5;

  // ── Read sessionStorage + kick off first question ─────────────
  useEffect(() => {
    const savedLang = sessionStorage.getItem("mk_lang") ?? "hi";
    const savedMode = (sessionStorage.getItem("mk_mode") ?? "allopathic") as InterviewMode;
    setLang(savedLang);
    setInterviewMode(savedMode);
    // Fetch first question with the CORRECT language + mode immediately
    if (!hasAskedFirst.current) {
      hasAskedFirst.current = true;
      setAiLoading(true);
      fetch("/api/history/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang: savedLang, messages: [], stage: "chief_complaint", mode: savedMode }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.question) setCurrentQuestion(data.question);
          setAiLoading(false);
        })
        .catch(() => {
          const FIRST_Q: Record<string, string> = {
            hi: "आज आपको मुख्य रूप से क्या तकलीफ है?",
            en: "What is your main problem today?",
            ta: "இன்று உங்கள் முக்கிய பிரச்சனை என்ன?",
            te: "మీకు ఈ రోజు ప్రధాన సమస్య ఏమిటి?",
            bn: "আজ আপনার প্রধান সমস্যা কী?",
            mr: "आज तुम्हाला मुख्यत्वे काय त्रास आहे?",
            gu: "આજે તમારી મુખ્ય સમસ્યા શું છે?",
            kn: "ಇಂದು ನಿಮ್ಮ ಮುಖ್ಯ ಸಮಸ್ಯೆ ಏನು?",
            ml: "ഇന്ന് നിങ്ങളുടെ പ്രധാന പ്രശ്നം എന്താണ്?",
            pa: "ਅੱਜ ਤੁਹਾਡੀ ਮੁੱਖ ਸਮੱਸਿਆ ਕੀ ਹੈ?",
            ur: "آج آپ کا اہم مسئلہ کیا ہے؟",
          };
          setCurrentQuestion(FIRST_Q[savedLang] ?? FIRST_Q["hi"]);
          setAiLoading(false);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Voice session ────────────────────────────────────────────
  const voice = useVoiceSession({
    lang,
    onTranscript: (text) => {
      setPatientInput(text);
    },
    onError: (msg) => setVoiceError(msg),
  });

  // ── Speak question when it changes ───────────────────────────
  useEffect(() => {
    if (currentQuestion && voice.isSupported) {
      voice.speak(currentQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion]);

  // ── API call to Gemini ───────────────────────────────────────
  const fetchNextQuestion = useCallback(
    async (forStage: Stage, history: ChatMessage[]) => {
      setAiLoading(true);
      try {
        const res = await fetch("/api/history/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lang, messages: history, stage: forStage, mode: interviewMode }),
        });
        const data = await res.json();
        if (data.isComplete && data.structuredSummary) {
          setSummary(data.structuredSummary);
          setIsComplete(true);
        } else {
          setStage(forStage); // sync breadcrumb to the question being ASKED, not the next stage
          setCurrentQuestion(data.question);
        }
      } catch {
        // Offline fallback — multilingual static questions per stage
        const OFFLINE_FALLBACKS: Record<string, Record<Stage, string>> = {
          hi: {
            chief_complaint: "आज आपको मुख्य रूप से क्या तकलीफ है?",
            hpi: "यह तकलीफ कब से है, कैसी है?",
            past_history: "क्या पहले कोई बड़ी बीमारी हुई है?",
            drug_allergy: "क्या आप कोई दवाई ले रहे हैं?",
            family_history: "परिवार में किसी को बड़ी बीमारी है?",
            personal_history: "आप क्या काम करते हैं? धूम्रपान/शराब?",
            review_of_systems: "किसी और अंग में तकलीफ है?",
            ayush_prakriti: "आपकी त्वचा कैसी है?",
            ayush_vikriti: "अभी कैसा महसूस कर रहे हैं?",
            ayush_agni: "भूख कैसी है?",
            ayush_koshtha: "पेट साफ कैसे होता है?",
            ayush_ahara_vihara: "आप क्या खाते हैं?",
            ayush_nidana: "तकलीफ से पहले क्या बदला?",
            ayush_samprapti: "तकलीफ कब बढ़ती है?",
            summary: "",
          },
          en: {
            chief_complaint: "What is your main problem today?",
            hpi: "When did it start, how does it feel?",
            past_history: "Any past major illness or surgery?",
            drug_allergy: "Any medicines or allergies?",
            family_history: "Family history of major diseases?",
            personal_history: "Occupation? Smoke or drink?",
            review_of_systems: "Any other body part issues?",
            ayush_prakriti: "How is your skin usually?",
            ayush_vikriti: "How do you feel now?",
            ayush_agni: "How is your appetite?",
            ayush_koshtha: "How is your bowel movement?",
            ayush_ahara_vihara: "What do you usually eat?",
            ayush_nidana: "What changed before this problem?",
            ayush_samprapti: "When does it worsen?",
            summary: "",
          },
          ta: {
            chief_complaint: "இன்று உங்கள் முக்கிய பிரச்சினை என்ன?",
            hpi: "இது எப்போது தொடங்கியது?",
            past_history: "முன்பு ஏதாவது பெரிய நோய் வந்ததுண்டா?",
            drug_allergy: "மருந்து அல்லது ஒவ்வாமை உள்ளதா?",
            family_history: "குடும்பத்தில் நோய் வரலாறு?",
            personal_history: "உங்கள் தொழில் என்ன?",
            review_of_systems: "வேறு உறுப்புகளில் பிரச்சனை?",
            ayush_prakriti: "உங்கள் தோல் எப்படி இருக்கும்?",
            ayush_vikriti: "இப்போது எப்படி உணர்கிறீர்கள்?",
            ayush_agni: "பசி எப்படி உள்ளது?",
            ayush_koshtha: "மலம் எப்படி?",
            ayush_ahara_vihara: "என்ன சாப்பிடுவீர்கள்?",
            ayush_nidana: "என்ன மாற்றம் ஏற்பட்டது?",
            ayush_samprapti: "எப்போது அதிகரிக்கிறது?",
            summary: "",
          },
          te: {
            chief_complaint: "ఈరోజు మీ ప్రధాన సమస్య ఏమిటి?",
            hpi: "ఇది ఎప్పుడు మొదలైంది?",
            past_history: "గతంలో ఏదైనా పెద్ద వ్యాధి వచ్చిందా?",
            drug_allergy: "మందులు లేదా అలర్జీ ఉందా?",
            family_history: "కుటుంబంలో వ్యాధుల చరిత్ర?",
            personal_history: "మీ వృత్తి ఏమిటి?",
            review_of_systems: "ఇతర భాగాల్లో సమస్య?",
            ayush_prakriti: "మీ చర్మం ఎలా ఉంటుంది?",
            ayush_vikriti: "ఇప్పుడు ఎలా అనిపిస్తోంది?",
            ayush_agni: "ఆకలి ఎలా ఉంది?",
            ayush_koshtha: "మలవిసర్జన ఎలా ఉంది?",
            ayush_ahara_vihara: "ఏమి తింటారు?",
            ayush_nidana: "ఏమి మారింది?",
            ayush_samprapti: "ఎప్పుడు పెరుగుతుంది?",
            summary: "",
          },
          bn: {
            chief_complaint: "আজ আপনার প্রধান সমস্যা কী?",
            hpi: "এটি কখন শুরু হয়েছে?",
            past_history: "আগে কোনো বড় রোগ হয়েছিল?",
            drug_allergy: "ওষুধ বা অ্যালার্জি?",
            family_history: "পরিবারে রোগের ইতিহাস?",
            personal_history: "আপনার পেশা কী?",
            review_of_systems: "অন্য অঙ্গে সমস্যা?",
            ayush_prakriti: "আপনার ত্বক কেমন?",
            ayush_vikriti: "এখন কেমন লাগছে?",
            ayush_agni: "ক্ষুধা কেমন?",
            ayush_koshtha: "মলত্যাগ কেমন?",
            ayush_ahara_vihara: "কী খান সাধারণত?",
            ayush_nidana: "কী পরিবর্তন হয়েছিল?",
            ayush_samprapti: "কখন বাড়ে?",
            summary: "",
          },
          mr: {
            chief_complaint: "आज तुमची मुख्य समस्या काय आहे?",
            hpi: "हा त्रास कधीपासून आहे?",
            past_history: "आधी काही मोठा आजार झाला होता का?",
            drug_allergy: "औषधे किंवा ॲलर्जी?",
            family_history: "कुटुंबात आजाराचा इतिहास?",
            personal_history: "तुमचा व्यवसाय काय?",
            review_of_systems: "इतर अवयवांत त्रास?",
            ayush_prakriti: "तुमची त्वचा कशी असते?",
            ayush_vikriti: "आत्ता कसे वाटते?",
            ayush_agni: "भूक कशी आहे?",
            ayush_koshtha: "मलशुद्धी कशी होते?",
            ayush_ahara_vihara: "काय खाता सहसा?",
            ayush_nidana: "काय बदलले?",
            ayush_samprapti: "केव्हा वाढतो त्रास?",
            summary: "",
          },
          gu: {
            chief_complaint: "આજે તમારી મુખ્ય સમસ્યા શું છે?",
            hpi: "આ ક્યારે શરૂ થઈ?",
            past_history: "પહેલા કોઈ મોટી બીમારી?",
            drug_allergy: "દવા કે એલર્જી?",
            family_history: "પરિવારમાં બીમારીઓ?",
            personal_history: "તમારો વ્યવસાય?",
            review_of_systems: "અન્ય ભાગોમાં તકલીફ?",
            ayush_prakriti: "ત્વચા કેવી?",
            ayush_vikriti: "હવે કેવું?",
            ayush_agni: "ભૂખ કેવી?",
            ayush_koshtha: "ઝાડા-સ્થિતિ?",
            ayush_ahara_vihara: "ખોરાક?",
            ayush_nidana: "પહેલા શું બદલ્યું?",
            ayush_samprapti: "ક્યારે વધે?",
            summary: "",
          },
          kn: {
            chief_complaint: "ಇಂದು ನಿಮ್ಮ ಮುಖ್ಯ ಸಮಸ್ಯೆ ಏನು?",
            hpi: "ಇದು ಯಾವಾಗ ಪ್ರಾರಂಭವಾಯಿತು?",
            past_history: "ಮೊದಲು ದೊಡ್ಡ ಕಾಯಿಲೆ ಬಂದಿತ್ತೇ?",
            drug_allergy: "ಔಷಧ ಅಥವಾ ಅಲರ್ಜಿ?",
            family_history: "ಕುಟುಂಬದ ಕಾಯಿಲೆ ಇತಿಹಾಸ?",
            personal_history: "ನಿಮ್ಮ ವೃತ್ತಿ ಏನು?",
            review_of_systems: "ಇತರ ಭಾಗಗಳಲ್ಲಿ ಸಮಸ್ಯೆ?",
            ayush_prakriti: "ಚರ್ಮ ಹೇಗಿದೆ?",
            ayush_vikriti: "ಈಗ ಹೇಗನಿಸಿದೆ?",
            ayush_agni: "ಹಸಿವು ಹೇಗಿದೆ?",
            ayush_koshtha: "ಮಲ ವಿಸರ್ಜನೆ?",
            ayush_ahara_vihara: "ಆಹಾರ?",
            ayush_nidana: "ಏನು ಬದಲಾಯಿತು?",
            ayush_samprapti: "ಯಾವಾಗ ಹೆಚ್ಚಾಗುತ್ತದೆ?",
            summary: "",
          },
          ml: {
            chief_complaint: "ഇന്ന് നിങ്ങളുടെ പ്രധാന പ്രശ്നം എന്താണ്?",
            hpi: "ഇത് എപ്പോൾ തുടങ്ങി?",
            past_history: "മുൻ വലിയ രോഗം ഉണ്ടായിരുന്നോ?",
            drug_allergy: "മരുന്ന് അല്ലെങ്കിൽ ആലർജി?",
            family_history: "കുടുംബ ചരിത്രം?",
            personal_history: "തൊഴിൽ?",
            review_of_systems: "ഇതര ഭാഗങ്ങളിൽ പ്രശ്നം?",
            ayush_prakriti: "ചർമം?",
            ayush_vikriti: "ഇപ്പോൾ?",
            ayush_agni: "വിശപ്പ്?",
            ayush_koshtha: "മലവിസർജ്ജനം?",
            ayush_ahara_vihara: "ഭക്ഷണം?",
            ayush_nidana: "മാറ്റം?",
            ayush_samprapti: "എപ്പോൾ?",
            summary: "",
          },
          pa: {
            chief_complaint: "ਅੱਜ ਤੁਹਾਡੀ ਮੁੱਖ ਸਮੱਸਿਆ ਕੀ ਹੈ?",
            hpi: "ਇਹ ਕਦੋਂ ਸ਼ੁਰੂ ਹੋਇਆ?",
            past_history: "ਪਹਿਲਾਂ ਕੋਈ ਵੱਡੀ ਬਿਮਾਰੀ?",
            drug_allergy: "ਦਵਾਈ ਜਾਂ ਐਲਰਜੀ?",
            family_history: "ਪਰਿਵਾਰ ਵਿੱਚ ਬਿਮਾਰੀਆਂ?",
            personal_history: "ਕੰਮ ਕੀ ਕਰਦੇ ਹੋ?",
            review_of_systems: "ਹੋਰ ਅੰਗਾਂ ਵਿੱਚ ਤਕਲੀਫ਼?",
            ayush_prakriti: "ਚਮੜੀ ਕਿਹੋ ਜਿਹੀ?",
            ayush_vikriti: "ਹੁਣ ਕਿਵੇਂ?",
            ayush_agni: "ਭੁੱਖ?",
            ayush_koshtha: "ਪੇਟ ਸਾਫ਼?",
            ayush_ahara_vihara: "ਖਾਣਾ?",
            ayush_nidana: "ਕੀ ਬਦਲਿਆ?",
            ayush_samprapti: "ਕਦੋਂ ਵਧਦਾ?",
            summary: "",
          },
        };
        const langFallbacks = OFFLINE_FALLBACKS[lang] ?? OFFLINE_FALLBACKS["hi"];
        setCurrentQuestion(langFallbacks[forStage]);
      } finally {
        setAiLoading(false);
      }
    },
    [lang]
  );

  // ── Submit patient answer ────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    const answer = selectedChips.length > 0
      ? selectedChips.join(", ")
      : patientInput.trim();

    if (!answer) return;

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: "ai", text: currentQuestion, stage },
      { role: "patient", text: answer, stage },
    ];
    setMessages(newMessages);
    setPatientInput("");
    setSelectedChips([]);

    const nextStage = STAGES[stageIndex + 1] ?? "summary";

    if (nextStage === "summary" || stageIndex >= STAGES.length - 1) {
      // Fetch structured summary
      setAiLoading(true);
      try {
        const res = await fetch("/api/history/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lang,
            messages: newMessages,
            stage: "medications", // triggers summary generation
          }),
        });
        const data = await res.json();
        if (data.structuredSummary) {
          setSummary(data.structuredSummary);
          setIsComplete(true);
          // Save to sessionStorage for summary page
          sessionStorage.setItem("mk_history", JSON.stringify({
            messages: newMessages,
            summary: data.structuredSummary,
          }));
        } else {
          // Gemini returned no summary — build one from raw messages
          const built = buildSummaryFromMessages(newMessages);
          setSummary(built);
          setIsComplete(true);
          sessionStorage.setItem("mk_history", JSON.stringify({
            messages: newMessages,
            summary: built,
          }));
        }
      } catch {
        // Gemini quota hit or network error — build summary directly from patient answers
        const built = buildSummaryFromMessages(newMessages);
        setSummary(built);
        setIsComplete(true);
        sessionStorage.setItem("mk_history", JSON.stringify({
          messages: newMessages,
          summary: built,
        }));
      } finally {
        setAiLoading(false);
      }
    } else {
      setCurrentQuestion(""); // clear stale question while loading next
      await fetchNextQuestion(nextStage as Stage, newMessages);
    }
  }, [selectedChips, patientInput, messages, currentQuestion, stage, stageIndex, lang, fetchNextQuestion]);

  // ── Complete → go to scan page ───────────────────────────────
  useEffect(() => {
    if (isComplete && summary) {
      setTimeout(() => router.push("/scan"), 1200);
    }
  }, [isComplete, summary, router]);

  // ── Chip toggle ───────────────────────────────────────────────
  function toggleChip(chip: string) {
    setSelectedChips((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
    );
  }

  const canSubmit = selectedChips.length > 0 || patientInput.trim().length > 1;
  const chips = (TOUCH_OPTIONS_L10N[lang] ?? TOUCH_OPTIONS_L10N["hi"])[stage] ?? COMMON_SYMPTOMS.slice(0, 8).map((s) => s.labelHi);

  // ── Complete screen ──────────────────────────────────────────
  if (isComplete) {
    return (
      <KioskScreen>
        <KioskBody className="flex flex-col items-center justify-center gap-4 py-16">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-6xl"
          >
            ✅
          </motion.div>
          <h2 className="text-xl font-bold text-neutral-900 text-center">
            {t(lang, "historyComplete")}
          </h2>
          <p className="text-sm text-neutral-400 text-center">
            History complete — moving to documents...
          </p>
          <div className="flex gap-1.5 mt-2">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-2 w-2 rounded-full bg-brand-500 animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
        </KioskBody>
      </KioskScreen>
    );
  }

  return (
    <KioskScreen>
      <KioskHeader
        title={t(lang, "uploadDocuments").replace("Upload", "").trim() || "इतिहास"}
        subtitle={`Medical History · Stage ${stageIndex + 1} / ${STAGES.length}`}
        onBack={() => router.push("/consent")}
        progress={progress}
        stepLabel={`${stageIndex + 1} / ${STAGES.length}`}
        rightSlot={
          <div className="flex gap-1.5">
            <button
              onClick={() => setInputMode("voice")}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                inputMode === "voice"
                  ? "bg-brand-600 text-white"
                  : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
              )}
            >
              🎙️ {t(lang, "voiceMode")}
            </button>
            <button
              onClick={() => setInputMode("touch")}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                inputMode === "touch"
                  ? "bg-secondary-500 text-white"
                  : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
              )}
            >
              👆 {t(lang, "touchMode")}
            </button>
          </div>
        }
      />

      <KioskBody className="space-y-4">
        {/* Stage badge */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {(STAGES as Stage[]).map((s: Stage, i: number) => (
            <span
              key={s}
              className={cn(
                "shrink-0 text-xs px-2.5 py-1 rounded-full font-semibold transition-all",
                i < stageIndex
                  ? "bg-brand-600 text-white"
                  : i === stageIndex
                  ? "bg-secondary-500 text-white"
                  : "bg-neutral-100 text-neutral-400"
              )}
            >
              {i < stageIndex ? "✓" : i + 1} {getStageLabels(lang)[s as Stage]}
            </span>
          ))}

        </div>

        {/* AI Question bubble */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-brand-50 border border-brand-100 rounded-2xl p-4"
          >
            {aiLoading ? (
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-brand-600 flex items-center justify-center shrink-0 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo.png" alt="ArogyaKiosk" className="h-7 w-7 rounded-full object-cover" />
                </div>
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="h-2 w-2 rounded-full bg-brand-400 animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <button
                  onClick={() => voice.speak(currentQuestion)}
                  className="h-9 w-9 rounded-full bg-brand-600 flex items-center justify-center
                             text-white text-sm shrink-0 hover:bg-brand-700 transition-colors"
                  title="Play audio"
                >
                  {voice.isSpeaking ? "⏸" : "🔊"}
                </button>
                <p className="text-lg font-bold text-neutral-900 leading-snug pt-1">
                  {currentQuestion}
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* ── VOICE MODE ── */}
        {inputMode === "voice" && (
          <div className="flex flex-col items-center gap-4 py-2">
            {/* Big mic button */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={voice.isListening ? voice.stopListening : voice.startListening}
              className={cn(
                "h-24 w-24 rounded-full flex items-center justify-center text-4xl",
                "shadow-lg transition-all duration-200",
                voice.isListening
                  ? "bg-red-500 text-white animate-pulse"
                  : "bg-brand-600 text-white hover:bg-brand-700"
              )}
            >
              {voice.isListening ? "⏹" : "🎙️"}
            </motion.button>

            <p className="text-sm font-semibold text-neutral-500">
              {voice.isListening
                ? t(lang, "listening")
                : t(lang, "tapToSpeak")}
            </p>

            {/* Live transcript */}
            {voice.transcript && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full bg-neutral-50 rounded-xl border border-neutral-200 p-3"
              >
                <p className="text-xs text-neutral-400 mb-1">{t(lang, "transcribed")}:</p>
                <p className="text-base font-semibold text-neutral-800">{voice.transcript}</p>
              </motion.div>
            )}

            {/* Override with text if voice failed */}
            {patientInput && (
              <div className="w-full">
                <input
                  type="text"
                  value={patientInput}
                  onChange={(e) => setPatientInput(e.target.value)}
                  className="w-full border-2 border-brand-200 rounded-xl px-4 py-3
                             text-base focus:outline-none focus:border-brand-500"
                  placeholder="या यहाँ टाइप करें..."
                />
              </div>
            )}

            {voiceError && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 flex items-start gap-2">
                <span className="text-base shrink-0 mt-0.5">⚠️</span>
                <div className="min-w-0">
                  <p className="text-xs text-amber-800 font-semibold leading-snug">{voiceError}</p>
                  <p className="text-[10px] text-amber-600 mt-0.5">Use the touch chips or text box below to answer.</p>
                </div>
                <button
                  onClick={() => setVoiceError("")}
                  className="ml-auto text-amber-400 hover:text-amber-600 text-sm shrink-0"
                  aria-label="Dismiss"
                >✕</button>
              </div>
            )}

            <p className="text-xs text-neutral-400">{t(lang, "orTapBelow")}</p>
          </div>
        )}

        {/* ── TOUCH MODE ── */}
        {inputMode === "touch" && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {chips.map((chip) => (
                <button
                  key={chip}
                  onClick={() => toggleChip(chip)}
                  className={cn(
                    "px-4 py-2.5 rounded-full text-sm font-semibold transition-all",
                    "border-2 min-h-[44px]",
                    selectedChips.includes(chip)
                      ? "bg-brand-600 border-brand-600 text-white"
                      : "bg-white border-neutral-200 text-neutral-700 hover:border-brand-300"
                  )}
                >
                  {chip}
                </button>
              ))}
            </div>
            {/* Freeform text */}
            <input
              type="text"
              value={patientInput}
              onChange={(e) => setPatientInput(e.target.value)}
              className="w-full border-2 border-neutral-200 rounded-xl px-4 py-3
                         text-base focus:outline-none focus:border-brand-500 transition-colors"
              placeholder={`${t(lang, "yourMainProblem")} (वैकल्पिक)`}
            />
          </div>
        )}

        {/* AudioWave indicator when listening */}
        {voice.isListening && (
          <div className="flex justify-center">
            <AudioWave active={true} bars={9} />
          </div>
        )}
      </KioskBody>

      <KioskFooter>
        <Button
          variant="primary"
          size="xl"
          fullWidth
          disabled={!canSubmit || aiLoading || voice.isListening}
          loading={aiLoading}
          onClick={handleSubmit}
        >
          {stageIndex >= STAGES.length - 1
            ? `✅ ${t(lang, "done")}`
            : `${t(lang, "next")} →`}
        </Button>
      </KioskFooter>
    </KioskScreen>
  );
}
