import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/nav-bar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Suivi des écarts",
  description: "Suivi des écarts SSE, évènements SSE et plans d'action",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background">
        <NavBar />
        {/* Décalé de la largeur de la barre latérale à partir de lg ; en
            dessous, la barre reste en haut et le contenu suit normalement. */}
        <main className="flex-1 lg:pl-[88px]">{children}</main>
      </body>
    </html>
  );
}
