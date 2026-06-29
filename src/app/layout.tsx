import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RambleBabble. Talk messy. Leave polished.",
  description:
    "Record or paste messy spoken thoughts and turn them into clean, usable written text.",
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
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&family=Caveat+Brush&display=swap"
        />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
