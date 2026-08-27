type PushTestStatus = 'idle' | 'requesting' | 'scheduled' | 'fired' | 'error';

export interface PushTestState {
    status: PushTestStatus;
    fireAt: number | null;
    message: string | null;
}

const DELAY_MS = 60_000;
const STORAGE_KEY = 'shotten-push-test-fire-at';
const PUSH_WORKER_URL =
    process.env.NEXT_PUBLIC_PUSH_WORKER_URL || 'https://shotten-push.bomanstristan.workers.dev';
const VAPID_PUBLIC_KEY =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    'BEETGiu_J0SHmKQoNgVJrFKJqI6fePz6K1lHXCWJ_BiV4j4buX4pHaL7NF-3iBXEsgGcbrVhJk8Faca1hcnWVKA';

let timer: ReturnType<typeof setTimeout> | null = null;
let state: PushTestState = { status: 'idle', fireAt: null, message: null };
const listeners = new Set<(next: PushTestState) => void>();

function emit(next: PushTestState) {
    state = next;
    listeners.forEach((listener) => listener(state));
}

export function getPushTestState(): PushTestState {
    return state;
}

export function subscribePushTest(listener: (next: PushTestState) => void): () => void {
    listeners.add(listener);
    listener(state);
    return () => {
        listeners.delete(listener);
    };
}

function persistFireAt(fireAt: number | null) {
    try {
        if (fireAt) {
            sessionStorage.setItem(STORAGE_KEY, String(fireAt));
        } else {
            sessionStorage.removeItem(STORAGE_KEY);
        }
    } catch {
        // Ignore private-mode / storage failures.
    }
}

function readPersistedFireAt(): number | null {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const fireAt = Number(raw);
        return Number.isFinite(fireAt) ? fireAt : null;
    } catch {
        return null;
    }
}

function clearTimer() {
    if (timer) {
        clearTimeout(timer);
        timer = null;
    }
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

async function ensureServiceWorker(): Promise<ServiceWorkerRegistration> {
    const existing = await navigator.serviceWorker.getRegistration();
    const registration = existing ?? await navigator.serviceWorker.register('/sw.js');

    if (registration.active) return registration;

    return withTimeout(navigator.serviceWorker.ready, 8000, 'Service worker ready');
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const output = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
    return output;
}

async function subscribeWebPush(registration: ServiceWorkerRegistration): Promise<PushSubscription> {
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
        await existing.unsubscribe();
    }

    return registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    });
}

async function fireScheduledNotification() {
    clearTimer();
    persistFireAt(null);
    emit({
        status: 'fired',
        fireAt: null,
        message: 'Cloudflare should have delivered the push. Check the notification shade.',
    });
}

function armTimer(fireAt: number) {
    clearTimer();
    const delay = Math.max(0, fireAt - Date.now());
    timer = setTimeout(() => {
        void fireScheduledNotification();
    }, delay);
}

function onVisibilityChange() {
    if (document.visibilityState !== 'visible') return;
    if (state.status !== 'scheduled' || !state.fireAt) return;

    if (Date.now() >= state.fireAt) {
        void fireScheduledNotification();
        return;
    }

    armTimer(state.fireAt);
}

let lifecycleBound = false;

function bindLifecycle() {
    if (lifecycleBound || typeof document === 'undefined') return;
    lifecycleBound = true;
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onVisibilityChange);
}

bindLifecycle();

const restoredFireAt = typeof window !== 'undefined' ? readPersistedFireAt() : null;
if (restoredFireAt && restoredFireAt > Date.now()) {
    emit({
        status: 'scheduled',
        fireAt: restoredFireAt,
        message: 'Scheduled via Cloudflare. You can lock the phone.',
    });
    armTimer(restoredFireAt);
} else if (restoredFireAt) {
    persistFireAt(null);
}

export async function schedulePushTestInOneMinute(): Promise<PushTestState> {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        const next = {
            status: 'error' as const,
            fireAt: null,
            message: 'Web Push is not supported in this browser.',
        };
        emit(next);
        return next;
    }

    try {
        let permission = Notification.permission;
        if (permission === 'default') {
            emit({
                status: 'requesting',
                fireAt: null,
                message: 'Asking for notification permission…',
            });
            permission = await Notification.requestPermission();
        }

        if (permission !== 'granted') {
            const next = {
                status: 'error' as const,
                fireAt: null,
                message: 'Notification permission denied.',
            };
            emit(next);
            return next;
        }

        emit({
            status: 'requesting',
            fireAt: null,
            message: 'Subscribing to Web Push…',
        });

        const registration = await ensureServiceWorker();
        const subscription = await subscribeWebPush(registration);

        const response = await fetch(`${PUSH_WORKER_URL}/test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                subscription: subscription.toJSON(),
                delaySeconds: Math.round(DELAY_MS / 1000),
            }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data?.ok) {
            throw new Error(data?.error || `Push worker returned ${response.status}`);
        }

        const fireAt = typeof data.sendAt === 'number' ? data.sendAt : Date.now() + DELAY_MS;
        persistFireAt(fireAt);
        armTimer(fireAt);

        const next = {
            status: 'scheduled' as const,
            fireAt,
            message: data.message || 'Scheduled via Cloudflare. You can lock the phone.',
        };
        emit(next);
        return next;
    } catch (error) {
        persistFireAt(null);
        const next = {
            status: 'error' as const,
            fireAt: null,
            message: error instanceof Error ? error.message : 'Could not schedule the test notification.',
        };
        emit(next);
        return next;
    }
}
