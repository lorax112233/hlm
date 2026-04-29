import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

// Register the app-wide font once and expose it through a CSS variable.
const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
});

// Next.js uses this for document title and meta description.
export const metadata: Metadata = {
  title: "Hardware Lifecycle Management",
  description: "Web-based hardware lifecycle management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* Apply global font class to all routes rendered by the app shell. */}
      <body className={manrope.variable} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

