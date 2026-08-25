import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MedNova NAFDAC PV Readiness Assessment',
  description: "Interactive NAFDAC QPPV & PV Compliance Readiness Assessment"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
