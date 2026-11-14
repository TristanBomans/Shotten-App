export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { validateAbsenceInput } from '@/lib/absences';
import { deleteAbsence, updateAbsence } from '@/lib/absencesServer';
import { absenceErrorResponse, parseId } from '../shared';

type Params = { params: Promise<{ id: string; absenceId: string }> };

async function readIds(params: Params['params']) {
    const { id, absenceId } = await params;
    return { playerId: parseId(id), absenceId: parseId(absenceId) };
}

/**
 * Same body as POST. Re-applies the absence: new days get auto-declined, auto
 * answers that fall outside the new range go back to "no response".
 */
export async function PUT(request: NextRequest, { params }: Params) {
    const { playerId, absenceId } = await readIds(params);
    if (!playerId || !absenceId) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    const result = validateAbsenceInput(await request.json().catch(() => null));
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    try {
        return NextResponse.json(await updateAbsence(playerId, absenceId, result.value));
    } catch (error) {
        return absenceErrorResponse(error, 'updating absence');
    }
}

/**
 * ?resetAnswers=true also sets its future auto-declined matches back to "no
 * response"; otherwise they stay "NotPresent" as normal answers. Returns { reset }.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
    const { playerId, absenceId } = await readIds(params);
    if (!playerId || !absenceId) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    const resetAnswers = new URL(request.url).searchParams.get('resetAnswers') === 'true';
    try {
        return NextResponse.json(await deleteAbsence(playerId, absenceId, resetAnswers));
    } catch (error) {
        return absenceErrorResponse(error, 'deleting absence');
    }
}
