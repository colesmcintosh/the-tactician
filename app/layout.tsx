import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Tactician | AI-Powered Tactical Analysis",
  description: "Generate AI-powered tactical analysis reports from match footage or data. Understand formations, key moments, player performance, strengths, and weaknesses.",
  keywords: ["tactical analysis", "AI", "sports analytics", "match analysis", "video analysis", "formation analysis", "player performance"],
  authors: [{ name: "The Tactician" }],
  openGraph: {
    title: "The Tactician | AI-Powered Tactical Analysis",
    description: "Generate AI-powered tactical analysis reports to gain deeper insights into match performance.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
