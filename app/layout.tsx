import type { Metadata, Viewport } from 'next';
import { Lato, Scheherazade_New } from 'next/font/google';
import './globals.css';
import { Providers } from '@/lib/providers';
import { PageScroll } from '@/components/PageScroll';
import { ScrollBar } from '@/components/ScrollBar';

// MMD's typeface; Google Fonts lacks its Medium cut, so 400 carries body
// text and 700 is reserved for titles
const lato = Lato({
  variable: '--font-lato',
  subsets: ['latin'],
  weight: ['400', '700'],
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
    <html lang="en" className={`${lato.variable} ${scheherazade.variable} h-full`}>
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
