# 🌿 ArogyaKiosk — AI Healthcare for Every Indian

> **Developed by Er. Pankaj Kumar**

ArogyaKiosk is a voice-first, multilingual AI kiosk that takes a patient's full medical history — in their own language — before they see the doctor. Built for Indian hospitals, AYUSH clinics, and primary health centres.

---

## ✨ Features

- 🎙️ **Voice-first AI** — Patients speak, ArogyaKiosk listens in 22 Indian languages
- 🧠 **AI Clinical History** — Structured symptom collection, duration, past history
- 📄 **Document Scanning** — Upload lab reports, prescriptions, discharge summaries
- 🔒 **Privacy-first** — DPDP Act 2023 compliant, ABDM certified, no Aadhaar stored
- 📵 **Offline-ready** — Service worker keeps the kiosk alive without internet
- 🏥 **Doctor Dashboard** — Clean interface for reviewing, annotating, and printing records
- 🔗 **ABDM / ABHA** — Auto-push patient records to India's digital health ecosystem

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15, React 19, TypeScript |
| **Styling** | Tailwind CSS v4, Framer Motion, GSAP |
| **Font** | Poppins (Google Fonts) |
| **AI / LLM** | Google Gemini (`@google/genai`) |
| **Voice** | Bhashini ASR/TTS API |
| **Database** | Neon (PostgreSQL serverless) via Drizzle ORM |
| **Auth** | Mobile OTP, Doctor auth |
| **Health Standards** | ABDM, ABHA, FHIR R4 |
| **Offline** | PWA Service Worker |
| **Testing** | Vitest, Testing Library |
| **Container** | Docker + Docker Compose |

---

## 📁 Project Structure

```
arogyakiosk/
├── landingPage/          # Public-facing marketing site (Next.js)
│   ├── src/app/
│   │   ├── page.tsx      # Landing page UI
│   │   ├── layout.tsx    # Metadata, fonts
│   │   └── globals.css   # Teal/green design system
│   └── public/           # Images, favicon
│
└── product/              # The actual kiosk application (Next.js)
    ├── src/
    │   ├── app/          # App Router pages
    │   │   ├── login/    # Patient OTP login
    │   │   ├── scan/     # Document scanner
    │   │   ├── history/  # AI-driven history taking
    │   │   ├── summary/  # Clinical summary review
    │   │   ├── consent/  # ABDM consent flow
    │   │   ├── doctor/   # Doctor dashboard
    │   │   └── complete/ # Session complete
    │   ├── components/   # KioskLayout, UI primitives
    │   ├── hooks/        # useVoiceSession, useOfflineStatus, usePageSpeaker
    │   └── lib/          # ABDM, Bhashini, FHIR, RAG, DB
    ├── drizzle/          # Database migrations
    ├── Dockerfile
    └── docker-compose.yml
```

---

## 🚀 Running Locally

### Prerequisites
- Node.js 20+
- npm or yarn
- A Neon (or any PostgreSQL) database
- API keys: Google Gemini, Bhashini, ABDM sandbox

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/arogyakiosk.git
cd arogyakiosk
```

**Landing Page:**
```bash
cd landingPage
npm install
npm run dev
# Open http://localhost:3001
```

**Product (Kiosk App):**
```bash
cd product
cp .env.local.example .env.local
# Fill in your API keys in .env.local
npm install
npm run dev
# Open http://localhost:3000
```

### 2. Database setup (product only)

```bash
cd product
npm run db:push      # Push schema to your Neon DB
npm run db:studio    # (optional) visual DB browser
```

### 3. Run with Docker

```bash
cd product
docker-compose up --build
```

---

## 🌐 Deploying to Production

### Best Free/Cheap Hosting Options

| Platform | What to host | Notes |
|---|---|---|
| **Vercel** | landingPage + product | Best for Next.js; free tier generous |
| **Railway** | product | Good for full-stack with DB |
| **Render** | product | Free web service + PostgreSQL |
| **Netlify** | landingPage | Static/SSG landing pages |
| **Fly.io** | product (Docker) | Docker-native, good free tier |

**Recommended: Deploy both on Vercel**
1. Push to GitHub
2. Go to [vercel.com](https://vercel.com) → Import repo
3. Select `landingPage` folder → Deploy
4. Repeat for `product` folder
5. Add environment variables from `.env.local.example`

---

## 🔑 Environment Variables

Copy `product/.env.local.example` → `product/.env.local` and fill in:

```
NEXT_PUBLIC_APP_URL=
DATABASE_URL=
GOOGLE_GEMINI_API_KEY=
BHASHINI_API_KEY=
ABDM_CLIENT_ID=
ABDM_CLIENT_SECRET=
DOCTOR_PASSWORD_HASH=
JWT_SECRET=
```

---

## 📜 License

MIT License — See [LICENSE](./LICENSE) file.

---

## 👨‍💻 Author

**Er. Pankaj Kumar**  
Full-Stack Developer | AI & Healthcare Tech  
© 2026 ArogyaKiosk

---

> *"Arogya" (आरोग्य) means health and well-being in Sanskrit.*
