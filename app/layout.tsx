import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/shell/Providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const display = Space_Grotesk({ subsets: ['latin'], variable: '--font-display', weight: ['400', '500', '600', '700'], display: 'swap' });

export const metadata: Metadata = {
  title: 'Printloom: design anything, printed by the best local shop',
  description: 'Clickable prototype of a three-sided custom print marketplace for customers, print shops and designers.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#6D4AFF',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Anton&family=Noto+Sans+Bengali:wght@500;700&family=Bebas+Neue&family=Caveat:wght@700&family=Pacifico&family=Permanent+Marker&family=Playfair+Display:wght@700&family=Righteous&family=Space+Mono:wght@700&display=swap"
        />
      </head>
      <body className="min-h-screen bg-bg text-text">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
