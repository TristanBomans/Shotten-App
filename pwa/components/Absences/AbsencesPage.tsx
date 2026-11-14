'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarOff, Plus, Trash2 } from 'lucide-react';
import { hapticPatterns } from '@/lib/haptic';
import { fetchPlayerMatchesData } from '@/lib/useData';
import { NavLevelContext, useNavLevel } from '@/lib/navHistory';
import { formatMatchDate, formatTimeSafe } from '@/lib/dateUtils';
import type { Match } from '@/lib/mockData';
import {
    ABSENCE_NOTE_MAX,
    ATTENDANCE_UPDATED_EVENT,
    absenceImpact,
    addDays,
    daysInclusive,
    deleteAbsence,
    fetchAbsences,
    formatAbsenceRange,
    saveAbsence,
    todayKey,
    validateAbsenceInput,
    type Absence,
} from '@/lib/absences';
import FlowPage from '../ui/FlowPage';
import { ListSection, Row } from '../ui/ListSection';
import { EmptyState, InlineNotice, StatusChip } from '../ui/controls';

interface AbsencesPageProps {
    open: boolean;
    onClose: () => void;
    playerId: number;
}

type Draft = { id: number | null; startDate: string; endDate: string; note: string };

const matchesLabel = (n: number) => `${n} ${n === 1 ? 'match' : 'matches'}`;

/** "My away periods": list, add/edit form with an impact preview, remove sheet. */
export default function AbsencesPage({ open, onClose, playerId }: AbsencesPageProps) {
    const level = useNavLevel();
    const [absences, setAbsences] = useState<Absence[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    // The form keeps its last draft while it slides out; a new key per open
    // gives it fresh field state.
    const [draft, setDraft] = useState<Draft | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [formKey, setFormKey] = useState(0);
    const [notice, setNotice] = useState<string | null>(null);

    const load = useCallback(
        () => Promise.all([fetchAbsences(playerId), fetchPlayerMatchesData(playerId)])
            .then(([list, playerMatches]) => {
                setAbsences(list);
                setMatches(playerMatches);
                setLoadError(null);
            })
            .catch((error: unknown) => {
                setLoadError(error instanceof Error ? error.message : 'Could not load your away periods');
            })
            .finally(() => setLoading(false)),
        [playerId]
    );

    useEffect(() => {
        if (open) void load();
    }, [open, load]);

    const close = () => {
        setFormOpen(false);
        setNotice(null);
        setLoading(true);
        onClose();
    };

    const openForm = (next: Draft) => {
        hapticPatterns.tap();
        setDraft(next);
        setFormKey(k => k + 1);
        setFormOpen(true);
    };

    useEffect(() => {
        if (!notice) return;
        const timer = setTimeout(() => setNotice(null), 4000);
        return () => clearTimeout(timer);
    }, [notice]);

    const afterChange = async (message: string) => {
        setNotice(message);
        window.dispatchEvent(new CustomEvent(ATTENDANCE_UPDATED_EVENT, { detail: { playerId } }));
        await load();
    };

    const today = todayKey();
    const upcoming = absences.filter(a => a.endDate >= today);
    const past = absences.filter(a => a.endDate < today).slice(-3).reverse();

    const openNew = () => {
        const start = addDays(today, 1);
        openForm({ id: null, startDate: start, endDate: addDays(start, 6), note: '' });
    };

    return (
        <FlowPage
            open={open}
            title="Away periods"
            subtitle="Matches while you're away are marked Can't"
            onBack={close}
            backClose
        >
            {notice && (
                <div style={{ marginBottom: 'var(--sp-4)' }}>
                    <InlineNotice>{notice}</InlineNotice>
                </div>
            )}

            {loading ? (
                <div className="flex-center" style={{ gap: 8, padding: '40px 0', color: 'var(--text-3)' }}>
                    <div className="spinner" />
                    Loading…
                </div>
            ) : loadError ? (
                <InlineNotice tone="error">{loadError}</InlineNotice>
            ) : upcoming.length === 0 ? (
                <EmptyState
                    icon={<CalendarOff size={20} />}
                    title="No away periods"
                    description="Going on holiday? Add the dates once and every match in that period is answered Can't for you. No reminders while you're away."
                    action={
                        <button className="btn btn-primary press" onClick={openNew}>
                            <Plus size={16} />
                            Add away period
                        </button>
                    }
                />
            ) : (
                <>
                    <ListSection
                        label="Current & upcoming"
                        footer="Matches you already answered Coming are left alone."
                    >
                        {upcoming.map(absence => {
                            const isNow = absence.startDate <= today;
                            const details = [
                                absence.note,
                                absence.autoDeclinedCount > 0
                                    ? `${matchesLabel(absence.autoDeclinedCount)} marked Can't`
                                    : 'No matches affected',
                            ].filter(Boolean).join(' · ');
                            return (
                                <Row
                                    key={absence.id}
                                    icon={<CalendarOff size={16} />}
                                    title={formatAbsenceRange(absence.startDate, absence.endDate)}
                                    subtitle={details}
                                    trailing={isNow ? <StatusChip tone="accent">Away now</StatusChip> : undefined}
                                    chevron
                                    onClick={() => openForm({
                                        id: absence.id,
                                        startDate: absence.startDate,
                                        endDate: absence.endDate,
                                        note: absence.note ?? '',
                                    })}
                                />
                            );
                        })}
                    </ListSection>
                    <button className="btn btn-quiet press" style={{ width: '100%' }} onClick={openNew}>
                        <Plus size={16} />
                        Add away period
                    </button>
                </>
            )}

            {!loading && past.length > 0 && (
                <ListSection label="Past" style={{ marginTop: 'var(--sp-6)' }}>
                    {past.map(absence => (
                        <Row
                            key={absence.id}
                            icon={<CalendarOff size={16} />}
                            title={<span style={{ color: 'var(--text-2)' }}>{formatAbsenceRange(absence.startDate, absence.endDate)}</span>}
                            subtitle={absence.note ?? undefined}
                        />
                    ))}
                </ListSection>
            )}

            <NavLevelContext.Provider value={level + 1}>
                {draft && (
                    <AbsenceForm
                        key={formKey}
                        open={formOpen}
                        draft={draft}
                        playerId={playerId}
                        matches={matches}
                        absences={absences}
                        onClose={() => setFormOpen(false)}
                        onSaved={async (message) => {
                            setFormOpen(false);
                            await afterChange(message);
                        }}
                    />
                )}
            </NavLevelContext.Provider>
        </FlowPage>
    );
}

interface AbsenceFormProps {
    open: boolean;
    draft: Draft;
    playerId: number;
    matches: Match[];
    absences: Absence[];
    onClose: () => void;
    onSaved: (message: string) => Promise<void>;
}

function AbsenceForm({ open, draft, playerId, matches, absences, onClose, onSaved }: AbsenceFormProps) {
    const [startDate, setStartDate] = useState(draft.startDate);
    const [endDate, setEndDate] = useState(draft.endDate);
    const [note, setNote] = useState(draft.note);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmRemove, setConfirmRemove] = useState(false);

    const today = todayKey();
    const editing = draft.id;
    const existing = absences.find(a => a.id === editing) ?? null;
    const validation = validateAbsenceInput({ startDate, endDate, note }, today);
    const impact = useMemo(
        () => absenceImpact(matches, playerId, startDate, endDate, editing),
        [matches, playerId, startDate, endDate, editing]
    );
    const days = validation.ok ? daysInclusive(startDate, endDate) : 0;
    const declined = impact.declined.length;

    const handleSave = async () => {
        if (!validation.ok) {
            setError(validation.error);
            return;
        }
        hapticPatterns.tap();
        setSaving(true);
        setError(null);
        try {
            const result = await saveAbsence(playerId, validation.value, editing ?? undefined);
            hapticPatterns.success();
            const range = formatAbsenceRange(result.absence.startDate, result.absence.endDate);
            await onSaved(
                result.applied > 0
                    ? `Away ${range} · ${matchesLabel(result.applied)} marked Can't`
                    : `Away ${range} saved`
            );
        } catch (e) {
            hapticPatterns.error();
            setError(e instanceof Error ? e.message : 'Could not save');
            setSaving(false);
        }
    };

    const handleRemove = async (resetAnswers: boolean) => {
        if (!existing) return;
        hapticPatterns.tap();
        setSaving(true);
        try {
            const { reset } = await deleteAbsence(playerId, existing.id, resetAnswers);
            hapticPatterns.success();
            setConfirmRemove(false);
            await onSaved(
                reset > 0
                    ? `Away period removed · ${matchesLabel(reset)} back to no response`
                    : 'Away period removed'
            );
        } catch (e) {
            hapticPatterns.error();
            setError(e instanceof Error ? e.message : 'Could not remove');
            setConfirmRemove(false);
            setSaving(false);
        }
    };

    const saveLabel = editing
        ? 'Save changes'
        : !validation.ok
            ? 'Save'
            : declined > 0
                ? `Save · mark ${matchesLabel(declined)} Can't`
                : 'Save';

    return (
        <FlowPage
            open={open}
            title={editing ? 'Edit away period' : 'Add away period'}
            subtitle={validation.ok ? `${formatAbsenceRange(startDate, endDate)} · ${days} ${days === 1 ? 'day' : 'days'}` : undefined}
            onBack={onClose}
            backClose
        >
            <ListSection label="Dates">
                <div className="row row-static" style={{ gap: 'var(--sp-3)', padding: 'var(--sp-3) var(--sp-4)' }}>
                    <label style={{ flex: 1, minWidth: 0 }}>
                        <span className="t-caption" style={{ display: 'block', marginBottom: 4 }}>From</span>
                        <input
                            type="date"
                            className="field date-field t-num"
                            value={startDate}
                            min={existing && existing.startDate < today ? existing.startDate : today}
                            onChange={(e) => {
                                const next = e.target.value;
                                setStartDate(next);
                                if (next && endDate && endDate < next) setEndDate(next);
                            }}
                            aria-label="First day away"
                        />
                    </label>
                    <label style={{ flex: 1, minWidth: 0 }}>
                        <span className="t-caption" style={{ display: 'block', marginBottom: 4 }}>Until</span>
                        <input
                            type="date"
                            className="field date-field t-num"
                            value={endDate}
                            min={startDate || today}
                            onChange={(e) => setEndDate(e.target.value)}
                            aria-label="Last day away"
                        />
                    </label>
                </div>
            </ListSection>

            <ListSection label="Note">
                <div className="row row-static" style={{ padding: 'var(--sp-3) var(--sp-4)' }}>
                    <input
                        className="field"
                        value={note}
                        maxLength={ABSENCE_NOTE_MAX}
                        placeholder="Optional, e.g. Holiday in Spain"
                        onChange={(e) => setNote(e.target.value)}
                        aria-label="Note"
                    />
                </div>
            </ListSection>

            {validation.ok && (
                <ListSection
                    label={declined > 0 ? `${matchesLabel(declined)} will be marked Can't` : 'No matches to mark'}
                    footer={impact.keptPresent.length > 0
                        ? `You said Coming to ${matchesLabel(impact.keptPresent.length)} in this period. Those stay as they are.`
                        : 'New matches added to the calendar in this period are marked too.'}
                >
                    {declined + impact.keptPresent.length + impact.alreadyOut.length === 0 ? (
                        <div className="row row-static">
                            <span className="t-caption">None of your matches fall in this period yet.</span>
                        </div>
                    ) : (
                        [...impact.declined.map(m => ({ m, kind: 'declined' as const })),
                            ...impact.keptPresent.map(m => ({ m, kind: 'present' as const })),
                            ...impact.alreadyOut.map(m => ({ m, kind: 'out' as const }))]
                            .sort((a, b) => a.m.date.localeCompare(b.m.date))
                            .map(({ m, kind }) => (
                                <Row
                                    key={m.id}
                                    title={m.name.replace(/-/g, ' vs ')}
                                    subtitle={`${formatMatchDate(m.date)} · ${formatTimeSafe(m.date)}`}
                                    trailing={
                                        kind === 'declined' ? (
                                            <StatusChip tone="no">Can&apos;t</StatusChip>
                                        ) : kind === 'present' ? (
                                            <StatusChip tone="ok">Coming · kept</StatusChip>
                                        ) : (
                                            <StatusChip>Already out</StatusChip>
                                        )
                                    }
                                />
                            ))
                    )}
                </ListSection>
            )}

            {error && (
                <div style={{ marginBottom: 'var(--sp-4)' }}>
                    <InlineNotice tone="error">{error}</InlineNotice>
                </div>
            )}

            <button
                className="btn btn-primary press"
                style={{ width: '100%' }}
                disabled={saving || !validation.ok}
                onClick={handleSave}
            >
                {saving ? <span className="spinner" aria-hidden /> : null}
                {saveLabel}
            </button>

            {existing && !confirmRemove && (
                <ListSection style={{ marginTop: 'var(--sp-6)' }}>
                    <Row
                        icon={<Trash2 size={16} />}
                        title="Remove away period"
                        destructive
                        disabled={saving}
                        onClick={() => {
                            hapticPatterns.tap();
                            setConfirmRemove(true);
                        }}
                    />
                </ListSection>
            )}

            {existing && confirmRemove && (
                <section className="panel" style={{ marginTop: 'var(--sp-6)', padding: 'var(--sp-4)' }} aria-label="Remove away period">
                    <p style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, marginBottom: 4 }}>Remove away period?</p>
                    <p className="t-caption" style={{ marginBottom: 'var(--sp-4)' }}>
                        {existing.autoDeclinedCount > 0
                            ? `${matchesLabel(existing.autoDeclinedCount)} ${existing.autoDeclinedCount === 1 ? 'was' : 'were'} marked Can't because of it. Reset ${existing.autoDeclinedCount === 1 ? 'it' : 'them'} to no response so you can answer again?`
                            : 'No upcoming matches were marked because of it.'}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                        {existing.autoDeclinedCount > 0 ? (
                            <>
                                <button className="btn btn-danger press" disabled={saving} onClick={() => handleRemove(true)}>
                                    Remove and reset {matchesLabel(existing.autoDeclinedCount)}
                                </button>
                                <button className="btn btn-quiet press" disabled={saving} onClick={() => handleRemove(false)}>
                                    Remove, keep Can&apos;t
                                </button>
                            </>
                        ) : (
                            <button className="btn btn-danger press" disabled={saving} onClick={() => handleRemove(false)}>
                                Remove
                            </button>
                        )}
                        <button className="btn press" style={{ color: 'var(--text-2)' }} disabled={saving} onClick={() => setConfirmRemove(false)}>
                            Cancel
                        </button>
                    </div>
                </section>
            )}
        </FlowPage>
    );
}
