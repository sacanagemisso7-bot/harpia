import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Plus_Jakarta_Sans } from "next/font/google";

import "@/app/globals.css";
import { AppThemeProvider } from "@/components/theme/theme-provider";
import { brand } from "@/lib/brand";

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
  title: {
    default: brand.name,
    template: `%s | ${brand.name}`
  },
  description: brand.description
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${plusJakartaSans.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable}`}
      >
        <AppThemeProvider>{children}</AppThemeProvider>
      </body>
    </html>
  );
}
