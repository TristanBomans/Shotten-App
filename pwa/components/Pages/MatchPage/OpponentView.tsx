'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, UserCircle, Sparkles, AlertCircle, Trophy, Palette } from 'lucide-react';
import { hapticPatterns } from '@/lib/haptic';
import type { ScraperTeam, ScraperPlayer } from '@/lib/useData';
import { ListSection, Row, MetricRow } from '../../ui/ListSection';
import { InlineNotice } from '../../ui/controls';
import { OpenAILogo } from '../../ui/OpenAILogo';

interface OpponentViewProps {
    opponentTeam: string | null;
    opponentData: ScraperTeam | null;
    opponentPlayers: ScraperPlayer[];
    ownTeamData: ScraperTeam | null;
    recentForm: ('W' | 'L' | 'D')[];
    loading: boolean;
    onImageClick: () => void;
    aiAnalysis: string | null;
    aiLoading: boolean;
    aiError: string | null;
    onGenerateAI: (force?: boolean) => void;
}

function formColor(result: 'W' | 'L' | 'D'): string {
    if (result === 'W') return 'var(--ok)';
    if (result === 'L') return 'var(--no)';
    return 'var(--warn)';
}

export default function OpponentView({
    opponentTeam,
    opponentData,
    opponentPlayers,
    ownTeamData,
    recentForm,
    loading,
    onImageClick,
    aiAnalysis,
    aiLoading,
    aiError,
    onGenerateAI,
}: OpponentViewProps) {
    if (!opponentTeam) return null;

    const winRate = opponentData?.matchesPlayed && opponentData.matchesPlayed > 0
        ? Math.round(((opponentData.wins || 0) / opponentData.matchesPlayed) * 100)
        : 0;

    if (loading && !opponentData) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="panel" style={{ padding: 16, display: 'flex', gap: 14, alignItems: 'center' }}>
                    <div className="skeleton" style={{ width: 56, height: 56, borderRadius: 12 }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div className="skeleton" style={{ height: 16, width: '70%' }} />
                        <div className="skeleton" style={{ height: 11, width: '45%' }} />
                    </div>
                </div>
                {[128, 72, 160].map((height, i) => (
                    <div key={i} className="panel skeleton" style={{ height }} />
                ))}
            </div>
        );
    }

    // Head-to-Head Comparison - Us vs Them
    const renderHeadToHead = () => {
        if (!opponentData || !ownTeamData || opponentData.rank === undefined || ownTeamData.rank === undefined) {
            return null;
        }

        const comparisons = [
            { label: 'Rank', us: ownTeamData.rank, them: opponentData.rank, lowerIsBetter: true },
            { label: 'Points', us: ownTeamData.points || 0, them: opponentData.points || 0, lowerIsBetter: false },
            { label: 'Wins', us: ownTeamData.wins || 0, them: opponentData.wins || 0, lowerIsBetter: false },
            { label: 'Goals', us: (ownTeamData.goalsFor || 0) - (ownTeamData.goalsAgainst || 0), them: (opponentData.goalsFor || 0) - (opponentData.goalsAgainst || 0), lowerIsBetter: false },
        ];

        let usWins = 0;
        let themWins = 0;
        comparisons.forEach(c => {
            const usAhead = c.lowerIsBetter ? c.us < c.them : c.us > c.them;
            const themAhead = c.lowerIsBetter ? c.them < c.us : c.them > c.us;
            if (usAhead) usWins++;
            if (themAhead) themWins++;
        });

        const verdict = usWins === 4
            ? { text: 'Clear favorite', color: 'var(--ok)' }
            : usWins >= 3
                ? { text: 'Advantage', color: 'var(--ok)' }
                : themWins === 4
                    ? { text: 'Underdogs', color: 'var(--no)' }
                    : themWins >= 3
                        ? { text: 'Tough match', color: 'var(--warn)' }
                        : { text: 'Even match', color: 'var(--text-2)' };

        const formatValue = (val: number, label: string) => {
            if (label === 'Rank') return `#${val}`;
            if (label === 'Goals' && val > 0) return `+${val}`;
            return val.toString();
        };

        return (
            <ListSection
                label="Head to head"
                labelAction={
                    <span style={{ color: verdict.color, textTransform: 'none', letterSpacing: 0 }}>
                        {verdict.text}
                    </span>
                }
            >
                <div className="row row-static" style={{ minHeight: 36, paddingTop: 8, paddingBottom: 4 }}>
                    <span style={{ flex: 1, fontSize: 'var(--fs-3xs)', fontWeight: 800, letterSpacing: '0.07em', color: 'var(--ok)' }}>
                        US
                    </span>
                    <span style={{ fontSize: 'var(--fs-3xs)', color: 'var(--text-3)' }}>vs</span>
                    <span style={{ flex: 1, textAlign: 'right', fontSize: 'var(--fs-3xs)', fontWeight: 800, letterSpacing: '0.07em', color: 'var(--no)' }}>
                        THEM
                    </span>
                </div>
                {comparisons.map((stat) => {
                    const usAhead = stat.lowerIsBetter ? stat.us < stat.them : stat.us > stat.them;
                    const themAhead = stat.lowerIsBetter ? stat.them < stat.us : stat.them > stat.us;

                    return (
                        <div key={stat.label} className="row row-static" style={{ minHeight: 42 }}>
                            <span
                                className="t-num"
                                style={{
                                    flex: 1,
                                    fontSize: 'var(--fs-sm)',
                                    fontWeight: 700,
                                    color: usAhead ? 'var(--ok)' : 'var(--text-2)',
                                }}
                            >
                                {formatValue(stat.us, stat.label)}
                            </span>
                            <span
                                style={{
                                    fontSize: 'var(--fs-3xs)',
                                    fontWeight: 600,
                                    color: 'var(--text-3)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.06em',
                                }}
                            >
                                {stat.label}
                            </span>
                            <span
                                className="t-num"
                                style={{
                                    flex: 1,
                                    textAlign: 'right',
                                    fontSize: 'var(--fs-sm)',
                                    fontWeight: 700,
                                    color: themAhead ? 'var(--no)' : 'var(--text-2)',
                                }}
                            >
                                {formatValue(stat.them, stat.label)}
                            </span>
                        </div>
                    );
                })}
                <div className="row row-static" style={{ minHeight: 40, justifyContent: 'center', gap: 14 }}>
                    <span className="t-num" style={{ fontWeight: 800, color: usWins >= themWins ? 'var(--ok)' : 'var(--text-2)' }}>
                        {usWins}
                    </span>
                    <span style={{ fontSize: 'var(--fs-3xs)', color: 'var(--text-3)' }}>—</span>
                    <span className="t-num" style={{ fontWeight: 800, color: themWins > usWins ? 'var(--no)' : 'var(--text-2)' }}>
                        {themWins}
                    </span>
                </div>
            </ListSection>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Team header */}
            {opponentData ? (
                <div className="panel" style={{ padding: 16, display: 'flex', gap: 14, alignItems: 'center', marginBottom: 'var(--sp-5)' }}>
                    {opponentData.imageBase64 ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={opponentData.imageBase64}
                            alt={opponentData.name}
                            onClick={() => {
                                hapticPatterns.tap();
                                onImageClick();
                            }}
                            style={{
                                width: 56,
                                height: 56,
                                borderRadius: 12,
                                objectFit: 'cover',
                                border: '1px solid var(--border-hairline)',
                                cursor: 'pointer',
                                flexShrink: 0,
                            }}
                        />
                    ) : (
                        <div
                            className="flex-center"
                            style={{
                                width: 56,
                                height: 56,
                                borderRadius: 12,
                                background: 'var(--bg-subtle)',
                                border: '1px solid var(--border-hairline)',
                                fontSize: '1.4rem',
                                fontWeight: 700,
                                color: 'var(--text-2)',
                                flexShrink: 0,
                            }}
                        >
                            {opponentData.name.charAt(0)}
                        </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h3
                            style={{
                                fontSize: 'var(--fs-base)',
                                fontWeight: 700,
                                letterSpacing: '-0.01em',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}
                        >
                            {opponentData.name}
                        </h3>
                        {opponentData.leagueName && (
                            <p style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3, fontSize: 'var(--fs-2xs)', color: 'var(--text-3)' }}>
                                <Trophy size={11} />
                                {opponentData.leagueName}
                            </p>
                        )}
                    </div>
                </div>
            ) : (
                <div className="panel" style={{ padding: 20, textAlign: 'center', marginBottom: 'var(--sp-5)' }}>
                    <p className="t-caption">Team data not available</p>
                </div>
            )}

            {/* Season stats */}
            {opponentData?.rank !== undefined && (
                <ListSection label="Season stats">
                    <MetricRow label="Rank" value={`#${opponentData.rank}`} />
                    <MetricRow label="Points" value={opponentData.points || 0} />
                    <MetricRow
                        label="Record (W-D-L)"
                        value={`${opponentData.wins || 0}-${opponentData.draws || 0}-${opponentData.losses || 0}`}
                    />
                    <MetricRow
                        label="Goal difference"
                        value={
                            <span style={{ color: (opponentData.goalDifference || 0) >= 0 ? 'var(--ok)' : 'var(--no)' }}>
                                {(opponentData.goalDifference || 0) >= 0 ? '+' : ''}
                                {opponentData.goalDifference || 0}
                            </span>
                        }
                    />
                </ListSection>
            )}

            {/* Recent form */}
            {(loading || recentForm.length > 0) && (
                <ListSection label="Recent form">
                    <div className="row row-static" style={{ gap: 7 }}>
                        {loading
                            ? Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="skeleton" style={{ width: 32, height: 32, borderRadius: 8 }} />
                            ))
                            : recentForm.map((result, i) => (
                                <span
                                    key={i}
                                    className="flex-center t-num"
                                    style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: 8,
                                        fontSize: 'var(--fs-2xs)',
                                        fontWeight: 800,
                                        color: formColor(result),
                                        background: `rgb(var(--${result === 'W' ? 'ok' : result === 'L' ? 'no' : 'warn'}-rgb) / 0.13)`,
                                        border: `1px solid rgb(var(--${result === 'W' ? 'ok' : result === 'L' ? 'no' : 'warn'}-rgb) / 0.26)`,
                                    }}
                                >
                                    {result}
                                </span>
                            ))}
                    </div>
                </ListSection>
            )}

            {/* Win rate */}
            {opponentData && (
                <ListSection label="Win rate">
                    <div className="row row-static" style={{ alignItems: 'center', gap: 14, paddingTop: 12, paddingBottom: 12 }}>
                        <span
                            className="t-num"
                            style={{ fontSize: 'var(--fs-xl)', fontWeight: 800, color: 'var(--ok)', flexShrink: 0 }}
                        >
                            {winRate}%
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ display: 'block', fontSize: 'var(--fs-xs)', fontWeight: 600 }}>
                                {opponentData.wins || 0}/{opponentData.matchesPlayed || 0} matches won
                            </span>
                            <span style={{ display: 'block', marginTop: 6, height: 5, borderRadius: 'var(--r-full)', background: 'var(--bg-subtle)', overflow: 'hidden' }}>
                                <motion.span
                                    initial={{ width: 0 }}
                                    animate={{ width: `${winRate}%` }}
                                    transition={{ duration: 0.5, ease: 'easeOut' }}
                                    style={{ display: 'block', height: '100%', background: 'var(--ok)', borderRadius: 'var(--r-full)' }}
                                />
                            </span>
                        </span>
                    </div>
                </ListSection>
            )}

            {/* Team info */}
            {opponentData && (opponentData.manager || opponentData.description || opponentData.colors) && (
                <ListSection label="Team info">
                    {opponentData.colors && (
                        <Row icon={<Palette size={15} />} title={opponentData.colors} />
                    )}
                    {opponentData.manager && (
                        <Row icon={<UserCircle size={15} />} title={opponentData.manager} subtitle="Manager" />
                    )}
                    {opponentData.description && (
                        <div className="row row-static">
                            <p style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-2)', fontStyle: 'italic', lineHeight: 1.5 }}>
                                &ldquo;{opponentData.description}&rdquo;
                            </p>
                        </div>
                    )}
                </ListSection>
            )}

            {/* Top scorers */}
            {opponentPlayers.length > 0 && (
                <ListSection label="Top scorers">
                    {opponentPlayers.slice(0, 5).map((player, i) => (
                        <div key={player.externalId} className="row row-static" style={{ minHeight: 46 }}>
                            <span
                                className="t-num"
                                style={{
                                    width: 18,
                                    fontSize: 'var(--fs-2xs)',
                                    fontWeight: 800,
                                    color: i === 0 ? 'var(--warn)' : 'var(--text-3)',
                                    flexShrink: 0,
                                }}
                            >
                                {i + 1}
                            </span>
                            <span
                                className="flex-center t-num"
                                style={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: '50%',
                                    background: 'var(--bg-subtle)',
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    color: 'var(--text-2)',
                                    flexShrink: 0,
                                }}
                            >
                                {player.number || '-'}
                            </span>
                            <span
                                style={{
                                    flex: 1,
                                    minWidth: 0,
                                    fontSize: 'var(--fs-xs)',
                                    fontWeight: 500,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {player.name}
                            </span>
                            <span className="t-num" style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-2)', flexShrink: 0 }}>
                                <span style={{ color: 'var(--ok)', fontWeight: 700 }}>{player.goals}</span> G
                                {' · '}
                                <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{player.assists}</span> A
                            </span>
                        </div>
                    ))}
                </ListSection>
            )}

            {/* Head-to-head comparison */}
            {renderHeadToHead()}

            {/* AI scouting report */}
            {opponentData && (ownTeamData || loading || aiLoading || aiAnalysis || aiError) && (
                <ListSection label="AI scouting report">
                    <div className="row row-static" style={{ display: 'block', padding: '14px 16px' }}>
                        {!ownTeamData && loading && (
                            <div className="flex-center" style={{ flexDirection: 'column', gap: 8, padding: 12 }}>
                                <Loader2 className="animate-spin" size={20} style={{ color: 'var(--text-2)' }} />
                                <span className="t-caption">Preparing scouting data...</span>
                            </div>
                        )}

                        {ownTeamData && !aiAnalysis && !aiLoading && !aiError && (
                            <button
                                className="btn btn-quiet press"
                                style={{ width: '100%' }}
                                onClick={() => {
                                    hapticPatterns.tap();
                                    onGenerateAI();
                                }}
                            >
                                <Sparkles size={15} />
                                Generate AI Analysis
                            </button>
                        )}

                        {aiLoading && (
                            <div className="flex-center" style={{ flexDirection: 'column', gap: 8, padding: 12 }}>
                                <Loader2 className="animate-spin" size={20} style={{ color: 'var(--text-2)' }} />
                                <span className="t-caption">Analyzing opponent data...</span>
                            </div>
                        )}

                        {aiError && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <InlineNotice tone="error">
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                        <AlertCircle size={13} />
                                        Analysis failed: {aiError}
                                    </span>
                                </InlineNotice>
                                <button
                                    className="btn btn-quiet press"
                                    onClick={() => {
                                        hapticPatterns.tap();
                                        onGenerateAI();
                                    }}
                                >
                                    Try Again
                                </button>
                            </div>
                        )}

                        {aiAnalysis && !aiLoading && (
                            <motion.p
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{
                                    fontSize: 'var(--fs-xs)',
                                    lineHeight: 1.65,
                                    color: 'var(--text-1)',
                                    whiteSpace: 'pre-line',
                                }}
                            >
                                {aiAnalysis}
                            </motion.p>
                        )}

                        {(aiAnalysis || aiLoading || (!ownTeamData && loading)) && (
                            <div
                                style={{
                                    marginTop: 10,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'flex-end',
                                    gap: 5,
                                    color: 'var(--text-3)',
                                    fontSize: '0.625rem',
                                }}
                            >
                                <span>Powered by</span>
                                <a
                                    href="https://openai.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        color: 'var(--text-2)',
                                        textDecoration: 'none',
                                    }}
                                >
                                    <OpenAILogo size={11} />
                                    <span>OpenAI</span>
                                </a>
                            </div>
                        )}
                    </div>
                </ListSection>
            )}
        </div>
    );
}
