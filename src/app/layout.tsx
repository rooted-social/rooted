import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Toaster } from "@/components/ui/sonner";
import { SidebarPadding } from "@/components/SidebarPadding";
import Providers from "../components/providers";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
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
      <body className={`${jakarta.className} antialiased`}>
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
