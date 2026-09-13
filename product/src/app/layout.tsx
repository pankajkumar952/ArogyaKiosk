import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? ""
  ),
  title: "ArogyaKiosk — AI Clinical History Kiosk",
  description:
    "AI-powered multilingual clinical history-taking kiosk for Indian hospitals and AYUSH clinics. Speaks 13 Indian languages.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ArogyaKiosk",
  },
  keywords: [
    "ArogyaKiosk", "ABHA", "ABDM", "clinical history",
    "AYUSH", "multilingual healthcare",
    "Bhashini", "voice kiosk", "Er. Pankaj Kumar",
  ],
  openGraph: {
    title: "ArogyaKiosk — AI Clinical History Kiosk",
    description: "AI voice agent takes patient history in 13 Indian languages before doctor consultation.",
    url: "",
    siteName: "ArogyaKiosk",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "ArogyaKiosk Logo",
      },
    ],
  },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0d9488",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hi" className={poppins.variable} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-white antialiased">
        <ServiceWorkerRegistrar />
        {children}
        {/* Watermark — Er. Pankaj Kumar */}
        <div style={{
          position: "fixed", bottom: 10, right: 14,
          fontFamily: "'Poppins', system-ui, sans-serif",
          fontSize: 10, fontWeight: 600,
          color: "rgba(13,148,136,0.4)",
          letterSpacing: "0.04em",
          pointerEvents: "none",
          zIndex: 9999,
          userSelect: "none",
        }}>© Er. Pankaj Kumar</div>
      </body>
    </html>
  );
}
