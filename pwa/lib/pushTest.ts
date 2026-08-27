type PushTestStatus = 'idle' | 'requesting' | 'scheduled' | 'fired' | 'error';

export interface PushTestState {
    status: PushTestStatus;
    fireAt: number | null;
    message: string | null;
}

const DELAY_MS = 60_000;
const STORAGE_KEY = 'shotten-push-test-fire-at';
const TEST_TITLE = 'Shotten test';
const TEST_OPTIONS = {
    body: 'If you can read this, notifications work on this device.',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: 'shotten-push-test',
    renotify: true,
    vibrate: [180, 80, 180],
    data: { url: '/' },
};

let timer: ReturnType<typeof setTimeout> | null = null;
let wakeLock: WakeLockSentinel | null = null;
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

async function releaseWakeLock() {
    const current = wakeLock;
    wakeLock = null;
    if (!current) return;
    try {
        await current.release();
    } catch {
        // Already released when the page went to the background.
    }
}

async function requestWakeLock() {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    try {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => {
            if (wakeLock) wakeLock = null;
        });
    } catch {
        // Not allowed while hidden, or unsupported on this device.
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

    const pending = registration.installing ?? registration.waiting;
    if (pending) {
        await withTimeout(
            new Promise<void>((resolve) => {
                if (pending.state === 'activated') {
                    resolve();
                    return;
                }
                pending.addEventListener('statechange', () => {
                    if (pending.state === 'activated' || pending.state === 'installed') {
                        resolve();
                    }
                });
            }),
            8000,
            'Service worker activate',
        );
        if (registration.active) return registration;
    }

    return withTimeout(navigator.serviceWorker.ready, 8000, 'Service worker ready');
}

async function showViaServiceWorker(registration: ServiceWorkerRegistration) {
    const worker = registration.active;
    if (!worker) {
        throw new Error('No active service worker');
    }

    await new Promise<void>((resolve, reject) => {
        const channel = new MessageChannel();
        const timeout = window.setTimeout(() => {
            reject(new Error('Service worker did not show the notification'));
        }, 5000);

        channel.port1.onmessage = (event) => {
            window.clearTimeout(timeout);
            if (event.data?.ok) {
                resolve();
                return;
            }
            reject(new Error(event.data?.error || 'Service worker rejected the notification'));
        };

        worker.postMessage(
            {
                type: 'SHOW_TEST_NOTIFICATION',
                title: TEST_TITLE,
                options: TEST_OPTIONS,
            },
            [channel.port2],
        );
    });
}

async function showTestNotification() {
    const registration = await ensureServiceWorker();

    try {
        await showViaServiceWorker(registration);
        return;
    } catch (swError) {
        try {
            await registration.showNotification(TEST_TITLE, TEST_OPTIONS);
            return;
        } catch {
            throw swError;
        }
    }
}

async function fireScheduledNotification() {
    clearTimer();
    persistFireAt(null);
    await releaseWakeLock();

    try {
        await showTestNotification();
        emit({
            status: 'fired',
            fireAt: null,
            message: 'Test notification sent. Check the shade if no popup appeared.',
        });
    } catch (error) {
        emit({
            status: 'error',
            fireAt: null,
            message: error instanceof Error ? error.message : 'Failed to show the test notification.',
        });
    }
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

    void requestWakeLock();

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
        message: 'Scheduled. Keep Shotten open — Android pauses timers if you leave.',
    });
    armTimer(restoredFireAt);
} else if (restoredFireAt && Date.now() - restoredFireAt < 5 * 60_000) {
    persistFireAt(null);
    void fireScheduledNotification();
} else if (restoredFireAt) {
    persistFireAt(null);
}

export async function schedulePushTestInOneMinute(): Promise<PushTestState> {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
        const next = {
            status: 'error' as const,
            fireAt: null,
            message: 'Notifications are not supported in this browser.',
        };
        emit(next);
        return next;
    }

    emit({
        status: 'requesting',
        fireAt: null,
        message: 'Asking for notification permission…',
    });

    try {
        const permission = await Notification.requestPermission();
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
            message: 'Preparing the service worker…',
        });

        await ensureServiceWorker();

        const fireAt = Date.now() + DELAY_MS;
        persistFireAt(fireAt);
        await requestWakeLock();
        armTimer(fireAt);

        const next = {
            status: 'scheduled' as const,
            fireAt,
            message: 'Scheduled. Keep Shotten open — Android pauses timers if you leave.',
        };
        emit(next);
        return next;
    } catch (error) {
        persistFireAt(null);
        await releaseWakeLock();
        const next = {
            status: 'error' as const,
            fireAt: null,
            message: error instanceof Error ? error.message : 'Could not schedule the test notification.',
        };
        emit(next);
        return next;
    }
}
