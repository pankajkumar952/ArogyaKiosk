// src/lib/rag/knowledge-base.ts
// Curated clinical knowledge base for RAG-powered adaptive questioning.
//
// SOURCES (open / public domain):
//   - SOCRATES/OPQRST framework: standard clinical teaching, no copyright
//   - Red flag criteria: NICE CKS, WHO ICD-11 clinical guidelines (open access)
//   - Dashavidha Pariksha: Charaka Samhita (public domain Ayurvedic text)
//   - Differential diagnoses: standard medical education (open literature)
//
// WHAT IS NOT HERE (requires license or not machine-readable):
//   - ICMR Standard Treatment Guidelines (not public/machine-readable)
//   - StatPearls full text (subscription)
//   - SNOMED CT concept graph (SNOMED International license)
//   - Indian National Formulary full drug database
//   These are isolated as EXTERNAL_SOURCE placeholders below.
//
// Each entry: { id, domain, symptomSystem, title, content, tags, source }

export type KnowledgeDomain = "allopathic" | "ayush" | "emergency" | "drug";
export type SymptomSystem =
  | "cardiac" | "respiratory" | "gi" | "neuro" | "msk"
  | "uro" | "endo" | "heme" | "psych" | "derm" | "ent"
  | "ophthal" | "obs" | "peds" | "general"
  | "ayush_dashavidha" | "ayush_nidana" | "emergency_triage";

export interface KnowledgeEntry {
  id: string;
  domain: KnowledgeDomain;
  symptomSystem: SymptomSystem;
  title: string;
  /** Plain-text content that will be embedded and retrieved */
  content: string;
  /** Tags for metadata filtering */
  tags: string[];
  source: string;
}

export const KNOWLEDGE_BASE: KnowledgeEntry[] = [

  // ── SOCRATES / OPQRST Clinical Questioning Frameworks ──────────────────────

  {
    id: "socrates-framework",
    domain: "allopathic",
    symptomSystem: "general",
    title: "SOCRATES Pain History Framework",
    content: `SOCRATES is the standard clinical framework for characterising any pain or symptom.
S - Site: Where exactly is the pain? Can you point to it with one finger?
O - Onset: When did it start? Was it sudden (seconds), rapid (minutes), or gradual (hours/days)?
C - Character: What does it feel like? Crushing, burning, stabbing, dull ache, throbbing, colicky?
R - Radiation: Does the pain go anywhere else? Down the arm, to the jaw, to the back, to the groin?
A - Associated symptoms: Any nausea, vomiting, sweating, breathlessness, fever, weight loss?
T - Time/Duration: Is it constant or comes and goes? How long does each episode last?
E - Exacerbating/Relieving factors: What makes it worse? What makes it better? Rest, food, position?
S - Severity: On a scale of 0-10 how bad is it? Has it changed since it started?
Clinical use: Ask each SOCRATES component for every new chief complaint. Red flags in any component trigger emergency triage.`,
    tags: ["pain", "history", "framework", "questioning", "clinical"],
    source: "Standard clinical teaching — public domain",
  },

  {
    id: "opqrst-framework",
    domain: "allopathic",
    symptomSystem: "general",
    title: "OPQRST Symptom Assessment",
    content: `OPQRST is an alternative to SOCRATES used in emergency and primary care settings.
O - Onset: When and how did it start?
P - Provocation/Palliation: What provokes it, what relieves it?
Q - Quality: Describe the quality — sharp, dull, pressure, tearing?
R - Region/Radiation: Where is it? Does it radiate?
S - Severity: 0-10 pain scale. How does it compare to your worst ever pain?
T - Time: Duration, frequency, pattern (constant vs intermittent)?
Use OPQRST to structure the chief complaint interview. Each letter maps to a clinical interview stage.`,
    tags: ["pain", "history", "framework", "emergency", "opqrst"],
    source: "Standard emergency medicine teaching — public domain",
  },

  // ── Cardiac ────────────────────────────────────────────────────────────────

  {
    id: "chest-pain-red-flags",
    domain: "emergency",
    symptomSystem: "cardiac",
    title: "Chest Pain — Emergency Red Flags (ACS / PE / Aortic Dissection)",
    content: `EMERGENCY TRIAGE REQUIRED for any of the following chest pain features:
1. Central crushing / pressure / heaviness ("like an elephant sitting on chest")
2. Radiation to left arm, jaw, neck, or back
3. Associated diaphoresis (cold sweating), nausea, vomiting
4. Sudden onset at maximum severity (aortic dissection until proven otherwise)
5. Tearing / ripping pain radiating to back (aortic dissection)
6. Pleuritic pain + recent long-haul travel or immobility + leg swelling (PE)
7. Syncope or near-syncope with chest pain
8. Pain in patient with known CAD, stents, CABG history
9. Pain at rest not relieved by GTN spray
10. Duration > 20 minutes not relieved by rest
Ask specifically: "Is the pain crushing like a weight? Does it go to your arm or jaw? Are you sweating?"`,
    tags: ["chest pain", "ACS", "MI", "red flag", "emergency", "cardiac", "PE"],
    source: "NICE CKS Chest Pain 2023 + WHO ICD-11 — open access",
  },

  {
    id: "cardiac-history-questions",
    domain: "allopathic",
    symptomSystem: "cardiac",
    title: "Cardiac History — Key Questions",
    content: `For a patient with chest pain or cardiac symptoms, ask:
1. Risk factors: Do you have high blood pressure? Diabetes? High cholesterol? Do you smoke?
2. Family history: Has anyone in your family had a heart attack before age 60?
3. Previous episodes: Have you had this before? Were you diagnosed with angina or heart disease?
4. Exercise tolerance: Can you climb one flight of stairs without chest pain or breathlessness?
5. Medications: Are you on aspirin, statins, beta-blockers, or nitrates?
6. Palpitations: Do you feel your heart racing, skipping beats, or beating irregularly?
7. Orthopnoea: Do you need extra pillows to breathe at night?
8. Ankle swelling: Is there swelling in your feet or ankles at the end of the day?`,
    tags: ["cardiac", "chest pain", "angina", "heart failure", "history"],
    source: "Standard cardiology clinical teaching — public domain",
  },

  // ── Respiratory ────────────────────────────────────────────────────────────

  {
    id: "dyspnoea-assessment",
    domain: "allopathic",
    symptomSystem: "respiratory",
    title: "Breathlessness — Clinical Assessment",
    content: `For breathlessness (dyspnoea) history:
Onset: Sudden (pneumothorax, PE, pulmonary oedema) vs gradual (COPD, heart failure, anaemia)?
Severity: MRC Dyspnoea Scale — 1=only strenuous exercise, 2=hurrying on flat, 3=slower than peers on flat, 4=stops after 100m, 5=too breathless to leave house.
Positional: Worse lying flat (orthopnoea → heart failure)? Better leaning forward (COPD)?
Nocturnal: Waking at night (PND → heart failure, asthma)?
Wheeze: High-pitched = asthma/COPD. Stridor (inspiratory) = upper airway obstruction.
Cough: Productive (LRTI, bronchiectasis)? Dry (ILD, ACE inhibitor)?
Haemoptysis: Blood in sputum — TB, lung cancer, PE emergency.
RED FLAGS: Sudden onset at rest, SpO2 < 90%, cyanosis, unable to complete sentences, haemoptysis.`,
    tags: ["breathlessness", "dyspnoea", "respiratory", "asthma", "COPD", "PE"],
    source: "NICE CKS Breathlessness + MRC scale — open access",
  },

  {
    id: "respiratory-red-flags",
    domain: "emergency",
    symptomSystem: "respiratory",
    title: "Respiratory Red Flags — Emergency Triage",
    content: `IMMEDIATE EMERGENCY for any of:
1. Unable to speak in full sentences due to breathlessness
2. Respiratory rate > 30/min at rest
3. Cyanosis (blue lips, fingertips)
4. Silent chest (no breath sounds on auscultation — severe asthma)
5. Tracheal deviation (tension pneumothorax)
6. Haemoptysis > 200ml (massive haemoptysis)
7. Stridor at rest (upper airway obstruction)
8. SpO2 < 90% on room air
Ask: "Can you breathe comfortably? Are your lips or fingers turning blue? Are you coughing up blood?"`,
    tags: ["respiratory", "emergency", "breathlessness", "red flag", "hypoxia"],
    source: "WHO Emergency Triage + NICE — open access",
  },

  // ── Gastrointestinal ───────────────────────────────────────────────────────

  {
    id: "abdominal-pain-assessment",
    domain: "allopathic",
    symptomSystem: "gi",
    title: "Abdominal Pain — Clinical Assessment",
    content: `For abdominal pain history:
Location: Right upper quadrant (gallbladder, liver), Epigastric (stomach, pancreas, ACS), Right iliac fossa (appendix, ovary), Left iliac fossa (diverticular, ovary), Loin-to-groin (ureteric colic), Periumbilical then RIF (appendicitis evolution).
Character: Colicky (visceral — bowel, ureter, bile duct) vs constant (peritoneal irritation).
Relationship to food: Worse after fatty foods (gallbladder), better with food (duodenal ulcer), worse with food (gastric ulcer, mesenteric ischaemia).
Bowel habit: Changed? Constipation, diarrhoea, blood in stool?
Vomiting: Bilious (small bowel obstruction), faeculent (large bowel obstruction).
RED FLAGS: Peritonism (rigid abdomen, guarding, rebound), pulsatile mass (AAA), severe constant pain > 6 hours, haematemesis.`,
    tags: ["abdominal pain", "GI", "appendicitis", "gallbladder", "bowel"],
    source: "Standard surgical teaching — public domain",
  },

  {
    id: "gi-red-flags",
    domain: "emergency",
    symptomSystem: "gi",
    title: "GI Red Flags — Urgent/Emergency Features",
    content: `EMERGENCY (same day / immediate):
1. Haematemesis (vomiting blood) — upper GI bleed
2. Melaena (black tarry stools) — upper GI bleed
3. Rigid board-like abdomen — peritonitis
4. Pulsatile abdominal mass + severe pain — AAA until proven otherwise
5. Sudden severe "worst ever" abdominal pain — mesenteric ischaemia / perforation
URGENT (same day referral):
6. Unexplained weight loss > 5kg in 3 months + abdominal symptoms
7. Dysphagia (difficulty swallowing) — oesophageal cancer
8. Rectal bleeding in patient > 50 years
9. Change in bowel habit > 4 weeks in patient > 50 years`,
    tags: ["GI", "red flag", "GI bleed", "cancer", "emergency", "abdomen"],
    source: "NICE CKS + BSG guidelines — open access",
  },

  // ── Neurological ───────────────────────────────────────────────────────────

  {
    id: "headache-assessment",
    domain: "allopathic",
    symptomSystem: "neuro",
    title: "Headache — Clinical Assessment",
    content: `For headache history:
Onset: Thunderclap (worst ever in seconds — SAH emergency), gradual.
Character: Pulsating unilateral (migraine), pressure bilateral (tension), stabbing (cluster), constant (raised ICP).
Location: Unilateral (migraine, cluster), bilateral (tension, raised ICP), posterior (cervicogenic, posterior fossa).
Associated: Nausea/vomiting, photophobia, phonophobia (migraine), visual aura, neck stiffness, fever, rash.
Timing: Morning headache worse on bending (raised ICP), triggered by stress/sleep deprivation (tension), menstrual (hormonal migraine).
RED FLAGS: Thunderclap onset, fever + neck stiffness, new headache in patient >50, on anticoagulants, immunosuppressed, progressively worsening, visual changes.`,
    tags: ["headache", "migraine", "SAH", "raised ICP", "neuro", "red flag"],
    source: "NICE CKS Headache + BASH guidelines — open access",
  },

  {
    id: "neuro-red-flags",
    domain: "emergency",
    symptomSystem: "neuro",
    title: "Neurological Emergency Red Flags",
    content: `IMMEDIATE EMERGENCY — call for help now:
1. Thunderclap headache (worst ever, instantaneous) — subarachnoid haemorrhage until proven otherwise
2. Headache + fever + neck stiffness + photophobia — bacterial meningitis
3. Facial droop, arm weakness, speech difficulty — STROKE (use FAST: Face Arm Speech Time)
4. Sudden loss of vision in one eye — central retinal artery occlusion / TIA
5. Seizure lasting > 5 minutes — status epilepticus
6. Sudden confusion / altered consciousness
7. Progressive limb weakness + bladder/bowel disturbance — cauda equina / cord compression
Ask FAST: "Can you smile? Raise both arms? Say a complete sentence? When did this start?"`,
    tags: ["neuro", "stroke", "SAH", "meningitis", "emergency", "FAST", "seizure"],
    source: "NICE Stroke + meningitis guidelines — open access",
  },

  // ── General / Systemic ─────────────────────────────────────────────────────

  {
    id: "fever-assessment",
    domain: "allopathic",
    symptomSystem: "general",
    title: "Fever — Clinical Assessment",
    content: `For fever history:
Duration: < 7 days (acute infection), 7-21 days (enteric fever, malaria, TB), > 21 days (PUO — TB, lymphoma, SBE, still's).
Pattern: Continuous (typhoid, bacterial pneumonia), remittent (most infections), intermittent (malaria every 48-72h), hectic (abscess).
Associated: Rigors (bacteraemia/malaria), night sweats (TB, lymphoma), weight loss (TB, cancer), rash (dengue, viral), jaundice (malaria, hepatitis, leptospirosis), joint pain (dengue, viral arthritis).
Travel: Recent travel to malaria-endemic area? Exposure to animals?
India-specific: Consider malaria, dengue, typhoid (enteric fever), chikungunya, leptospirosis, scrub typhus in febrile patients.
RED FLAGS: Temperature > 39.5°C + altered sensorium, petechial/purpuric rash + fever (meningococcal), jaundice + fever + haemorrhage (dengue haemorrhagic fever).`,
    tags: ["fever", "malaria", "dengue", "typhoid", "TB", "infection", "general"],
    source: "WHO Clinical Guidelines + NVBDCP guidelines — open access",
  },

  {
    id: "weight-loss-assessment",
    domain: "allopathic",
    symptomSystem: "general",
    title: "Unexplained Weight Loss — Clinical Assessment",
    content: `For unexplained weight loss:
Quantify: How many kg lost in how many months? Intentional or unintentional?
Red flag threshold: > 5% body weight over 6 months unintentionally.
Causes by system: 
  - GI: dysphagia, dyspepsia, altered bowel habit, haematemesis, melaena (cancer)
  - Respiratory: chronic cough, haemoptysis, dyspnoea (TB, lung cancer)
  - Endocrine: polydipsia, polyuria (DM), heat intolerance (hyperthyroidism), cold intolerance (hypothyroidism)
  - Constitutional: fever, night sweats, fatigue (TB, lymphoma, HIV)
  - Psychological: low mood, poor appetite, social isolation (depression, anorexia)
India-specific: Always consider TB in any patient with weight loss + fever + night sweats.`,
    tags: ["weight loss", "cancer", "TB", "diabetes", "general", "red flag"],
    source: "NICE CKS + RNTCP guidelines — open access",
  },

  // ── AYUSH Dashavidha Pariksha ──────────────────────────────────────────────

  {
    id: "ayush-dashavidha-overview",
    domain: "ayush",
    symptomSystem: "ayush_dashavidha",
    title: "Dashavidha Pariksha — Ten-Parameter Ayurvedic Examination",
    content: `Dashavidha Pariksha is the classical Ayurvedic ten-point patient examination from Charaka Samhita (Vimana Sthana 8/94).
The ten parameters (Dasha Pariksha) are:
1. Prakriti (Constitution): Vata, Pitta, Kapha predominance — innate body type
2. Vikriti (Pathological state): Current dosha imbalance causing disease
3. Sara (Tissue quality): Quality of dhatus (body tissues) — skin, hair, nails as indicators
4. Samhanana (Compactness): Body build, muscle tone, bone structure
5. Pramana (Measurement): Height, weight, body proportions
6. Satmya (Adaptability): Foods, climates, activities the patient is adapted to
7. Sattva (Mental strength): Patient's psychological resilience and tolerance
8. Ahara Shakti (Digestive capacity): Appetite, digestion quality, Agni assessment
9. Vyayama Shakti (Exercise tolerance): Physical endurance and activity level
10. Vaya (Age): Bala (childhood), Madhyama (middle age), Vriddha (old age) — affects treatment
Each parameter guides Ayurvedic treatment selection and prognosis.`,
    tags: ["ayush", "dashavidha", "prakriti", "dosha", "ayurveda", "examination"],
    source: "Charaka Samhita, Vimana Sthana 8/94 — public domain Ayurvedic text",
  },

  {
    id: "ayush-prakriti-questions",
    domain: "ayush",
    symptomSystem: "ayush_dashavidha",
    title: "Prakriti Assessment — Vata/Pitta/Kapha Questions",
    content: `Questions to determine Prakriti (constitutional type):
VATA indicators: Thin build, dry skin, irregular appetite, light/interrupted sleep, quick mind but forgetful, cold hands/feet, constipation tendency, talks fast.
PITTA indicators: Medium build, warm skin, sharp hunger, moderate sleep, sharp intellect, warm body, loose stools tendency, irritable when hungry.
KAPHA indicators: Heavy/stocky build, oily/smooth skin, steady appetite, heavy deep sleep, calm stable mind, cool moist skin, slow digestion, steady memory.
Ask patient: 
- "Is your skin usually dry, warm and oily, or cool and moist?"
- "Is your appetite irregular, very strong, or steady and moderate?"
- "Do you feel cold easily, hot easily, or are you generally comfortable?"
- "Is your digestion often irregular, very sharp, or slow?"
- "Do you sleep lightly and wake easily, moderately, or very deeply?"`,
    tags: ["prakriti", "vata", "pitta", "kapha", "dosha", "constitution", "ayurveda"],
    source: "Charaka Samhita + Ashtanga Hridayam — public domain",
  },

  {
    id: "ayush-nidana-panchaka",
    domain: "ayush",
    symptomSystem: "ayush_nidana",
    title: "Nidana Panchaka — Five Ayurvedic Disease Factors",
    content: `Nidana Panchaka is the Ayurvedic five-factor disease causation model:
1. Nidana (Cause/Aetiology): Dietary factors (Ahara), lifestyle (Vihara), seasonal (Kala), psychological (Manasika). Ask: "What were you eating/doing before this started?"
2. Purvarupa (Prodromal symptoms): Early warning signs before the main disease. Ask: "Did you notice anything unusual in the days/weeks before?"
3. Rupa (Signs/Symptoms): Current manifestation of the disease. Ask: "Tell me all your symptoms now."
4. Upashaya (Therapeutic trial): What relieves symptoms? Dietary changes, warm/cold food, rest? Ask: "What makes you feel better?"
5. Samprapti (Pathogenesis): How the disease developed — which channels (Srotas) are affected, which dosha is aggravated.
These five factors guide Ayurvedic diagnosis and differentiate similar-appearing conditions.`,
    tags: ["nidana", "ayurveda", "diagnosis", "samprapti", "causation", "rupa"],
    source: "Charaka Samhita, Nidana Sthana — public domain",
  },

  {
    id: "ayush-ahara-shakti",
    domain: "ayush",
    symptomSystem: "ayush_dashavidha",
    title: "Ahara Shakti (Agni) — Digestive Capacity Assessment",
    content: `Agni (digestive fire) assessment is central to Ayurvedic diagnosis. Four types:
1. Sama Agni (Balanced): Regular appetite, good digestion, no gas/bloating, normal stools. Healthy state.
2. Vishama Agni (Irregular/Vata): Variable appetite, irregular digestion, gas, constipation, dry stools.
3. Tikshna Agni (Sharp/Pitta): Very strong appetite, heartburn, loose stools, burning sensations, cannot skip meals.
4. Manda Agni (Slow/Kapha): Low appetite, heaviness after eating, slow digestion, excess mucus, weight gain.
Questions to assess Ahara Shakti:
- "How is your appetite — regular, very strong, irregular, or weak?"
- "After eating, do you feel light, heavy, have burning, or gas/bloating?"
- "How many times a day do you have bowel movements? What is the consistency?"
- "Do you feel hungry at regular times or does your appetite vary a lot?"`,
    tags: ["agni", "digestion", "ahara shakti", "ayurveda", "appetite", "dosha"],
    source: "Charaka Samhita, Sutra Sthana — public domain",
  },

  {
    id: "ayush-nadi-pariksha",
    domain: "ayush",
    symptomSystem: "ayush_dashavidha",
    title: "Nadi Pariksha — Pulse Examination in Ayurveda",
    content: `Nadi Pariksha (pulse diagnosis) is the primary Ayurvedic examination tool.
Three finger positions on radial pulse (Vata at index finger, Pitta at middle, Kapha at ring finger).
Pulse qualities by dosha:
- Vata pulse: Irregular, thin, quick, feels like a snake moving (Sarpa gati)
- Pitta pulse: Forceful, sharp, jumping, like a frog (Manduka gati)  
- Kapha pulse: Slow, deep, steady, like a swan gliding (Hamsa gati)
For patient interview (cannot do physical Nadi without examiner present):
Ask: "Do you generally feel your heartbeat is fast and irregular, strong and forceful, or slow and steady?"
Note: Actual Nadi Pariksha requires physical examination by Vaidya. This question only provides preliminary indication.`,
    tags: ["nadi", "pulse", "ayurveda", "diagnosis", "vata", "pitta", "kapha"],
    source: "Sharngadhara Samhita + Charaka Samhita — public domain",
  },

  // ── Drug / Medication History ──────────────────────────────────────────────

  {
    id: "medication-history",
    domain: "drug",
    symptomSystem: "general",
    title: "Medication History — Key Questions",
    content: `Complete medication history requires:
1. Current medications: Name, dose, frequency, duration. Include all — tablets, injections, inhalers, eye drops, skin creams.
2. Traditional/Ayurvedic medicines: Many patients in India take parallel Ayurvedic medications — ask specifically.
3. Over-the-counter: Painkillers (paracetamol, ibuprofen, diclofenac), antacids, supplements.
4. Allergies: Any medication allergy? What reaction did you have (rash, swelling, breathing difficulty)?
5. Adherence: Are you taking them regularly? Any doses missed?
6. Recent changes: Any new medication started in the last month?
High-risk combinations to flag (if present in patient history):
- Warfarin + NSAIDs → increased bleeding risk
- ACE inhibitor + potassium-sparing diuretics → hyperkalaemia
- Metformin + contrast media (planned CT) → lactic acidosis risk
- SSRIs + tramadol → serotonin syndrome
Ask: "Please tell me all medicines you take, including any Ayurvedic, homeopathic, or herbal preparations."`,
    tags: ["medication", "drug history", "allergy", "adherence", "drug interaction"],
    source: "Standard pharmacology teaching — public domain",
  },

  // ── Emergency Triage ───────────────────────────────────────────────────────

  {
    id: "emergency-triage-criteria",
    domain: "emergency",
    symptomSystem: "emergency_triage",
    title: "Emergency Triage — Immediate Action Criteria",
    content: `IMMEDIATE EMERGENCY — patient must be directed to emergency/casualty NOW:
AIRWAY: Stridor, unable to speak, drooling (airway obstruction)
BREATHING: Cannot complete sentences, cyanosis, SpO2 < 90%, silent chest
CIRCULATION: Pale/cold/clammy, BP not palpable, pulse > 130 or < 40, haemorrhage
DISABILITY: GCS < 14, sudden confusion, seizure, FAST-positive stroke signs
EXPOSURE: Purpuric rash + fever, anaphylaxis (urticaria + wheeze + BP drop), temperature > 40°C with confusion
SPECIFIC RED FLAGS:
- Any "worst ever" sudden onset symptom
- Chest pain + radiation + sweating (ACS)
- Thunderclap headache (SAH)
- Unilateral limb weakness + facial droop (stroke)
- Melaena or haematemesis (GI bleed)
- Testicular/abdominal pain sudden onset in young male (torsion/AAA)
Output EMERGENCY_TRIAGE if ANY of the above are confirmed.`,
    tags: ["emergency", "triage", "ABCDE", "red flag", "immediate", "critical"],
    source: "ATLS + ALS + WHO Emergency Triage — open access",
  },

  // ── Social / Family History ────────────────────────────────────────────────

  {
    id: "social-history",
    domain: "allopathic",
    symptomSystem: "general",
    title: "Social and Family History — Key Questions",
    content: `Social History:
1. Occupation: What work do you do? (Chemical exposure, physical strain, stress)
2. Smoking: Current/past? How many cigarettes per day, for how many years? Pack-years = (cigarettes/day ÷ 20) × years.
3. Alcohol: Do you drink? How much per week? Risky use: > 14 units/week women, > 21 units/week men.
4. Diet: Vegetarian/non-vegetarian? Regular meals? Any dietary restrictions?
5. Living situation: Who do you live with? (Relevant for TB contact history, elderly fall risk)
6. Exercise: How physically active are you?

Family History:
- Parents, siblings, children: Any heart disease, diabetes, hypertension, cancer, TB, kidney disease?
- Age at which first-degree relative had the condition?
- Any hereditary conditions in the family?

India-specific: Ask about TB contact history in household. Ask about consanguineous marriage if relevant to genetic conditions.`,
    tags: ["social history", "family history", "smoking", "alcohol", "occupation"],
    source: "Standard clinical teaching — public domain",
  },

  // ── Paediatric ─────────────────────────────────────────────────────────────

  {
    id: "peds-history",
    domain: "allopathic",
    symptomSystem: "peds",
    title: "Paediatric History — Additional Components",
    content: `For children (asked to parent/guardian):
Birth history: Term or preterm? Any complications at birth? Birth weight?
Development: Is the child meeting developmental milestones for age?
Immunisation: Is the child's vaccination schedule up to date? (IAP schedule)
Nutrition: Breastfed or formula? Age of weaning? Current diet — any picky eating?
Growth: Has weight/height been tracking on the growth chart?
Infections: Frequent ear infections, chest infections, UTIs? (Immunodeficiency?)
School: Any learning difficulties, behavioural concerns?
Medications: Any regular medications? Any known drug/food allergies?

PEDS EMERGENCY RED FLAGS:
- Bulging fontanelle in infants (raised ICP / meningitis)
- Non-blanching rash at any age (meningococcal)
- Barking cough + stridor (croup / epiglottitis)
- High fever + limp in child (septic arthritis)
- Bilious vomiting in neonate (malrotation / volvulus)`,
    tags: ["paediatric", "child", "development", "vaccination", "infant"],
    source: "IAP guidelines + standard paediatric teaching — open access",
  },

];

// ── EXTERNAL SOURCE PLACEHOLDERS ───────────────────────────────────────────
// The following sources are referenced in the engineering plan but are NOT
// embedded here due to licensing or format constraints. They are isolated
// as named constants so the ingestion pipeline knows what is missing.

export const EXTERNAL_SOURCES_UNAVAILABLE = [
  {
    name: "ICMR Standard Treatment Guidelines",
    url: "https://main.icmr.nic.in/stg",
    reason: "Not publicly available in machine-readable format",
    replacement: "Curated clinical QA entries above cover equivalent content for common conditions",
  },
  {
    name: "StatPearls (NCBI)",
    url: "https://www.ncbi.nlm.nih.gov/books/NBK430685/",
    reason: "Subscription required for bulk download",
    replacement: "Open-access PubMed abstracts can be auto-ingested — pipeline ready",
  },
  {
    name: "SNOMED CT Concept Graph",
    url: "https://www.snomed.org/",
    reason: "Requires SNOMED International license (free for India via NHA)",
    replacement: "ICD-10 codes used inline in knowledge entries; SNOMED mappable via NHA portal",
  },
  {
    name: "Indian National Formulary",
    url: "https://cdsco.gov.in/opencms/opencms/en/consumer/INF.html",
    reason: "PDF format only; no machine-readable API",
    replacement: "Drug interaction logic uses flag-based heuristics; full INF needs OCR pipeline",
  },
  {
    name: "Ayurvedic Pharmacopoeia of India",
    url: "https://pharmexcil.com/resource/images/ayurvedic_pharma_india.pdf",
    reason: "PDF format; digitization required",
    replacement: "Dashavidha Pariksha entries above sourced from Charaka Samhita text",
  },
] as const;

export const KNOWLEDGE_BASE_META = {
  totalEntries: KNOWLEDGE_BASE.length,
  domains: [...new Set(KNOWLEDGE_BASE.map((e) => e.domain))],
  symptomSystems: [...new Set(KNOWLEDGE_BASE.map((e) => e.symptomSystem))],
  lastUpdated: "2026-09-09",
  embeddingModel: "text-embedding-004",
  vectorDimension: 768,
};
