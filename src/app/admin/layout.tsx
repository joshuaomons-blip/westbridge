import type { Metadata, Viewport } from "next";
import { Archivo, Inter } from "next/font/google";
import "../globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });
const archivo = Archivo({ subsets: ["latin", "latin-ext"], axes: ["wdth"], variable: "--font-display-face", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Admin — Westbridge Global Express", template: "%s — Westbridge Admin" },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#0f1c3b", width: "device-width", initialScale: 1 };

// Admin pages always render per request with the current session.
export const dynamic = "force-dynamic";

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${archivo.variable}`}>
      <body className="min-h-screen bg-slate-100">{children}</body>
    </html>
  );
}
