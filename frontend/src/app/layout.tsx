import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LingoDarling ・ 두근두근 ドキドキ",
  description: "연애로 배우는 한국어 × 일본어",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fff0f7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/*
        높이 정책:
        - body 는 화면 높이로 고정 (h-dvh = 모바일 주소창 변화 추종, 키보드 OK)
        - app-frame 도 고정 + overflow-hidden → 내부 콘텐츠가 늘어나도 절대 부모를 밀지 않음
        - 채팅 같은 스크롤 영역은 내부 컨테이너(`flex-1 overflow-y-auto`) 에서만 스크롤
        min-h-* 는 절대 쓰지 말 것. 콘텐츠 누적 시 프레임이 같이 커지는 원인.
      */}
      <body className="h-dvh overflow-hidden">
        <div className="app-frame mx-auto flex h-full w-full max-w-[440px] flex-col overflow-hidden">
          {children}
        </div>
      </body>
    </html>
  );
}
