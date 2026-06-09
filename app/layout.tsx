import type { Metadata, Viewport } from 'next';
import { Inter, Scheherazade_New } from 'next/font/google';
import './globals.css';
import { Providers } from '@/lib/providers';
import { PageScroll } from '@/components/PageScroll';
import { ScrollBar } from '@/components/ScrollBar';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const scheherazade = Scheherazade_New({
  variable: '--font-scheherazade',
  subsets: ['arabic'],
  weight: ['400', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Mindful Quran',
  description: 'Read the Quran with mindful, distraction-free design.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${scheherazade.variable} h-full`}>
      <body className="bg-paper text-ink h-full font-sans">
        <Providers>
          <PageScroll />
          <ScrollBar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
