import { Suspense } from 'react';
import { Manrope, Cormorant_Garamond } from 'next/font/google';
import { ActionFeedbackProvider } from '@/components/ui/action-feedback';
import type { Metadata } from 'next';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import './globals.css';
import './product-experience.css';
import './public-sprint.css';
import './ui.css';
import './brand.css';

const bodyFont = Manrope({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  fallback: ['Segoe UI', 'Helvetica', 'sans-serif']
});
const displayFont = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
  fallback: ['Palatino Linotype', 'Book Antiqua', 'serif']
});

export const metadata: Metadata = {
  title: 'Home Fashion',
  description: 'Muebles para hacer hogar'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${bodyFont.variable} ${displayFont.variable}`}>
      <body>
        <ActionFeedbackProvider>
          <a className="skip-link" href="#main-content">
            Saltar al contenido
          </a>
          <Suspense fallback={null}>
            <SiteHeader />
          </Suspense>
          <div id="main-content" tabIndex={-1}>
            {children}
          </div>
          <SiteFooter />
        </ActionFeedbackProvider>
      </body>
    </html>
  );
}
