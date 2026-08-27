import {
    PUSH_WORKER_URL,
    ensureServiceWorker,
    isWebPushSupported,
    subscribeWebPush,
} from './webPushClient';

export type PushSettingsResult = {
    enabled: boolean;
    message: string;
};

async function postSubscription(path: '/subscribe' | '/unsubscribe', subscription: PushSubscription, playerId?: number) {
    const response = await fetch(`${PUSH_WORKER_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            subscription: subscription.toJSON(),
            playerId,
        }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.ok === false) {
        throw new Error(data?.error || `Push worker returned ${response.status}`);
    }
}

async function showWelcome(registration: ServiceWorkerRegistration) {
    try {
        await registration.showNotification("You're on", {
            body: 'We’ll remind you about attendance and kickoff.',
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-192x192.png',
            tag: 'shotten-welcome',
            data: { url: '/?view=settings' },
        });
    } catch {
        // Permission can be granted without a displayable notification on some browsers.
    }
}

export async function enableMatchPush(playerId: number): Promise<PushSettingsResult> {
    if (!isWebPushSupported()) {
        throw new Error('Web Push is not supported in this browser. On iPhone, add Shotten to your home screen first.');
    }

    let permission = Notification.permission;
    if (permission === 'default') {
        permission = await Notification.requestPermission();
    }
    if (permission !== 'granted') {
        throw new Error('Notification permission was not granted.');
    }

    const registration = await ensureServiceWorker();
    const subscription = await subscribeWebPush(registration);
    await postSubscription('/subscribe', subscription, playerId);
    await showWelcome(registration);

    return {
        enabled: true,
        message: 'Match reminders are on for this phone.',
    };
}

export async function disableMatchPush(): Promise<PushSettingsResult> {
    if (!isWebPushSupported()) {
        return { enabled: false, message: 'Notifications are off.' };
    }

    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
        try {
            await postSubscription('/unsubscribe', subscription);
        } catch {
            // Still drop the local subscription so this device stops receiving.
        }
        await subscription.unsubscribe();
    }

    return { enabled: false, message: 'Notifications are off.' };
}

export async function syncMatchPush(playerId: number, enabled: boolean): Promise<void> {
    if (!enabled || !isWebPushSupported() || Notification.permission !== 'granted') return;
    const registration = await ensureServiceWorker();
    const existing = await registration.pushManager.getSubscription();
    const subscription = existing ?? await subscribeWebPush(registration);
    await postSubscription('/subscribe', subscription, playerId);
}
