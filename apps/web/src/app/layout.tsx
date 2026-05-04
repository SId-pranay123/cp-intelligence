import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CP Intelligence',
  description: 'Competitive programming skill tracker and recommender',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-gray-950 text-gray-100">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
