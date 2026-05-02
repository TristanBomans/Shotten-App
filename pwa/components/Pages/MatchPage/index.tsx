'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, MapPin, Calendar, MoreHorizontal, Users, Swords } from 'lucide-react';
import { hapticPatterns } from '@/lib/haptic';
import { isSameTeamName } from '@/lib/teamNameMatching';
import type { Match } from '@/lib/mockData';
import type { RosterPlayer, StatusGroup } from '../../MatchCard/types';
import { useOpponentTeamData } from '../../MatchCard/hooks/useOpponentTeamData';
import SquadView from './SquadView';
import OpponentView from './OpponentView';

interface MatchPageProps {
    match: Match;
    dateObj: Date;
    roster: RosterPlayer[];
    currentPlayerId: number;
    open: boolean;
    onClose: () => void;
}

const OWN_TEAMS = ['FC Degradé', 'Wille ma ni kunne'];
const modalTabs = ['squad', 'opponent'] as const;

export default function MatchPage({ match, dateObj, roster, currentPlayerId, open, onClose }: MatchPageProps) {
    const [activeTab, setActiveTab] = useState<'squad' | 'opponent'>('squad');
    const [showImage, setShowImage] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const lastTabRef = useRef<'squad' | 'opponent'>('squad');

    const getTabFromScroll = useCallback((): 'squad' | 'opponent' => {
        if (!scrollRef.current) return 'squad';

        const scrollLeft = scrollRef.current.scrollLeft;
        const viewWidth = scrollRef.current.clientWidth || 1;
        const tabIndex = Math.round(scrollLeft / viewWidth);

        return modalTabs[tabIndex] || 'squad';
    }, []);

    const scrollToView = useCallback((view: 'squad' | 'opponent') => {
        if (scrollRef.current) {
            const left = view === 'squad' ? 0 : scrollRef.current.clientWidth;
            scrollRef.current.scrollTo({ left, behavior: 'smooth' });
        }
    }, []);

    const handleScroll = useCallback(() => {
        const nextTab = getTabFromScroll();

        if (nextTab !== lastTabRef.current) {
            hapticPatterns.swipe();
            lastTabRef.current = nextTab;
            setActiveTab(nextTab);
        }
    }, [getTabFromScroll]);

    // Reset tab state when modal opens so indicator and content stay aligned
    useEffect(() => {
        if (open) {
            setActiveTab('squad');
            setShowMenu(false);
            lastTabRef.current = 'squad';
            if (scrollRef.current) {
                scrollRef.current.scrollLeft = 0;
            }
        }
    }, [open]);

    if (typeof document === 'undefined') return null;

    // Squad data
    const present = roster.filter(p => p.status === 'Present');
    const maybe = roster.filter(p => p.status === 'Maybe');
    const absent = roster.filter(p => p.status === 'NotPresent');
    const unknown = roster.filter(p => p.status === 'Unknown');

    const statusGroups: StatusGroup[] = [
        { title: 'Coming', players: present, color: 'var(--color-success)', emoji: '✅' },
        { title: 'Maybe', players: maybe, color: 'var(--color-warning)', emoji: '🤔' },
        { title: 'Not Coming', players: absent, color: 'var(--color-danger)', emoji: '❌' },
        { title: 'No Response', players: unknown, color: 'var(--color-text-tertiary)', emoji: '❓' },
    ];

    // Current user status for calendar
    const myStatus = roster.find(p => p.id === currentPlayerId)?.status;
    const calendarTitle = myStatus === 'Present' ? `${match.name} (Confirmed ✅)` : match.name;

    // Determine opponent team (the team that isn't ours)
    const teams = match.name.split('-').map(t => t.trim());
    const opponentTeam = teams.find(t => !OWN_TEAMS.some(own =>
        isSameTeamName(t, own)
    )) || teams[1] || null;
    const ownTeam = teams.find(t => OWN_TEAMS.some(own =>
        isSameTeamName(t, own)
    )) || teams[0] || null;

    // Fetch opponent team data
    const {
        opponentData,
        opponentPlayers,
        ownTeamData,
        recentForm,
        loading: loadingOpponent,
        aiAnalysis,
        aiLoading,
        aiError,
        fetchAIAnalysis,
    } = useOpponentTeamData({
        opponentTeam,
        ownTeam,
        enabled: activeTab === 'opponent',
    });

    // Details data
    const mapUrl = match.location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(match.location)}` : null;
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(calendarTitle)}&dates=${dateObj.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${new Date(dateObj.getTime() + 2 * 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0]}Z&location=${encodeURIComponent(match.location || '')}`;

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0, x: '100%' }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: '100%' }}
                    transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'var(--color-bg)',
                        zIndex: 10020,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                    }}
                >
                {/* Header: floating glass pills (back · info · more) */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        zIndex: 5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: 'calc(var(--safe-top) + 20px) 12px 10px',
                    }}
                >
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                            hapticPatterns.tap();
                            onClose();
                        }}
                        aria-label="Back"
                        style={{
                            flexShrink: 0,
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            background: 'var(--color-glass-heavy)',
                            backdropFilter: 'blur(40px)',
                            WebkitBackdropFilter: 'blur(40px)',
                            border: '0.5px solid var(--color-border)',
                            color: 'var(--color-text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: 'var(--shadow-lg)',
                        }}
                    >
                        <ChevronLeft size={22} strokeWidth={2} />
                    </motion.button>

                    <div
                        style={{
                            flex: 1,
                            minWidth: 0,
                            padding: '8px 14px',
                            borderRadius: 999,
                            background: 'var(--color-glass-heavy)',
                            backdropFilter: 'blur(40px)',
                            WebkitBackdropFilter: 'blur(40px)',
                            border: '0.5px solid var(--color-border)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 2,
                            overflow: 'hidden',
                            boxShadow: 'var(--shadow-lg)',
                        }}
                    >
                        <div
                            style={{
                                fontSize: '0.9rem',
                                fontWeight: 700,
                                color: 'var(--color-text-primary)',
                                lineHeight: 1.2,
                                width: '100%',
                                textAlign: 'center',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}
                        >
                            {match.name.replace(/-/g, ' vs ')}
                        </div>
                        <div
                            style={{
                                fontSize: '0.72rem',
                                color: 'var(--color-text-secondary)',
                                lineHeight: 1.2,
                                width: '100%',
                                textAlign: 'center',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}
                        >
                            {dateObj.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · {dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                            {match.location ? ` · ${match.location}` : ''}
                        </div>
                    </div>

                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                            hapticPatterns.tap();
                            setShowMenu(prev => !prev);
                        }}
                        aria-label="More"
                        aria-expanded={showMenu}
                        style={{
                            flexShrink: 0,
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            background: showMenu ? 'var(--color-bg-elevated)' : 'var(--color-glass-heavy)',
                            backdropFilter: 'blur(40px)',
                            WebkitBackdropFilter: 'blur(40px)',
                            border: '0.5px solid var(--color-border)',
                            color: 'var(--color-text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'background 0.15s',
                            boxShadow: 'var(--shadow-lg)',
                        }}
                    >
                        <MoreHorizontal size={20} strokeWidth={2} />
                    </motion.button>
                </div>

                {/* Scrollable Container */}
                <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="scrollbar-hide"
                    style={{
                        display: 'flex',
                        width: '100%',
                        flex: 1,
                        overflowX: 'auto',
                        scrollSnapType: 'x mandatory',
                        scrollBehavior: 'smooth',
                        overflowY: 'hidden',
                    }}
                >
                    {/* Squad View */}
                    <div
                        data-view="squad"
                        style={{
                            minWidth: '100%',
                            scrollSnapAlign: 'center',
                            scrollSnapStop: 'always',
                            padding: 'calc(var(--safe-top) + 84px) 16px calc(var(--safe-bottom, 0px) + 100px)',
                            overflowY: 'auto',
                        }}
                    >
                        <SquadView statusGroups={statusGroups} currentPlayerId={currentPlayerId} />
                    </div>

                    {/* Opponent View */}
                    <div
                        data-view="opponent"
                        style={{
                            minWidth: '100%',
                            scrollSnapAlign: 'center',
                            scrollSnapStop: 'always',
                            padding: 'calc(var(--safe-top) + 84px) 16px calc(var(--safe-bottom, 0px) + 100px)',
                            overflowY: 'auto',
                        }}
                    >
                        <OpponentView
                            opponentTeam={opponentTeam}
                            opponentData={opponentData}
                            opponentPlayers={opponentPlayers}
                            ownTeamData={ownTeamData}
                            recentForm={recentForm}
                            loading={loadingOpponent}
                            onImageClick={() => setShowImage(true)}
                            aiAnalysis={aiAnalysis}
                            aiLoading={aiLoading}
                            aiError={aiError}
                            onGenerateAI={fetchAIAnalysis}
                        />
                    </div>
                </div>

                {/* Tabs (liquid glass pill) at bottom */}
                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 5,
                    padding: '10px 16px calc(var(--safe-bottom, 0px) + 12px)',
                }}>
                    <div style={{
                        display: 'flex',
                        gap: 4,
                        padding: 6,
                        background: 'var(--color-glass-heavy)',
                        backdropFilter: 'blur(60px)',
                        WebkitBackdropFilter: 'blur(60px)',
                        border: '0.5px solid var(--color-border)',
                        borderRadius: 999,
                        boxShadow: 'var(--shadow-lg)',
                    }}>
                        {(['squad', 'opponent'] as const).map(tab => {
                            const isActive = activeTab === tab;
                            const Icon = tab === 'squad' ? Users : Swords;
                            const label = tab === 'squad' ? 'Squad' : 'Opponent';
                            const badgeCount = tab === 'squad' ? present.length : null;
                            return (
                                <motion.button
                                    key={tab}
                                    onClick={() => {
                                        hapticPatterns.tap();
                                        lastTabRef.current = tab;
                                        setActiveTab(tab);
                                        scrollToView(tab);
                                    }}
                                    whileTap={{ scale: 0.95 }}
                                    style={{
                                        flex: 1,
                                        padding: '8px 12px',
                                        background: isActive ? 'var(--color-surface-hover)' : 'transparent',
                                        border: 'none',
                                        borderRadius: 999,
                                        color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: 4,
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    <div style={{ position: 'relative', lineHeight: 0 }}>
                                        <Icon size={22} strokeWidth={1.75} />
                                        {badgeCount !== null && badgeCount > 0 && (
                                            <span style={{
                                                position: 'absolute',
                                                top: -6,
                                                right: -10,
                                                minWidth: 18,
                                                height: 18,
                                                padding: '0 5px',
                                                background: 'var(--color-accent)',
                                                color: '#fff',
                                                fontSize: '0.65rem',
                                                fontWeight: 700,
                                                borderRadius: 999,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                lineHeight: 1,
                                                boxSizing: 'border-box',
                                            }}>
                                                {badgeCount}
                                            </span>
                                        )}
                                    </div>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 600, lineHeight: 1 }}>
                                        {label}
                                    </span>
                                </motion.button>
                            );
                        })}
                    </div>
                </div>

                {/* More menu (Directions / Add to Calendar) */}
                <AnimatePresence>
                    {showMenu && (
                        <>
                            <div
                                onClick={() => setShowMenu(false)}
                                style={{
                                    position: 'fixed',
                                    inset: 0,
                                    zIndex: 10024,
                                }}
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.92, y: -6 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.92, y: -6 }}
                                transition={{ duration: 0.15, ease: 'easeOut' }}
                                style={{
                                    position: 'absolute',
                                    top: 'calc(var(--safe-top) + 68px)',
                                    right: 12,
                                    minWidth: 220,
                                    background: 'var(--color-glass-heavy)',
                                    backdropFilter: 'blur(60px)',
                                    WebkitBackdropFilter: 'blur(60px)',
                                    border: '0.5px solid var(--color-border)',
                                    borderRadius: 14,
                                    overflow: 'hidden',
                                    boxShadow: 'var(--shadow-lg)',
                                    zIndex: 10025,
                                    transformOrigin: 'top right',
                                }}
                            >
                                {match.location && (
                                    <button
                                        onClick={() => {
                                            hapticPatterns.tap();
                                            window.open(mapUrl!, '_blank');
                                            setShowMenu(false);
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 12,
                                            width: '100%',
                                            padding: '14px 16px',
                                            background: 'transparent',
                                            border: 'none',
                                            borderBottom: '0.5px solid var(--color-border-subtle)',
                                            color: 'var(--color-text-primary)',
                                            fontSize: '0.95rem',
                                            fontWeight: 500,
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                        }}
                                    >
                                        <MapPin size={18} color="var(--color-text-secondary)" />
                                        Directions
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        hapticPatterns.tap();
                                        window.open(calendarUrl, '_blank');
                                        setShowMenu(false);
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        width: '100%',
                                        padding: '14px 16px',
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--color-text-primary)',
                                        fontSize: '0.95rem',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                    }}
                                >
                                    <Calendar size={18} color="var(--color-text-secondary)" />
                                    Add to Calendar
                                </button>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {/* Full Screen Image Overlay */}
                <AnimatePresence>
                    {showImage && opponentData?.imageBase64 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => {
                                hapticPatterns.tap();
                                setShowImage(false);
                            }}
                            style={{
                                position: 'fixed',
                                inset: 0,
                                zIndex: 10021,
                                background: 'var(--color-overlay)',
                                backdropFilter: 'blur(10px)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                pointerEvents: 'auto',
                                padding: 20
                            }}
                        >
                            <motion.img
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0.8 }}
                                src={opponentData.imageBase64}
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '80vh',
                                    borderRadius: 16,
                                    objectFit: 'contain'
                                }}
                            />
                            <button
                                onClick={() => {
                                    hapticPatterns.tap();
                                    setShowImage(false);
                                }}
                                style={{
                                    position: 'absolute',
                                    top: 20,
                                    right: 20,
                                    background: 'var(--color-surface-hover)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: 36,
                                    height: 36,
                                    color: 'var(--color-text-primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer'
                                }}
                            >
                                <ChevronLeft size={20} style={{ transform: 'rotate(180deg)' }} />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        )}
        </AnimatePresence>,
        document.body
    );
}
