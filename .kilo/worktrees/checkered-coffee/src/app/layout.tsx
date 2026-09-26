import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/sky/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SKY — Smart Knowledge & Security Intelligence",
  description:
    "Multimodal AI security-intelligence platform. Analyzes images, videos, and voice/audio to detect crime, payment fraud, scams, and manipulated media. RAG-based retrieval from trusted sources. AI-assisted decision support — all outputs reviewed by humans.",
  keywords: [
    "SKY",
    "security intelligence",
    "multimodal AI",
    "RAG",
    "fraud detection",
    "scam detection",
    "deepfake detection",
    "computer vision",
    "ASR",
    "decision support",
    "MERN",
    "MongoDB",
  ],
  authors: [{ name: "SKY Platform" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
        <Toaster richColors position="top-right" theme="dark" />
      </body>
    </html>
  );
}
