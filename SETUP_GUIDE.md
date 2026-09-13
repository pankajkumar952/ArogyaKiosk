# ArogyaKiosk - Setup & Running Guide

## 🔧 Fixed Issue: Login Button Not Working

**Problem**: The login button on the landing page was not navigating to the login page.

**Root Cause**: The landing page was missing the `.env.local` file with the `NEXT_PUBLIC_APP_URL` environment variable.

**Solution**: Added `.env.local` file to the `landingPage` directory with the correct app URL.

---

## 📋 Project Structure

```
arogyakiosk/
├── landingPage/     (Marketing landing page - Port 3001)
│   ├── .env.local   ✅ NEWLY ADDED - Contains app URL
│   └── ...
└── product/         (Main kiosk application - Port 3000)
    ├── .env.local   (Already exists with API keys)
    └── ...
```

---

## 🚀 How to Run

### Prerequisites
- **Node.js 18+** installed
- **npm** or **yarn** package manager

### Step 1: Install Dependencies

**For Landing Page:**
```bash
cd landingPage
npm install
```

**For Product App:**
```bash
cd product
npm install
```

### Step 2: Start Both Servers

**Open Terminal 1 - Landing Page:**
```bash
cd landingPage
npm run dev
```
Landing page will be available at: **http://localhost:3001**

**Open Terminal 2 - Product App:**
```bash
cd product
npm run dev
```
Product app will be available at: **http://localhost:3000**

### Step 3: Test the Login Button

1. Open **http://localhost:3001** in your browser (landing page)
2. Click the **"Log In ›"** button (top right or bottom CTA)
3. ✅ You should now be redirected to **http://localhost:3000/login** (login page)

---

## 📝 Environment Configuration

### Landing Page (`.env.local`)
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- **Local Development**: `http://localhost:3000`
- **Production**: `https://app.arogyakiosk.in`

### Product App (`.env.local`)
Already configured with:
- `NEXT_PUBLIC_APP_URL` - App URL
- `GEMINI_API_KEY` - AI model key
- `NEXTAUTH_SECRET` - Session management
- `ABDM_*` - Health ID system (optional for now)

---

## 🔗 Login Button Locations

The login button navigates to `${process.env.NEXT_PUBLIC_APP_URL}/login`:

1. **Top Navigation** - Line 136 in `landingPage/src/app/page.tsx`
2. **Final CTA Section** - Line 372 in `landingPage/src/app/page.tsx`
3. **Mobile Menu** - Linked to the same destination

---

## ✅ Verification Checklist

- [ ] Both servers are running on correct ports (3001 & 3000)
- [ ] `.env.local` exists in landingPage directory
- [ ] `NEXT_PUBLIC_APP_URL=http://localhost:3000` is set
- [ ] Login button on landing page navigates to login page
- [ ] No console errors in browser

---

## 🐛 Troubleshooting

**Q: "Port 3000/3001 already in use"**
- Kill existing process: `lsof -i :3000` then `kill -9 <PID>`
- Or change port in package.json script

**Q: "Cannot find module" errors**
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again

**Q: ".env.local not being loaded"**
- Make sure you're in the correct directory (landingPage or product)
- Restart the dev server after creating `.env.local`

---

## 📦 For Production Deployment

Update `.env.local` in landingPage:
```env
NEXT_PUBLIC_APP_URL=https://app.arogyakiosk.in
```

Then build and deploy:
```bash
npm run build
npm run start
```

---

**Created by**: Er. Pankaj Kumar  
**Last Updated**: September 13, 2026
