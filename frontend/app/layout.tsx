import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bridge — AI Language Companion",
  description: "Chat with an AI companion while learning Korean and Japanese.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-100 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
