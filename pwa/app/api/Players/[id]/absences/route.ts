export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { validateAbsenceInput } from '@/lib/absences';
import { createAbsence, listAbsences } from '@/lib/absencesServer';
import { absenceErrorResponse, parseId } from './shared';

/** The player's absence periods, oldest first, with their auto-declined match counts. */
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const playerId = parseId((await params).id);
    if (!playerId) return NextResponse.json({ error: 'Invalid player id' }, { status: 400 });
    try {
        return NextResponse.json(await listAbsences(playerId));
    } catch (error) {
        return absenceErrorResponse(error, 'listing absences');
    }
}

/**
 * Body: { startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD', note?: string }.
 * Marks the player's future matches in range "NotPresent" unless they said
 * "Present" or already answered "NotPresent". Returns { absence, applied }.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const playerId = parseId((await params).id);
    if (!playerId) return NextResponse.json({ error: 'Invalid player id' }, { status: 400 });
    const result = validateAbsenceInput(await request.json().catch(() => null));
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    try {
        return NextResponse.json(await createAbsence(playerId, result.value), { status: 201 });
    } catch (error) {
        return absenceErrorResponse(error, 'creating absence');
    }
}
