'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X } from 'lucide-react';
import type { Match, Player } from '@/lib/mockData';
import { parseDate, parseDateToTimestamp } from '@/lib/dateUtils';

interface StatsViewProps {
    matches: Match[];
    players: Player[];
    currentPlayerId: number;
}

// Rank configuration
const RANKS = [
    { name: 'Club Legend', emoji: '👑', minScore: 1300, color: '#ffd700' },
    { name: 'Ultra', emoji: '📢', minScore: 1100, color: '#30d158' },
    { name: 'Plastic Fan', emoji: '🤡', minScore: 1000, color: '#0a84ff' },
    { name: 'Bench Warmer', emoji: '🪵', minScore: 800, color: '#ff9f0a' },
    { name: 'Casual', emoji: '🍺', minScore: 500, color: '#ff453a' },
    { name: 'Professional Ghost', emoji: '👻', minScore: 0, color: '#8e8e93' },
];

const POINTS = {
    present: 50,
    maybe: -20,
    notPresent: -50,
    ghost: -100,
    base: 1000,
};

function getRank(score: number) {
    return RANKS.find(r => score >= r.minScore) || RANKS[RANKS.length - 1];
}

interface MatchResult {
    matchId: number;
    matchName: string;
    date: Date;
    status: 'present' | 'maybe' | 'notPresent' | 'ghost';
    points: number;
}

function calculatePlayerScore(player: Player, allMatches: Match[]) {
    // Filter: player's team's matches, past, and at least 1 person Present
    const now = Date.now();
    const relevantMatches = allMatches.filter(m => {
        const isPast = parseDateToTimestamp(m.date) < now;
        const isPlayerTeam = player.teamIds.includes(m.teamId);
        const hasAttendees = m.attendances?.some(a => a.status === 'Present');
        return isPast && isPlayerTeam && hasAttendees;
    });

    const sortedMatches = [...relevantMatches].sort((a, b) =>
        parseDateToTimestamp(b.date) - parseDateToTimestamp(a.date)
    );

    let score = POINTS.base;
    let presentCount = 0;
    let maybeCount = 0;
    let absentCount = 0;
    let ghostCount = 0;

    const matchResults: MatchResult[] = [];

    sortedMatches.forEach(match => {
        const attendance = match.attendances?.find(a => a.playerId === player.id);

        let status: MatchResult['status'];
        let points: number;

        if (!attendance) {
            status = 'ghost';
            points = POINTS.ghost;
            ghostCount++;
        } else if (attendance.status === 'Present') {
            status = 'present';
            points = POINTS.present;
            presentCount++;
        } else if (attendance.status === 'Maybe') {
            status = 'maybe';
            points = POINTS.maybe;
            maybeCount++;
        } else {
            status = 'notPresent';
            points = POINTS.notPresent;
            absentCount++;
        }

        score += points;
        matchResults.push({
            matchId: match.id,
            matchName: match.name,
            date: parseDate(match.date) || new Date(0),
            status,
            points,
        });
    });

    const recentForm = matchResults.slice(0, 5).map(r => r.status);

    return {
        score,
        presentCount,
        maybeCount,
        absentCount,
        ghostCount,
        totalMatches: relevantMatches.length,
        rank: getRank(score),
        recentForm,
        matchResults,
    };
}

type PlayerWithStats = Player & { stats: ReturnType<typeof calculatePlayerScore> };

export default function StatsView({ matches, players, currentPlayerId }: StatsViewProps) {
    const [showRules, setShowRules] = useState(false);
    const [selectedPlayer, setSelectedPlayer] = useState<PlayerWithStats | null>(null);

    const playerStats = players.map(player => ({
        ...player,
        stats: calculatePlayerScore(player, matches),
    })).sort((a, b) => b.stats.score - a.stats.score);

    const topScorer = playerStats[0];
    const mostGhosts = playerStats.length > 0 ? playerStats.reduce((a, b) =>
        a.stats.ghostCount > b.stats.ghostCount ? a : b
    ) : null;
    const mostMaybe = playerStats.length > 0 ? playerStats.reduce((a, b) =>
        a.stats.maybeCount > b.stats.maybeCount ? a : b
    ) : null;

    return (
        <div className="container">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                {/* Header */}
                <div style={{ marginBottom: 20 }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 8,
                    }}>
                        <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#0a84ff',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                        }}>
                            Social Credit
                        </span>
                        <motion.button
                            onClick={() => setShowRules(true)}
                            whileTap={{ scale: 0.95 }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '6px 12px',
                                background: 'rgba(255, 255, 255, 0.08)',
                                border: 'none',
                                borderRadius: 20,
                                color: 'rgba(255,255,255,0.6)',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                            }}
                        >
                            <HelpCircle size={14} />
                            Rules
                        </motion.button>
                    </div>
                    <h1 style={{
                        fontSize: '1.75rem',
                        fontWeight: 700,
                        color: 'white',
                        margin: 0,
                    }}>
                        Leaderboard
                    </h1>
                </div>

                {/* Highlights */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 8,
                    marginBottom: 16,
                }}>
                    <HighlightCard icon="🏆" title="THE LEGEND" player={topScorer?.name} />
                    <HighlightCard icon="👻" title="CASPER" player={mostGhosts?.name} />
                    <HighlightCard icon="🤔" title="MISS MAYBE" player={mostMaybe?.name} />
                </div>

                {/* Leaderboard - Clean simple layout */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        backdropFilter: 'blur(40px)',
                        WebkitBackdropFilter: 'blur(40px)',
                        borderRadius: 20,
                        border: '0.5px solid rgba(255, 255, 255, 0.1)',
                        overflow: 'hidden',
                    }}
                >
                    {playerStats.map((player, i) => (
                        <motion.div
                            key={player.id}
                            onClick={() => setSelectedPlayer(player)}
                            whileTap={{ scale: 0.98 }}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.02 }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                padding: '14px 16px',
                                background: player.id === currentPlayerId
                                    ? 'rgba(10, 132, 255, 0.15)'
                                    : 'transparent',
                                borderLeft: player.id === currentPlayerId
                                    ? '3px solid #0a84ff'
                                    : '3px solid transparent',
                                cursor: 'pointer',
                                borderBottom: i < playerStats.length - 1
                                    ? '0.5px solid rgba(255, 255, 255, 0.06)'
                                    : 'none',
                            }}
                        >
                            {/* Rank */}
                            <span style={{
                                width: 28,
                                fontSize: i < 3 ? '1.1rem' : '0.9rem',
                                fontWeight: 600,
                                color: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'rgba(255,255,255,0.4)',
                                textAlign: 'center',
                            }}>
                                {i < 3 ? ['🥇', '🥈', '🥉'][i] : `#${i + 1}`}
                            </span>

                            {/* Avatar - Rank Emoji */}
                            <div style={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                background: player.stats.rank.color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.25rem',
                                flexShrink: 0,
                            }}>
                                {player.stats.rank.emoji}
                            </div>

                            {/* Info - simplified */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    color: 'white',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {player.name}
                                </div>
                                {/* Recent Form dots only */}
                                <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
                                    {player.stats.recentForm.map((status, j) => (
                                        <div
                                            key={j}
                                            style={{
                                                width: 8,
                                                height: 8,
                                                borderRadius: '50%',
                                                background: status === 'present' ? '#30d158' :
                                                    status === 'maybe' ? '#ffd60a' :
                                                        status === 'notPresent' ? '#ff453a' :
                                                            '#8e8e93',
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Score */}
                            <div style={{
                                fontSize: '1.25rem',
                                fontWeight: 700,
                                color: 'white',
                            }}>
                                {player.stats.score}
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </motion.div>

            {/* Rules Modal */}
            <AnimatePresence>
                {showRules && <RulesModal onClose={() => setShowRules(false)} />}
            </AnimatePresence>

            {/* Player Detail Modal */}
            <AnimatePresence>
                {selectedPlayer && (
                    <PlayerDetailModal
                        player={selectedPlayer}
                        rank={playerStats.findIndex(p => p.id === selectedPlayer.id) + 1}
                        onClose={() => setSelectedPlayer(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function HighlightCard({ icon, title, player }: { icon: string; title: string; player?: string }) {
    return (
        <div style={{
            background: 'rgba(255, 255, 255, 0.06)',
            borderRadius: 14,
            border: '0.5px solid rgba(255, 255, 255, 0.08)',
            padding: '12px 10px',
            textAlign: 'center',
        }}>
            <div style={{ fontSize: '1.25rem', marginBottom: 4 }}>{icon}</div>
            <div style={{
                fontSize: '0.55rem',
                fontWeight: 700,
                color: 'rgba(255,255,255,0.4)',
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                marginBottom: 4,
            }}>
                {title}
            </div>
            <div style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: 'white',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
            }}>
                {player}
            </div>
        </div>
    );
}

function PlayerDetailModal({ player, rank, onClose }: {
    player: PlayerWithStats;
    rank: number;
    onClose: () => void;
}) {
    if (typeof document === 'undefined') return null;

    const modalContent = (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0, 0, 0, 0.85)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    zIndex: 10000,
                }}
            />
            <div style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 20, zIndex: 10001, pointerEvents: 'none',
            }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    style={{
                        width: '100%', maxWidth: 360, maxHeight: 'calc(100dvh - 120px)',
                        display: 'flex', flexDirection: 'column', pointerEvents: 'auto',
                        background: 'rgba(25, 25, 30, 0.98)',
                        backdropFilter: 'blur(60px)', WebkitBackdropFilter: 'blur(60px)',
                        borderRadius: 24, border: '0.5px solid rgba(255, 255, 255, 0.12)',
                        boxShadow: '0 24px 80px rgba(0, 0, 0, 0.8)', overflow: 'hidden',
                    }}
                >
                    {/* Header */}
                    <div style={{ padding: '20px 20px 16px', borderBottom: '0.5px solid rgba(255, 255, 255, 0.1)', flexShrink: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
                                    #{rank} · {player.stats.rank.emoji} {player.stats.rank.name}
                                </div>
                                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'white' }}>
                                    {player.name}
                                </h2>
                            </div>
                            <motion.button
                                onClick={onClose}
                                whileTap={{ scale: 0.9 }}
                                style={{
                                    width: 32, height: 32, borderRadius: 9999, border: 'none',
                                    background: 'rgba(255, 255, 255, 0.08)', color: 'rgba(255, 255, 255, 0.6)',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                            >
                                <X size={16} />
                            </motion.button>
                        </div>

                        {/* Score */}
                        <div style={{
                            marginTop: 16, padding: 14, background: 'rgba(255,255,255,0.04)',
                            borderRadius: 14, textAlign: 'center',
                        }}>
                            <div style={{ fontSize: '2.25rem', fontWeight: 800, color: player.stats.rank.color }}>
                                {player.stats.score}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
                                Shotten Points
                            </div>
                        </div>

                        {/* Stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 12 }}>
                            <StatMini label="Present" value={player.stats.presentCount} color="#30d158" />
                            <StatMini label="Maybe" value={player.stats.maybeCount} color="#ffd60a" />
                            <StatMini label="Absent" value={player.stats.absentCount} color="#ff453a" />
                            <StatMini label="Ghost" value={player.stats.ghostCount} color="#8e8e93" />
                        </div>
                    </div>

                    {/* Match History */}
                    <div style={{ padding: '12px 16px 20px', overflowY: 'auto', flex: 1 }}>
                        <h3 style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 10 }}>
                            Match History
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {player.stats.matchResults.map((result) => (
                                <div
                                    key={result.matchId}
                                    style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 10,
                                    }}
                                >
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontSize: '0.85rem', color: 'white', fontWeight: 500,
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                        }}>
                                            {result.matchName.replace(/-/g, ' – ')}
                                        </div>
                                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>
                                            {result.date.toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                        <span style={{ fontSize: '0.9rem' }}>
                                            {result.status === 'present' ? '✅' :
                                                result.status === 'maybe' ? '⚠️' :
                                                    result.status === 'notPresent' ? '❌' : '👻'}
                                        </span>
                                        <span style={{
                                            fontWeight: 700, fontSize: '0.9rem',
                                            color: result.points > 0 ? '#30d158' : '#ff453a',
                                        }}>
                                            {result.points > 0 ? '+' : ''}{result.points}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>
        </>
    );

    return createPortal(modalContent, document.body);
}

function StatMini({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1rem', fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>{label}</div>
        </div>
    );
}

function RulesModal({ onClose }: { onClose: () => void }) {
    if (typeof document === 'undefined') return null;

    const modalContent = (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)', zIndex: 10000,
                }}
            />
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 20, zIndex: 10001, pointerEvents: 'none',
            }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    style={{
                        width: '100%', maxWidth: 340, maxHeight: 'calc(100dvh - 120px)',
                        overflowY: 'auto', pointerEvents: 'auto',
                        background: 'rgba(25, 25, 30, 0.98)', backdropFilter: 'blur(60px)',
                        WebkitBackdropFilter: 'blur(60px)', borderRadius: 24,
                        border: '0.5px solid rgba(255, 255, 255, 0.12)',
                        boxShadow: '0 24px 80px rgba(0, 0, 0, 0.8)', padding: 20,
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'white' }}>
                            How it works 🤡
                        </h2>
                        <motion.button
                            onClick={onClose}
                            whileTap={{ scale: 0.9 }}
                            style={{
                                width: 32, height: 32, borderRadius: 9999, border: 'none',
                                background: 'rgba(255, 255, 255, 0.08)', color: 'rgba(255, 255, 255, 0.6)',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                        >
                            <X size={16} />
                        </motion.button>
                    </div>

                    <div style={{ marginBottom: 20 }}>
                        <h3 style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 10 }}>
                            Points
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: 12 }}>
                            Start with <strong style={{ color: 'white' }}>1000</strong> points.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <PointRow emoji="✅" label="Present" points="+50" color="#30d158" />
                            <PointRow emoji="⚠️" label="Maybe" points="-20" color="#ffd60a" />
                            <PointRow emoji="❌" label="Absent" points="-50" color="#ff453a" />
                            <PointRow emoji="👻" label="Ghost" points="-100" color="#8e8e93" />
                        </div>
                    </div>

                    <div>
                        <h3 style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 10 }}>
                            Ranks
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {RANKS.map(rank => (
                                <div key={rank.name} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '6px 10px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: 8,
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ fontSize: '0.9rem' }}>{rank.emoji}</span>
                                        <span style={{ color: rank.color, fontWeight: 500, fontSize: '0.85rem' }}>{rank.name}</span>
                                    </div>
                                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{rank.minScore}+</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <motion.button
                        onClick={onClose}
                        whileTap={{ scale: 0.98 }}
                        style={{
                            width: '100%', marginTop: 20, padding: '12px',
                            background: 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: 12,
                            color: 'white', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer',
                        }}
                    >
                        Got it
                    </motion.button>
                </motion.div>
            </div>
        </>
    );

    return createPortal(modalContent, document.body);
}

function PointRow({ emoji, label, points, color }: { emoji: string; label: string; points: string; color: string }) {
    return (
        <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 10px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: 8,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{emoji}</span>
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}>{label}</span>
            </div>
            <span style={{ fontWeight: 700, color, fontSize: '0.85rem' }}>{points}</span>
        </div>
    );
}
