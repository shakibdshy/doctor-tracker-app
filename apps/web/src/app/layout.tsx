import type { Metadata } from "next";
import { headers } from "next/headers";
import { Fragment_Mono, Fraunces, Schibsted_Grotesk } from "next/font/google";

import "../index.css";
import Providers from "./providers";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The per-request nonce stamped by src/proxy.ts. Anything that injects
  // its own inline script (next-themes' theme bootstrap) must carry it —
  // under 'strict-dynamic', hash-based fallbacks are ignored.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fraunces.variable} ${schibsted.variable} ${fragment.variable} antialiased`}>
        <Providers nonce={nonce}>{children}</Providers>
      </body>
    </html>
  );
}
