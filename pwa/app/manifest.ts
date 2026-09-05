import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
    const iconUrl = process.env.NEXT_PUBLIC_APP_ICON_URL;
    const maskableIconUrl = process.env.NEXT_PUBLIC_APP_MASKABLE_ICON_URL;

    const icons: MetadataRoute.Manifest['icons'] = iconUrl
        ? [
              { src: iconUrl, purpose: 'any' },
              ...(maskableIconUrl ? [{ src: maskableIconUrl, purpose: 'maskable' as const }] : []),
          ]
        : [
            {
                src: '/icons/icon-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/icons/icon-384x384.png',
                sizes: '384x384',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/icons/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/icons/icon-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable',
            },
            {
                src: '/icons/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
        ];

    return {
        name: 'Shotten - Team Tracker',
        short_name: 'Shotten',
        description: 'Track your weekly futsal team attendance',
        start_url: '/',
        display: 'standalone',
        background_color: '#0a0a0a',
        theme_color: '#000000',
        orientation: 'portrait',
        icons,
    };
}
