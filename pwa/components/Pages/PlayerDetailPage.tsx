'use client';

import { useRef, useState, useEffect } from 'react';
import { LineChart, Line, ReferenceLine, YAxis } from 'recharts';
import { Flame, Snowflake, Trophy } from 'lucide-react';
import { hapticPatterns } from '@/lib/haptic';
import { RANKS, type PlayerWithStats, type AttendanceHistoryPoint } from '../StatsView';
import { formatMatchDate } from '@/lib/dateUtils';
import FlowPage from '../ui/FlowPage';
import { ListSection } from '../ui/ListSection';
import { StatusChip } from '../ui/controls';

interface PlayerDetailPageProps {
    open: boolean;
    player: PlayerWithStats;
    rank: number;
    onClose: () => void;
}

const statusConfig = {
    present: { color: 'var(--ok)', label: 'Present' },
    maybe: { color: 'var(--warn)', label: 'Maybe' },
    notPresent: { color: 'var(--no)', label: 'Absent' },
    ghost: { color: 'var(--tbd)', label: 'Ghost' },
} as const;

export default function PlayerDetailPage({ open, player, rank, onClose }: PlayerDetailPageProps) {
    if (!player?.stats) return null;

    const s = player.stats;
    const currentRank = s.rank;
    const currentRankIndex = RANKS.findIndex(r => r.name === currentRank.name);
    const nextRank = currentRankIndex > 0 ? RANKS[currentRankIndex - 1] : null;

    const neededPresent = nextRank
        ? Math.max(0, Math.ceil(((nextRank.minPct / 100) * s.totalMatches - s.presentCount) / (1 - nextRank.minPct / 100)))
        : 0;

    const streakValue = s.currentStreakPresent > 0 ? s.currentStreakPresent : s.currentStreakAbsent;
    const streakIsPositive = s.currentStreakPresent > 0;
    const streakLabel = streakIsPositive ? 'present' : s.currentStreakAbsent > 0 ? 'missed' : 'no streak';

    return (
        <FlowPage
            open={open}
            title={player.name}
            subtitle={`#${rank} · ${s.rank.name}`}
            onBack={() => {
                hapticPatterns.tap();
                onClose();
            }}
        >
            {/* Attendance rate */}
            <div className="panel" style={{ padding: 14, marginBottom: 'var(--sp-5)' }}>
                <div className="flex-between" style={{ alignItems: 'baseline', gap: 12 }}>
                    <span className="t-num" style={{ fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                        {s.attendancePct}%
                    </span>
                    <span className="t-caption t-num">
                        {s.presentCount} of {s.totalMatches} {s.totalMatches === 1 ? 'match' : 'matches'}
                    </span>
                </div>
                <div
                    aria-hidden
                    style={{
                        height: 4,
                        marginTop: 10,
                        borderRadius: 'var(--r-full)',
                        background: 'var(--bg-subtle-strong)',
                        overflow: 'hidden',
                    }}
                >
                    <div style={{ height: '100%', width: `${s.attendancePct}%`, background: 'var(--text-2)' }} />
                </div>

                {s.attendanceHistory && s.attendanceHistory.length > 1 && (
                    <div style={{ marginTop: 12 }}>
                        <AttendanceSparkline history={s.attendanceHistory} />
                    </div>
                )}

                {nextRank && neededPresent > 0 && (
                    <p className="t-caption" style={{ marginTop: 10 }}>
                        {neededPresent} more present {neededPresent === 1 ? 'match' : 'matches'} to reach{' '}
                        <span style={{ color: 'var(--text-2)', fontWeight: 500 }}>
                            {nextRank.name} ({nextRank.minPct}%)
                        </span>
                    </p>
                )}
            </div>

            {/* Activity */}
            <ListSection label="Activity">
                <div
                    className="row row-static"
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, paddingTop: 12, paddingBottom: 12 }}
                >
                    {([
                        ['present', s.presentCount],
                        ['maybe', s.maybeCount],
                        ['notPresent', s.absentCount],
                        ['ghost', s.ghostCount],
                    ] as const).map(([key, value]) => {
                        const cfg = statusConfig[key];
                        const isZero = value === 0;
                        return (
                            <span key={key} style={{ textAlign: 'center' }}>
                                <span
                                    className="t-num"
                                    style={{ display: 'block', fontSize: 'var(--fs-base)', fontWeight: 600, color: isZero ? 'var(--text-3)' : 'var(--text-1)' }}
                                >
                                    {value}
                                </span>
                                <span style={{ display: 'block', fontSize: 'var(--fs-3xs)', fontWeight: 500, color: isZero ? 'var(--text-3)' : cfg.color }}>
                                    {cfg.label}
                                </span>
                            </span>
                        );
                    })}
                </div>

                {(s.currentStreakPresent >= 3 || s.currentStreakAbsent >= 2) && (
                    <div className="row row-static" style={{ gap: 8 }}>
                        <StatusChip>
                            {streakIsPositive ? <Flame size={11} /> : <Snowflake size={11} />}
                            <span className="t-num">{streakValue}</span>
                            {streakLabel}
                        </StatusChip>
                        <StatusChip>
                            <Trophy size={11} />
                            <span className="t-num">{s.bestStreak}</span>
                            best
                        </StatusChip>
                    </div>
                )}
            </ListSection>

            {/* Match history */}
            <ListSection label="Match history">
                {s.matchResults.length === 0 ? (
                    <div className="row row-static">
                        <span className="t-caption">No matches yet.</span>
                    </div>
                ) : (
                    s.matchResults.map((result) => {
                        const cfg = statusConfig[result.status];
                        return (
                            <div key={result.matchId} className="row row-static">
                                <span style={{ flex: 1, minWidth: 0 }}>
                                    <span
                                        style={{
                                            display: 'block',
                                            fontSize: 'var(--fs-xs)',
                                            fontWeight: 500,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {result.matchName.replace(/-/g, ' – ')}
                                    </span>
                                    <span className="t-num" style={{ display: 'block', fontSize: 'var(--fs-3xs)', color: 'var(--text-3)', marginTop: 1 }}>
                                        {formatMatchDate(result.date)}
                                    </span>
                                </span>
                                <span style={{ fontSize: 'var(--fs-2xs)', fontWeight: 500, color: cfg.color, flexShrink: 0 }}>
                                    {cfg.label}
                                </span>
                            </div>
                        );
                    })
                )}
            </ListSection>
        </FlowPage>
    );
}

function AttendanceSparkline({ history }: { history: AttendanceHistoryPoint[] }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const update = () => {
            const { width, height } = el.getBoundingClientRect();
            const fallbackWidth = typeof window !== 'undefined'
                ? Math.max(280, Math.min(window.innerWidth - 56, 520))
                : 320;
            const nextWidth = Math.round(width || fallbackWidth);
            const nextHeight = Math.round(height || 180);

            if (nextWidth > 0 && nextHeight > 0) {
                setDimensions({ width: nextWidth, height: nextHeight });
            }
        };

        update();

        if (typeof ResizeObserver === 'undefined') {
            window.addEventListener('resize', update);
            return () => window.removeEventListener('resize', update);
        }

        const observer = new ResizeObserver(() => update());
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    if (history.length < 2) return null;

    const pcts = history.map((point) => point.attendancePct);
    const visualMin = Math.min(...pcts, 0);
    const visualMax = Math.max(...pcts, 100);
    const pctRange = Math.max(visualMax - visualMin, 10);
    const yPadding = Math.max(10, Math.round(pctRange * 0.45));
    const chartMin = Math.max(0, visualMin - yPadding);
    const chartMax = Math.min(100, visualMax + yPadding);

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%', height: 180 }}>
            {dimensions && (
                <LineChart
                    width={dimensions.width}
                    height={dimensions.height}
                    data={history}
                    margin={{ top: 10, right: 8, bottom: 10, left: 24 }}
                >
                    <YAxis
                        domain={[chartMin, chartMax]}
                        tick={{ fontSize: 10, fill: 'var(--text-3)' }}
                        tickFormatter={(v: number) => `${v}%`}
                        width={24}
                        axisLine={false}
                        tickLine={false}
                    />
                    <ReferenceLine y={25} stroke="var(--border-subtle)" strokeDasharray="3 3" strokeOpacity={0.5} />
                    <ReferenceLine y={50} stroke="var(--border-subtle)" strokeDasharray="3 3" strokeOpacity={0.8} />
                    <ReferenceLine y={75} stroke="var(--border-subtle)" strokeDasharray="3 3" strokeOpacity={0.5} />
                    <Line
                        type="monotone"
                        dataKey="attendancePct"
                        stroke="var(--text-2)"
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                    />
                </LineChart>
            )}
        </div>
    );
}
