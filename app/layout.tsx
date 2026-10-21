import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 穿搭助手",
  description: "AI-powered outfit recommendation assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
        {children}
      </body>
    </html>
  );
}
