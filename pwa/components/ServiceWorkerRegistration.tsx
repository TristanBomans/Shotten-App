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

        // RSVPs sent from a notification action: let the app refresh its data
        // through the same event the in-app attendance flow uses.
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'ATTENDANCE_UPDATED') {
                window.dispatchEvent(new CustomEvent('attendanceUpdated', { detail: event.data }));
            }
        };
        navigator.serviceWorker.addEventListener('message', handleMessage);

        register();

        return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
    }, []);

    return null;
}
