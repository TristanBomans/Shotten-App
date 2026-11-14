import { NextRequest, NextResponse } from 'next/server';
import { MissingMigrationError, setCorePlayerLzvLink } from '@/lib/supabase';

/** Body: { lzvPlayerExternalId: number | null } (null clears the link). */
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const playerId = parseInt(id, 10);
    const body = await request.json().catch(() => null);
    const raw = body?.lzvPlayerExternalId;
    const lzvPlayerExternalId = raw === null ? null : Number(raw);

    if (!Number.isInteger(playerId) || (lzvPlayerExternalId !== null && !Number.isInteger(lzvPlayerExternalId))) {
        return NextResponse.json({ error: 'Invalid player or LZV player id' }, { status: 400 });
    }

    try {
        await setCorePlayerLzvLink(playerId, lzvPlayerExternalId);
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        if (error instanceof MissingMigrationError) {
            return NextResponse.json({ error: error.message }, { status: 409 });
        }
        console.error('Error linking player to LZV:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
