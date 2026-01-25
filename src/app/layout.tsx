import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "입시컨설팅 CRM",
  description: "입시컨설팅 학원 전용 CRM 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
