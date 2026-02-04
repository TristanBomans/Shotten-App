import type { Metadata, Viewport } from 'next';
import './globals.css';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';
import { ConvexClientProvider } from '@/components/ConvexClientProvider';

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
        <html lang="en" suppressHydrationWarning>
            <head>
                <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="mobile-web-app-capable" content="yes" />
                {/* Theme loader - runs before any rendering to prevent flash */}
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            (function() {
                                const theme = localStorage.getItem('theme') || 'original';
                                document.documentElement.setAttribute('data-theme', theme);
                                // Set meta theme-color based on theme
                                const themeColors = {
                                    original: '#050508',
                                    oled: '#000000',
                                    white: '#ffffff'
                                };
                                const meta = document.querySelector('meta[name="theme-color"]');
                                if (meta) {
                                    meta.setAttribute('content', themeColors[theme] || '#050508');
                                } else {
                                    const newMeta = document.createElement('meta');
                                    newMeta.setAttribute('name', 'theme-color');
                                    newMeta.setAttribute('content', themeColors[theme] || '#050508');
                                    document.head.appendChild(newMeta);
                                }
                            })();
                        `,
                    }}
                />
            </head>
            <body>
                {/* Ambient Background - theme-aware gradient for Original theme */}
                <div className="ambient-bg" />

                {/* Main Content */}
                <ConvexClientProvider>
                    {children}
                </ConvexClientProvider>

                {/* Service Worker */}
                <ServiceWorkerRegistration />
            </body>
        </html>
    );
}
