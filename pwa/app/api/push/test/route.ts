import { NextRequest, NextResponse } from 'next/server';
import { queuePush, readSubscription, saveSubscription } from '@/lib/pushServer';

// The backend flushes the outbox once a minute, so delivery lands within ~1 min of sendAt.
export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const sub = readSubscription(body.subscription);
        if (!sub) return NextResponse.json({ ok: false, error: 'Missing subscription' }, { status: 400 });

        const delayMs = Math.min(Math.max((Number(body.delaySeconds) || 60) * 1000, 5_000), 15 * 60_000);
        const sendAt = Date.now() + delayMs;

        await saveSubscription(sub);
        await queuePush(sub.endpoint, {
            title: 'Shotten test',
            body: 'If you can read this, Web Push works on this device.',
            url: '/',
            tag: 'shotten-test',
        }, new Date(sendAt));

        return NextResponse.json({
            ok: true,
            sendAt,
            delaySeconds: Math.round(delayMs / 1000),
            message: 'Scheduled. You can lock the phone.',
        });
    } catch (error) {
        console.error('Error scheduling test push:', error);
        return NextResponse.json({ ok: false, error: 'Server Error' }, { status: 500 });
    }
}
