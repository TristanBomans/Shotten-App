'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, UserCircle, ChevronRight, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { hapticPatterns } from '@/lib/haptic';
import type { ScraperTeam, ScraperPlayer } from '@/lib/useData';

// Mistral AI logo
function MistralLogo({ size = 14 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size * (91/129)}
            viewBox="0 0 129 91"
            style={{ fillRule: 'evenodd', clipRule: 'evenodd' }}
        >
            <rect x="18.292" y="0" width="18.293" height="18.123" fill="#ffd800" />
            <rect x="91.473" y="0" width="18.293" height="18.123" fill="#ffd800" />
            <rect x="18.292" y="18.121" width="36.586" height="18.123" fill="#ffaf00" />
            <rect x="73.181" y="18.121" width="36.586" height="18.123" fill="#ffaf00" />
            <rect x="18.292" y="36.243" width="91.476" height="18.122" fill="#ff8205" />
            <rect x="18.292" y="54.37" width="18.293" height="18.123" fill="#fa500f" />
            <rect x="54.883" y="54.37" width="18.293" height="18.123" fill="#fa500f" />
            <rect x="91.473" y="54.37" width="18.293" height="18.123" fill="#fa500f" />
            <rect x="0" y="72.504" width="54.89" height="18.123" fill="#e10500" />
            <rect x="73.181" y="72.504" width="54.89" height="18.123" fill="#e10500" />
        </svg>
    );
}

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
            <div>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Team Header with Image */}
            <div style={{ display: 'flex', gap: 12 }}>
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
                </div>
            </div>

            {/* Recent Form */}
            {recentForm.length > 0 && (
                <div style={{ marginBottom: 0 }}>
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
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    overflow: 'hidden',
                }}>
                    <div style={{ background: 'rgba(35,35,40,0.8)', padding: 12, textAlign: 'center' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffd60a' }}>#{opponentData.rank}</div>
                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>RANK</div>
                    </div>
                    <div style={{ background: 'rgba(35,35,40,0.8)', padding: 12, textAlign: 'center' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>{opponentData.points || 0}</div>
                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>PTS</div>
                    </div>
                    <div style={{ background: 'rgba(35,35,40,0.8)', padding: 12, textAlign: 'center' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'white' }}>
                            <span style={{ color: '#30d158' }}>{opponentData.wins || 0}</span>
                            <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
                            <span style={{ color: '#ffd60a' }}>{opponentData.draws || 0}</span>
                            <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
                            <span style={{ color: '#ff453a' }}>{opponentData.losses || 0}</span>
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>W/D/L</div>
                    </div>
                    <div style={{ background: 'rgba(35,35,40,0.8)', padding: 12, textAlign: 'center' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: (opponentData.goalDifference || 0) >= 0 ? '#30d158' : '#ff453a' }}>
                            {(opponentData.goalDifference || 0) >= 0 ? '+' : ''}{opponentData.goalDifference || 0}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>GD</div>
                    </div>
                </div>
            )}

            {/* Manager & Description */}
            {(opponentData.manager || opponentData.description || opponentData.colors) && (
                <div style={{
                    padding: 14,
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: 12,
                }}>
                    {opponentData.colors && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            marginBottom: (opponentData.manager || opponentData.description) ? 10 : 0,
                        }}>
                            <span style={{ fontSize: '0.9rem' }}>🎨</span>
                            <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
                                {opponentData.colors}
                            </span>
                        </div>
                    )}
                    {opponentData.manager && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            marginBottom: opponentData.description ? 10 : 0,
                        }}>
                            <UserCircle size={16} style={{ color: 'rgba(255,255,255,0.4)' }} />
                            <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
                                {opponentData.manager}
                            </span>
                        </div>
                    )}
                    {opponentData.description && (
                        <div style={{
                            fontSize: '0.85rem',
                            color: 'rgba(255,255,255,0.5)',
                            fontStyle: 'italic',
                            lineHeight: 1.5,
                        }}>
                            "{opponentData.description}"
                        </div>
                    )}
                </div>
            )}

            {/* Top Players */}
            {opponentPlayers.length > 0 && (
                <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 8, textTransform: 'uppercase' }}>
                        Top Scorers
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {opponentPlayers.map((player, i) => (
                            <div key={player.externalId} style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: '10px 12px',
                                background: i < 3 ? 'rgba(255,214,10,0.08)' : 'rgba(255,255,255,0.03)',
                                borderRadius: 12,
                                border: '0.5px solid rgba(255,255,255,0.05)',
                            }}>
                                <div style={{
                                    width: 32, height: 32, borderRadius: '50%',
                                    background: i < 3 ? '#ffd60a' : 'rgba(255,255,255,0.1)',
                                    color: i < 3 ? 'black' : 'white',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.8rem', fontWeight: 700, flexShrink: 0
                                }}>
                                    {player.number || i + 1}
                                </div>
                                <div style={{ flex: 1, fontSize: '0.9rem', color: 'white', fontWeight: 500 }}>
                                    {player.name}
                                </div>
                                <div style={{ display: 'flex', gap: 12, fontSize: '0.9rem' }}>
                                    <span style={{ color: '#30d158', fontWeight: 600 }}>⚽ {player.goals}</span>
                                    <span style={{ color: '#0a84ff', fontWeight: 600 }}>🎯 {player.assists}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

                {/* Head-to-Head Comparison */}
                {renderHeadToHead()}

            {/* AI Scouting Report */}
            {ownTeamData && opponentData && (
                <div>
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
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                        }}>
                            <Sparkles size={12} style={{ color: '#bf5af2' }} />
                            AI Scouting Report
                        </div>
                        {aiAnalysis && (
                            <motion.button
                                onClick={() => {
                                    hapticPatterns.tap();
                                    onGenerateAI(true); // Force regenerate
                                }}
                                whileTap={{ scale: 0.95 }}
                                disabled={aiLoading}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'rgba(255,255,255,0.4)',
                                    cursor: aiLoading ? 'not-allowed' : 'pointer',
                                    padding: 4,
                                    display: 'flex',
                                    alignItems: 'center',
                                    opacity: aiLoading ? 0.5 : 1,
                                }}
                            >
                                <RefreshCw size={14} className={aiLoading ? 'animate-spin' : ''} />
                            </motion.button>
                        )}
                    </div>

                    {!aiAnalysis && !aiLoading && !aiError && (
                        <motion.button
                            onClick={() => {
                                hapticPatterns.tap();
                                onGenerateAI();
                            }}
                            whileTap={{ scale: 0.97 }}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                background: 'linear-gradient(135deg, rgba(191, 90, 242, 0.2), rgba(10, 132, 255, 0.2))',
                                border: '1px solid rgba(191, 90, 242, 0.3)',
                                borderRadius: 12,
                                color: '#bf5af2',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                            }}
                        >
                            <Sparkles size={16} />
                            Generate AI Report
                        </motion.button>
                    )}

                    {aiLoading && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 20,
                            color: 'rgba(255,255,255,0.5)',
                            gap: 8,
                        }}>
                            <Loader2 className="animate-spin" size={16} />
                            <span style={{ fontSize: '0.85rem' }}>Analyzing opponent...</span>
                        </div>
                    )}

                    {aiError && (
                        <div style={{
                            padding: '12px',
                            background: 'rgba(255, 69, 58, 0.1)',
                            border: '1px solid rgba(255, 69, 58, 0.2)',
                            borderRadius: 10,
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 8,
                        }}>
                            <AlertCircle size={16} style={{ color: '#ff453a', flexShrink: 0, marginTop: 2 }} />
                            <div>
                                <div style={{ fontSize: '0.8rem', color: '#ff453a', fontWeight: 500 }}>
                                    Analysis failed
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                                    {aiError}
                                </div>
                                <motion.button
                                    onClick={() => {
                                        hapticPatterns.tap();
                                        onGenerateAI();
                                    }}
                                    whileTap={{ scale: 0.95 }}
                                    style={{
                                        marginTop: 8,
                                        padding: '6px 12px',
                                        background: 'rgba(255,255,255,0.1)',
                                        border: 'none',
                                        borderRadius: 6,
                                        color: 'white',
                                        fontSize: '0.75rem',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Try again
                                </motion.button>
                            </div>
                        </div>
                    )}

                    {aiAnalysis && !aiLoading && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <div style={{
                                padding: '14px',
                                background: 'linear-gradient(135deg, rgba(191, 90, 242, 0.08), rgba(10, 132, 255, 0.08))',
                                border: '1px solid rgba(191, 90, 242, 0.15)',
                                borderRadius: 12,
                            }}>
                                <p style={{
                                    margin: 0,
                                    fontSize: '0.85rem',
                                    lineHeight: 1.7,
                                    color: 'rgba(255,255,255,0.85)',
                                    whiteSpace: 'pre-line',
                                }}>
                                    {aiAnalysis}
                                </p>
                            </div>
                            {/* Powered by Mistral */}
                            <div style={{
                                marginTop: 10,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                gap: 6,
                                color: 'rgba(255,255,255,0.3)',
                                fontSize: '0.65rem',
                            }}>
                                <span>Powered by</span>
                                <a
                                    href="https://mistral.ai"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        color: 'rgba(255,255,255,0.4)',
                                        textDecoration: 'none',
                                    }}
                                >
                                    <MistralLogo size={12} />
                                    <span>Mistral</span>
                                </a>
                            </div>
                        </motion.div>
                    )}
                </div>
            )}

            {/* Link to LZV */}
            <a
                href={`https://www.lzvcup.be/teams/detail/${opponentData.externalId}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 14, gap: 8,
                    background: 'rgba(10,132,255,0.15)',
                    borderRadius: 12,
                    color: '#0a84ff', fontSize: '0.9rem', fontWeight: 600,
                    textDecoration: 'none'
                }}
            >
                View on LZV Cup <ChevronRight size={16} />
            </a>
        </div>
    );
}
