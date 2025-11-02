import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClaimSense - AI Billing Employee",
  description: "Healthcare billing assistant with AI-powered claim validation and fixing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

