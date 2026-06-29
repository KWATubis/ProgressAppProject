import type { Metadata, Viewport } from "next";
import { Anton, Instrument_Serif, Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegistrar } from "@/components/pwa/ServiceWorkerRegistrar";
import "./globals.css";

// Brand type system — shared with the landing page so the whole product speaks
// one voice. Anton = display, Instrument Serif = editorial accent, Geist = body.
const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-anton" });
const instrument = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-instrument",
});
const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "Portion — Health + Money",
  description:
    "Track your training, diet, body, TikTok growth, and income in one place. AI-coached goals.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Portion",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${anton.variable} ${instrument.variable} ${geist.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full bg-background font-sans text-foreground">
        {children}
        <ServiceWorkerRegistrar />
        <Toaster richColors position="top-right" theme="dark" />
      </body>
    </html>
  );
}
