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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "루티드 - 올인원 커뮤니티 플랫폼",
  description:
    "루티드는 멤버십, 콘텐츠, 이벤트, 클래스 운영까지 손쉽게 관리하고, 함께 성장할 수 있는 공간을 제공합니다.",
  icons: {
    icon: [
      { url: "/logos/logo_icon.png", type: "image/png", rel: "icon" },
      { url: "/logos/logo_icon.png", type: "image/png", rel: "shortcut icon" },
    ],
    apple: [{ url: "/logos/logo_icon.png", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    title: "루티드 - 올인원 커뮤니티 플랫폼",
    description:
      "루티드는 멤버십, 콘텐츠, 이벤트, 클래스 운영까지 손쉽게 관리하고, 함께 성장할 수 있는 공간을 제공합니다.",
    siteName: "Rooted",
    images: [
      {
        url: "/logos/thumbnail.png",
        alt: "Rooted",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "루티드 - 올인원 커뮤니티 플랫폼",
    description:
      "루티드는 멤버십, 콘텐츠, 이벤트, 클래스 운영까지 손쉽게 관리하고, 함께 성장할 수 있는 공간을 제공합니다.",
    images: ["/logos/thumbnail.png"],
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
