'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, UserCircle, ChevronRight, Sparkles, AlertCircle, TrendingUp, Trophy, Users, Zap } from 'lucide-react';
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

// Section Card Component - Consistent container for all sections
const SectionCard = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
    <div style={{
        background: 'rgba(255, 255, 255, 0.06)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        borderRadius: 16,
        border: '0.5px solid rgba(255, 255, 255, 0.1)',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        ...style,
    }}>
        {children}
    </div>
);

// Section Header Component - Consistent header with icon
const SectionHeader = ({ icon: Icon, title, color = '#a0a0a0', rightContent }: {
    icon: React.ElementType;
    title: string;
    color?: string;
    rightContent?: React.ReactNode;
}) => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    }}>
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
        }}>
            <Icon size={14} style={{ color }} />
            <span style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: 'rgba(255,255,255,0.5)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
            }}>
                {title}
            </span>
        </div>
        {rightContent}
    </div>
);

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
            verdict = { text: 'Major challenge', emoji: '🚨', color: '#ff453a', bg: 'rgba(255, 69, 58, 0.2)' };
        } else if (themWins >= 3) {
            verdict = { text: 'Tough match', emoji: '⚠️', color: '#ff9f0a', bg: 'rgba(255, 159, 10, 0.15)' };
        }

        return (
            <SectionCard>
                <SectionHeader
                    icon={Zap}
                    title="Head to Head"
                    color="#ffd60a"
                    rightContent={(
                        <div style={{
                            padding: '4px 10px',
                            borderRadius: 10,
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
                    )}
                />

                {/* Comparison Table */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto',
                    gap: '8px 12px',
                }}>
                    {comparisons.map((stat) => {
                        const usAhead = stat.lowerIsBetter ? stat.us < stat.them : stat.us > stat.them;
                        const themAhead = stat.lowerIsBetter ? stat.them < stat.us : stat.them > stat.us;

                        return (
                            <React.Fragment key={stat.label}>
                                <div style={{
                                    fontSize: '0.85rem',
                                    color: 'rgba(255,255,255,0.5)',
                                    display: 'flex',
                                    alignItems: 'center',
                                }}>
                                    {stat.label}
                                </div>
                                <div style={{
                                    padding: '6px 14px',
                                    borderRadius: 8,
                                    background: usAhead ? 'rgba(48, 209, 88, 0.15)' : 'rgba(255,255,255,0.05)',
                                    fontSize: '0.9rem',
                                    fontWeight: 700,
                                    color: usAhead ? '#30d158' : 'rgba(255,255,255,0.8)',
                                    textAlign: 'center',
                                    minWidth: 50,
                                    border: usAhead ? '1px solid rgba(48, 209, 88, 0.25)' : '1px solid transparent',
                                }}>
                                    {stat.label === 'Goal Diff' && stat.us > 0 ? '+' : ''}{stat.us}
                                </div>
                                <div style={{
                                    padding: '6px 14px',
                                    borderRadius: 8,
                                    background: themAhead ? 'rgba(255, 69, 58, 0.15)' : 'rgba(255,255,255,0.05)',
                                    fontSize: '0.9rem',
                                    fontWeight: 700,
                                    color: themAhead ? '#ff453a' : 'rgba(255,255,255,0.8)',
                                    textAlign: 'center',
                                    minWidth: 50,
                                    border: themAhead ? '1px solid rgba(255, 69, 58, 0.25)' : '1px solid transparent',
                                }}>
                                    {stat.label === 'Goal Diff' && stat.them > 0 ? '+' : ''}{stat.them}
                                </div>
                            </React.Fragment>
                        );
                    })}
                </div>
            </SectionCard>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Team Header Card */}
            <SectionCard style={{ padding: 20 }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    {opponentData.imageBase64 ? (
                        <img
                            src={opponentData.imageBase64}
                            alt={opponentData.name}
                            onClick={() => {
                                hapticPatterns.tap();
                                onImageClick();
                            }}
                            style={{
                                width: 72, height: 72,
                                borderRadius: 14,
                                objectFit: 'cover',
                                border: '1px solid rgba(255,255,255,0.1)',
                                cursor: 'pointer',
                                flexShrink: 0,
                            }}
                        />
                    ) : (
                        <div style={{
                            width: 72, height: 72,
                            borderRadius: 14,
                            background: 'linear-gradient(135deg, #5e5ce6, #0a84ff)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.75rem', fontWeight: 700, color: 'white',
                            flexShrink: 0,
                        }}>
                            {opponentData.name.charAt(0)}
                        </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                            fontSize: '1.25rem',
                            fontWeight: 700,
                            color: 'white',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}>
                            {opponentData.name}
                        </div>
                        {opponentData.leagueName && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                marginTop: 4,
                            }}>
                                <Trophy size={12} style={{ color: 'rgba(255,255,255,0.4)' }} />
                                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                                    {opponentData.leagueName}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </SectionCard>

            {/* Stats Overview Card */}
            {opponentData.rank !== undefined && (
                <SectionCard>
                    <SectionHeader
                        icon={TrendingUp}
                        title="Season Stats"
                        color="#0a84ff"
                    />
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 0',
                    }}>
                        <StatItem label="Rank" value={`#${opponentData.rank}`} color={opponentData.rank === 1 ? '#ffd60a' : 'white'} />
                        <StatItem label="Points" value={opponentData.points || 0} />
                        <StatItem label="Record" value={`${opponentData.wins || 0}-${opponentData.draws || 0}-${opponentData.losses || 0}`} />
                        <StatItem
                            label="Goal Diff"
                            value={`${(opponentData.goalDifference || 0) >= 0 ? '+' : ''}${opponentData.goalDifference || 0}`}
                            color={(opponentData.goalDifference || 0) >= 0 ? '#30d158' : '#ff453a'}
                        />
                    </div>
                </SectionCard>
            )}

            {/* Recent Form Card */}
            {recentForm.length > 0 && (
                <SectionCard>
                    <SectionHeader
                        icon={TrendingUp}
                        title="Recent Form"
                        color="#30d158"
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                        {recentForm.map((result, i) => (
                            <motion.div
                                key={i}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: i * 0.05 }}
                                style={{
                                    width: 36, height: 36,
                                    borderRadius: 10,
                                    background: result === 'W' ? 'rgba(48, 209, 88, 0.2)' :
                                        result === 'L' ? 'rgba(255, 69, 58, 0.2)' :
                                            'rgba(255, 214, 10, 0.2)',
                                    border: `1px solid ${result === 'W' ? 'rgba(48, 209, 88, 0.3)' :
                                        result === 'L' ? 'rgba(255, 69, 58, 0.3)' :
                                            'rgba(255, 214, 10, 0.3)'}`,
                                    color: result === 'W' ? '#30d158' :
                                        result === 'L' ? '#ff453a' : '#ffd60a',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.9rem',
                                    fontWeight: 800,
                                }}
                            >
                                {result}
                            </motion.div>
                        ))}
                    </div>
                </SectionCard>
            )}

            {/* Manager & Description Card */}
            {(opponentData.manager || opponentData.description || opponentData.colors) && (
                <SectionCard>
                    <SectionHeader
                        icon={UserCircle}
                        title="Team Info"
                        color="#af52de"
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {opponentData.colors && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                            }}>
                                <span style={{ fontSize: '1rem' }}>🎨</span>
                                <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)' }}>
                                    {opponentData.colors}
                                </span>
                            </div>
                        )}
                        {opponentData.manager && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                            }}>
                                <UserCircle size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
                                <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)' }}>
                                    {opponentData.manager}
                                </span>
                            </div>
                        )}
                        {opponentData.description && (
                            <div style={{
                                fontSize: '0.85rem',
                                color: 'rgba(255,255,255,0.6)',
                                fontStyle: 'italic',
                                lineHeight: 1.5,
                                paddingTop: opponentData.manager || opponentData.colors ? 8 : 0,
                                borderTop: opponentData.manager || opponentData.colors ? '1px solid rgba(255,255,255,0.06)' : 'none',
                            }}>
                                "{opponentData.description}"
                            </div>
                        )}
                    </div>
                </SectionCard>
            )}

            {/* Top Players Card */}
            {opponentPlayers.length > 0 && (
                <SectionCard>
                    <SectionHeader
                        icon={Users}
                        title="Top Scorers"
                        color="#ff453a"
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {opponentPlayers.slice(0, 5).map((player, i) => (
                            <div key={player.externalId} style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: '12px 0',
                                borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                            }}>
                                <div style={{
                                    width: 24, height: 24,
                                    color: i === 0 ? '#ffd60a' :
                                        i === 1 ? '#a0a0a0' :
                                            i === 2 ? '#cd7f32' :
                                                'rgba(255,255,255,0.3)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.85rem', fontWeight: 800, flexShrink: 0,
                                }}>
                                    {i + 1}
                                </div>
                                <div style={{
                                    width: 28, height: 28, borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.08)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', flexShrink: 0,
                                }}>
                                    {player.number || '-'}
                                </div>
                                <div style={{ flex: 1, fontSize: '0.9rem', color: 'white', fontWeight: 500 }}>
                                    {player.name}
                                </div>
                                <div style={{ display: 'flex', gap: 12, fontSize: '0.85rem', alignItems: 'center' }}>
                                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>
                                        <span style={{ color: '#30d158', fontWeight: 600 }}>{player.goals}</span> ⚽
                                    </span>
                                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>
                                        <span style={{ color: '#0a84ff', fontWeight: 600 }}>{player.assists}</span> 🎯
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            )}

            {/* Head-to-Head Comparison */}
            {renderHeadToHead()}

            {/* AI Scouting Report */}
            {ownTeamData && opponentData && (
                <SectionCard>
                    <SectionHeader
                        icon={Sparkles}
                        title="AI Scouting Report"
                        color="#bf5af2"
                    />

                    {!aiAnalysis && !aiLoading && !aiError && (
                        <motion.button
                            onClick={() => {
                                hapticPatterns.tap();
                                onGenerateAI();
                            }}
                            whileTap={{ scale: 0.97 }}
                            style={{
                                width: '100%',
                                padding: '14px 16px',
                                background: 'rgba(191, 90, 242, 0.12)',
                                border: '1px solid rgba(191, 90, 242, 0.2)',
                                borderRadius: 12,
                                color: '#bf5af2',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                            }}
                        >
                            <Sparkles size={18} />
                            Generate AI Analysis
                        </motion.button>
                    )}

                    {aiLoading && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 24,
                            color: 'rgba(255,255,255,0.5)',
                            gap: 10,
                            flexDirection: 'column',
                        }}>
                            <Loader2 className="animate-spin" size={24} style={{ color: '#bf5af2' }} />
                            <span style={{ fontSize: '0.85rem' }}>Analyzing opponent data...</span>
                        </div>
                    )}

                    {aiError && (
                        <div style={{
                            padding: '14px',
                            background: 'rgba(255, 69, 58, 0.1)',
                            border: '1px solid rgba(255, 69, 58, 0.2)',
                            borderRadius: 10,
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 10,
                        }}>
                            <AlertCircle size={18} style={{ color: '#ff453a', flexShrink: 0, marginTop: 2 }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.85rem', color: '#ff453a', fontWeight: 600 }}>
                                    Analysis failed
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                                    {aiError}
                                </div>
                                <motion.button
                                    onClick={() => {
                                        hapticPatterns.tap();
                                        onGenerateAI();
                                    }}
                                    whileTap={{ scale: 0.95 }}
                                    style={{
                                        marginTop: 10,
                                        padding: '8px 16px',
                                        background: 'rgba(255,255,255,0.1)',
                                        border: 'none',
                                        borderRadius: 8,
                                        color: 'white',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                    }}
                                >
                                    Try Again
                                </motion.button>
                            </div>
                        </div>
                    )}

                    {aiAnalysis && !aiLoading && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <p style={{
                                margin: 0,
                                fontSize: '0.9rem',
                                lineHeight: 1.7,
                                color: 'rgba(255,255,255,0.9)',
                                whiteSpace: 'pre-line',
                            }}>
                                {aiAnalysis}
                            </p>
                        </motion.div>
                    )}

                    {/* Powered by Mistral */}
                    {(aiAnalysis || aiLoading) && (
                        <div style={{
                            marginTop: 12,
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
                    )}
                </SectionCard>
            )}

            {/* Link to LZV */}
            <a
                href={`https://www.lzvcup.be/teams/detail/${opponentData.externalId}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 16, gap: 8,
                    background: 'rgba(10,132,255,0.12)',
                    borderRadius: 14,
                    border: '1px solid rgba(10,132,255,0.2)',
                    color: '#0a84ff', fontSize: '0.95rem', fontWeight: 600,
                    textDecoration: 'none',
                }}
            >
                View on LZV Cup <ChevronRight size={18} />
            </a>
        </div>
    );
}

// Stat Item Component - Simple inline stat
function StatItem({ label, value, color = 'white' }: {
    label: string;
    value: React.ReactNode;
    color?: string;
}) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
        }}>
            <div style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: color,
            }}>
                {value}
            </div>
            <div style={{
                fontSize: '0.65rem',
                color: 'rgba(255,255,255,0.4)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
            }}>
                {label}
            </div>
        </div>
    );
}
