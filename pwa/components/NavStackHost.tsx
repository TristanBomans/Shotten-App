'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Match, Player } from '@/lib/mockData';
import { fetchScraperTeamById, setMatchForfait, useUpdateAttendance, type ScraperTeam } from '@/lib/useData';
import { hapticPatterns } from '@/lib/haptic';
import { isMatchFinished, parseDate } from '@/lib/dateUtils';
import { useNav } from '@/lib/navContext';
import { NavLevelContext } from '@/lib/navHistory';
import type { NavEntry } from '@/lib/navStack';
import MatchPage from './Pages/MatchPage';
import TeamDetailPage from './Pages/TeamDetailPage';
import LzvMatchDetailPage from './Pages/LzvMatchDetailPage';
import RespondAsPlayerPage from './Pages/RespondAsPlayerPage';
import { buildRoster } from './MatchBoard/roster';
import MotmVoteSection from './Motm/MotmVoteSection';
import type { AttendanceStatus } from './MatchBoard/types';

interface Slot {
    key: string;
    entry: NavEntry;
    level: number;
    open: boolean;
}

const EXIT_MS = 450;
const slotKey = (entry: NavEntry, level: number) => `${level}:${entry.kind}:${entry.id ?? ''}`;

/**
 * Live stack entries plus the ones just popped, kept for their exit animation.
 */
function useStackSlots(stack: NavEntry[]): Slot[] {
    const live = useMemo(
        () => stack.map((entry, level) => ({ key: slotKey(entry, level), entry, level, open: true })),
        [stack]
    );
    const [closing, setClosing] = useState<Slot[]>([]);
    const prevRef = useRef<Slot[]>(live);

    useEffect(() => {
        const liveKeys = new Set(live.map((slot) => slot.key));
        const removed = prevRef.current
            .filter((slot) => !liveKeys.has(slot.key))
            .map((slot) => ({ ...slot, open: false }));
        prevRef.current = live;
        if (removed.length === 0) return;
        const removedKeys = new Set(removed.map((slot) => slot.key));
        setClosing((prev) => [...prev.filter((slot) => !removedKeys.has(slot.key)), ...removed]);
        setTimeout(() => {
            setClosing((prev) => prev.filter((slot) => !removedKeys.has(slot.key)));
        }, EXIT_MS);
    }, [live]);

    return useMemo(() => {
        const liveKeys = new Set(live.map((slot) => slot.key));
        return [...live, ...closing.filter((slot) => !liveKeys.has(slot.key))]
            .sort((a, b) => a.level - b.level);
    }, [live, closing]);
}

interface NavStackHostProps {
    playerId: number;
    matches: Match[];
    players: Player[];
    teams: ScraperTeam[];
    onMatchUpdate: (matchId: number, status: AttendanceStatus) => void;
    /** Match whose response control should pulse once (opened from a reminder). */
    focusResponseMatchId: number | null;
}

/**
 * Renders the navigation stack pages that can be opened from anywhere:
 * our matches, LZV teams, LZV results and match-scoped captain tools.
 * Tab-owned pages (player stats, settings pages, recent results sheet) stay
 * where they are and only read their open state from the stack.
 */
export default function NavStackHost(props: NavStackHostProps) {
    const { stack } = useNav();
    const slots = useStackSlots(stack);

    return (
        <>
            {slots.map((slot) => (
                <NavLevelContext.Provider key={slot.key} value={slot.level}>
                    <StackPage slot={slot} isTop={slot.open && slot.level === stack.length - 1} {...props} />
                </NavLevelContext.Provider>
            ))}
        </>
    );
}

function StackPage({ slot, isTop, ...props }: { slot: Slot; isTop: boolean } & NavStackHostProps) {
    const { entry } = slot;
    switch (entry.kind) {
        case 'match':
            return <MatchStackPage slot={slot} isTop={isTop} {...props} />;
        case 'team':
            return <TeamStackPage slot={slot} isTop={isTop} teams={props.teams} />;
        case 'result':
            return <ResultStackPage slot={slot} isTop={isTop} />;
        case 'respond': {
            // Without a match id this is the legacy picker owned by Settings.
            if (!entry.id) return null;
            const match = props.matches.find((m) => m.id.toString() === entry.id) ?? null;
            if (!match) return null;
            return <RespondPage slot={slot} isTop={isTop} match={match} />;
        }
        default:
            return null;
    }
}

/** Close only from the top page; a stale page below must not pop someone else. */
function usePopIfTop(isTop: boolean) {
    const { pop } = useNav();
    return () => {
        if (isTop) pop();
    };
}

function RespondPage({ slot, isTop, match }: { slot: Slot; isTop: boolean; match: Match }) {
    const close = usePopIfTop(isTop);
    return <RespondAsPlayerPage isOpen={slot.open} onClose={close} match={match} />;
}

function MatchStackPage({
    slot,
    isTop,
    playerId,
    matches,
    players,
    onMatchUpdate,
    focusResponseMatchId,
}: { slot: Slot; isTop: boolean } & NavStackHostProps) {
    const { push, replaceTop } = useNav();
    const close = usePopIfTop(isTop);
    const { updating, updateAttendance } = useUpdateAttendance();
    const [forfaitBusy, setForfaitBusy] = useState(false);

    const match = matches.find((m) => m.id.toString() === slot.entry.id) ?? null;
    const roster = useMemo(() => (match ? buildRoster(match, players) : []), [match, players]);
    if (!match) return null;

    const dateObj = parseDate(match.date) || new Date(0);
    const isFinished = isMatchFinished(dateObj);
    const lzvResultId = isFinished ? match.result?.resultId ?? null : null;

    if (lzvResultId !== null) {
        return (
            <LzvMatchDetailPage
                resultId={lzvResultId}
                perspectiveTeamId={match.result?.teamLzvId ?? null}
                fallbackTitle={match.name.replace(/-/g, ' vs ')}
                open={slot.open}
                onClose={close}
                onOpenTeam={(teamId) => push({ kind: 'team', id: teamId.toString() })}
            >
                <MotmVoteSection match={match} roster={roster} currentPlayerId={playerId} />
            </LzvMatchDetailPage>
        );
    }

    const handleRespond = async (status: AttendanceStatus) => {
        hapticPatterns.tap();
        try {
            await updateAttendance(match.id, playerId, status, () => {
                hapticPatterns.success();
                onMatchUpdate(match.id, status);
            });
        } catch {
            hapticPatterns.error();
        }
    };

    const handleToggleForfait = async () => {
        setForfaitBusy(true);
        try {
            await setMatchForfait(match.id, !match.forfait);
            hapticPatterns.success();
            // Dashboard refreshes matches silently on this event.
            window.dispatchEvent(new CustomEvent('attendanceUpdated', { detail: { matchId: match.id } }));
        } catch (error) {
            console.error('Failed to toggle forfait:', error);
            hapticPatterns.error();
        } finally {
            setForfaitBusy(false);
        }
    };

    return (
        <MatchPage
            match={match}
            dateObj={dateObj}
            roster={roster}
            currentPlayerId={playerId}
            isFinished={isFinished}
            open={slot.open}
            onClose={close}
            initialTab={slot.entry.extra === 'opponent' ? 'opponent' : 'squad'}
            onTabChange={(tab) => {
                if (!isTop) return;
                replaceTop({ ...slot.entry, extra: tab === 'opponent' ? 'opponent' : null });
            }}
            onRespond={handleRespond}
            respondUpdating={updating as AttendanceStatus | null}
            highlightResponse={focusResponseMatchId === match.id}
            onOpenTeam={(teamId) => push({ kind: 'team', id: teamId.toString() })}
            onOpenPlayer={(id) => push({ kind: 'player', id: id.toString() })}
            captainActions={{
                onRespondForPlayers: () => push({ kind: 'respond', id: match.id.toString() }),
                onToggleForfait: handleToggleForfait,
                forfaitBusy,
            }}
        />
    );
}

function TeamStackPage({ slot, isTop, teams }: { slot: Slot; isTop: boolean; teams: ScraperTeam[] }) {
    const { push } = useNav();
    const close = usePopIfTop(isTop);
    const teamId = slot.entry.id ? parseInt(slot.entry.id, 10) : NaN;
    const known = teams.find((t) => t.externalId === teamId) ?? null;
    const [fetched, setFetched] = useState<ScraperTeam | null>(null);

    // Teams outside the loaded league list (e.g. a cup opponent) load on their own.
    useEffect(() => {
        if (known || Number.isNaN(teamId)) return;
        let cancelled = false;
        fetchScraperTeamById(teamId)
            .then((team) => {
                if (!cancelled) setFetched(team);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [known, teamId]);

    const team = known ?? fetched;
    return (
        <TeamDetailPage
            team={team || ({} as ScraperTeam)}
            open={slot.open && Boolean(team)}
            onClose={close}
            onSelectMatch={(resultId) => push({ kind: 'result', id: resultId.toString(), extra: slot.entry.id })}
        />
    );
}

function ResultStackPage({ slot, isTop }: { slot: Slot; isTop: boolean }) {
    const { stack, push, pop } = useNav();
    const close = usePopIfTop(isTop);
    const resultId = slot.entry.id ? parseInt(slot.entry.id, 10) : NaN;
    const perspective = slot.entry.extra ? parseInt(slot.entry.extra, 10) : NaN;

    return (
        <LzvMatchDetailPage
            resultId={Number.isNaN(resultId) ? null : resultId}
            perspectiveTeamId={Number.isNaN(perspective) ? null : perspective}
            open={slot.open}
            onClose={close}
            onOpenTeam={(teamId) => {
                if (!isTop) return;
                // Going "into" the team we just came from is a step back.
                const below = stack[slot.level - 1];
                if (below?.kind === 'team' && below.id === teamId.toString()) {
                    pop();
                    return;
                }
                push({ kind: 'team', id: teamId.toString() });
            }}
        />
    );
}
