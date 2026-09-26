import type { Metadata } from 'next';
import './globals.css';

// Carried over verbatim from portfolio1/index.html — your text, not invented here.
export const metadata: Metadata = {
  title: 'Michael Lawrence',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
