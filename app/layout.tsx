import type { Metadata, Viewport } from 'next';
import { Inter, Amiri } from 'next/font/google';
import './globals.css';
import { Providers } from '@/lib/providers';
import { PageScroll } from '@/components/PageScroll';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const amiri = Amiri({
  variable: '--font-amiri',
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
    <html lang="en" className={`${inter.variable} ${amiri.variable} h-full`}>
      <body className="bg-paper text-ink h-full font-sans">
        <Providers>
          <PageScroll />
          {children}
        </Providers>
      </body>
    </html>
  );
}
