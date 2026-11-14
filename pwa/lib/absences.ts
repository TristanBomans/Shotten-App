// =============================================================================
// ABSENCE PERIODS
// "I'm away from 12 to 26 July": every future match of the player's teams in
// that range is answered NotPresent automatically (marked autoAbsenceId).
// Shared by the client (pages, mock mode) and the API routes (validation).
// =============================================================================

import { API_BASE_URL } from './config';
import { MOCK_ABSENCES, MOCK_MATCHES, MOCK_PLAYERS, type Match } from './mockData';
import { parseDateToTimestamp } from './dateUtils';

export interface Absence {
    id: number;
    playerId: number;
    /** Inclusive Brussels calendar days, YYYY-MM-DD. */
    startDate: string;
    endDate: string;
    note: string | null;
    /** Future matches currently auto-declined by this absence. */
    autoDeclinedCount: number;
}

export interface AbsenceInput {
    startDate: string;
    endDate: string;
    note?: string | null;
}

export const ABSENCE_NOTE_MAX = 80;
export const ABSENCE_MAX_DAYS = 366;
/** Tell other views (match board) to refetch answers. */
export const ATTENDANCE_UPDATED_EVENT = 'attendanceUpdated';

// -----------------------------------------------------------------------------
// Brussels calendar days
// -----------------------------------------------------------------------------

const brusselsDayFormat = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Brussels',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

/** Brussels calendar day of an instant, as YYYY-MM-DD. */
export function brusselsDay(value: Date | string | number): string {
    const date = value instanceof Date ? value : new Date(typeof value === 'string' ? parseDateToTimestamp(value) : value);
    return brusselsDayFormat.format(date);
}

export function todayKey(now: number = Date.now()): string {
    return brusselsDay(now);
}

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidDayKey(value: unknown): value is string {
    if (typeof value !== 'string') return false;
    const m = DAY_RE.exec(value);
    if (!m) return false;
    const date = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return date.getUTCFullYear() === +m[1] && date.getUTCMonth() === +m[2] - 1 && date.getUTCDate() === +m[3];
}

function dayToUtc(key: string): Date {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(key: string, days: number): string {
    const date = dayToUtc(key);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

/** Days covered, both ends included. */
export function daysInclusive(startDate: string, endDate: string): number {
    return Math.round((dayToUtc(endDate).getTime() - dayToUtc(startDate).getTime()) / 86_400_000) + 1;
}

/** "12–26 Jul", "28 Jul – 3 Aug", "Sat 12 Jul"; the year only when it isn't this one. */
export function formatAbsenceRange(startDate: string, endDate: string, now: number = Date.now()): string {
    const start = dayToUtc(startDate);
    const end = dayToUtc(endDate);
    const thisYear = Number(todayKey(now).slice(0, 4));
    const showYear = start.getUTCFullYear() !== thisYear || end.getUTCFullYear() !== thisYear;
    const fmt = (date: Date, opts: Intl.DateTimeFormatOptions) =>
        date.toLocaleDateString('en-GB', { timeZone: 'UTC', ...opts }).replace(/,/g, '');
    const year = (date: Date) => (showYear ? ` ${date.getUTCFullYear()}` : '');

    if (startDate === endDate) {
        return fmt(start, { weekday: 'short', day: 'numeric', month: 'short' }) + year(start);
    }
    const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
    if (sameYear && start.getUTCMonth() === end.getUTCMonth()) {
        return `${start.getUTCDate()}–${fmt(end, { day: 'numeric', month: 'short' })}${year(end)}`;
    }
    const startText = fmt(start, { day: 'numeric', month: 'short' }) + (sameYear ? '' : year(start));
    return `${startText} – ${fmt(end, { day: 'numeric', month: 'short' })}${year(end)}`;
}

// -----------------------------------------------------------------------------
// Validation (client form and API routes)
// -----------------------------------------------------------------------------

export type AbsenceValidation =
    | { ok: true; value: { startDate: string; endDate: string; note: string | null } }
    | { ok: false; error: string };

export function validateAbsenceInput(body: unknown, today: string = todayKey()): AbsenceValidation {
    const input = (body ?? {}) as Record<string, unknown>;
    const { startDate, endDate } = input;
    if (!isValidDayKey(startDate) || !isValidDayKey(endDate)) {
        return { ok: false, error: 'Pick a start and end date' };
    }
    if (endDate < startDate) return { ok: false, error: 'The end date is before the start date' };
    if (endDate < today) return { ok: false, error: 'This period is already over' };
    if (daysInclusive(startDate, endDate) > ABSENCE_MAX_DAYS) {
        return { ok: false, error: 'Keep it under a year' };
    }
    const rawNote = input.note;
    if (rawNote != null && typeof rawNote !== 'string') return { ok: false, error: 'Invalid note' };
    const note = rawNote?.trim() || null;
    if (note && note.length > ABSENCE_NOTE_MAX) {
        return { ok: false, error: `Keep the note under ${ABSENCE_NOTE_MAX} characters` };
    }
    return { ok: true, value: { startDate, endDate, note } };
}

// -----------------------------------------------------------------------------
// What an absence does to a player's matches (preview before saving)
// -----------------------------------------------------------------------------

export interface AbsenceImpact {
    /** Will be (or already are) auto-declined by this absence. */
    declined: Match[];
    /** Explicit "Coming" answers: left alone. */
    keptPresent: Match[];
    /** Already answered "Can't" by hand or by another absence. */
    alreadyOut: Match[];
}

export function absenceImpact(
    matches: Match[],
    playerId: number,
    startDate: string,
    endDate: string,
    absenceId: number | null = null,
    now: number = Date.now()
): AbsenceImpact {
    const impact: AbsenceImpact = { declined: [], keptPresent: [], alreadyOut: [] };
    if (!isValidDayKey(startDate) || !isValidDayKey(endDate) || endDate < startDate) return impact;

    for (const match of matches) {
        if (parseDateToTimestamp(match.date) <= now) continue;
        const day = brusselsDay(match.date);
        if (day < startDate || day > endDate) continue;
        const att = match.attendances?.find(a => a.playerId === playerId);
        if (att?.status === 'Present') impact.keptPresent.push(match);
        else if (att?.status === 'NotPresent' && (att.autoAbsenceId == null || att.autoAbsenceId !== absenceId)) {
            impact.alreadyOut.push(match);
        } else impact.declined.push(match);
    }
    return impact;
}

/** The current player's answer for this match was filled in by an absence. */
export function isAutoDeclined(match: Match, playerId: number): boolean {
    const att = match.attendances?.find(a => a.playerId === playerId);
    return att?.status === 'NotPresent' && att.autoAbsenceId != null;
}

// -----------------------------------------------------------------------------
// Client API (with mock mode)
// -----------------------------------------------------------------------------

const isMock = () => typeof window !== 'undefined' && localStorage.getItem('useMockData') === 'true';
const mockDelay = () => new Promise(r => setTimeout(r, 250));

async function readError(res: Response, fallback: string): Promise<Error> {
    const body = await res.json().catch(() => null);
    return new Error(typeof body?.error === 'string' ? body.error : fallback);
}

export async function fetchAbsences(playerId: number): Promise<Absence[]> {
    if (isMock()) {
        await mockDelay();
        return mockList(playerId);
    }
    const res = await fetch(`${API_BASE_URL}/api/Players/${playerId}/absences`);
    if (!res.ok) throw await readError(res, 'Could not load your absences');
    return res.json();
}

export interface SaveAbsenceResult {
    absence: Absence;
    /** Matches newly marked "Can't". */
    applied: number;
}

export async function saveAbsence(playerId: number, input: AbsenceInput, absenceId?: number): Promise<SaveAbsenceResult> {
    if (isMock()) {
        await mockDelay();
        return mockSave(playerId, input, absenceId);
    }
    const url = absenceId
        ? `${API_BASE_URL}/api/Players/${playerId}/absences/${absenceId}`
        : `${API_BASE_URL}/api/Players/${playerId}/absences`;
    const res = await fetch(url, {
        method: absenceId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    if (!res.ok) throw await readError(res, 'Could not save the absence');
    return res.json();
}

/** Delete an absence; with `resetAnswers` its future auto-declines go back to "no response". */
export async function deleteAbsence(playerId: number, absenceId: number, resetAnswers: boolean): Promise<{ reset: number }> {
    if (isMock()) {
        await mockDelay();
        return mockRemove(absenceId, resetAnswers);
    }
    const res = await fetch(
        `${API_BASE_URL}/api/Players/${playerId}/absences/${absenceId}?resetAnswers=${resetAnswers}`,
        { method: 'DELETE' }
    );
    if (!res.ok) throw await readError(res, 'Could not remove the absence');
    return res.json();
}

// -----------------------------------------------------------------------------
// Mock mode: mirrors apply_player_absence / remove_player_absence (migration 010)
// -----------------------------------------------------------------------------

function mockMatchDay(match: Match) {
    return brusselsDay(match.date);
}

function mockCovering(playerId: number, day: string, excludeId: number) {
    return MOCK_ABSENCES.find(a => a.playerId === playerId && a.id !== excludeId && a.startDate <= day && day <= a.endDate);
}

function mockList(playerId: number): Absence[] {
    const now = Date.now();
    return MOCK_ABSENCES
        .filter(a => a.playerId === playerId)
        .sort((a, b) => a.startDate.localeCompare(b.startDate))
        .map(a => ({
            ...a,
            autoDeclinedCount: MOCK_MATCHES.filter(m =>
                parseDateToTimestamp(m.date) > now && m.attendances.some(att => att.autoAbsenceId === a.id)
            ).length,
        }));
}

function mockApply(absenceId: number): number {
    const ab = MOCK_ABSENCES.find(a => a.id === absenceId);
    const player = ab && MOCK_PLAYERS.find(p => p.id === ab.playerId);
    if (!ab || !player) return 0;
    const now = Date.now();
    let changed = 0;

    for (const match of MOCK_MATCHES) {
        if (parseDateToTimestamp(match.date) <= now) continue;
        const day = mockMatchDay(match);
        const inRange = ab.startDate <= day && day <= ab.endDate && player.teamIds.includes(match.teamId);
        const idx = match.attendances.findIndex(a => a.playerId === ab.playerId);
        const att = idx >= 0 ? match.attendances[idx] : null;

        if (att?.autoAbsenceId === ab.id && !inRange) {
            const other = mockCovering(ab.playerId, day, ab.id);
            if (other) att.autoAbsenceId = other.id;
            else match.attendances.splice(idx, 1);
            continue;
        }
        if (!inRange) continue;
        if (!att) {
            match.attendances.push({ playerId: ab.playerId, status: 'NotPresent', autoAbsenceId: ab.id });
            changed += 1;
        } else if (att.status === 'Maybe') {
            att.status = 'NotPresent';
            att.autoAbsenceId = ab.id;
            changed += 1;
        }
    }
    return changed;
}

function mockSave(playerId: number, input: AbsenceInput, absenceId?: number): SaveAbsenceResult {
    const check = validateAbsenceInput(input);
    if (!check.ok) throw new Error(check.error);
    let id = absenceId;
    if (id) {
        const existing = MOCK_ABSENCES.find(a => a.id === id && a.playerId === playerId);
        if (!existing) throw new Error('Absence not found');
        Object.assign(existing, check.value);
    } else {
        id = Math.max(0, ...MOCK_ABSENCES.map(a => a.id)) + 1;
        MOCK_ABSENCES.push({ id, playerId, ...check.value });
    }
    const applied = mockApply(id);
    const absence = mockList(playerId).find(a => a.id === id)!;
    return { absence, applied };
}

function mockRemove(absenceId: number, resetAnswers: boolean): { reset: number } {
    const ab = MOCK_ABSENCES.find(a => a.id === absenceId);
    if (!ab) return { reset: 0 };
    const now = Date.now();
    let reset = 0;
    for (const match of MOCK_MATCHES) {
        const idx = match.attendances.findIndex(a => a.autoAbsenceId === ab.id);
        if (idx < 0) continue;
        const att = match.attendances[idx];
        const future = parseDateToTimestamp(match.date) > now;
        const other = future ? mockCovering(ab.playerId, mockMatchDay(match), ab.id) : undefined;
        if (other) att.autoAbsenceId = other.id;
        else if (future && resetAnswers) {
            match.attendances.splice(idx, 1);
            reset += 1;
        } else att.autoAbsenceId = null;
    }
    MOCK_ABSENCES.splice(MOCK_ABSENCES.indexOf(ab), 1);
    return { reset };
}
