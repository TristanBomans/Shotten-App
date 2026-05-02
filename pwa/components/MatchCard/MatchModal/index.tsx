'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, MapPin, Calendar } from 'lucide-react';
import { hapticPatterns } from '@/lib/haptic';
import { isSameTeamName } from '@/lib/teamNameMatching';
import type { Match } from '@/lib/mockData';
import type { RosterPlayer, StatusGroup } from '../types';
import { useOpponentTeamData } from '../hooks/useOpponentTeamData';
import SquadView from './SquadView';
import OpponentView from './OpponentView';

interface MatchModalProps {
    match: Match;
    dateObj: Date;
    roster: RosterPlayer[];
    currentPlayerId: number;
    open: boolean;
    onClose: () => void;
}

const OWN_TEAMS = ['FC Degradé', 'Wille ma ni kunne'];
const modalTabs = ['squad', 'opponent'] as const;

export default function MatchModal({ match, dateObj, roster, currentPlayerId, open, onClose }: MatchModalProps) {
    const [activeTab, setActiveTab] = useState<'squad' | 'opponent'>('squad');
    const [showImage, setShowImage] = useState(false);
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
                {/* Header with iOS-style back button */}
                <div
                    style={{
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        padding: 'calc(var(--safe-top) + 8px) 16px 10px',
                        borderBottom: '0.5px solid var(--color-border-subtle)',
                        background: 'var(--color-surface)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <motion.button
                            whileTap={{ scale: 0.96 }}
                            onClick={() => {
                                hapticPatterns.tap();
                                onClose();
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--color-accent)',
                                fontSize: '1.05rem',
                                fontWeight: 400,
                                cursor: 'pointer',
                                padding: '4px 8px 4px 0',
                                marginLeft: -4,
                                zIndex: 1,
                            }}
                        >
                            <ChevronLeft size={28} strokeWidth={1.5} />
                            Back
                        </motion.button>
                        <div
                            style={{
                                flex: 1,
                                fontSize: '1.05rem',
                                fontWeight: 600,
                                color: 'var(--color-text-primary)',
                                textAlign: 'center',
                                lineHeight: 1.3,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                paddingRight: 8,
                            }}
                        >
                            {match.name.replace(/-/g, ' vs ')}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex', padding: '10px 16px', gap: 8,
                    borderBottom: '0.5px solid var(--color-border)',
                    background: 'var(--color-surface)',
                }}
                >
                    {(['squad', 'opponent'] as const).map(tab => (
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
                                flex: 1, padding: '10px 16px',
                                background: activeTab === tab ? 'var(--color-surface-hover)' : 'transparent',
                                border: 'none', borderRadius: 10,
                                color: activeTab === tab ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                                fontSize: '0.85rem', fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                        >
                            {tab === 'squad' ? (
                                <>
                                    Squad ({present.length})
                                    {maybe.length > 0 && (
                                        <span style={{
                                            marginLeft: 4,
                                            fontSize: '0.7rem',
                                            fontWeight: 500,
                                            color: 'var(--color-warning)',
                                        }}>
                                            +{maybe.length}
                                        </span>
                                    )}
                                </>
                            ) : 'Opponent'}
                        </motion.button>
                    ))}
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
                            padding: 16,
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
                            padding: 16,
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

                {/* Bottom Action Bar */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    padding: '12px 16px calc(var(--safe-bottom, 0px) + 12px)',
                    borderTop: '0.5px solid var(--color-border-subtle)',
                    background: 'var(--color-surface)',
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        width: '100%',
                        minWidth: 0,
                    }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', flexShrink: 0 }}>
                            {dateObj.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · {dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {match.location && (
                            <>
                                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)', flexShrink: 0 }}>·</span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                                    {match.location}
                                </span>
                            </>
                        )}
                    </div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 10,
                    }}>
                        {match.location && (
                            <motion.button
                                onClick={() => window.open(mapUrl!, '_blank')}
                                whileTap={{ scale: 0.95 }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 7,
                                    flex: 1,
                                    padding: '11px 16px',
                                    background: 'var(--color-surface-hover)',
                                    border: '0.5px solid var(--color-border)',
                                    borderRadius: 12,
                                    color: 'var(--color-text-secondary)',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                <MapPin size={16} />
                                Directions
                            </motion.button>
                        )}
                        <motion.button
                            onClick={() => window.open(calendarUrl, '_blank')}
                            whileTap={{ scale: 0.95 }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 7,
                                flex: 1,
                                padding: '11px 16px',
                                background: 'var(--color-surface-hover)',
                                border: '0.5px solid var(--color-border)',
                                borderRadius: 12,
                                color: 'var(--color-text-secondary)',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            <Calendar size={16} />
                            Add to Calendar
                        </motion.button>
                    </div>
                </div>

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
