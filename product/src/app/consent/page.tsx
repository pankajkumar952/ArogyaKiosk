"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  KioskHeader,
  KioskScreen,
  KioskBody,
  KioskFooter,
} from "@/components/kiosk/KioskLayout";
import { Button, Card } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { t } from "@/lib/translations";
import { usePageSpeaker } from "@/hooks/usePageSpeaker";

// Localized spoken intro for the consent page — in the patient's language
const CONSENT_SPEECH: Record<string, string> = {
  hi: "यह आपकी सहमति का पेज है। कृपया नीचे दी गई अनुमतियाँ पढ़ें और सहमति दें। आपकी जानकारी केवल आपके डॉक्टर के साथ साझा की जाएगी।",
  en: "This is the consent page. Please read the permissions below and agree to continue. Your information will only be shared with your treating doctor.",
  bn: "এটি আপনার সম্মতির পৃষ্ঠা। নিচের অনুমতিগুলি পড়ুন এবং সম্মতি দিন। আপনার তথ্য শুধুমাত্র আপনার ডাক্তারের সাথে শেয়ার করা হবে।",
  ta: "இது உங்கள் சம்மதப் பக்கம். கீழே உள்ள அனுமதிகளை படித்து சம்மதிக்கவும். உங்கள் தகவல் உங்கள் மருத்துவருடன் மட்டுமே பகிரப்படும்.",
  te: "ఇది మీ అనుమతి పేజీ. దయచేసి దిగువ అనుమతులను చదివి అంగీకరించండి. మీ సమాచారం మీ డాక్టర్‌తో మాత్రమే భాగస్వామ్యం చేయబడుతుంది.",
  mr: "हे तुमच्या संमतीचे पान आहे. कृपया खालील परवानग्या वाचा आणि संमती द्या. तुमची माहिती फक्त तुमच्या डॉक्टरांसोबत शेअर केली जाईल.",
  gu: "આ તમારી સ્વીકૃતિ પૃષ્ઠ છે. કૃપા કરીને નીચેની પરવાનગી વાંચો અને સ્વીકૃતિ આપો. તમારી માહિતી ફક્ત તમારા ડૉક્ટર સાથે જ શેર કરવામાં આવશે.",
  kn: "ಇದು ನಿಮ್ಮ ಒಪ್ಪಿಗೆ ಪುಟ. ಕೆಳಗಿನ ಅನುಮತಿಗಳನ್ನು ಓದಿ ಮತ್ತು ಒಪ್ಪಿಗೆ ನೀಡಿ. ನಿಮ್ಮ ಮಾಹಿತಿ ನಿಮ್ಮ ವೈದ್ಯರಿಗೆ ಮಾತ್ರ ಹಂಚಲಾಗುತ್ತದೆ.",
  ml: "ഇത് നിങ്ങളുടെ സമ്മത പേജ് ആണ്. താഴെ ഉള്ള അനുമതികൾ വായിച്ച് സമ്മതം നൽകുക. നിങ്ങളുടെ വിവരങ്ങൾ നിങ്ങളുടെ ഡോക്ടറുമായി മാത്രം പങ്കിടും.",
  pa: "ਇਹ ਤੁਹਾਡਾ ਸਹਿਮਤੀ ਪੰਨਾ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਹੇਠਾਂ ਦਿੱਤੀਆਂ ਇਜਾਜ਼ਤਾਂ ਪੜ੍ਹੋ ਅਤੇ ਸਹਿਮਤੀ ਦਿਓ। ਤੁਹਾਡੀ ਜਾਣਕਾਰੀ ਕੇਵਲ ਤੁਹਾਡੇ ਡਾਕਟਰ ਨਾਲ ਸਾਂਝੀ ਕੀਤੀ ਜਾਵੇਗੀ।",
  ur: "یہ آپ کی رضامندی کا صفحہ ہے۔ براہ کرم نیچے دی گئی اجازتیں پڑھیں اور رضامندی دیں۔ آپ کی معلومات صرف آپ کے ڈاکٹر کے ساتھ شیئر کی جائیں گی۔",
};

interface ConsentItem {
  id: string;
  icon: string;
  titleKey: "shareHistory" | "shareWithDoctor" | "saveToABHA" | "allowVoiceRecording";
  titleEn: string;
  description: string;
  required: boolean;
}

const CONSENT_ITEMS: ConsentItem[] = [
  {
    id: "dataCapture",
    icon: "🎙️",
    titleKey: "shareHistory",
    titleEn: "Share my medical history for this visit",
    description:
      "Your voice and touch responses will be processed by AI to create a clinical summary for your doctor.",
    required: true,
  },
  {
    id: "doctorShare",
    icon: "👨‍⚕️",
    titleKey: "shareWithDoctor",
    titleEn: "Share summary with my doctor today",
    description:
      "The structured history summary will appear on the doctor's screen before consultation.",
    required: true,
  },
  {
    id: "abhaLink",
    icon: "🔗",
    titleKey: "saveToABHA",
    titleEn: "Save to my ABHA health record",
    description:
      "Your history will be saved to your permanent Ayushman Bharat health account.",
    required: false,
  },
  {
    id: "audioRecording",
    icon: "🔊",
    titleKey: "allowVoiceRecording",
    titleEn: "Allow voice recording",
    description:
      "Audio is processed locally and deleted after your session. Never stored permanently.",
    required: false,
  },
];

export default function ConsentPage() {
  const router = useRouter();
  const [lang, setLang] = useState("hi");
  const [checked, setChecked] = useState<Record<string, boolean>>({
    dataCapture: false,
    doctorShare: false,
    abhaLink: false,
    audioRecording: false,
  });

  const { speak, stop, isSpeaking } = usePageSpeaker(lang);

  useEffect(() => {
    setLang(sessionStorage.getItem("mk_lang") ?? "hi");
  }, []);

  const requiredChecked = CONSENT_ITEMS.filter((i) => i.required).every(
    (i) => checked[i.id]
  );

  function toggle(id: string) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleProceed() {
    stop(); // stop audio when proceeding
    sessionStorage.setItem("mk_consent", JSON.stringify(checked));
    // Always use combined mode (allopathic + AYUSH stages merged)
    sessionStorage.setItem("mk_mode", "combined");
    router.push("/history");
  }

  function handlePlayAudio() {
    if (isSpeaking) {
      stop();
    } else {
      const text = CONSENT_SPEECH[lang] ?? CONSENT_SPEECH["hi"];
      speak(text);
    }
  }

  return (
    <KioskScreen>
      <KioskHeader
        title={t(lang, "yourConsent")}
        subtitle="Your Consent"
        onBack={() => router.push("/login")}
        progress={20}
        stepLabel="2 / 6"
        rightSlot={
          <button
            onClick={handlePlayAudio}
            aria-label="Play audio explanation"
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all",
              isSpeaking
                ? "bg-brand-600 text-white animate-pulse"
                : "bg-brand-50 text-brand-700 hover:bg-brand-100"
            )}
          >
            {isSpeaking ? (
              <span>🔊 {lang === "hi" ? "चल रहा है..." : lang === "pa" ? "ਚੱਲ ਰਿਹਾ ਹੈ..." : "Playing..."}</span>
            ) : (
              <>{lang === "hi" ? "🔊 सुनें" : lang === "pa" ? "🔊 ਸੁਣੋ" : lang === "bn" ? "🔊 শুনুন" : lang === "ta" ? "🔊 கேளுங்கள்" : lang === "te" ? "🔊 వినండి" : lang === "mr" ? "🔊 ऐका" : lang === "gu" ? "🔊 સાંભળો" : lang === "kn" ? "🔊 ಕೇಳಿ" : lang === "ml" ? "🔊 കേൾക്കുക" : "🔊 Listen"}</>
            )}
          </button>
        }
      />

      <KioskBody className="space-y-3">
        {/* Privacy banner */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-brand-50 rounded-2xl border border-brand-100 p-4">
            <div className="flex gap-3 items-start">
              <span className="text-xl shrink-0">🔒</span>
              <div>
                <p className="font-semibold text-brand-900 text-sm">
                  {t(lang, "dataProtected")}
                </p>
                <p className="text-xs text-brand-700 mt-1">
                  Protected under <strong>DPDP Act 2023</strong> &amp; ABDM
                  consent framework. Session data deleted after you leave.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Consent items */}

        {CONSENT_ITEMS.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07 }}
          >
            <Card
              interactive
              selected={checked[item.id]}
              className="p-4"
              onClick={() => toggle(item.id)}
              role="checkbox"
              aria-checked={checked[item.id]}
              tabIndex={0}
              onKeyDown={(e) => e.key === " " && toggle(item.id)}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <div
                  className={cn(
                    "shrink-0 mt-0.5 h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all",
                    checked[item.id]
                      ? "bg-brand-600 border-brand-600"
                      : "border-neutral-300 bg-white"
                  )}
                >
                  {checked[item.id] && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M2.5 7L5.5 10L11.5 4"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>

                <span className="text-xl shrink-0">{item.icon}</span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-neutral-900 text-base leading-tight">
                      {t(lang, item.titleKey)}
                    </p>
                    {item.required ? (
                      <span className="text-xs bg-secondary-50 text-secondary-600 px-2 py-0.5 rounded-full font-semibold border border-secondary-200">
                        {t(lang, "required")}
                      </span>
                    ) : (
                      <span className="text-xs bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full">
                        {t(lang, "optional")}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                    {item.titleEn}
                  </p>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}

        <p className="text-xs text-neutral-400 text-center pt-1">
          {t(lang, "aadhaarNeverStored")} · You can withdraw consent at any time.
        </p>
      </KioskBody>

      <KioskFooter>
        <Button
          variant="primary"
          size="xl"
          fullWidth
          disabled={!requiredChecked}
          onClick={handleProceed}
        >
          ✅ &nbsp;{t(lang, "agreeAndContinue")}
        </Button>
        {!requiredChecked && (
          <p className="text-center text-xs text-neutral-400 mt-2">
            {t(lang, "required")} items above must be checked to continue
          </p>
        )}
      </KioskFooter>
    </KioskScreen>
  );
}
