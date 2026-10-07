import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lụmlott — Lụm bộ số, nhặt ước mơ",
  description: "Lụmlott - Lụm bộ số, nhặt ước mơ. Hệ thống quay thưởng xổ số tự động thời gian thực.",
  keywords: ["lụmlott", "lụm bộ số nhặt ước mơ", "lồng cầu", "quay số", "xổ số"],
  authors: [{ name: "Lụmlott Team" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="dark">
      <body className="flex flex-col min-h-screen bg-[#090a0f]">
        {children}
      </body>
    </html>
  );
}
