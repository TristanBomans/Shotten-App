'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
            return;
        }

        const register = () => {
            navigator.serviceWorker.register('/sw.js').then(
                (registration) => {
                    console.log('SW registered:', registration.scope);
                    void registration.update();
                },
                (error) => {
                    console.log('SW registration failed:', error);
                }
            );
        };

        register();
    }, []);

    return null;
}
