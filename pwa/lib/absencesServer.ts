// Server-side data access for absence periods (migration 010). Writes use the
// service key; applying an absence to existing matches runs in Postgres
// (apply_player_absence / remove_player_absence) so it is one transaction.

import { getSupabaseClient, getSupabaseServiceClient, MissingMigrationError } from './supabase';
import type { Absence } from './absences';

interface AbsenceRow {
    id: number;
    player_id: number;
    start_date: string;
    end_date: string;
    note: string | null;
}

export class AbsenceNotFoundError extends Error {}

// undefined table / column / function, as Postgres or PostgREST reports them.
const MISSING_CODES = new Set(['42P01', 'PGRST205', '42703', 'PGRST204', '42883', 'PGRST202']);

function check(error: { code?: string } | null): void {
    if (!error) return;
    if (MISSING_CODES.has(error.code ?? '')) throw new MissingMigrationError('Run migration 010 (absence periods) first');
    if (error.code === '23503') throw new AbsenceNotFoundError('Player not found');
    throw error;
}

/** Future matches each absence currently auto-declines. */
async function autoDeclinedCounts(playerId: number): Promise<Map<number, number>> {
    const client = getSupabaseClient();
    const { data, error } = await client
        .from('attendances')
        .select('match_id, auto_absence_id')
        .eq('player_id', playerId)
        .not('auto_absence_id', 'is', null);
    check(error);
    const rows = (data ?? []) as { match_id: number; auto_absence_id: number }[];
    const counts = new Map<number, number>();
    if (rows.length === 0) return counts;

    const { data: future, error: matchError } = await client
        .from('core_matches')
        .select('id')
        .in('id', rows.map(r => r.match_id))
        .gt('date', new Date().toISOString());
    check(matchError);
    const futureIds = new Set((future ?? []).map((m: { id: number }) => m.id));
    for (const row of rows) {
        if (!futureIds.has(row.match_id)) continue;
        counts.set(row.auto_absence_id, (counts.get(row.auto_absence_id) ?? 0) + 1);
    }
    return counts;
}

function toAbsence(row: AbsenceRow, counts: Map<number, number>): Absence {
    return {
        id: row.id,
        playerId: row.player_id,
        startDate: row.start_date,
        endDate: row.end_date,
        note: row.note,
        autoDeclinedCount: counts.get(row.id) ?? 0,
    };
}

export async function listAbsences(playerId: number): Promise<Absence[]> {
    const { data, error } = await getSupabaseClient()
        .from('player_absences')
        .select('id, player_id, start_date, end_date, note')
        .eq('player_id', playerId)
        .order('start_date');
    check(error);
    const counts = await autoDeclinedCounts(playerId);
    return ((data ?? []) as AbsenceRow[]).map(row => toAbsence(row, counts));
}

async function applyAbsence(absenceId: number): Promise<number> {
    const { data, error } = await getSupabaseServiceClient().rpc('apply_player_absence', { p_absence_id: absenceId });
    check(error);
    return typeof data === 'number' ? data : 0;
}

async function withCount(row: AbsenceRow, applied: number) {
    const counts = await autoDeclinedCounts(row.player_id);
    return { absence: toAbsence(row, counts), applied };
}

type AbsenceValues = { startDate: string; endDate: string; note: string | null };

export async function createAbsence(playerId: number, values: AbsenceValues) {
    const { data, error } = await getSupabaseServiceClient()
        .from('player_absences')
        .insert({ player_id: playerId, start_date: values.startDate, end_date: values.endDate, note: values.note })
        .select('id, player_id, start_date, end_date, note')
        .single();
    check(error);
    const row = data as AbsenceRow;
    return withCount(row, await applyAbsence(row.id));
}

export async function updateAbsence(playerId: number, absenceId: number, values: AbsenceValues) {
    const { data, error } = await getSupabaseServiceClient()
        .from('player_absences')
        .update({ start_date: values.startDate, end_date: values.endDate, note: values.note })
        .eq('id', absenceId)
        .eq('player_id', playerId)
        .select('id, player_id, start_date, end_date, note')
        .maybeSingle();
    check(error);
    if (!data) throw new AbsenceNotFoundError('Absence not found');
    const row = data as AbsenceRow;
    return withCount(row, await applyAbsence(row.id));
}

export async function deleteAbsence(playerId: number, absenceId: number, resetAnswers: boolean): Promise<{ reset: number }> {
    const { data: existing, error } = await getSupabaseClient()
        .from('player_absences')
        .select('id')
        .eq('id', absenceId)
        .eq('player_id', playerId)
        .maybeSingle();
    check(error);
    if (!existing) throw new AbsenceNotFoundError('Absence not found');

    const { data, error: rpcError } = await getSupabaseServiceClient()
        .rpc('remove_player_absence', { p_absence_id: absenceId, p_reset: resetAnswers });
    check(rpcError);
    return { reset: typeof data === 'number' ? data : 0 };
}
