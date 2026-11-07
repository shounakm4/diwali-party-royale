import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Diwali Party Royale · Bring your people. Bring the chaos.",
  description:
    "Two outrageously fun party games. Eight friends. One unforgettable Diwali.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
