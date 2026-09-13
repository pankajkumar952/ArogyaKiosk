// src/app/api/history/chat/route.ts
// Gemini-powered adaptive clinical history-taking AI — RAG-enhanced.
// Generates the next clinical question using:
//   1. RAG context retrieved from clinical knowledge base
//   2. AYUSH Dashavidha Pariksha mode when requested
//   3. Red-flag detection via emergency RAG chunks
//   4. Fallback static questions when Gemini / RAG unavailable

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { embedText } from "@/lib/rag/embedder";
import {
  retrieveByVector,
  retrieveByKeyword,
  hasEmergencyTrigger,
  formatContextForLLM,
} from "@/lib/rag/retriever";
import type { KnowledgeDomain } from "@/lib/rag/knowledge-base";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const LANG_NAMES: Record<string, string> = {
  hi: "Hindi",   en: "English",    bn: "Bengali",   ta: "Tamil",
  te: "Telugu",  mr: "Marathi",    gu: "Gujarati",  kn: "Kannada",
  ml: "Malayalam", pa: "Punjabi",  ur: "Urdu",      or: "Odia",
  as: "Assamese", bo: "Bodo",      doi: "Dogri",    kok: "Konkani",
  mai: "Maithili", mni: "Manipuri", ne: "Nepali",   sa: "Sanskrit",
  sat: "Santali", sd: "Sindhi",    ks: "Kashmiri",  mni_mtei: "Meitei",
};

// ── Allopathic stages ────────────────────────────────────────────────────────
const ALLOPATHIC_STAGES = [
  "chief_complaint", "hpi", "past_history", "drug_allergy",
  "family_history", "personal_history", "review_of_systems", "summary",
] as const;

// ── AYUSH Dashavidha Pariksha stages ─────────────────────────────────────────
const AYUSH_STAGES = [
  "chief_complaint", "hpi", "past_history", "drug_allergy",
  "family_history", "personal_history",
  "ayush_prakriti",      // Constitution (Vata/Pitta/Kapha)
  "ayush_vikriti",       // Current dosha imbalance
  "ayush_agni",          // Digestive capacity
  "ayush_koshtha",       // Bowel nature
  "ayush_ahara_vihara",  // Diet and lifestyle
  "ayush_nidana",        // Causative factors
  "ayush_samprapti",     // Pathogenesis
  "summary",
] as const;

type AllopathicStage = typeof ALLOPATHIC_STAGES[number];
type AyushStage = typeof AYUSH_STAGES[number];
export type Stage = AllopathicStage | AyushStage;
export type InterviewMode = "allopathic" | "ayush";

export interface ChatMessage {
  role: "ai" | "patient";
  text: string;
  stage?: Stage;
}

export interface ChatRequest {
  lang: string;
  messages: ChatMessage[];
  stage: Stage;
  mode?: InterviewMode;
  /** Chief complaint text (for RAG retrieval) */
  chiefComplaint?: string;
}

export interface ChatResponse {
  question: string;
  nextStage: Stage;
  isComplete: boolean;
  emergencyTriage?: boolean;
  ragChunksUsed?: number;
  structuredSummary?: StructuredSummary;
}

export interface StructuredSummary {
  chiefComplaint: string;
  hpi: string;
  pastHistory: string;
  drugAllergy: string;
  familyHistory: string;
  personalHistory: string;
  reviewOfSystems: string;
  // Legacy compat fields (kept for fallback builder)
  duration?: string;
  severity?: string;
  character?: string;
  associatedSymptoms?: string[];
  currentMedications?: string;
  suggestedICD10: string;
  redFlags: string[];
  ayushNote: string;
  // AYUSH Dashavidha Pariksha (all 7 params)
  prakriti?: string;
  vikriti?: string;
  agniType?: string;
  koshtha?: string;
  aharaVihara?: string;
  nidana?: string;
  samprapti?: string;
}

// ── Stage sequencing ─────────────────────────────────────────────────────────

function getStageList(mode: InterviewMode): readonly Stage[] {
  // "combined" = all stages (allopathic + AYUSH merged). API treats it as ayush (full list).
  if (mode === "combined" as string) return AYUSH_STAGES;
  return mode === "ayush" ? AYUSH_STAGES : ALLOPATHIC_STAGES;
}

function getNextStage(current: Stage, mode: InterviewMode): Stage {
  const stages = getStageList(mode);
  const idx = stages.indexOf(current as never);
  if (idx === -1 || idx >= stages.length - 1) return "summary";
  return stages[idx + 1];
}

function isLastQuestionStage(stage: Stage, mode: InterviewMode): boolean {
  const stages = getStageList(mode);
  // Stage just before "summary" triggers summary generation
  return stage === stages[stages.length - 2];
}

// ── RAG retrieval helper ──────────────────────────────────────────────────────

async function fetchRAGContext(
  query: string,
  domain: KnowledgeDomain | KnowledgeDomain[],
  k = 3
): Promise<{ context: string; emergencyTriage: boolean; chunksUsed: number }> {
  try {
    let results;
    if (process.env.GEMINI_API_KEY) {
      try {
        const embedding = await embedText(query);
        results = await retrieveByVector(embedding, { k, domain });
      } catch {
        results = await retrieveByKeyword(query, { k, domain });
      }
    } else {
      results = await retrieveByKeyword(query, { k, domain });
    }

    return {
      context: formatContextForLLM(results),
      emergencyTriage: hasEmergencyTrigger(results),
      chunksUsed: results.length,
    };
  } catch {
    return { context: "", emergencyTriage: false, chunksUsed: 0 };
  }
}

const LANG_SCRIPTS: Record<string, string> = {
  hi: "हिंदी (Devanagari)",    en: "English",
  bn: "বাংলা (Bengali)",       ta: "தமிழ் (Tamil)",
  te: "తెలుగు (Telugu)",        mr: "मराठी (Devanagari)",
  gu: "ગુજરાતી (Gujarati)",    kn: "ಕನ್ನಡ (Kannada)",
  ml: "മലയാളം (Malayalam)",    pa: "ਪੰਜਾਬੀ (Gurmukhi)",
  ur: "اردو (Nastaliq)",        or: "ଓଡ଼ିଆ (Odia)",
  as: "অসমীয়া (Assamese)",     bo: "བོད་སྐད། (Tibetan)",
  doi: "डोगरी (Devanagari)",   kok: "कोंकणी (Devanagari)",
  mai: "मैथिली (Devanagari)",  mni: "মণিপুরী (Bengali script)",
  ne: "नेपाली (Devanagari)",   sa: "संस्कृत (Devanagari)",
  sat: "ᱥᱟᱱᱛᱟᱲᱤ (Ol Chiki)", sd: "سنڌي (Khudawadi)",
  ks: "کٲشُر (Nastaliq)",       mni_mtei: "ꯃꯤꯇꯩ (Meitei Mayek)",
};

function buildSystemPrompt(
  lang: string,
  mode: InterviewMode,
  ragContext: string
): string {
  const langName = LANG_NAMES[lang] ?? "Hindi";
  const langScript = LANG_SCRIPTS[lang] ?? langName;

  const ragSection = ragContext
    ? `\n\n--- CLINICAL KNOWLEDGE (use this to guide relevant follow-up) ---\n${ragContext}\n--- END CLINICAL KNOWLEDGE ---`
    : "";

  return `You are ArogyaKiosk — an empathetic clinical history-taking AI assistant deployed at Indian government hospitals and kiosks.

CORE ROLE: Gather medical history from patients BEFORE they see the doctor. You are NOT diagnosing — only listening and asking follow-up questions.

LANGUAGE (CRITICAL): You MUST respond ONLY in ${langName} (${langScript}).
- NEVER mix languages. Every word must be in ${langName} native script.
- If the patient replies in another language, still respond only in ${langName}.
- Medical terms should be simplified to everyday village-level ${langName} words.
- Do NOT use transliterated Roman script — use the proper native script only.

CONVERSATION STYLE:
- You are like a kind, warm doctor's assistant.
- React to what the patient ACTUALLY said — acknowledge their answer first if needed.
- Ask ONE specific follow-up question based on what they told you.
- Keep the question SHORT (under 15 words in ${langName}).
- Be empathetic — the patient may be anxious or in pain.
- Ask what a real doctor would naturally ask next, given the patient's exact words.

CRITICAL RULE — NO HARDCODED QUESTIONS:
- NEVER ask a generic template question like "When did it start, how severe is it?"
- ALWAYS base your question on the patient's specific answer.
- If patient says "fever", ask about temperature, chills, timing etc.
- If patient says "awesome" or something nonsensical, gently re-ask to clarify their main problem.
- If patient says "chest pain", ask about radiation to arm/jaw, breathing difficulty, sweating.
- Adapt! Every patient gets a unique conversation.

For the SUMMARY stage only: return ONLY valid JSON — no other text.${ragSection}`;
}

// ── Summary prompt ────────────────────────────────────────────────────────────

function buildSummaryPrompt(
  messages: ChatMessage[],
  mode: InterviewMode
): string {
  const conversationText = messages
    .map((m) => `${m.role === "ai" ? "Doctor" : "Patient"}: ${m.text}`)
    .join("\n");

  const isAyushMode = mode === "ayush" || (mode as string) === "combined";
  const ayushFields = isAyushMode
      ? `
  "prakriti": "Vata/Pitta/Kapha constitution based on patient's description",
  "vikriti": "current dosha imbalance",
  "agniType": "Sama/Vishama/Tikshna/Manda — digestive capacity",
  "koshtha": "Krura/Mridu/Madhyama — bowel nature",
  "aharaVihara": "diet and lifestyle summary",
  "nidana": "causative factors identified",
  "samprapti": "pathogenesis / disease progression pattern",`
      : "";

  return `Based on this clinical conversation, generate a structured medical summary.
Return ONLY valid JSON. No extra text, no markdown fences.

Conversation:
${conversationText}

JSON Schema:
{
  "chiefComplaint": "one line summary of main complaint",
  "hpi": "detailed history of present illness — onset, duration, character, severity, radiation, associated symptoms",
  "pastHistory": "past medical/surgical/obstetric history or 'None reported'",
  "drugAllergy": "current medications and allergies or 'None'",
  "familyHistory": "family history of diseases or 'None reported'",
  "personalHistory": "occupation, habits (smoking/alcohol/tobacco), diet or 'None reported'",
  "reviewOfSystems": "review of other organ systems — eyes, ears, chest, abdomen, joints, etc.",
  "currentMedications": "current medications or 'None'",
  "suggestedICD10": "ICD-10 code + name (best guess)",
  "redFlags": ["urgent symptoms needing immediate attention — empty array if none"],
  "ayushNote": "AYUSH-specific clinical note or Dashavidha Pariksha summary"${ayushFields}
}`;
}

// ── Gemini call helper ────────────────────────────────────────────────────────

async function callGemini(systemPrompt: string, userPrompt: string): Promise<string | null> {
  // gemini-2.0-flash deprecated (404). Use 2.5-flash primary, 1.5-flash as fallback.
  const modelsToTry = [
    process.env.GEMINI_MODEL,
    "gemini-2.5-flash",
    "gemini-1.5-flash",
  ].filter(Boolean) as string[];

  for (const model of modelsToTry) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response: any = await ai.models.generateContent({
          model,
          contents: [
            { role: "user", parts: [{ text: systemPrompt }] },
            { role: "model", parts: [{ text: "Understood. I will ask one contextual question at a time in the patient's language." }] },
            { role: "user", parts: [{ text: userPrompt }] },
          ],
        });
        if (response?.text) return response.text.trim();
        break; // null response but not an error — try next model
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
          // Rate limited — wait 6 seconds then retry once
          if (attempt === 0) {
            await new Promise((r) => setTimeout(r, 6000));
            continue;
          }
          // Still failing — try next model
        }
        // Other error (404 deprecated, etc.) — try next model immediately
        break;
      }
    }
  }
  return null;
}

// ── Fallback questions ────────────────────────────────────────────────────────

const FALLBACK_QUESTIONS: Partial<Record<Stage, Record<string, string>>> = {
  chief_complaint: {
    hi: "आज आपको मुख्य रूप से क्या तकलीफ है?",
    en: "What is your main problem today?",
    bn: "আজ আপনার প্রধান সমস্যা কী?",
    ta: "இன்று உங்கள் முக்கிய பிரச்சனை என்ன?",
    te: "ఈ రోజు మీ ప్రధాన సమస్య ఏమిటి?",
    mr: "आज तुम्हाला मुख्य त्रास काय आहे?",
    gu: "આજે તમારી મુખ્ય ફરિયાદ શું છે?",
    kn: "ಇಂದು ನಿಮ್ಮ ಮುಖ್ಯ ಸಮಸ್ಯೆ ಏನು?",
    ml: "ഇന്ന് നിങ്ങളുടെ പ്രധാന പ്രശ്നം എന്താണ്?",
    pa: "ਅੱਜ ਤੁਹਾਨੂੰ ਮੁੱਖ ਕੀ ਤਕਲੀਫ਼ ਹੈ?",
    ur: "آج آپ کی اہم تکلیف کیا ہے؟",
  },
  hpi: {
    hi: "यह तकलीफ कब से है, कैसी है, और कितनी तेज़ है?",
    en: "When did it start, what does it feel like, and how severe is it?",
    bn: "এটি কখন শুরু হয়েছে, কেমন অনুভব হচ্ছে, কতটা তীব্র?",
    ta: "இது எப்போது தொடங்கியது, எப்படி உணர்கிறீர்கள், எவ்வளவு கடுமையானது?",
    te: "ఇది ఎప్పుడు మొదలైంది, ఎలా అనిపిస్తోంది, ఎంత తీవ్రంగా ఉంది?",
    mr: "हा त्रास कधीपासून आहे, कसा वाटतो, किती तीव्र आहे?",
    gu: "આ ક્યારે શરૂ થયો, કેવો લાગે છે, કેટલો ગંભીર છે?",
    kn: "ಇದು ಯಾವಾಗ ಪ್ರಾರಂಭವಾಯಿತು, ಹೇಗನಿಸುತ್ತಿದೆ, ಎಷ್ಟು ತೀವ್ರ?",
    ml: "ഇത് എപ്പോൾ തുടങ്ങി, എങ്ങനെ അനുഭവപ്പെടുന്നു, എത്ര കഠിനം?",
    pa: "ਇਹ ਕਦੋਂ ਸ਼ੁਰੂ ਹੋਇਆ, ਕਿਵੇਂ ਮਹਿਸੂਸ ਹੁੰਦਾ ਹੈ, ਕਿੰਨਾ ਤੇਜ਼ ਹੈ?",
    ur: "یہ کب شروع ہوا، کیسا محسوس ہوتا ہے، کتنا شدید ہے؟",
  },
  past_history: {
    hi: "क्या पहले कोई बड़ी बीमारी, मधुमेह, BP, या ऑपरेशन हुआ है?",
    en: "Any past illness like diabetes, hypertension, heart disease, or surgery?",
    bn: "আগে কোনো বড় অসুস্থতা, ডায়াবেটিস, উচ্চ রক্তচাপ, বা অপারেশন?",
    ta: "முன்பு நீரிழிவு, ரத்த அழுத்தம், இதய நோய் அல்லது அறுவை சிகிச்சை?",
    te: "గతంలో మధుమేహం, బ్లడ్ ప్రెషర్, గుండె జబ్బు లేదా శస్త్రచికిత్స జరిగిందా?",
    mr: "आधी मधुमेह, रक्तदाब, हृदयरोग किंवा ऑपरेशन झाले आहे का?",
    gu: "પહેલા ડાયાબિટીઝ, BP, હૃદય રોગ કે ઓપરેશન થઈ છે?",
    kn: "ಮೊದಲು ಮಧುಮೇಹ, BP, ಹೃದ್ರೋಗ ಅಥವಾ ಶಸ್ತ್ರಚಿಕಿತ್ಸೆ ಆಗಿದೆಯೇ?",
    ml: "മുൻപ് പ്രമേഹം, BP, ഹൃദ്രോഗം അല്ലെങ്കിൽ ശസ്ത്രക്രിയ ഉണ്ടായിരുന്നോ?",
    pa: "ਪਹਿਲਾਂ ਸ਼ੂਗਰ, BP, ਦਿਲ ਦੀ ਬਿਮਾਰੀ ਜਾਂ ਓਪਰੇਸ਼ਨ ਹੋਇਆ ਹੈ?",
    ur: "پہلے ذیابطیس، BP، دل کی بیماری یا آپریشن ہوا ہے؟",
  },
  drug_allergy: {
    hi: "क्या आप कोई दवाई ले रहे हैं? और किसी दवाई या खाने से एलर्जी है?",
    en: "Are you taking any medicines? Any known drug or food allergies?",
    bn: "আপনি কি কোনো ওষুধ নিচ্ছেন? কোনো ওষুধ বা খাবারে অ্যালার্জি আছে?",
    ta: "ஏதாவது மருந்து எடுக்கிறீர்களா? மருந்து அல்லது உணவு ஒவ்வாமை உள்ளதா?",
    te: "మీరు ఏదైనా మందులు తీసుకుంటున్నారా? ఏదైనా మందు లేదా ఆహారానికి అలర్జీ ఉందా?",
    mr: "तुम्ही कोणती औषधे घेत आहात? कोणत्याही औषध किंवा अन्नाची अ‍ॅलर्जी?",
    gu: "શું તમે કોઈ દવા લઈ રહ્યા છો? કોઈ દવા કે ખોરાકથી એલર્જી?",
    kn: "ಯಾವುದಾದರೂ ಔಷಧ ತೆಗೆದುಕೊಳ್ಳುತ್ತಿದ್ದೀರಾ? ಯಾವುದಾದರೂ ಅಲರ್ಜಿ ಇದೆಯೇ?",
    ml: "ഏതെങ്കിലും മരുന്ന് കഴിക്കുന്നുണ്ടോ? ഏതെങ്കിലും ആലർജി ഉണ്ടോ?",
    pa: "ਕੀ ਤੁਸੀਂ ਕੋਈ ਦਵਾਈ ਲੈ ਰਹੇ ਹੋ? ਕਿਸੇ ਦਵਾਈ ਜਾਂ ਖਾਣੇ ਤੋਂ ਐਲਰਜੀ ਹੈ?",
    ur: "کیا آپ کوئی دوائی لے رہے ہیں؟ کسی دوا یا کھانے سے الرجی ہے؟",
  },
  family_history: {
    hi: "परिवार में किसी को मधुमेह, BP, दिल की बीमारी, या कैंसर है?",
    en: "Any family history of diabetes, hypertension, heart disease, or cancer?",
    bn: "পরিবারে কারো ডায়াবেটিস, উচ্চ রক্তচাপ, হৃদরোগ বা ক্যান্সার আছে?",
    ta: "குடும்பத்தில் நீரிழிவு, ரத்த அழுத்தம், இதய நோய் அல்லது புற்றுநோய் உள்ளதா?",
    te: "కుటుంబంలో మధుమేహం, BP, గుండె జబ్బు లేదా క్యాన్సర్ ఉందా?",
    mr: "कुटुंबात मधुमेह, रक्तदाब, हृदयरोग किंवा कर्करोग आहे का?",
    gu: "પરિવારમાં ડાયાબિટીઝ, BP, હૃદય રોગ કે કેન્સર છે?",
    kn: "ಕುಟುಂಬದಲ್ಲಿ ಮಧುಮೇಹ, BP, ಹೃದ್ರೋಗ ಅಥವಾ ಕ್ಯಾನ್ಸರ್ ಇದೆಯೇ?",
    ml: "കുടുംബത്തിൽ പ്രമേഹം, BP, ഹൃദ്രോഗം അല്ലെങ്കിൽ ക്യാൻസർ ഉണ്ടോ?",
    pa: "ਪਰਿਵਾਰ ਵਿੱਚ ਕਿਸੇ ਨੂੰ ਸ਼ੂਗਰ, BP, ਦਿਲ ਦੀ ਬਿਮਾਰੀ ਜਾਂ ਕੈਂਸਰ ਹੈ?",
    ur: "خاندان میں کسی کو ذیابطیس، BP، دل کی بیماری یا کینسر ہے؟",
  },
  personal_history: {
    hi: "आप क्या काम करते हैं? क्या धूम्रपान, शराब लेते हैं? खाना कैसा है?",
    en: "What is your occupation? Do you smoke or drink? How is your diet and sleep?",
    bn: "আপনার পেশা কী? ধূমপান বা মদ্যপান করেন? খাবার ও ঘুম কেমন?",
    ta: "உங்கள் தொழில் என்ன? புகை பிடிக்கிறீர்களா? உணவு மற்றும் தூக்கம் எப்படி?",
    te: "మీ వృత్తి ఏమిటి? ధూమపానం లేదా మద్యం తీసుకుంటారా? ఆహారం ఎలా ఉంది?",
    mr: "तुमचा व्यवसाय काय आहे? धूम्रपान किंवा मद्यपान करता? आहार कसा आहे?",
    gu: "તમારો વ્યવસાય શું છે? ધૂમ્રપાન કે દારૂ પીઓ છો? ખોરાક અને ઊંઘ કેવી?",
    kn: "ನಿಮ್ಮ ವೃತ್ತಿ ಏನು? ಧೂಮಪಾನ ಅಥವಾ ಮದ್ಯ ತೆಗೆದುಕೊಳ್ಳುತ್ತೀರಾ? ಆಹಾರ ಹೇಗಿದೆ?",
    ml: "നിങ്ങളുടെ തൊഴിൽ എന്ത്? പുകവലിക്കുന്നോ? ഭക്ഷണവും ഉറക്കവും എങ്ങനെ?",
    pa: "ਤੁਹਾਡਾ ਕੰਮ ਕੀ ਹੈ? ਸਿਗਰਟ ਜਾਂ ਸ਼ਰਾਬ ਲੈਂਦੇ ਹੋ? ਖਾਣਾ ਕਿਹੋ ਜਿਹਾ ਹੈ?",
    ur: "آپ کا کام کیا ہے؟ سگریٹ یا شراب پیتے ہیں؟ کھانا اور نیند کیسی ہے؟",
  },
  review_of_systems: {
    hi: "क्या आँख, कान, छाती, पेट, या किसी और हिस्से में भी कोई तकलीफ है?",
    en: "Any problems with eyes, ears, chest, stomach, or any other body part?",
    bn: "চোখ, কান, বুক, পেট বা অন্য কোনো অঙ্গে কোনো সমস্যা আছে?",
    ta: "கண், காது, மார்பு, வயிறு அல்லது வேறு உறுப்புகளில் பிரச்சனை உள்ளதா?",
    te: "కళ్ళు, చెవులు, ఛాతీ, పొట్ట లేదా ఇతర భాగాల్లో సమస్య ఉందా?",
    mr: "डोळे, कान, छाती, पोट किंवा इतर कुठल्या भागात त्रास आहे का?",
    gu: "આંખ, કાન, છાતી, પેટ અથવા બીજા ભાગમાં કોઈ તકલીફ?",
    kn: "ಕಣ್ಣು, ಕಿವಿ, ಎದೆ, ಹೊಟ್ಟೆ ಅಥವಾ ಇತರ ಯಾವ ಭಾಗದಲ್ಲಿ ಸಮಸ್ಯೆ ಇದೆ?",
    ml: "കണ്ണ്, ചെവി, നെഞ്ച്, വയർ അല്ലെങ്കിൽ ശരീരത്തിന്റെ മറ്റ് ഭാഗങ്ങളിൽ പ്രശ്നം?",
    pa: "ਅੱਖਾਂ, ਕੰਨ, ਛਾਤੀ, ਪੇਟ ਜਾਂ ਕਿਸੇ ਹੋਰ ਹਿੱਸੇ ਵਿੱਚ ਕੋਈ ਤਕਲੀਫ਼?",
    ur: "آنکھ، کان، سینہ، پیٹ یا کسی اور حصے میں کوئی تکلیف ہے؟",
  },
  // AYUSH Dashavidha Pariksha fallbacks
  ayush_prakriti: {
    hi: "आपकी त्वचा सामान्यतः कैसी है — रूखी, गर्म-तैलीय, या ठंडी-मुलायम?",
    en: "Is your skin usually dry, warm and oily, or cool and smooth?",
    bn: "আপনার ত্বক সাধারণত কেমন — শুষ্ক, উষ্ণ-তৈলাক্ত, বা শীতল-মসৃণ?",
    ta: "உங்கள் தோல் பொதுவாக உலர்ந்ததா, சூடான-எண்ணெயா, குளிர்-மென்மையா?",
    te: "మీ చర్మం సాధారణంగా పొడిగా, వేడిగా-నూనెగా, లేదా చల్లగా-మెత్తగా ఉంటుందా?",
    mr: "तुमची त्वचा साधारणतः कशी असते — कोरडी, उष्ण-तेलकट, किंवा थंड-मुलायम?",
    gu: "તમારી ત્વચા સામાન્ય રીતે કેવી હોય — સૂકી, ગરમ-તૈલી, કે ઠંડી-મૃદુ?",
    kn: "ನಿಮ್ಮ ಚರ್ಮ ಸಾಮಾನ್ಯವಾಗಿ ಹೇಗಿರುತ್ತದೆ — ಒಣ, ಬೆಚ್ಚನೆಯ-ಎಣ್ಣೆ, ತಂಪು-ಮೃದು?",
    ml: "നിങ്ങളുടെ ചർമം സ്ഥിരമായി — ഉണങ്ങിയതോ, ചൂടും എണ്ണക്കതോ, അല്ലെങ്കിൽ തണുത്ത-മൃദുലമോ?",
    pa: "ਤੁਹਾਡੀ ਚਮੜੀ ਆਮ ਤੌਰ 'ਤੇ ਕਿਹੋ ਜਿਹੀ ਹੈ — ਖੁਸ਼ਕ, ਗਰਮ-ਤੇਲੀ, ਜਾਂ ਠੰਡੀ-ਨਰਮ?",
    ur: "آپ کی جلد عام طور پر کیسی ہے — خشک، گرم-چکنی، یا ٹھنڈی-نرم؟",
  },
  ayush_vikriti: {
    hi: "अभी आप कैसा महसूस कर रहे हैं — बेचैन, गर्म/जलन, या भारीपन?",
    en: "How do you feel now — restless/anxious, hot/burning, or heavy/sluggish?",
    bn: "এখন আপনি কেমন অনুভব করছেন — অস্থির, গরম/জ্বালা, বা ভারী?",
    ta: "இப்போது நீங்கள் எப்படி உணர்கிறீர்கள் — பதட்டம், சூடு/எரிச்சல், கனம்?",
    te: "ఇప్పుడు మీకు ఎలా అనిపిస్తోంది — అస్థిరంగా, వేడిగా, లేదా భారంగా?",
    mr: "आत्ता तुम्हाला कसे वाटते — अस्वस्थ, गरम/जळजळ, की जड वाटते?",
    gu: "હાલ તમને કેવું લાગે છે — બેચેની, ગરમ/બળતરા, કે ભારેપણું?",
    kn: "ಈಗ ನಿಮಗೆ ಹೇಗನಿಸುತ್ತಿದೆ — ಚಡಪಡಿಕೆ, ಶಾಖ/ಉರಿ, ಅಥವಾ ಭಾರ?",
    ml: "ഇപ്പോൾ നിങ്ങൾക്ക് — ഉത്കണ്ഠ, ചൂട്/കത്ത്, അല്ലെങ്കിൽ ഭാരം തോന്നുന്നോ?",
    pa: "ਹੁਣ ਤੁਸੀਂ ਕਿਵੇਂ ਮਹਿਸੂਸ ਕਰਦੇ ਹੋ — ਬੇਚੈਨ, ਗਰਮ/ਜਲਣ, ਜਾਂ ਭਾਰਾਪਣ?",
    ur: "ابھی آپ کیسا محسوس کر رہے ہیں — بے چینی، گرمی/جلن، یا بھاری پن؟",
  },
  ayush_agni: {
    hi: "आपकी भूख कैसी है — अनियमित, बहुत तेज़, या बहुत धीमी?",
    en: "How is your appetite — irregular, very strong, or slow and low?",
    bn: "আপনার ক্ষুধা কেমন — অনিয়মিত, খুব তীব্র, বা ধীর?",
    ta: "உங்கள் பசி எப்படி — ஒழுங்கற்ற, மிகவும் அதிக, அல்லது குறைவான?",
    te: "మీ ఆకలి ఎలా ఉంది — అనిశ్చితంగా, చాలా తీవ్రంగా, లేదా తక్కువగా?",
    mr: "तुमची भूक कशी आहे — अनियमित, खूप जास्त, किंवा खूप कमी?",
    gu: "તમારી ભૂખ કેવી છે — અનિયમિત, ઘણી વધારે, કે ઓછી?",
    kn: "ನಿಮ್ಮ ಹಸಿವು ಹೇಗಿದೆ — ಅನಿಯಮಿತ, ತುಂಬಾ ಹೆಚ್ಚು, ಅಥವಾ ಕಡಿಮೆ?",
    ml: "നിങ്ങളുടെ വിശപ്പ് — ക്രമരഹിതം, വളരെ ശക്തം, അതോ കുറഞ്ഞതോ?",
    pa: "ਤੁਹਾਡੀ ਭੁੱਖ ਕਿਹੋ ਜਿਹੀ ਹੈ — ਅਨਿਯਮਿਤ, ਬਹੁਤ ਤੇਜ਼, ਜਾਂ ਬਹੁਤ ਘੱਟ?",
    ur: "آپ کی بھوک کیسی ہے — بے ترتیب، بہت زیادہ، یا بہت کم؟",
  },
  ayush_koshtha: {
    hi: "आपका पेट साफ कैसे होता है — रोज़ नियमित, कभी-कभी, या बहुत कम?",
    en: "How is your bowel movement — regular daily, occasional, or infrequent/constipated?",
    bn: "আপনার মলত্যাগ কেমন — নিয়মিত দৈনিক, মাঝে মাঝে, বা কোষ্ঠকাঠিন্য?",
    ta: "உங்கள் மலம் எப்படி — தினமும் சரியாக, சில நேரங்களில், அல்லது மலச்சிக்கல்?",
    te: "మీ మలవిసర్జన ఎలా ఉంది — ప్రతిరోజు సక్రమంగా, అప్పుడప్పుడు, లేదా మలబద్ధత?",
    mr: "तुमचे मलशुद्धी कसे होते — रोज नियमित, अधूनमधून, की मलबद्धता?",
    gu: "તમારી ઝાડા-સ્થિતિ કેવી છે — રોજ નિયમિત, ક્યારેક, કે કબજિયાત?",
    kn: "ನಿಮ್ಮ ಮಲ ವಿಸರ್ಜನೆ ಹೇಗಿದೆ — ನಿಯಮಿತ ದೈನಂದಿನ, ಅಪರೂಪ, ಮಲಬದ್ಧತೆ?",
    ml: "നിങ്ങളുടെ മലവിസർജ്ജനം — ദൈനംദിന ക്രമം, ഇടയ്ക്കിടെ, അതോ മലബന്ധം?",
    pa: "ਤੁਹਾਡਾ ਪੇਟ ਕਿਵੇਂ ਸਾਫ਼ ਹੁੰਦਾ ਹੈ — ਰੋਜ਼ ਨਿਯਮਿਤ, ਕਦੇ-ਕਦੇ, ਜਾਂ ਕਬਜ਼?",
    ur: "آپ کا پیٹ کیسے صاف ہوتا ہے — روزانہ باقاعدہ، کبھی کبھی، یا قبض؟",
  },
  ayush_ahara_vihara: {
    hi: "आप क्या खाते हैं — गर्म, तीखा, ठंडा? रात को देर से सोते हैं?",
    en: "What do you usually eat — hot, spicy, cold? Do you sleep late or have irregular routine?",
    bn: "সাধারণত কী খান — গরম, মশলাদার, ঠান্ডা? রাতে দেরিতে ঘুমান?",
    ta: "பொதுவாக என்ன சாப்பிடுகிறீர்கள் — சூடான, காரமான, குளிர்ந்த? இரவில் தாமதமாக தூங்குகிறீர்களா?",
    te: "మీరు సాధారణంగా ఏం తింటారు — వేడి, కారం, చల్లని? రాత్రి ఆలస్యంగా నిద్రపోతారా?",
    mr: "तुम्ही सहसा काय खाता — गरम, तिखट, थंड? रात्री उशिरा झोपता का?",
    gu: "તમે સામાન્ય રીતે શું ખાઓ છો — ગરમ, તીખું, ઠંડું? રાત્રે મોડે સૂઓ?",
    kn: "ನೀವು ಸಾಮಾನ್ಯವಾಗಿ ಏನು ತಿನ್ನುತ್ತೀರಿ — ಬಿಸಿ, ಖಾರ, ತಣ್ಣನೆ? ರಾತ್ರಿ ತಡವಾಗಿ ಮಲಗುತ್ತೀರಾ?",
    ml: "നിങ്ങൾ സ്ഥിരമായി — ചൂടുള്ളതോ, ചൂടുള്ളതോ, തണുത്തതോ കഴിക്കുന്നു? രാത്രി വൈകി ഉറങ്ങുന്നോ?",
    pa: "ਤੁਸੀਂ ਆਮ ਤੌਰ 'ਤੇ ਕੀ ਖਾਂਦੇ ਹੋ — ਗਰਮ, ਮਸਾਲੇਦਾਰ, ਠੰਡਾ? ਰਾਤ ਨੂੰ ਦੇਰ ਨਾਲ ਸੌਂਦੇ ਹੋ?",
    ur: "آپ عموماً کیا کھاتے ہیں — گرم، مسالہ دار، ٹھنڈا؟ رات کو دیر سے سوتے ہیں؟",
  },
  ayush_nidana: {
    hi: "यह तकलीफ शुरू होने से पहले क्या बदला — खाना, मौसम, तनाव?",
    en: "Before this problem, what changed — food, weather, stress, or travel?",
    bn: "এই সমস্যার আগে কী পরিবর্তন হয়েছিল — খাবার, আবহাওয়া, মানসিক চাপ?",
    ta: "இந்த பிரச்சனைக்கு முன், என்ன மாற்றம் — உணவு, வானிலை, மன அழுத்தம்?",
    te: "ఈ సమస్యకు ముందు ఏమి మారింది — ఆహారం, వాతావరణం, ఒత్తిడి?",
    mr: "हा त्रास सुरू होण्यापूर्वी काय बदलले — अन्न, हवामान, ताण?",
    gu: "આ તકલીફ પહેલા શું બદલ્યું — ખોરાક, હવામાન, તણાવ?",
    kn: "ಈ ಸಮಸ್ಯೆಯ ಮೊದಲು ಏನು ಬದಲಾಯಿತು — ಆಹಾರ, ಹವಾಮಾನ, ಒತ್ತಡ?",
    ml: "ഈ പ്രശ്നത്തിന് മുൻപ് — ഭക്ഷണം, കാലാവസ്ഥ, ഒരു മാറ്റം?",
    pa: "ਇਸ ਤਕਲੀਫ਼ ਤੋਂ ਪਹਿਲਾਂ ਕੀ ਬਦਲਿਆ — ਖਾਣਾ, ਮੌਸਮ, ਤਣਾਅ?",
    ur: "اس تکلیف سے پہلے کیا بدلا — کھانا، موسم، ذہنی دباؤ؟",
  },
  ayush_samprapti: {
    hi: "यह तकलीफ कैसे बढ़ती है — खाने के बाद, सुबह, रात को, या ठंड में?",
    en: "When does this problem worsen — after eating, morning, night, or in cold weather?",
    bn: "এই সমস্যা কখন বাড়ে — খাওয়ার পরে, সকালে, রাতে, বা ঠান্ডায়?",
    ta: "இந்த பிரச்சனை எப்போது அதிகரிக்கிறது — சாப்பிட்ட பிறகு, காலையில், இரவில், குளிரில்?",
    te: "ఈ సమస్య ఎప్పుడు పెరుగుతుంది — తిన్న తర్వాత, ఉదయం, రాత్రి, చలిలో?",
    mr: "हा त्रास कधी वाढतो — जेवणानंतर, सकाळी, रात्री, किंवा थंडीत?",
    gu: "આ તકલીફ ક્યારે વધે — ખાધા પછી, સવારે, રાત્રે, ઠંડીમાં?",
    kn: "ಈ ಸಮಸ್ಯೆ ಯಾವಾಗ ಹೆಚ್ಚಾಗುತ್ತದೆ — ತಿಂದ ನಂತರ, ಬೆಳಿಗ್ಗೆ, ರಾತ್ರಿ, ಚಳಿಯಲ್ಲಿ?",
    ml: "ഈ പ്രശ്നം — ഭക്ഷണത്തിന് ശേഷം, രാവിലെ, രാത്രി, തണുപ്പിൽ കൂടുതൽ?",
    pa: "ਇਹ ਤਕਲੀਫ਼ ਕਦੋਂ ਵਧਦੀ ਹੈ — ਖਾਣ ਤੋਂ ਬਾਅਦ, ਸਵੇਰੇ, ਰਾਤ ਨੂੰ, ਜਾਂ ਠੰਡ ਵਿੱਚ?",
    ur: "یہ تکلیف کب بڑھتی ہے — کھانے کے بعد، صبح، رات کو، یا سردی میں؟",
  },
  summary: { hi: "", en: "", bn: "", ta: "", te: "", mr: "", gu: "", kn: "", ml: "", pa: "", ur: "" },
};

function getFallbackQuestion(stage: Stage, lang: string): string {
  const stageQ = FALLBACK_QUESTIONS[stage];
  return stageQ?.[lang] ?? stageQ?.["hi"] ?? "आपको क्या तकलीफ है?";
}

// ── Determine RAG domain for a stage ─────────────────────────────────────────

function getRAGDomain(stage: Stage, mode: InterviewMode): KnowledgeDomain[] {
  if (mode === "ayush") return ["ayush"];
  if (stage === "chief_complaint" || stage === "hpi" || stage === "review_of_systems") {
    return ["allopathic", "emergency"];
  }
  if (stage === "drug_allergy") return ["drug"];
  return ["allopathic"];
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json();
    const { lang, messages, stage, mode = "allopathic", chiefComplaint } = body;

    const nextStage = getNextStage(stage, mode);
    const isComplete = isLastQuestionStage(stage, mode);

    // ── Emergency detection on incoming messages ──────────────────────────
    // If the last patient message contains a red-flag keyword, run emergency RAG
    const lastPatientMsg = [...messages].reverse().find((m) => m.role === "patient")?.text ?? "";
    let globalEmergency = false;

    if (lastPatientMsg.length > 3) {
      const emergencyRag = await fetchRAGContext(
        lastPatientMsg,
        ["emergency"],
        2
      );
      globalEmergency = emergencyRag.emergencyTriage;
    }

    // ── Summary stage — generate structured JSON ──────────────────────────
    if (stage === "summary" || isComplete) {
      const summaryPrompt = buildSummaryPrompt(messages, mode);
      try {
        const modelsToTry = [
          process.env.GEMINI_MODEL,
          "gemini-2.5-flash",
          "gemini-2.0-flash",
          "gemini-1.5-flash",
        ].filter(Boolean) as string[];

        let raw = "{}";
        for (const model of modelsToTry) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const resp: any = await ai.models.generateContent({ model, contents: summaryPrompt });
            if (resp?.text) { raw = resp.text; break; }
          } catch { /* try next */ }
        }

        const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const structuredSummary: StructuredSummary = JSON.parse(cleaned);
        return NextResponse.json({
          question: "",
          nextStage: "summary",
          isComplete: true,
          emergencyTriage: globalEmergency || (structuredSummary.redFlags?.length ?? 0) > 0,
          structuredSummary,
        } satisfies ChatResponse);
      } catch {
        // Fallback summary from individual stage answers
        const byStage = (s: Stage) =>
          messages.find((m) => m.stage === s)?.text ?? "Not recorded";
        const fallback: StructuredSummary = {
          chiefComplaint: byStage("chief_complaint"),
          hpi: byStage("hpi"),
          pastHistory: byStage("past_history"),
          drugAllergy: byStage("drug_allergy"),
          familyHistory: byStage("family_history"),
          personalHistory: byStage("personal_history"),
          reviewOfSystems: byStage("review_of_systems"),
          currentMedications: byStage("drug_allergy"),
          suggestedICD10: "R00-R99 — Symptoms and signs",
          redFlags: [],
          ayushNote: (mode === "ayush" || (mode as string) === "combined")
            ? `Prakriti: ${byStage("ayush_prakriti")}. Vikriti: ${byStage("ayush_vikriti")}. Agni: ${byStage("ayush_agni")}. Koshtha: ${byStage("ayush_koshtha")}. Ahara-Vihara: ${byStage("ayush_ahara_vihara")}. Nidana: ${byStage("ayush_nidana")}. Samprapti: ${byStage("ayush_samprapti")}.`
            : "Not applicable",
          ...((mode === "ayush" || (mode as string) === "combined") ? {
            prakriti: byStage("ayush_prakriti"),
            vikriti: byStage("ayush_vikriti"),
            agniType: byStage("ayush_agni"),
            koshtha: byStage("ayush_koshtha"),
            aharaVihara: byStage("ayush_ahara_vihara"),
            nidana: byStage("ayush_nidana"),
            samprapti: byStage("ayush_samprapti"),
          } : {}),
        };
        return NextResponse.json({
          question: "", nextStage: "summary", isComplete: true,
          emergencyTriage: globalEmergency, structuredSummary: fallback,
        } satisfies ChatResponse);
      }
    }

    // ── Question stage — retrieve RAG context then ask Gemini ─────────────
    const ragQuery = chiefComplaint
      ? `${chiefComplaint} ${stage.replace(/_/g, " ")}`
      : `${stage.replace(/_/g, " ")} clinical history question`;

    const rag = await fetchRAGContext(ragQuery, getRAGDomain(stage, mode), 3);
    const systemPrompt = buildSystemPrompt(lang, mode, rag.context);


    // Extract key context from conversation
    const lastPatientAnswer = [...messages].reverse().find((m) => m.role === "patient")?.text ?? "";
    const collectedChiefComplaint = chiefComplaint
      || messages.find((m) => m.role === "patient" && m.stage === "chief_complaint")?.text
      || lastPatientAnswer;

    const stageLabel = (mode === "ayush" || mode === ("combined" as string))
      ? stage.replace("ayush_", "Dashavidha Pariksha — ")
      : stage.replace(/_/g, " ");

    // Script hints to reinforce language for Gemini
    const SCRIPT_EXAMPLES: Record<string, string> = {
      pa: "ਤੁਹਾਨੂੰ ਕੀ ਤਕਲੀਫ਼ ਹੈ?",
      bn: "আপনার কী সমস্যা হচ্ছে?",
      ta: "உங்களுக்கு என்ன பிரச்சனை?",
      te: "మీకు ఏమి సమస్య?",
      gu: "તમને શું તકલીફ છે?",
      kn: "ನಿಮಗೆ ಏನು ಸಮಸ್ಯೆ?",
      ml: "നിങ്ങൾക്ക് എന്ത് പ്രശ്നമാണ്?",
      ur: "آپ کو کیا تکلیف ہے؟",
      mr: "तुम्हाला काय त्रास होतोय?",
    };
    const scriptExample = SCRIPT_EXAMPLES[lang]
      ? `\nScript example (use this exact script): "${SCRIPT_EXAMPLES[lang]}"`
      : "";

    const conversationHistory = messages
      .map((m) => `${m.role === "ai" ? "Doctor (AI)" : "Patient"}: ${m.text}`)
      .join("\n");

    const isFirstQuestion = messages.length === 0;

    const userPrompt = isFirstQuestion
      ? `You are starting a clinical history-taking session. The patient has just arrived.

STAGE: ${stageLabel}
TASK: Ask the patient what their main problem is today. Make it welcoming and warm.

LANGUAGE RULE: Reply ONLY in ${LANG_NAMES[lang] ?? "Hindi"}.${scriptExample}

Reply with ONLY the question — nothing else.`
      : `CURRENT STAGE: ${stageLabel}
PATIENT'S CHIEF COMPLAINT: ${collectedChiefComplaint || "Not stated yet"}
PATIENT'S LAST ANSWER: "${lastPatientAnswer}"

FULL CONVERSATION:
${conversationHistory}

YOUR TASK:
1. READ the patient's last answer carefully: "${lastPatientAnswer}"
2. Ask ONE natural follow-up question appropriate for the stage "${stageLabel}"
3. The question MUST be based on what the patient specifically said — NOT a generic template
4. If the patient said something unrelated or unclear, gently re-guide them
5. Think: what would a real doctor naturally ask next, hearing exactly these words?

LANGUAGE RULE: Reply ONLY in ${LANG_NAMES[lang] ?? "Hindi"} native script.${scriptExample}
NEVER respond in Hindi if the selected language is not Hindi.

Reply with ONLY the question — no label, no prefix, no explanation.`;


    const geminiResponse = await callGemini(systemPrompt, userPrompt);

    // ── Script validation: reject if Gemini returned Devanagari for a non-Devanagari language
    const DEVANAGARI_LANGS = new Set(["hi", "mr", "ne", "sa"]);
    const hasDevanagari = /[\u0900-\u097F]/.test(geminiResponse ?? "");
    const usesFallback = !DEVANAGARI_LANGS.has(lang) && hasDevanagari;

    const question = usesFallback
      ? getFallbackQuestion(stage, lang)   // Gemini replied in Hindi — use deterministic fallback
      : (geminiResponse ?? getFallbackQuestion(stage, lang));

    return NextResponse.json({
      question,
      nextStage,
      isComplete: false,
      emergencyTriage: globalEmergency || rag.emergencyTriage,
      ragChunksUsed: rag.chunksUsed,
    } satisfies ChatResponse);

  } catch (err) {
    console.error("[history/chat] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
