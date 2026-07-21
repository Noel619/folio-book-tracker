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
  metadataBase: new URL("http://localhost:3000"),
  title: "Folio · Book Tracker",
  description: "Una biblioteca personal, privada y sencilla para seguir tus lecturas.",
  openGraph: {
    title: "Folio · Book Tracker",
    description: "Tu biblioteca. A tu ritmo.",
    images: [{ url: "/og.png", width: 1736, height: 909, alt: "Folio, tu biblioteca a tu ritmo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Folio · Book Tracker",
    description: "Tu biblioteca. A tu ritmo.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/folio-logo.png",
    apple: "/folio-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://openlibrary.org" />
        <link rel="preconnect" href="https://covers.openlibrary.org" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://covers.openlibrary.org" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
