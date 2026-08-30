'use client';

import { useRef, useState, useEffect } from 'react';
import { LineChart, Line, ReferenceLine, YAxis } from 'recharts';
import { Check, HelpCircle, X, Ghost, Flame, Snowflake, Trophy } from 'lucide-react';
import { hapticPatterns } from '@/lib/haptic';
import { RANKS, type PlayerWithStats, type AttendanceHistoryPoint } from '../StatsView';
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
    present: { icon: Check, color: 'var(--ok)', bg: 'rgb(var(--ok-rgb) / 0.13)', label: 'Present' },
    maybe: { icon: HelpCircle, color: 'var(--warn)', bg: 'rgb(var(--warn-rgb) / 0.13)', label: 'Maybe' },
    notPresent: { icon: X, color: 'var(--no)', bg: 'rgb(var(--no-rgb) / 0.12)', label: 'Absent' },
    ghost: { icon: Ghost, color: 'var(--tbd)', bg: 'rgb(var(--tbd-rgb) / 0.12)', label: 'Ghost' },
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
            subtitle={`#${rank} · ${s.rank.name} · ${s.attendancePct}% present`}
            onBack={() => {
                hapticPatterns.tap();
                onClose();
            }}
        >
            {/* Attendance rate */}
            <div className="panel" style={{ padding: '18px 14px', textAlign: 'center', marginBottom: 'var(--sp-5)' }}>
                <div
                    className="t-num"
                    style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', color: s.rank.color }}
                >
                    {s.attendancePct}%
                </div>
                <div className="t-label" style={{ marginTop: 2 }}>Attendance rate</div>

                {s.attendanceHistory && s.attendanceHistory.length > 1 && (
                    <div style={{ marginTop: 12 }}>
                        <AttendanceSparkline history={s.attendanceHistory} />
                        <div className="t-caption" style={{ marginTop: 4 }}>Season trend</div>
                    </div>
                )}

                {nextRank && neededPresent > 0 && (
                    <p className="t-caption" style={{ marginTop: 12 }}>
                        {neededPresent} more present {neededPresent === 1 ? 'match' : 'matches'} to reach{' '}
                        <span style={{ color: nextRank.color, fontWeight: 700 }}>
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
                        const Icon = cfg.icon;
                        const isZero = value === 0;
                        return (
                            <span key={key} style={{ textAlign: 'center', opacity: isZero ? 0.45 : 1 }}>
                                <Icon size={13} style={{ color: cfg.color }} aria-hidden />
                                <span
                                    className="t-num"
                                    style={{ display: 'block', fontSize: 'var(--fs-base)', fontWeight: 800, color: isZero ? 'var(--text-3)' : cfg.color }}
                                >
                                    {value}
                                </span>
                                <span style={{ display: 'block', fontSize: '0.575rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)' }}>
                                    {cfg.label}
                                </span>
                            </span>
                        );
                    })}
                </div>

                {(s.currentStreakPresent >= 3 || s.currentStreakAbsent >= 2) && (
                    <div className="row row-static" style={{ gap: 8, minHeight: 44 }}>
                        <StatusChip tone={streakIsPositive ? 'warn' : 'no'}>
                            {streakIsPositive ? <Flame size={11} /> : <Snowflake size={11} />}
                            <span className="t-num" style={{ fontWeight: 800 }}>{streakValue}</span>
                            {streakLabel}
                        </StatusChip>
                        <StatusChip tone="warn">
                            <Trophy size={11} />
                            <span className="t-num" style={{ fontWeight: 800 }}>{s.bestStreak}</span>
                            best
                        </StatusChip>
                    </div>
                )}

                {s.recentForm.length > 0 && (
                    <div className="row row-static" style={{ display: 'block', paddingTop: 10, paddingBottom: 12 }}>
                        <span className="t-label" style={{ display: 'block', marginBottom: 8 }}>
                            Last {s.recentForm.length} matches
                        </span>
                        <span style={{ display: 'flex', gap: 4 }}>
                            {s.recentForm.map((status, j) => {
                                const cfg = statusConfig[status as keyof typeof statusConfig] || statusConfig.ghost;
                                const Icon = cfg.icon;
                                return (
                                    <span
                                        key={j}
                                        className="flex-center"
                                        style={{
                                            flex: 1,
                                            height: 28,
                                            borderRadius: 6,
                                            background: cfg.bg,
                                            color: cfg.color,
                                            minWidth: 0,
                                        }}
                                        aria-label={cfg.label}
                                    >
                                        <Icon size={13} strokeWidth={2.5} />
                                    </span>
                                );
                            })}
                        </span>
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
                        const Icon = cfg.icon;
                        return (
                            <div key={result.matchId} className="row row-static" style={{ minHeight: 48 }}>
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
                                        {result.date.toLocaleDateString()}
                                    </span>
                                </span>
                                <span
                                    className="flex-center"
                                    style={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: 7,
                                        background: cfg.bg,
                                        color: cfg.color,
                                        flexShrink: 0,
                                    }}
                                    aria-label={cfg.label}
                                >
                                    <Icon size={12} strokeWidth={2.5} />
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

    const endPct = history[history.length - 1].attendancePct;
    const trendColor = endPct >= 50 ? 'var(--ok)' : 'var(--no)';
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
                        stroke={trendColor}
                        strokeWidth={2.5}
                        dot={false}
                        isAnimationActive={false}
                    />
                </LineChart>
            )}
        </div>
    );
}
