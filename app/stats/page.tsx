'use client';

import { useEffect, useState } from 'react';
import { fetchPlayerMatchesData as fetchMatches, fetchAllPlayersData as fetchPlayers } from '@/lib/useData';
import { motion } from 'framer-motion';
import { Trophy, ArrowLeft, Activity, Ghost, HelpCircle, Star } from 'lucide-react';
import Link from 'next/link';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';

export default function StatsPage() {
    const [stats, setStats] = useState<any[]>([]);
    const [consideredMatches, setConsideredMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showMatchParams, setShowMatchParams] = useState(false);

    const [showRules, setShowRules] = useState(false);

    useEffect(() => {
        async function load() {
            try {
                // Fetch players first to get a valid ID for fetching matches
                // We use the first player to get the schedule, assuming all players share roughly the same team schedule

                const players = await fetchPlayers();
                if (players.length === 0) return;

                // Just use the first player to get the match schedule. 
                // Assumption: specific matches might vary by team, but we want generally "Who comes the most".


                const allMatches = await fetchMatches(players[0].id);

                // Filter for Stats:
                // 1. Match must be in the past
                // 2. Match must have at least one person "Present" (active match)
                const now = new Date();
                const matches = allMatches.filter((m: any) => {
                    const isPast = new Date(m.date) < now;
                    const hasAttendees = m.attendances?.some((a: any) => a.status === 'Present');
                    return isPast && hasAttendees;
                });

                // Calculate Stats
                const playerStats = players.map((player: any) => {
                    let present = 0;
                    let maybe = 0;
                    let notPresent = 0;
                    let unknown = 0;
                    let totalRelevantMatches = 0;
                    let score = 1000; // Base score

                    const matchHistory: any[] = [];

                    matches.forEach((match: any) => {
                        // Check if player is in the team for this match
                        if (player.teamIds && player.teamIds.includes(match.teamId)) {
                            totalRelevantMatches++;
                            const attendance = match.attendances.find((a: any) => a.playerId === player.id);
                            const status = attendance ? attendance.status : 'Unknown';

                            if (status === 'Present') { present++; score += 50; }
                            if (status === 'Maybe') { maybe++; score -= 20; }
                            if (status === 'NotPresent') { notPresent++; score -= 50; }
                            if (status === 'Unknown') { unknown++; score -= 100; } // Ghost penalty

                            matchHistory.push({
                                id: match.id,
                                date: match.date,
                                name: match.name, // or opponent
                                status: status
                            });
                        }
                    });

                    // Sort history by date descending (newest first)
                    matchHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                    // Generate Score Breakdown HTML
                    let breakdown = `<div class="text-left text-xs min-w-[150px]">
                        <div class="font-bold mb-2 border-b border-white/20 pb-1">Score Calculation</div>
                        <div class="flex justify-between mb-1"><span>Base Score:</span> <span>1000</span></div>`;

                    if (present > 0) breakdown += `<div class="flex justify-between mb-1 text-green-400"><span>Present (${present}x):</span> <span>+${present * 50}</span></div>`;
                    if (maybe > 0) breakdown += `<div class="flex justify-between mb-1 text-yellow-400"><span>Maybe (${maybe}x):</span> <span>${maybe * -20}</span></div>`;
                    if (notPresent > 0) breakdown += `<div class="flex justify-between mb-1 text-red-400"><span>Not Present (${notPresent}x):</span> <span>${notPresent * -50}</span></div>`;
                    if (unknown > 0) breakdown += `<div class="flex justify-between mb-1 text-purple-400"><span>Ghosted (${unknown}x):</span> <span>${unknown * -100}</span></div>`;

                    breakdown += `<div class="mt-2 pt-1 border-t border-white/20 flex justify-between font-bold"><span>Total:</span> <span>${score}</span></div>
                    </div>`;

                    return {
                        ...player,
                        stats: {
                            present,
                            maybe,
                            notPresent,
                            unknown,
                            total: totalRelevantMatches,
                            history: matchHistory,
                            score: score,
                            scoreBreakdown: breakdown
                        }
                    };
                });

                // Sort by SCORE desc
                playerStats.sort((a: any, b: any) => b.stats.score - a.stats.score);

                setStats(playerStats);
                setConsideredMatches(matches);
                setLoading(false);

            } catch (e) {
                console.error(e);
                setLoading(false);
            }
        }
        load();
    }, []);

    const getRankTitle = (score: number) => {
        if (score >= 1300) return "Club Legend 👑";
        if (score >= 1100) return "Ultra 📢";
        if (score >= 1000) return "Plastic Fan 🤡";
        if (score >= 800) return "Bench Warmer 🪵";
        if (score >= 500) return "Casual 🍺";
        return "Professional Ghost 👻";
    };

    if (loading) return (
        <div className="bg-black/95 min-h-screen text-white flex items-center justify-center">
            <span className="loader"></span>
        </div>
    );

    return (
        <div className="bg-black/95 min-h-screen text-white p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                <header className="flex flex-col md:flex-row md:items-center gap-6 mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold">Hall of Shame 🤡</h1>
                            <p className="text-xs text-gray-500">Official Social Credit System</p>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowRules(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-sm font-bold ml-auto"
                    >
                        <HelpCircle size={16} className="text-primary" />
                        How it works
                    </button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    {/* Top Cards */}
                    <StatHighlight
                        title="The Legend"
                        player={stats[0]}
                        icon={<Trophy className="text-yellow-400" />}
                        label="Shotten Points"
                        value={stats[0]?.stats.score}
                        color="from-yellow-400/20 to-yellow-900/10"
                    />
                    <StatHighlight
                        title="Casper 👻"
                        player={[...stats].sort((a, b) => b.stats.unknown - a.stats.unknown)[0]}
                        icon={<Ghost className="text-purple-400" />}
                        label="ghosted matches"
                        value={[...stats].sort((a, b) => b.stats.unknown - a.stats.unknown)[0]?.stats.unknown}
                        color="from-purple-400/20 to-purple-900/10"
                    />
                    <StatHighlight
                        title="Miss Maybe"
                        player={[...stats].sort((a, b) => b.stats.maybe - a.stats.maybe)[0]}
                        icon={<HelpCircle className="text-blue-400" />}
                        label="times unsure"
                        value={[...stats].sort((a, b) => b.stats.maybe - a.stats.maybe)[0]?.stats.maybe}
                        color="from-blue-400/20 to-blue-900/10"
                    />
                </div>

                {/* Desktop View */}
                <div className="hidden md:block glass rounded-3xl overflow-hidden overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="p-4 pl-6 font-semibold text-gray-400 w-16">Rank</th>
                                <th className="p-4 font-semibold text-gray-400 w-48">Player</th>
                                <th className="p-4 font-semibold text-gray-400">Recent Form</th>
                                <th className="p-4 text-center font-semibold text-success w-24">Present</th>
                                <th className="p-4 text-center font-semibold text-gray-400 w-40">Shotten Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.map((player, idx) => (
                                <motion.tr
                                    key={player.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
                                >
                                    <td className="p-4 pl-6 font-mono text-gray-500">#{idx + 1}</td>
                                    <td className="p-4 font-bold text-lg">
                                        {player.name}
                                        <div className="text-[10px] uppercase tracking-wider font-normal text-gray-500 mt-1">
                                            {getRankTitle(player.stats.score)}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {player.stats.history.slice(0, 5).map((match: any) => (
                                                <div
                                                    key={match.id}
                                                    data-tooltip-id="match-tooltip"
                                                    data-tooltip-html={`
                                                        <div class="text-center">
                                                            <div class="font-bold mb-1">${match.name.replace(/-/g, ' - ')}</div>
                                                            <div class="text-xs opacity-75">${new Date(match.date).toLocaleDateString()}</div>
                                                            <div class="mt-1 font-bold ${match.status === 'Present' ? 'text-success' :
                                                            match.status === 'Maybe' ? 'text-warning' :
                                                                match.status === 'NotPresent' ? 'text-danger' : 'text-gray-400'
                                                        }">
                                                                ${match.status === 'Present' ? 'Active' : match.status === 'NotPresent' ? 'Out' : match.status === 'Maybe' ? 'Maybe' : 'Unknown'}
                                                            </div>
                                                        </div>
                                                    `}
                                                    className={`
                                                        w-3 h-3 rounded-full cursor-help transition-all hover:scale-125
                                                        ${match.status === 'Present' ? 'bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                                                            match.status === 'Maybe' ? 'bg-warning shadow-[0_0_8px_rgba(245,158,11,0.5)]' :
                                                                match.status === 'NotPresent' ? 'bg-danger shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-gray-700'}
                                                    `}
                                                />
                                            ))}
                                            {player.stats.history.length === 0 && <span className="text-xs text-gray-600">No matches</span>}
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div
                                            className="inline-block bg-success/10 text-success px-3 py-1 rounded-full font-bold cursor-help"
                                            data-tooltip-id="present-tooltip"
                                            data-tooltip-content={`${player.stats.present} / ${player.stats.total} matches available`}
                                        >
                                            {player.stats.present}
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div
                                            className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent cursor-help"
                                            data-tooltip-id="match-tooltip"
                                            data-tooltip-html={player.stats.scoreBreakdown}
                                        >
                                            {player.stats.score}
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View (Cards) */}
                <div className="md:hidden space-y-4">
                    {stats.map((player, idx) => (
                        <motion.div
                            key={player.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="glass p-5 rounded-2xl flex flex-col gap-4"
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className="text-xl font-mono text-gray-600 font-bold">#{idx + 1}</div>
                                    <div>
                                        <div className="text-lg font-bold text-white leading-none">{player.name}</div>
                                        <div className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-medium">
                                            {getRankTitle(player.stats.score)}
                                        </div>
                                    </div>
                                </div>
                                <div
                                    className="bg-success/10 text-success px-3 py-1 rounded-full font-bold text-sm cursor-help"
                                    data-tooltip-id="match-tooltip"
                                    data-tooltip-content={`${player.stats.present} / ${player.stats.total} matches available`}
                                >
                                    {player.stats.present}
                                </div>
                            </div>

                            <div className="flex justify-between items-end border-t border-white/5 pt-4">
                                <div>
                                    <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-2">Form</div>
                                    <div className="flex items-center gap-2">
                                        {player.stats.history.slice(0, 5).map((match: any) => (
                                            <div
                                                key={match.id}
                                                data-tooltip-id="match-tooltip"
                                                data-tooltip-html={`
                                                    <div class="text-center">
                                                        <div class="font-bold mb-1">${match.name.replace(/-/g, ' - ')}</div>
                                                        <div class="text-xs opacity-75">${new Date(match.date).toLocaleDateString()}</div>
                                                        <div class="mt-1 font-bold ${match.status === 'Present' ? 'text-success' :
                                                        match.status === 'Maybe' ? 'text-warning' :
                                                            match.status === 'NotPresent' ? 'text-danger' : 'text-gray-400'
                                                    }">
                                                            ${match.status === 'Present' ? 'Active' : match.status === 'NotPresent' ? 'Out' : match.status === 'Maybe' ? 'Maybe' : 'Unknown'}
                                                        </div>
                                                    </div>
                                                `}
                                                className={`
                                                    w-3 h-3 rounded-full cursor-help transition-all
                                                    ${match.status === 'Present' ? 'bg-success' :
                                                        match.status === 'Maybe' ? 'bg-warning' :
                                                            match.status === 'NotPresent' ? 'bg-danger' : 'bg-gray-700'}
                                                `}
                                            />
                                        ))}
                                        {player.stats.history.length === 0 && <span className="text-xs text-gray-600">No matches</span>}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-gray-500 uppercase tracking-wider font-bold">Score</div>
                                    <div
                                        className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent cursor-help"
                                        data-tooltip-id="match-tooltip"
                                        data-tooltip-html={player.stats.scoreBreakdown}
                                    >
                                        {player.stats.score}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Calculation Parameters Section */}
                <div className="mt-12 border-t border-white/5 pt-8">
                    <button
                        onClick={() => setShowMatchParams(!showMatchParams)}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium uppercase tracking-wider mb-4"
                    >
                        <span>Matches in Calculation ({consideredMatches.length})</span>
                    </button>

                    {showMatchParams && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
                        >
                            {consideredMatches.map((match: any) => (
                                <div key={match.id} className="bg-white/5 rounded-lg p-3 text-sm border border-white/5 flex flex-col">
                                    <div className="font-bold text-gray-300 truncate">{match.name.replace(/-/g, ' - ')}</div>
                                    <div className="flex justify-between items-center mt-1 text-xs text-gray-500">
                                        <span>{new Date(match.date).toLocaleDateString()}</span>
                                        <span className="text-primary">{match.attendances?.filter((a: any) => a.status === 'Present').length} Present</span>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </div>
            </div>

            <Tooltip
                id="match-tooltip"
                style={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '12px',
                    zIndex: 50
                }}
            />
            <Tooltip
                id="present-tooltip"
                style={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '8px 12px',
                    zIndex: 50,
                    fontSize: '12px',
                    fontWeight: 'bold'
                }}
            />

            {/* Rules Modal */}
            {showRules && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowRules(false)} />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative z-10 glass p-8 rounded-3xl max-w-lg w-full border border-white/10"
                    >
                        <h2 className="text-2xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                            How it works 🤡
                        </h2>

                        <div className="space-y-6">
                            <div>
                                <h3 className="text-sm uppercase tracking-wider text-gray-400 font-bold mb-3">Social Credit System</h3>
                                <p className="text-sm text-gray-300 mb-4">Everyone starts with <span className="text-white font-bold">1000 points</span>.</p>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between p-2 rounded bg-white/5">
                                        <span>✅ Present</span>
                                        <span className="text-green-400 font-bold">+50</span>
                                    </div>
                                    <div className="flex justify-between p-2 rounded bg-white/5">
                                        <span>⚠️ Maybe</span>
                                        <span className="text-yellow-400 font-bold">-20</span>
                                    </div>
                                    <div className="flex justify-between p-2 rounded bg-white/5">
                                        <span>❌ Not Present</span>
                                        <span className="text-red-400 font-bold">-50</span>
                                    </div>
                                    <div className="flex justify-between p-2 rounded bg-white/5">
                                        <span>👻 Ghost (No response)</span>
                                        <span className="text-purple-400 font-bold">-100</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm uppercase tracking-wider text-gray-400 font-bold mb-3">Ranks</h3>
                                <div className="space-y-1 text-sm text-gray-300">
                                    <div className="flex justify-between"><span>👑 Club Legend</span> <span>1300+</span></div>
                                    <div className="flex justify-between"><span>📢 Ultra</span> <span>1100+</span></div>
                                    <div className="flex justify-between"><span>🤡 Plastic Fan</span> <span>1000+</span></div>
                                    <div className="flex justify-between"><span>🪵 Bench Warmer</span> <span>800+</span></div>
                                    <div className="flex justify-between"><span>🍺 Casual</span> <span>500+</span></div>
                                    <div className="flex justify-between"><span>👻 Professional Ghost</span> <span>&lt;500</span></div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowRules(false)}
                            className="mt-8 w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 font-bold transition-colors"
                        >
                            Got it
                        </button>
                    </motion.div>
                </div>
            )}
        </div>
    );
}

function StatHighlight({ title, player, icon, label, value, color }: any) {
    if (!player) return null;
    return (
        <div className={`glass p-6 rounded-3xl relative overflow-hidden bg-gradient-to-br ${color}`}>
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2 opacity-80 uppercase tracking-widest text-xs font-bold">
                    {icon}
                    <span>{title}</span>
                </div>
                <div className="text-3xl font-bold mb-1 truncate">{player.name}</div>
                <div className="text-sm opacity-60">{value} {label}</div>
            </div>
        </div>
    );
}
