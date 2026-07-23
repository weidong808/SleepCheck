import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { Analytics } from "@/components/Analytics";
import { AppHeader } from "@/components/AppHeader";
import {
  APP_DESCRIPTION,
  APP_ICON_APPLE,
  APP_ICON_PNG_192,
  APP_ICON_PNG_512,
  APP_ICON_SRC,
  APP_NAME,
  APP_TAGLINE,
  APP_URL,
} from "@/lib/brand";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description: APP_DESCRIPTION,
  openGraph: {
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description: APP_DESCRIPTION,
    url: APP_URL,
    siteName: APP_NAME,
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: `${APP_NAME} — ${APP_TAGLINE}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description: APP_DESCRIPTION,
    images: ["/og.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
  },
  icons: {
    icon: [
      { url: APP_ICON_SRC, type: "image/svg+xml" },
      { url: APP_ICON_PNG_192, sizes: "192x192", type: "image/png" },
      { url: APP_ICON_PNG_512, sizes: "512x512", type: "image/png" },
    ],
    apple: APP_ICON_APPLE,
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0c0b",
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
      className={`${geistSans.variable} ${geistMono.variable} ${instrument.variable}`}
    >
      <body className="bg-background text-foreground min-h-full antialiased">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <AppHeader />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
