import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/cn";
import { AuthProvider } from "@/hooks/useAuth";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [
    "GenLayer",
    "Intelligent Contracts",
    "Bounty Platform",
    "AI Evaluation",
    "Web3",
    "Hackathon",
  ],
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
  },
};

export const viewport: Viewport = {
  themeColor: siteConfig.primaryHex,
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={cn(
          inter.variable,
          geistMono.variable,
          "min-h-screen bg-canvas text-ink font-sans antialiased",
        )}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
