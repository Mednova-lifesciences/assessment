import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';

const SITE_URL = 'https://nafdac-readiness-assessment.vercel.app';
const SITE_NAME = 'MedNova Lifesciences';
const DEFAULT_TITLE = 'NAFDAC PV Readiness Assessment | MedNova Lifesciences';
const DESCRIPTION =
  'Free 2-minute NAFDAC QPPV & pharmacovigilance compliance readiness assessment for pharmaceutical companies in Nigeria. Get your instant compliance score and gap analysis.';
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'NAFDAC',
    'pharmacovigilance Nigeria',
    'QPPV Nigeria',
    'PV compliance assessment',
    'NAFDAC readiness',
    'MedNova Lifesciences',
    'drug safety Nigeria'
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: {
    canonical: '/'
  },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: 'en_NG',
    title: DEFAULT_TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — NAFDAC PV Readiness Assessment`
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: DEFAULT_TITLE,
    description: DESCRIPTION,
    images: ['/og-image.png']
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  },
  category: 'healthcare'
};

export const viewport: Viewport = {
  themeColor: '#0F52BA'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        {GA_MEASUREMENT_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}');
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
