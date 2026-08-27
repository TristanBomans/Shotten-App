export const PUSH_WORKER_URL =
    process.env.NEXT_PUBLIC_PUSH_WORKER_URL || 'https://shotten-push.bomanstristan.workers.dev';

const VAPID_PUBLIC_KEY =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    'BEETGiu_J0SHmKQoNgVJrFKJqI6fePz6K1lHXCWJ_BiV4j4buX4pHaL7NF-3iBXEsgGcbrVhJk8Faca1hcnWVKA';

export function isWebPushSupported(): boolean {
    return typeof window !== 'undefined'
        && 'Notification' in window
        && 'serviceWorker' in navigator
        && 'PushManager' in window;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const output = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
    return output;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise((resolve, reject) => {
        const timeout = window.setTimeout(() => {
            reject(new Error(`${label} timed out after ${ms}ms`));
        }, ms);
        promise.then(
            (value) => {
                window.clearTimeout(timeout);
                resolve(value);
            },
            (error) => {
                window.clearTimeout(timeout);
                reject(error);
            },
        );
    });
}

export async function ensureServiceWorker(): Promise<ServiceWorkerRegistration> {
    const existing = await navigator.serviceWorker.getRegistration();
    const registration = existing ?? await navigator.serviceWorker.register('/sw.js');
    if (registration.active) return registration;
    return withTimeout(navigator.serviceWorker.ready, 8000, 'Service worker ready');
}

export async function subscribeWebPush(registration: ServiceWorkerRegistration): Promise<PushSubscription> {
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
        await existing.unsubscribe();
    }

    return registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    });
}
