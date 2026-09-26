import { NextRequest, NextResponse } from 'next/server';
import { readPlayerId, readSubscription, saveSubscription } from '@/lib/pushServer';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const sub = readSubscription(body.subscription);
        if (!sub) return NextResponse.json({ ok: false, error: 'Missing subscription' }, { status: 400 });

        await saveSubscription(sub, readPlayerId(body.playerId));
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Error saving push subscription:', error);
        return NextResponse.json({ ok: false, error: 'Server Error' }, { status: 500 });
    }
}
