import type { Metadata } from "next";
import "./globals.css";

const TAGLINE =
  "RambleBabble: Ramble in. Brilliance out... sometimes wildly wacky.";
const PITCH =
  "Dump your messiest voice memos and half-thoughts. Get back clean messages, emails, and notes, or something wildly wacky. Ramble in, brilliance out.";

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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300..800&family=Instrument+Serif:ital@0;1&family=Space+Mono:wght@400;700&display=swap"
        />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
