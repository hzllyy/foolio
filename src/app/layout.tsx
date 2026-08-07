import type { Metadata } from "next";
import { Jua, Anonymous_Pro } from "next/font/google";
import "@/components/design-system/tokens.css";
import "./globals.css";

const jua = Jua({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-jua",
});

const anonymousPro = Anonymous_Pro({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-anonymous-pro",
});

export const metadata: Metadata = {
  title: "foolio",
  description: "A website builder for creative portfolios, built around scroll animation.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jua.variable} ${anonymousPro.variable}`}>
      <body>{children}</body>
    </html>
  );
}
