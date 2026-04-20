

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { updateAttendance } from '@/lib/supabase';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; playerId: string }> }
) {
    try {
        const { id: matchIdStr, playerId: playerIdStr } = await params;
        const matchId = parseInt(matchIdStr);
        const playerId = parseInt(playerIdStr);

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        if (!status || !['Present', 'NotPresent', 'Maybe'].includes(status)) {
            return NextResponse.json(
                { error: 'Invalid status. Must be Present, NotPresent, or Maybe' },
                { status: 400 }
            );
        }

        const attendance = await updateAttendance(
            matchId,
            playerId,
            status as 'Present' | 'NotPresent' | 'Maybe'
        );

        return NextResponse.json({
            matchId: attendance.match_id,
            playerId: attendance.player_id,
            status: attendance.status
        });
    } catch (error) {
        console.error('Error updating attendance:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
