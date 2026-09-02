import type { Metadata } from 'next';
import { Baloo_2, Be_Vietnam_Pro } from 'next/font/google';
import './globals.css';

const display = Baloo_2({
  subsets: ['latin', 'vietnamese'],
  weight: ['600', '700', '800'],
  variable: '--font-display',
});

const body = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
});

export const metadata: Metadata = {
  title: 'IELTS Mock Test — Thi thử IELTS 4 kỹ năng',
  description: 'Nền tảng thi thử IELTS đủ 4 kỹ năng: Listening, Reading, Writing, Speaking.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
