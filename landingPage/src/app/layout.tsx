import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ArogyaKiosk — AI Healthcare for Every Indian",
  description:
    "Voice-first AI kiosk that takes your medical history in your language before you see the doctor. ABDM certified. 22 Indian languages.",
  metadataBase: new URL("http://localhost:3001"),
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "ArogyaKiosk — AI Healthcare for Every Indian",
    description: "Voice-first clinical history kiosk in 22 Indian languages.",
    url: "",
    siteName: "ArogyaKiosk",
    images: [{ url: "/favicon.png", width: 256, height: 256, alt: "ArogyaKiosk" }],
    locale: "en_IN",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning style={{ fontFamily: "'Poppins', system-ui, sans-serif", margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
