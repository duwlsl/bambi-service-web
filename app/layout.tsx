import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AuthProvider } from "@/components/auth/auth-provider";
import { GuestGateProvider } from "@/components/auth/guest-gate-provider";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { THEME_STORAGE_KEY } from "@/lib/theme";

import "./globals.css";

/**
 * 테마 초기화 — paint 전에 저장된 화면 모드를 documentElement 에 적용해 FOUC 를 막는다.
 * 저장 키는 lib/theme.ts 와 단일 소스로 맞춘다. 잘못된 값이면 system 으로 처리한다.
 */
const themeInitScript = `(function(){try{var s=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});var m=s==="light"||s==="dark"||s==="system"?s:"system";var dark=m==="dark"||(m==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",dark);}catch(e){}})();`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AlphaCatcher — 밤새비서",
  description: "매일 아침, 나에게 중요한 것만. 관심사 기반 출처 카드 브리핑.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* 테마 초기 적용(paint 전) — documentElement 의 .dark 토글은 <html> 속성 변화라 hydration 경고를
            내지 않도록 위 suppressHydrationWarning 과 함께 둔다. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {/* 앱 셸 — 모달이 열리면 이 요소를 inert + aria-hidden 처리해 배경(키보드·스크린리더)을 격리한다.
            모달은 createPortal 로 이 요소 바깥(document.body)에 렌더되어 자신은 inert 되지 않는다. */}
        <div id="app-shell" className="flex min-h-full flex-1 flex-col">
          <ThemeProvider>
            <AuthProvider>
              <GuestGateProvider>{children}</GuestGateProvider>
            </AuthProvider>
          </ThemeProvider>
        </div>
      </body>
    </html>
  );
}
