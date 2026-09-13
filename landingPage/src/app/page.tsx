"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const APP_URL = "https://app.arogyakiosk.in";

const C = {
  white:  "#ffffff",
  black:  "#0a1a14",
  teal:   "#0d9488",
  green:  "#059669",
  dark:   "#022c22",
  gray:   "#f0fdf8",
  muted:  "#4b7a6a",
  border: "rgba(13,148,136,0.12)",
};
const FONT = "'Poppins', system-ui, sans-serif";

// ── Reveal wrapper ────────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, className = "", style = {} }: {
  children: React.ReactNode; delay?: number; className?: string; style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className} style={style}>
      {children}
    </motion.div>
  );
}

const tagLabel = (color = C.teal): React.CSSProperties => ({
  fontFamily: FONT, fontSize: 11, fontWeight: 700,
  letterSpacing: "0.1em", textTransform: "uppercase" as const,
  color, marginBottom: 16, display: "block",
});

const h2: React.CSSProperties = {
  fontFamily: FONT, fontWeight: 800, letterSpacing: "-0.6px",
  lineHeight: 1.12, color: C.black, marginBottom: 20,
};

const bodyText: React.CSSProperties = {
  fontFamily: FONT, fontSize: 17, color: C.muted, lineHeight: 1.7, maxWidth: 440,
};

const FEATURES = [
  { tag: "Voice-first",  headline: "Talk to us.\nWe understand every language.",            body: "Speak in Hindi, Tamil, Bengali — or any of India's 22 Scheduled Languages. ArogyaKiosk listens and understands. No typing needed.",                                                             img: "/feature-voice.png",    alt: "Patient speaking to ArogyaKiosk" },
  { tag: "AI History",   headline: "Your doctor gets the full picture\nbefore you walk in.", body: "Our AI asks about your chief complaint, symptoms, duration, and past history — structuring everything into a clinical summary the doctor can act on.",                                          img: "/feature-ai.avif",      alt: "Doctor reviewing clinical summary" },
  { tag: "Documents",    headline: "Old prescriptions and reports —\njust scan them.",       body: "Upload a photo of your lab report, prescription, or discharge summary. ArogyaKiosk reads it and adds key findings to your record automatically.",                                                 img: "/feature-docs.avif",    alt: "Scanning medical documents" },
  { tag: "Privacy",      headline: "Your data belongs to you.\nAlways.",                    body: "DPDP Act 2023 compliant. ABDM certified. No Aadhaar stored. Your record is shared only with your treating doctor, only on the day of your visit.",                                             img: "/feature-privacy.png",  alt: "Digital health privacy" },
];

const STEPS = [
  { n: "01", title: "Choose your language",     body: "Hindi, Tamil, Bengali, and 19 more." },
  { n: "02", title: "Speak your symptoms",      body: "Voice or touch — whatever feels natural." },
  { n: "03", title: "Upload old reports",       body: "Prescriptions, lab reports, discharge summaries." },
  { n: "04", title: "Doctor gets your summary", body: "Full clinical record ready before you enter." },
];

const LANGS = [
  { native: "हिंदी", en: "Hindi" },       { native: "தமிழ்", en: "Tamil" },
  { native: "తెలుగు", en: "Telugu" },     { native: "বাংলা", en: "Bengali" },
  { native: "मराठी", en: "Marathi" },     { native: "ગુજરાતી", en: "Gujarati" },
  { native: "ಕನ್ನಡ", en: "Kannada" },     { native: "മലയാളം", en: "Malayalam" },
  { native: "ਪੰਜਾਬੀ", en: "Punjabi" },    { native: "اردو", en: "Urdu" },
  { native: "ଓଡ଼ିଆ", en: "Odia" },        { native: "অসমীয়া", en: "Assamese" },
  { native: "मैथिली", en: "Maithili" },   { native: "डोगरी", en: "Dogri" },
  { native: "कोंकणी", en: "Konkani" },    { native: "नेपाली", en: "Nepali" },
  { native: "ᱥᱟᱱᱛᱟᱲᱤ", en: "Santali" }, { native: "سنڌي", en: "Sindhi" },
  { native: "संस्कृत", en: "Sanskrit" },  { native: "বোড়ো", en: "Bodo" },
  { native: "মণিপুরী", en: "Manipuri" },  { native: "کشمیری", en: "Kashmiri" },
];

export default function LandingPage() {
  const heroTextRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let lenis: import("lenis").default | null = null;
    async function init() {
      const { default: Lenis } = await import("lenis");
      lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
      function raf(t: number) { lenis!.raf(t); requestAnimationFrame(raf); }
      requestAnimationFrame(raf);
    }
    init();
    return () => lenis?.destroy();
  }, []);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    gsap.set(heroTextRef.current, { opacity: 0, y: 36 });
    gsap.to(heroTextRef.current, { opacity: 1, y: 0, duration: 1, delay: 0.25, ease: "power3.out" });
    return () => ScrollTrigger.killAll();
  }, []);

  return (
    <div style={{ background: C.white, color: C.black, fontFamily: FONT, overflowX: "hidden" }}>

      {/* ── WATERMARK ───────────────────────────────────────────────────────── */}
      <div className="watermark">© Er. Pankaj Kumar</div>

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        background: "rgba(255,255,255,0.96)", backdropFilter: "blur(16px)",
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div className="page-container" style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <Image src="/logo.png" alt="ArogyaKiosk" width={36} height={36} style={{ borderRadius: 10, objectFit: "cover" }} />
            <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: 18, letterSpacing: "-0.3px", color: C.black }}>
              Arogya<span style={{ color: C.teal }}>Kiosk</span>
            </span>
          </a>

          <nav className="hide-mobile" style={{ display: "flex", gap: 32 }}>
            {["Features", "For Hospitals", "Languages"].map((item) => (
              <a key={item} href={`#${item.toLowerCase().replace(" ", "-")}`}
                style={{ fontFamily: FONT, fontSize: 14, fontWeight: 500, color: C.muted, textDecoration: "none" }}>
                {item}
              </a>
            ))}
          </nav>

          <div className="hide-mobile" style={{ display: "flex", gap: 8 }}>
            <a href={process.env.NEXT_PUBLIC_APP_URL} className="btn-login">Log In ›</a>
            
          </div>

          <button
            className="show-mobile"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
            style={{
              background: "none", border: "none", cursor: "pointer",
              display: "none", flexDirection: "column", gap: 5, padding: 6,
            }}>
            <span style={{ display: "block", width: 22, height: 2, background: menuOpen ? C.teal : C.black, transition: "0.2s", transform: menuOpen ? "rotate(45deg) translate(5px,5px)" : "none" }} />
            <span style={{ display: "block", width: 22, height: 2, background: menuOpen ? C.teal : C.black, transition: "0.2s", opacity: menuOpen ? 0 : 1 }} />
            <span style={{ display: "block", width: 22, height: 2, background: menuOpen ? C.teal : C.black, transition: "0.2s", transform: menuOpen ? "rotate(-45deg) translate(5px,-5px)" : "none" }} />
          </button>
        </div>

        {menuOpen && (
          <div style={{
            position: "absolute", top: 64, left: 0, right: 0,
            background: C.white, borderBottom: `1px solid ${C.border}`,
            padding: "16px 24px 24px", display: "flex", flexDirection: "column", gap: 16,
          }}>
            {["Features", "For Hospitals", "Languages"].map((item) => (
              <a key={item} href={`#${item.toLowerCase().replace(" ", "-")}`}
                onClick={() => setMenuOpen(false)}
                style={{ fontFamily: FONT, fontSize: 15, fontWeight: 600, color: C.black, textDecoration: "none" }}>
                {item}
              </a>
            ))}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
              <a href={process.env.NEXT_PUBLIC_APP_URL} className="btn-login" style={{ textAlign: "center" }}>Log In ›</a>
              
            </div>
          </div>
        )}
      </header>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section style={{ paddingTop: 64, background: C.white }}>
        <div className="hero-container" style={{ paddingTop: 16, paddingBottom: 0 }}>
          <div style={{
            position: "relative",
            borderRadius: 18,
            overflow: "hidden",
            height: "calc(100vh - 64px - 16px)",
            minHeight: 420,
            maxHeight: 780,
            display: "flex",
            alignItems: "flex-end",
          }}>
            <Image
              src="/hero.png"
              alt="Patient at ArogyaKiosk"
              fill
              priority
              style={{ objectFit: "cover", objectPosition: "center 20%" }}
            />
            <div className="hero-overlay" />

            <div ref={heroTextRef} className="hero-text-wrap"
              style={{ position: "relative", zIndex: 2, padding: "48px 52px", maxWidth: 580 }}>
              <span style={{
                fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em",
                textTransform: "uppercase", color: "#5eead4", marginBottom: 14, display: "block",
              }}>
                🌿 Arogya means health in Sanskrit
              </span>
              <h1 style={{
                fontFamily: FONT, fontSize: "clamp(36px, 5.5vw, 66px)",
                fontWeight: 800, letterSpacing: "-1.5px", lineHeight: 1.08,
                color: C.white, marginBottom: 18,
              }}>
                Healthcare in<br />your language.
              </h1>
              <p style={{
                fontFamily: FONT, fontSize: "clamp(14px, 1.8vw, 17px)",
                color: "rgba(255,255,255,0.85)", lineHeight: 1.6, marginBottom: 28, maxWidth: 380,
              }}>
                ArogyaKiosk takes your full medical history — by voice, in your language — before you see the doctor.
              </p>
              <div className="btn-group" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <a href={process.env.NEXT_PUBLIC_APP_URL} className="btn-login btn-login-white">Log In ›</a>
                
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "absolute", top: 32, right: 36, zIndex: 3,
                background: "rgba(255,255,255,0.96)", borderRadius: 18,
                padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, maxWidth: 260,
              }}>
              <Image src="/logo.png" alt="ArogyaKiosk" width={40} height={40}
                style={{ borderRadius: 12, objectFit: "cover", flexShrink: 0 }} />
              <div>
                <p style={{ fontFamily: FONT, fontSize: 10, color: C.teal, fontWeight: 700, marginBottom: 3 }}>ArogyaKiosk AI</p>
                <p style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: C.black, lineHeight: 1.3 }}>
                  &ldquo;आपको क्या तकलीफ है?&rdquo;
                </p>
              </div>
            </motion.div>
          </div>
          <p style={{ fontFamily: FONT, fontSize: 11, color: "#bbb", marginTop: 10, textAlign: "right" }}>
            * Free · No app store · Android · iOS · Desktop
          </p>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────────── */}
      <section id="features" style={{ background: C.white }}>
        <div className="page-container" style={{ paddingTop: 96, paddingBottom: 96 }}>
          <Reveal>
            <p style={tagLabel(C.teal)}>Simple process</p>
            <h2 style={{ ...h2, fontSize: "clamp(30px, 4vw, 48px)", maxWidth: 340, marginBottom: 56 }}>
              Four steps.<br />Under four minutes.
            </h2>
          </Reveal>
          <div className="four-col">
            {STEPS.map((step, i) => (
              <Reveal key={step.n} delay={i * 0.1}>
                <p style={{ fontFamily: FONT, fontSize: 48, fontWeight: 800, color: "rgba(13,148,136,0.09)", lineHeight: 1, marginBottom: 16, letterSpacing: "-2px" }}>{step.n}</p>
                <p style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, color: C.black, marginBottom: 6 }}>{step.title}</p>
                <p style={{ fontFamily: FONT, fontSize: 14, color: C.muted, lineHeight: 1.6 }}>{step.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────────── */}
      {FEATURES.map((feat, i) => {
        const isEven = i % 2 === 0;
        return (
          <section key={feat.tag} style={{ background: i % 2 === 0 ? C.gray : C.white }}>
            <div className="page-container two-col" style={{ paddingTop: 80, paddingBottom: 80 }}>
              <Reveal className={isEven ? "" : "order-flip"} style={{ order: isEven ? 1 : 2 }}>
                <p style={tagLabel(C.teal)}>{feat.tag}</p>
                <h2 style={{ ...h2, fontSize: "clamp(26px, 3vw, 38px)", whiteSpace: "pre-line" }}>{feat.headline}</h2>
                <p style={bodyText}>{feat.body}</p>
              </Reveal>
              <Reveal delay={0.12} style={{ order: isEven ? 2 : 1 }}>
                <div style={{ aspectRatio: "4/3", borderRadius: 20, overflow: "hidden", position: "relative", background: C.gray }}>
                  <Image src={feat.img} alt={feat.alt} fill style={{ objectFit: "cover" }} />
                </div>
              </Reveal>
            </div>
          </section>
        );
      })}

      {/* ── LANGUAGES ───────────────────────────────────────────────────────── */}
      <section id="languages" style={{ background: C.dark }}>
        <div className="page-container" style={{ paddingTop: 96, paddingBottom: 96 }}>
          <Reveal>
            <p style={tagLabel("rgba(94,234,212,0.7)")}>Inclusive by design</p>
            <h2 style={{ ...h2, fontSize: "clamp(30px, 4vw, 48px)", color: C.white, maxWidth: 340, marginBottom: 44 }}>
              22 languages.<br />All of them.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {LANGS.map((lang) => (
                <div key={lang.en} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  border: "1.5px solid rgba(94,234,212,0.2)",
                  borderRadius: 9999, padding: "8px 18px", cursor: "default",
                  transition: "border-color 0.2s ease, background 0.2s ease",
                }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = "#0d9488";
                    (e.currentTarget as HTMLElement).style.background = "rgba(13,148,136,0.18)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(94,234,212,0.2)";
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}>
                  <span style={{ fontSize: 15, color: C.white }}>{lang.native}</span>
                  <span style={{ fontFamily: FONT, fontSize: 12, color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>{lang.en}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOR HOSPITALS ───────────────────────────────────────────────────── */}
      <section id="for-hospitals" style={{ background: C.white }}>
        <div className="page-container two-col" style={{ paddingTop: 96, paddingBottom: 96, alignItems: "stretch" }}>
          <Reveal>
            <p style={tagLabel(C.green)}>For Hospitals</p>
            <h2 style={{ ...h2, fontSize: "clamp(26px, 3vw, 40px)", maxWidth: 420, marginBottom: 36 }}>
              <span style={{ display: "block", whiteSpace: "nowrap" }}>Cut OPD wait times.</span>
              <span style={{ display: "block", whiteSpace: "nowrap" }}>Not quality of care.</span>
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {[
                { icon: "⚡", title: "Faster OPD flow",  body: "Doctor gets a structured clinical summary before the patient enters." },
                { icon: "📊", title: "Doctor dashboard", body: "Annotate, approve, and print records from one clean screen." },
                { icon: "🔗", title: "ABDM / ABHA",      body: "Auto-push records to the patient's digital health locker." },
                { icon: "📵", title: "Offline-ready",    body: "Service worker keeps the kiosk running even when network drops." },
              ].map((item) => (
                <div key={item.title} style={{ display: "flex", gap: 14 }}>
                  <span style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }}>{item.icon}</span>
                  <div>
                    <p style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: C.black, marginBottom: 3 }}>{item.title}</p>
                    <p style={{ fontFamily: FONT, fontSize: 13, color: C.muted, lineHeight: 1.6 }}>{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.12} style={{ display: "flex" }}>
            <div style={{ borderRadius: 20, overflow: "hidden", position: "relative", flex: 1, minHeight: 380 }}>
              <Image src="/hospital.jpg" alt="Hospital OPD" fill sizes="100vw" style={{ objectFit: "cover" }} />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────────────────────── */}
      <section style={{ background: C.gray, borderTop: `1px solid ${C.border}` }}>
        <div className="page-container" style={{ paddingTop: 96, paddingBottom: 96, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <Reveal>
            <h2 style={{ fontFamily: FONT, fontSize: "clamp(34px, 5vw, 60px)", fontWeight: 800, letterSpacing: "-1.2px", lineHeight: 1.08, color: C.black, marginBottom: 14 }}>
              Ready to try ArogyaKiosk?
            </h2>
            <p className="cta-subtitle" style={{ fontFamily: FONT, fontSize: 17, color: C.muted, lineHeight: 1.5, marginBottom: 36, whiteSpace: "nowrap" }}>
              Free. No app store needed. Works on any device.
            </p>
            <div className="btn-group" style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
              <a href={process.env.NEXT_PUBLIC_APP_URL} className="btn-login btn-login-lg">Log In ›</a>
              
            </div>
            <p style={{ fontFamily: FONT, fontSize: 12, color: "#bbb", marginTop: 18 }}>
              Android · iOS · Desktop · No app store required
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: `1px solid ${C.border}`, background: C.white }}>
        <div className="page-container footer-bottom" style={{
          paddingTop: 22, paddingBottom: 26,
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          gap: 16,
        }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <Image src="/logo.png" alt="ArogyaKiosk" width={26} height={26} style={{ borderRadius: 7, objectFit: "cover" }} />
            <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: 15, color: C.black }}>
              Arogya<span style={{ color: C.teal }}>Kiosk</span>
            </span>
          </a>

          <p style={{ fontFamily: FONT, fontSize: 13, color: "#aaa", fontWeight: 500, textAlign: "center", whiteSpace: "nowrap" }}>
            © 2026 ArogyaKiosk · Er. Pankaj Kumar
          </p>

          <p style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, color: "#aaa", textAlign: "right", whiteSpace: "nowrap" }}>
            Designed &amp; Developed by{" "}
            <span style={{ color: C.teal, fontWeight: 700 }}>Er. Pankaj Kumar</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
