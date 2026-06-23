import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "近代史纲要 · 刷题台",
  description: "中国近现代史纲要 · 单元测试与全书测试 · 配套知识点 / 时间轴 / AI 复习",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
