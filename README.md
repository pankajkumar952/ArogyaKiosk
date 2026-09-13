# 🌿 ArogyaKiosk — AI Healthcare Kiosk for India

> **Voice-first • Multilingual • AI-powered • Healthcare-focused**

**ArogyaKiosk** is a voice-first, multilingual healthcare kiosk designed to help patients provide their medical history in their preferred Indian language before meeting a doctor.

The platform combines **AI-powered clinical history collection, voice interaction, medical document scanning, structured summaries, doctor review, offline support, and healthcare interoperability concepts** into a single modern application.

### 🚀 Live Demo

**[ArogyaKiosk — Live Application](https://arogyalanding-5xnto6r7w-pankaj-20b2.vercel.app/)**

> **Developed by Er. Pankaj Kumar**  
> Full-Stack Developer | AI & Healthcare Technology

---

## 🎯 Why ArogyaKiosk?

In many healthcare environments, doctors spend valuable time collecting basic patient information, understanding symptoms, and reviewing previous medical documents.

ArogyaKiosk explores how an AI-assisted kiosk could streamline this initial information-gathering process.

### Patient → AI Kiosk → Structured History → Doctor

The system is designed around a simple workflow:

**Speak → Understand → Structure → Review → Share**

Patients can interact with the system using voice, provide symptoms and medical history, upload relevant documents, and generate a structured summary that can be reviewed by healthcare professionals.

---

## ✨ Key Features

### 🎙️ Voice-First Patient Interaction

Patients can provide information through voice instead of relying entirely on typing.

- Voice-based interaction
- Multilingual healthcare experience
- Designed for accessibility and ease of use
- Indian-language interaction through Bhashini integration

---

### 🧠 AI-Assisted Clinical History

The application uses AI to organize patient-provided information into a structured format.

It can assist with collecting:

- Symptoms
- Symptom duration
- Previous medical history
- Current concerns
- Relevant patient information
- Structured clinical summaries

> The AI is intended as an information-collection and organization layer, not as a replacement for professional medical diagnosis.

---

### 📄 Medical Document Scanning

Patients can upload medical documents such as:

- Laboratory reports
- Prescriptions
- Discharge summaries
- Previous medical records

The platform is designed to bring relevant information together before doctor review.

---

### 🏥 Doctor Dashboard

A dedicated doctor-facing interface provides a structured view of collected patient information.

The dashboard concept includes:

- Patient history
- AI-generated summaries
- Uploaded documents
- Record review
- Annotation workflow
- Printing/export-oriented workflow

---

### 🔗 Healthcare Interoperability

The project is designed around modern healthcare interoperability concepts including:

- **ABDM**
- **ABHA**
- **FHIR R4**
- Structured healthcare records
- Consent-oriented workflows

This makes the project more than a conventional AI chatbot — it explores how AI can fit into a healthcare information workflow.

---

### 📵 Offline-Ready Architecture

A **Progressive Web App (PWA)** approach and service-worker architecture are used to explore reliable kiosk operation in environments where connectivity may not always be stable.

---

### 🔐 Privacy-Oriented Design

Healthcare applications require careful handling of sensitive information.

The project follows a privacy-first design approach with considerations such as:

- Consent-oriented workflows
- Minimal unnecessary data collection
- Environment-based secret management
- No hardcoded API credentials
- Separation between application logic and sensitive configuration

> This portfolio project should not be interpreted as a formal legal certification or production healthcare compliance certification.

---

# 🛠️ Technology Stack

| Category | Technologies |
|---|---|
| **Frontend** | Next.js 15, React 19, TypeScript |
| **Styling** | Tailwind CSS v4 |
| **Animation** | Framer Motion, GSAP |
| **AI / LLM** | Google Gemini (`@google/genai`) |
| **Voice** | Bhashini ASR / TTS |
| **Database** | PostgreSQL / Neon |
| **ORM** | Drizzle ORM |
| **Authentication** | Mobile OTP, Doctor Authentication |
| **Healthcare Standards** | ABDM, ABHA, FHIR R4 |
| **Offline Support** | PWA / Service Worker |
| **Testing** | Vitest, Testing Library |
| **Containerization** | Docker, Docker Compose |
| **Deployment** | Vercel |

---

# 🏗️ System Architecture

```text
                    ┌─────────────────────┐
                    │      Patient        │
                    │  Voice / Documents  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    ArogyaKiosk      │
                    │   Next.js / React    │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
        ┌──────────┐     ┌───────────┐    ┌──────────┐
        │ Bhashini │     │  Gemini   │    │ Document │
        │ ASR/TTS  │     │ AI / LLM  │    │  Input   │
        └────┬─────┘     └─────┬─────┘    └────┬─────┘
             │                 │                │
             └─────────────────┼────────────────┘
                               ▼
                    ┌─────────────────────┐
                    │ Structured Patient  │
                    │      History        │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   PostgreSQL /      │
                    │   Neon + Drizzle    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Doctor Dashboard  │
                    │ Review / Annotate    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ ABDM / FHIR Layer   │
                    └─────────────────────┘
```

---

# 🔄 Application Workflow

### 1. Patient Authentication

The patient begins the session through the kiosk authentication flow.

### 2. Consent

The system presents the required consent workflow before processing healthcare information.

### 3. Medical Documents

Patients can provide previous prescriptions, laboratory reports, or other relevant documents.

### 4. AI History Taking

The AI-assisted workflow collects information about symptoms, duration, and medical history.

### 5. Voice Interaction

Patients can interact through supported Indian languages using speech recognition and text-to-speech.

### 6. Clinical Summary

The collected information is transformed into a structured summary.

### 7. Doctor Review

A doctor can review the collected information before making clinical decisions.

### 8. Healthcare Record Integration

The architecture includes concepts for interoperability through **FHIR / ABDM-oriented workflows**.

---

# 📁 Project Structure

```text
arogyakiosk/
│
├── landingPage/
│   ├── src/
│   │   └── app/
│   │       ├── page.tsx
│   │       ├── layout.tsx
│   │       └── globals.css
│   │
│   └── public/
│       ├── images/
│       └── favicon/
│
├── product/
│   │
│   ├── src/
│   │   ├── app/
│   │   │   ├── login/
│   │   │   ├── scan/
│   │   │   ├── history/
│   │   │   ├── summary/
│   │   │   ├── consent/
│   │   │   ├── doctor/
│   │   │   └── complete/
│   │   │
│   │   ├── components/
│   │   ├── hooks/
│   │   └── lib/
│   │       ├── ABDM/
│   │       ├── Bhashini/
│   │       ├── FHIR/
│   │       ├── RAG/
│   │       └── database/
│   │
│   ├── drizzle/
│   │   ├── migrations/
│   │   └── schema/
│   │
│   ├── Dockerfile
│   └── docker-compose.yml
│
└── README.md
```

---

# 🚀 Running Locally

## Prerequisites

Make sure you have:

- Node.js 20+
- npm or yarn
- PostgreSQL / Neon database
- Google Gemini API key
- Bhashini API credentials
- ABDM sandbox credentials if using the integration layer

---

## 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/arogyakiosk.git

cd arogyakiosk
```

---

## 2. Run the Landing Page

```bash
cd landingPage

npm install

npm run dev
```

Open:

```text
http://localhost:3001
```

---

## 3. Run the Product

```bash
cd product

npm install
```

Create your environment file:

```bash
cp .env.local.example .env.local
```

Add your required environment variables and start the application:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

# 🗄️ Database Setup

The product uses PostgreSQL with Neon and Drizzle ORM.

From the `product` directory:

```bash
npm run db:push
```

To inspect the database:

```bash
npm run db:studio
```

---

# 🐳 Docker Setup

The product can also be run using Docker.

```bash
cd product

docker-compose up --build
```

This provides a reproducible containerized development environment.

---

# 🔑 Environment Variables

Create:

```text
product/.env.local
```

Example:

```env
NEXT_PUBLIC_APP_URL=

DATABASE_URL=

GOOGLE_GEMINI_API_KEY=

BHASHINI_API_KEY=

ABDM_CLIENT_ID=
ABDM_CLIENT_SECRET=

DOCTOR_PASSWORD_HASH=

JWT_SECRET=
```

> Never commit real API keys, database passwords, JWT secrets, or other credentials to GitHub.

---

# 🧪 Testing

The project includes a testing setup using:

- Vitest
- Testing Library

Run tests with the project's configured npm test command.

Example:

```bash
npm test
```

---

# 📱 Responsive & PWA Experience

ArogyaKiosk is designed for kiosk-style healthcare environments while maintaining a responsive web experience.

The architecture explores:

- Responsive UI
- PWA capabilities
- Service-worker caching
- Offline-ready application behavior
- Touch-friendly kiosk interaction

---

# 💡 Engineering Highlights

This project demonstrates practical experience across several areas of modern software development:

### Frontend Engineering

- Next.js App Router
- React 19
- TypeScript
- Responsive UI
- Component-based architecture
- Animations with Framer Motion and GSAP

### AI Engineering

- Gemini API integration
- AI-assisted information extraction
- Structured prompt workflows
- AI-generated summaries
- Healthcare-oriented conversational flows

### Voice Technology

- Speech recognition
- Text-to-speech
- Multilingual interaction
- Bhashini API integration

### Backend & Data

- PostgreSQL
- Neon
- Drizzle ORM
- Authentication flows
- Structured healthcare data

### DevOps

- Docker
- Docker Compose
- Environment configuration
- Vercel deployment
- Production-oriented project structure

### Healthcare Technology

- ABDM concepts
- ABHA ecosystem concepts
- FHIR R4
- Consent workflow
- Privacy-oriented architecture

---

# 📊 Recruiter Snapshot

| Area | Implementation |
|---|---|
| **Application Type** | AI Healthcare Platform |
| **Frontend** | Next.js + React + TypeScript |
| **AI** | Google Gemini |
| **Voice AI** | Bhashini |
| **Database** | PostgreSQL / Neon |
| **ORM** | Drizzle |
| **Healthcare** | ABDM / ABHA / FHIR |
| **Authentication** | OTP + Doctor Auth |
| **Offline** | PWA / Service Worker |
| **Testing** | Vitest + Testing Library |
| **Containerization** | Docker |
| **Deployment** | Vercel |

---

# 🌐 Project Links

### 🚀 Live Demo

**[Open ArogyaKiosk Live](https://arogyalanding-5xnto6r7w-pankaj-20b2.vercel.app/)**

### 💻 Source Code

**GitHub:** `Add your GitHub repository link here`

### 👨‍💻 Developer

**Er. Pankaj Kumar**

Full-Stack Developer | AI & Healthcare Technology

---

# 🔐 Security & Responsible AI

ArogyaKiosk is a portfolio/project implementation exploring AI-assisted healthcare workflows.

It is **not intended to replace doctors, clinical judgment, emergency medical services, or professional diagnosis**.

AI-generated information should be reviewed by qualified healthcare professionals before being used for clinical decision-making.

No production deployment should process real patient healthcare data without completing the required security, privacy, regulatory, infrastructure, and healthcare compliance requirements.

---

# 📜 License

This project is released under the **MIT License**.

See the [`LICENSE`](./LICENSE) file for details.

---

# 👨‍💻 About the Developer

**Er. Pankaj Kumar** is a Full-Stack Developer focused on building practical applications using modern web technologies, AI, APIs, databases, and cloud deployment.

ArogyaKiosk represents an exploration of how **AI + Voice + Full-Stack Engineering + Healthcare Interoperability** can be combined into a real-world product concept.

---

## ⭐ Project Highlights

```text
AI                    → Google Gemini
Voice                 → Bhashini
Frontend              → Next.js + React + TypeScript
Database              → PostgreSQL + Neon
ORM                   → Drizzle
Healthcare Standards  → ABDM + ABHA + FHIR R4
Offline               → PWA / Service Worker
Testing               → Vitest + Testing Library
DevOps                → Docker + Docker Compose
Deployment            → Vercel
```

> **ArogyaKiosk — Making healthcare information collection more accessible, structured, and patient-friendly. 🌿**
