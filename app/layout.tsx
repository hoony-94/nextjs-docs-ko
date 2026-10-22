import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { SiteHeader } from '@/components/site/site-header';
import { preferenceScript } from '@/components/site/preferences';
import { getLatestVersion } from '@/lib/content/versions';
import { SITE_URL } from '@/lib/site';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: '%s · Next.js 문서 한국어 (비공식)',
    default: 'Next.js 문서 한국어 (비공식)',
  },
  description: 'Next.js 공식 문서의 영어 원문 문장마다 한국어 번역을 붙인 비공식 학습용 사이트입니다.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable}`} data-view="both" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: preferenceScript }} />
      </head>
      <body>
        <SiteHeader />
        {children}
        <footer className="site-footer">
          <p>
            원문은 <a href="https://github.com/vercel/next.js/tree/canary/docs">vercel/next.js</a> 저장소의 버전별 릴리스
            문서입니다(최신 {getLatestVersion().tag}). © Vercel, Inc. ·{' '}
            <a href="https://github.com/vercel/next.js/blob/canary/license.md">MIT License</a>
          </p>
          <p>이 사이트는 학습용 비공식 한국어 번역이며 Vercel과 관련이 없습니다. 정확한 내용은 nextjs.org 원문을 확인하세요.</p>
        </footer>
      </body>
    </html>
  );
}
