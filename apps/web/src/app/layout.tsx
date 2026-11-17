import type { Metadata } from "next";
import { Fragment_Mono, Fraunces, Schibsted_Grotesk } from "next/font/google";

import "../index.css";
import Providers from "@/components/providers";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
});

const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
});

const fragment = Fragment_Mono({
  variable: "--font-fragment",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Doctor Tracker",
  description: "Admin portal for doctors and the patients under their care",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fraunces.variable} ${schibsted.variable} ${fragment.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
