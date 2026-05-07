import type { Metadata } from 'next';
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CP Intelligence',
  description: 'Competitive programming skill tracker and recommender',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <head>
        {/* Apply saved theme before first paint to avoid flash */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            var t = localStorage.getItem('theme') || 'dark';
            var v = t === 'system'
              ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
              : t;
            document.documentElement.setAttribute('data-theme', v);
          })();
        `}} />
      </head>
      <body className="min-h-screen antialiased font-sans" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
        {children}
      </body>
    </html>
  );
}
