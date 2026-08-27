type PushTestStatus = 'idle' | 'scheduled' | 'fired' | 'error';

export interface PushTestState {
    status: PushTestStatus;
    fireAt: number | null;
    message: string | null;
}

const DELAY_MS = 60_000;

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

async function showTestNotification() {
    const registration = await navigator.serviceWorker.ready;
    const options: NotificationOptions = {
        body: 'If you can read this, notifications work on this device.',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        tag: 'shotten-push-test',
        data: { url: '/' },
    };

    try {
        await registration.showNotification('Shotten test', options);
    } catch {
        new Notification('Shotten test', options);
    }
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

    await navigator.serviceWorker.ready;

    if (timer) {
        clearTimeout(timer);
        timer = null;
    }

    const fireAt = Date.now() + DELAY_MS;
    emit({
        status: 'scheduled',
        fireAt,
        message: 'Scheduled. Keep the PWA open for one minute.',
    });

    timer = setTimeout(async () => {
        timer = null;
        try {
            await showTestNotification();
            emit({
                status: 'fired',
                fireAt: null,
                message: 'Test notification sent.',
            });
        } catch {
            emit({
                status: 'error',
                fireAt: null,
                message: 'Failed to show the test notification.',
            });
        }
    }, DELAY_MS);

    return getPushTestState();
}
