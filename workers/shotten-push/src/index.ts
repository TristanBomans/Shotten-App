import { parseVapidPrivateJwk, parseVapidPublicRaw, sendWebPush } from './webpush';

export interface Env {
    DB: D1Database;
    VAPID_PUBLIC_KEY: string;
    VAPID_PRIVATE_JWK: string;
    VAPID_SUBJECT: string;
}

interface PushSubscriptionBody {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
    expirationTime?: number | null;
}

interface TestBody {
    subscription?: PushSubscriptionBody;
    playerId?: number;
    delaySeconds?: number;
    title?: string;
    body?: string;
    url?: string;
}

const ALLOWED_ORIGIN_SUFFIXES = [
    'https://shotten.taltiko.com',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
];

function corsHeaders(request: Request): HeadersInit {
    const origin = request.headers.get('Origin') || '';
    const allowed =
        ALLOWED_ORIGIN_SUFFIXES.includes(origin) ||
        origin.endsWith('.pages.dev') ||
        origin.endsWith('.workers.dev');
    return {
        'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGIN_SUFFIXES[0],
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
    };
}

function json(request: Request, data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(request),
        },
    });
}

function readSubscription(input: PushSubscriptionBody | undefined) {
    const endpoint = input?.endpoint;
    const p256dh = input?.keys?.p256dh;
    const auth = input?.keys?.auth;
    if (!endpoint || !p256dh || !auth) return null;
    return { endpoint, p256dh, auth };
}

async function flushOutbox(env: Env): Promise<{ sent: number; failed: number; gone: number }> {
    const now = Date.now();
    const rows = await env.DB.prepare(
        'SELECT id, endpoint, p256dh, auth, title, body, url FROM outbox WHERE send_at <= ? ORDER BY send_at ASC LIMIT 10',
    )
        .bind(now)
        .all<{
            id: number;
            endpoint: string;
            p256dh: string;
            auth: string;
            title: string;
            body: string;
            url: string | null;
        }>();

    let sent = 0;
    let failed = 0;
    let gone = 0;
    const vapidPublicRaw = parseVapidPublicRaw(env.VAPID_PUBLIC_KEY);
    const vapidPrivateJwk = parseVapidPrivateJwk(env.VAPID_PRIVATE_JWK);

    for (const row of rows.results || []) {
        const result = await sendWebPush({
            endpoint: row.endpoint,
            p256dh: row.p256dh,
            auth: row.auth,
            payload: {
                title: row.title,
                body: row.body,
                tag: 'shotten-push-test',
                data: { url: row.url || '/' },
            },
            vapidPublicRaw,
            vapidPrivateJwk,
            vapidSubject: env.VAPID_SUBJECT,
        });

        if (result.status === 404 || result.status === 410) {
            gone += 1;
            await env.DB.prepare('DELETE FROM subscriptions WHERE endpoint = ?').bind(row.endpoint).run();
            await env.DB.prepare('DELETE FROM outbox WHERE id = ?').bind(row.id).run();
            continue;
        }

        if (result.ok || result.status === 201) {
            sent += 1;
            await env.DB.prepare('DELETE FROM outbox WHERE id = ?').bind(row.id).run();
            continue;
        }

        failed += 1;
        console.warn(JSON.stringify({
            msg: 'webpush-failed',
            status: result.status,
            body: result.text.slice(0, 300),
            endpointHost: new URL(row.endpoint).host,
        }));
    }

    return { sent, failed, gone };
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: corsHeaders(request) });
        }

        const url = new URL(request.url);

        if (request.method === 'GET' && url.pathname === '/health') {
            return json(request, {
                ok: true,
                vapidPublicKey: env.VAPID_PUBLIC_KEY,
            });
        }

        if (request.method === 'POST' && url.pathname === '/subscribe') {
            const body = await request.json<TestBody>().catch(() => ({} as TestBody));
            const sub = readSubscription(body.subscription);
            if (!sub) return json(request, { ok: false, error: 'Missing subscription' }, 400);

            await env.DB.prepare(
                `INSERT INTO subscriptions (endpoint, p256dh, auth, player_id, created_at)
                 VALUES (?, ?, ?, ?, ?)
                 ON CONFLICT(endpoint) DO UPDATE SET
                   p256dh = excluded.p256dh,
                   auth = excluded.auth,
                   player_id = excluded.player_id`,
            )
                .bind(sub.endpoint, sub.p256dh, sub.auth, body.playerId ?? null, Date.now())
                .run();

            return json(request, { ok: true });
        }

        if (request.method === 'POST' && url.pathname === '/test') {
            const body = await request.json<TestBody>().catch(() => ({} as TestBody));
            const sub = readSubscription(body.subscription);
            if (!sub) return json(request, { ok: false, error: 'Missing subscription' }, 400);

            const delayMs = Math.min(Math.max((body.delaySeconds ?? 60) * 1000, 5_000), 15 * 60_000);
            const sendAt = Date.now() + delayMs;

            await env.DB.prepare(
                `INSERT INTO subscriptions (endpoint, p256dh, auth, player_id, created_at)
                 VALUES (?, ?, ?, ?, ?)
                 ON CONFLICT(endpoint) DO UPDATE SET
                   p256dh = excluded.p256dh,
                   auth = excluded.auth,
                   player_id = excluded.player_id`,
            )
                .bind(sub.endpoint, sub.p256dh, sub.auth, body.playerId ?? null, Date.now())
                .run();

            await env.DB.prepare(
                `INSERT INTO outbox (endpoint, p256dh, auth, title, body, url, send_at, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            )
                .bind(
                    sub.endpoint,
                    sub.p256dh,
                    sub.auth,
                    body.title || 'Shotten test',
                    body.body || 'If you can read this, Web Push works on this device.',
                    body.url || '/',
                    sendAt,
                    Date.now(),
                )
                .run();

            return json(request, {
                ok: true,
                sendAt,
                delaySeconds: Math.round(delayMs / 1000),
                message: 'Scheduled on Cloudflare. You can lock the phone.',
            });
        }

        return json(request, { ok: false, error: 'Not found' }, 404);
    },

    async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
        await flushOutbox(env);
    },
};
