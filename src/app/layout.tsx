import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Toaster } from "@/components/ui/sonner";
import { SidebarPadding } from "@/components/SidebarPadding";
import Providers from "../components/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "루티드 - 커뮤니티 플랫폼",
  description: "크리에이터와 전문가를 위한 멤버십 커뮤니티 플랫폼",
  icons: {
    icon: [
      { url: "/logos/logo_icon.png", type: "image/png", rel: "icon" },
      { url: "/logos/logo_icon.png", type: "image/png", rel: "shortcut icon" },
    ],
    apple: [{ url: "/logos/logo_icon.png", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${inter.variable} antialiased font-sans`}>
        <Providers>
          {/* 좌측 사이드바 */}
          <Header />
          {/* 본문: 라우트에 따라 좌측 패딩을 동적으로 적용 */}
          <SidebarPadding>
            {children}
          </SidebarPadding>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
