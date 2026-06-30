import type { Metadata } from "next";
import "./globals.css";

const TAGLINE = "RambleBabble, talk messy, leave polished or wildly wacky";
const PITCH =
  "Ramble in, Babble out. Turn your messiest voice memos and half-thoughts into clean messages, emails, and notes, or crank them up wildly wacky.";

export const metadata: Metadata = {
  metadataBase: new URL("https://ramblebabble.com"),
  title: TAGLINE,
  description: PITCH,
  openGraph: {
    title: TAGLINE,
    description: PITCH,
    url: "https://ramblebabble.com",
    siteName: "RambleBabble",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TAGLINE,
    description: PITCH,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@700,800&f[]=general-sans@400,500,600,700&display=swap"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300..800&family=Instrument+Serif:ital@0;1&family=Space+Mono:wght@400;700&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&family=Caveat+Brush&display=swap"
        />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
