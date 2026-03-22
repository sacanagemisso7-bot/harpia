import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Plus_Jakarta_Sans } from "next/font/google";

import "@/app/globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans"
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display"
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono"
});

export const metadata: Metadata = {
  title: "HireFlow AI",
  description: "Plataforma SaaS de triagem inteligente para RH."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${plusJakartaSans.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable}`}>{children}</body>
    </html>
  );
}
