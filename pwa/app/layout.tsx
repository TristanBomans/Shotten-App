import type { Metadata, Viewport } from 'next';
import { DM_Sans } from 'next/font/google';
import './globals.css';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';

const dmSans = DM_Sans({
    subsets: ['latin'],
    variable: '--font-dm-sans',
});

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
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning className={dmSans.variable}>
            <head>
                <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="mobile-web-app-capable" content="yes" />
                {/* Theme loader - runs before any rendering to prevent flash */}
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            (function() {
                                let theme = localStorage.getItem('theme');
                                if (!theme || theme === 'original') {
                                    theme = 'oled';
                                    localStorage.setItem('theme', theme);
                                }
                                document.documentElement.setAttribute('data-theme', theme);
                                const themeColors = {
                                    oled: '#000000',
                                    white: '#f2f2f6'
                                };
                                const meta = document.querySelector('meta[name="theme-color"]');
                                const color = themeColors[theme] || '#000000';
                                if (meta) {
                                    meta.setAttribute('content', color);
                                } else {
                                    const newMeta = document.createElement('meta');
                                    newMeta.setAttribute('name', 'theme-color');
                                    newMeta.setAttribute('content', color);
                                    document.head.appendChild(newMeta);
                                }
                            })();
                        `,
                    }}
                />
            </head>
            <body>
                {/* Ambient Background */}
                <div className="ambient-bg" />

                {/* Main Content */}
                {children}

                {/* Service Worker */}
                <ServiceWorkerRegistration />
            </body>
        </html>
    );
}
