import { Metadata } from 'next'
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// eslint-disable-next-line no-unused-vars
export const metadata: Metadata = {
  title: 'Street Names AI Mapper | NYC Commemorative Streets Explorer',
  description: 'Explore NYC commemorative street names and their stories using AI. Discover the history behind street names in your neighborhood.',
  keywords: ['NYC', 'street names', 'history', 'commemorative', 'interactive map'],
  openGraph: {
    title: 'Memories Around the Corner',
    description: 'Explore NYC commemorative street names and their stories using AI',
    url: 'https://streetname.vercel.app',
    siteName: 'Memories Around the Corner',
    images: [
      {
        url: 'https://raw.githubusercontent.com/JessieJessJe/nyc-conaming/main/src/images/plate0.png', // Using your existing street sign image
        width: 1200,
        height: 630,
        alt: 'NYC Street Signs Collage'
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Memories Around the Corner',
    description: 'Explore NYC commemorative street names and their stories using AI',
    images: ['https://raw.githubusercontent.com/JessieJessJe/nyc-conaming/main/src/images/plate0.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' }
    ],
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
