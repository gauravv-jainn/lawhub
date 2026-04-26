import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'LawHub — India\'s Legal Marketplace',
  description: 'Post your legal matter. Verified advocates bid competitively. You compare, then choose.',
  keywords: 'lawyer, advocate, legal, India, marketplace, brief, legal services',
  openGraph: {
    title: 'LawHub — Find the Right Lawyer',
    description: 'Post your legal matter. Verified advocates bid competitively.',
    siteName: 'LawHub',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
