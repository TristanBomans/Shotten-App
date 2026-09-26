import { getSupabaseServiceClient } from './supabase';

// shotten-backend-node sends to these endpoints from its own network, so only
// accept the browser push services; anything else could point it at an internal host.
const PUSH_SERVICE_HOSTS = [
    'fcm.googleapis.com',
    'updates.push.services.mozilla.com',
    'web.push.apple.com',
    '.push.apple.com',
    '.notify.windows.com',
];

export interface PushSubscriptionInput {
    endpoint: string;
    p256dh: string;
    auth: string;
}

function isPushServiceEndpoint(endpoint: string): boolean {
    let url: URL;
    try {
        url = new URL(endpoint);
    } catch {
        return false;
    }
    if (url.protocol !== 'https:') return false;
    return PUSH_SERVICE_HOSTS.some((host) =>
        host.startsWith('.') ? url.hostname.endsWith(host) : url.hostname === host,
    );
}

export function readSubscription(input: unknown): PushSubscriptionInput | null {
    const sub = input as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | undefined;
    const endpoint = sub?.endpoint;
    const p256dh = sub?.keys?.p256dh;
    const auth = sub?.keys?.auth;
    if (typeof endpoint !== 'string' || typeof p256dh !== 'string' || typeof auth !== 'string') return null;
    if (endpoint.length > 1024 || p256dh.length > 256 || auth.length > 64) return null;
    if (!isPushServiceEndpoint(endpoint)) return null;
    return { endpoint, p256dh, auth };
}

export function readPlayerId(input: unknown): number | undefined {
    const id = Number(input);
    return Number.isInteger(id) && id > 0 ? id : undefined;
}

/** Upsert a subscription; leaves the linked player untouched when playerId is omitted. */
export async function saveSubscription(sub: PushSubscriptionInput, playerId?: number): Promise<void> {
    const row: Record<string, unknown> = { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth };
    if (playerId !== undefined) row.player_id = playerId;
    const { error } = await getSupabaseServiceClient()
        .from('push_subscriptions')
        .upsert(row, { onConflict: 'endpoint' });
    if (error) throw error;
}

export async function deleteSubscription(endpoint: string): Promise<void> {
    const { error } = await getSupabaseServiceClient()
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', endpoint);
    if (error) throw error;
}

export async function queuePush(endpoint: string, message: { title: string; body: string; url: string; tag: string }, sendAt: Date): Promise<void> {
    const { error } = await getSupabaseServiceClient()
        .from('push_outbox')
        .insert({ endpoint, ...message, send_at: sendAt.toISOString() });
    if (error) throw error;
}
