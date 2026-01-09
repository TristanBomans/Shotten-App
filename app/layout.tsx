import type { Metadata, Viewport } from 'next';
import './globals.css';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';

export const metadata: Metadata = {
    title: 'Shotten - Team Tracker',
    description: 'Track your weekly futsal team attendance',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'Shotten',
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
    themeColor: '#050508',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head>
                <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="mobile-web-app-capable" content="yes" />
            </head>
            <body>
                {/* Ambient Background Layer */}
                <div className="ambient-bg" aria-hidden="true" />

                {/* Main Content */}
                {children}

                {/* Service Worker */}
                <ServiceWorkerRegistration />
            </body>
        </html>
    );
}
