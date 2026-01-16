'use client';

import React from 'react';
import { Loader2, UserCircle, ChevronRight } from 'lucide-react';
import { hapticPatterns } from '@/lib/haptic';
import type { ScraperTeam, ScraperPlayer } from '@/lib/useData';

interface OpponentViewProps {
    opponentTeam: string | null;
    opponentData: ScraperTeam | null;
    opponentPlayers: ScraperPlayer[];
    ownTeamData: ScraperTeam | null;
    recentForm: ('W' | 'L' | 'D')[];
    loading: boolean;
    onImageClick: () => void;
}

export default function OpponentView({
    opponentTeam,
    opponentData,
    opponentPlayers,
    ownTeamData,
    recentForm,
    loading,
    onImageClick,
}: OpponentViewProps) {
    if (!opponentTeam) return null;

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, color: 'rgba(255,255,255,0.5)' }}>
                <Loader2 className="animate-spin" size={20} style={{ marginRight: 8 }} /> Loading team data...
            </div>
        );
    }

    if (!opponentData) {
        return (
            <div style={{
                padding: 16, textAlign: 'center',
                color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem'
            }}>
                Team data not available
            </div>
        );
    }

    // Head-to-Head Comparison
    const renderHeadToHead = () => {
        if (!ownTeamData || opponentData.rank === undefined || ownTeamData.rank === undefined) {
            return null;
        }

        const comparisons = [
            { label: 'Rank', us: ownTeamData.rank, them: opponentData.rank, lowerIsBetter: true },
            { label: 'Points', us: ownTeamData.points || 0, them: opponentData.points || 0, lowerIsBetter: false },
            { label: 'Wins', us: ownTeamData.wins || 0, them: opponentData.wins || 0, lowerIsBetter: false },
            { label: 'Goal Diff', us: ownTeamData.goalDifference || 0, them: opponentData.goalDifference || 0, lowerIsBetter: false },
        ];

        let usWins = 0;
        let themWins = 0;
        comparisons.forEach(c => {
            const usAhead = c.lowerIsBetter ? c.us < c.them : c.us > c.them;
            const themAhead = c.lowerIsBetter ? c.them < c.us : c.them > c.us;
            if (usAhead) usWins++;
            if (themAhead) themWins++;
        });

        let verdict = { text: 'Even match', emoji: '🤝', color: '#ffd60a', bg: 'rgba(255, 214, 10, 0.15)' };
        if (usWins === 4) {
            verdict = { text: 'Easy pickings', emoji: '🔥', color: '#30d158', bg: 'rgba(48, 209, 88, 0.2)' };
        } else if (usWins >= 3) {
            verdict = { text: 'Looking good', emoji: '💪', color: '#30d158', bg: 'rgba(48, 209, 88, 0.15)' };
        } else if (themWins === 4) {
            verdict = { text: 'Major challenge', emoji: '🚨', color: '#ff453a', bg: 'rgba(255, 69, 58, 0.15)' };
        } else if (themWins >= 3) {
            verdict = { text: 'Tough match', emoji: '⚠️', color: '#ff9f0a', bg: 'rgba(255, 159, 10, 0.15)' };
        }

        return (
            <div style={{ padding: '12px', borderTop: '0.5px solid rgba(255,255,255,0.05)' }}>
                {/* Section Title + Verdict */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 10,
                }}>
                    <div style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: 'rgba(255,255,255,0.4)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                    }}>
                        Head to Head
                    </div>
                    <div style={{
                        padding: '4px 10px',
                        borderRadius: 12,
                        background: verdict.bg,
                        color: verdict.color,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                    }}>
                        <span>{verdict.emoji}</span>
                        <span>{verdict.text}</span>
                    </div>
                </div>

                {/* Comparison Table */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto',
                    gap: '6px 8px',
                }}>
                    {comparisons.map((stat) => {
                        const usAhead = stat.lowerIsBetter ? stat.us < stat.them : stat.us > stat.them;
                        const themAhead = stat.lowerIsBetter ? stat.them < stat.us : stat.them > stat.us;

                        return (
                            <div key={stat.label} style={{ display: 'contents' }}>
                                <div
                                    style={{
                                        fontSize: '0.8rem',
                                        color: 'rgba(255,255,255,0.5)',
                                        display: 'flex',
                                        alignItems: 'center',
                                    }}
                                >
                                    {stat.label}
                                </div>
                                <div
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: 8,
                                        background: usAhead ? 'rgba(48, 209, 88, 0.15)' : 'transparent',
                                        border: usAhead ? '1px solid rgba(48, 209, 88, 0.3)' : '1px solid transparent',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        color: usAhead ? '#30d158' : 'rgba(255,255,255,0.6)',
                                        textAlign: 'center',
                                        minWidth: 50,
                                    }}
                                >
                                    {stat.label === 'Goal Diff' && stat.us > 0 ? '+' : ''}{stat.us}
                                </div>
                                <div
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: 8,
                                        background: themAhead ? 'rgba(255, 69, 58, 0.15)' : 'transparent',
                                        border: themAhead ? '1px solid rgba(255, 69, 58, 0.3)' : '1px solid transparent',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        color: themAhead ? '#ff453a' : 'rgba(255,255,255,0.6)',
                                        textAlign: 'center',
                                        minWidth: 50,
                                    }}
                                >
                                    {stat.label === 'Goal Diff' && stat.them > 0 ? '+' : ''}{stat.them}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 16,
                border: '0.5px solid rgba(255,255,255,0.1)',
                overflow: 'hidden',
            }}>
                {/* Team Header with Image */}
                <div style={{ display: 'flex', gap: 12, padding: 12 }}>
                    {opponentData.imageBase64 ? (
                        <img
                            src={opponentData.imageBase64}
                            alt={opponentData.name}
                            onClick={() => {
                                hapticPatterns.tap();
                                onImageClick();
                            }}
                            style={{
                                width: 64, height: 64,
                                borderRadius: 12,
                                objectFit: 'cover',
                                border: '1px solid rgba(255,255,255,0.1)',
                                cursor: 'pointer'
                            }}
                        />
                    ) : (
                        <div style={{
                            width: 64, height: 64,
                            borderRadius: 12,
                            background: 'linear-gradient(135deg, #5e5ce6, #0a84ff)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.5rem', fontWeight: 700, color: 'white'
                        }}>
                            {opponentData.name.charAt(0)}
                        </div>
                    )}
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'white' }}>
                            {opponentData.name}
                        </div>
                        {opponentData.leagueName && (
                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                                {opponentData.leagueName}
                            </div>
                        )}
                        {opponentData.colors && (
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                                🎨 {opponentData.colors}
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Form */}
                {recentForm.length > 0 && (
                    <div style={{ padding: '0 12px 12px 12px' }}>
                        <div style={{
                            fontSize: '0.7rem', fontWeight: 600,
                            color: 'rgba(255,255,255,0.4)',
                            textTransform: 'uppercase',
                            marginBottom: 8,
                        }}>
                            Recent Form
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            {recentForm.map((result, i) => (
                                <div
                                    key={i}
                                    style={{
                                        width: 32, height: 32,
                                        borderRadius: 8,
                                        background: result === 'W' ? 'rgba(48, 209, 88, 0.2)' :
                                            result === 'L' ? 'rgba(255, 69, 58, 0.2)' :
                                                'rgba(255, 214, 10, 0.2)',
                                        color: result === 'W' ? '#30d158' :
                                            result === 'L' ? '#ff453a' : '#ffd60a',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.85rem',
                                        fontWeight: 700,
                                    }}
                                >
                                    {result}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Stats Grid */}
                {opponentData.rank !== undefined && (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: 1,
                        background: 'rgba(255,255,255,0.05)',
                        padding: 1
                    }}>
                        <div style={{ background: 'rgba(25,25,30,0.9)', padding: 10, textAlign: 'center' }}>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffd60a' }}>#{opponentData.rank}</div>
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>RANK</div>
                        </div>
                        <div style={{ background: 'rgba(25,25,30,0.9)', padding: 10, textAlign: 'center' }}>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>{opponentData.points || 0}</div>
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>PTS</div>
                        </div>
                        <div style={{ background: 'rgba(25,25,30,0.9)', padding: 10, textAlign: 'center' }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'white' }}>
                                <span style={{ color: '#30d158' }}>{opponentData.wins || 0}</span>
                                <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
                                <span style={{ color: '#ffd60a' }}>{opponentData.draws || 0}</span>
                                <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
                                <span style={{ color: '#ff453a' }}>{opponentData.losses || 0}</span>
                            </div>
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>W/D/L</div>
                        </div>
                        <div style={{ background: 'rgba(25,25,30,0.9)', padding: 10, textAlign: 'center' }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: (opponentData.goalDifference || 0) >= 0 ? '#30d158' : '#ff453a' }}>
                                {(opponentData.goalDifference || 0) >= 0 ? '+' : ''}{opponentData.goalDifference || 0}
                            </div>
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>GD</div>
                        </div>
                    </div>
                )}

                {/* Manager & Description */}
                {(opponentData.manager || opponentData.description) && (
                    <div style={{ padding: 12, borderTop: '0.5px solid rgba(255,255,255,0.05)' }}>
                        {opponentData.manager && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: opponentData.description ? 8 : 0 }}>
                                <UserCircle size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
                                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                                    {opponentData.manager}
                                </span>
                            </div>
                        )}
                        {opponentData.description && (
                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', lineHeight: 1.4 }}>
                                "{opponentData.description}"
                            </div>
                        )}
                    </div>
                )}

                {/* Top Players */}
                {opponentPlayers.length > 0 && (
                    <div style={{ padding: 12, borderTop: '0.5px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 8, textTransform: 'uppercase' }}>
                            Top Scorers
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {opponentPlayers.map((player, i) => (
                                <div key={player.externalId} style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '6px 8px',
                                    background: i === 0 ? 'rgba(255,214,10,0.1)' : 'transparent',
                                    borderRadius: 8,
                                }}>
                                    <div style={{
                                        width: 24, height: 24, borderRadius: '50%',
                                        background: i === 0 ? '#ffd60a' : 'rgba(255,255,255,0.1)',
                                        color: i === 0 ? 'black' : 'white',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.7rem', fontWeight: 700, flexShrink: 0
                                    }}>
                                        {player.number || i + 1}
                                    </div>
                                    <div style={{ flex: 1, fontSize: '0.8rem', color: 'white' }}>
                                        {player.name}
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, fontSize: '0.75rem' }}>
                                        <span style={{ color: '#30d158' }}>⚽ {player.goals}</span>
                                        <span style={{ color: '#0a84ff' }}>🎯 {player.assists}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Head-to-Head Comparison */}
                {renderHeadToHead()}

                {/* Link to LZV */}
                <a
                    href={`https://www.lzvcup.be/teams/detail/${opponentData.externalId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 12, gap: 6,
                        background: 'rgba(10,132,255,0.15)',
                        borderTop: '0.5px solid rgba(255,255,255,0.05)',
                        color: '#0a84ff', fontSize: '0.8rem', fontWeight: 600,
                        textDecoration: 'none'
                    }}
                >
                    View on LZV Cup <ChevronRight size={14} />
                </a>
            </div>
        </div>
    );
}
