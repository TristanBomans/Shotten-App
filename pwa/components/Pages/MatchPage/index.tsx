'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, MapPin, Calendar, MoreHorizontal, ExternalLink, X } from 'lucide-react';
import { hapticPatterns } from '@/lib/haptic';
import { isSameTeamName } from '@/lib/teamNameMatching';
import { formatMatchDate, formatTimeSafe } from '@/lib/dateUtils';
import type { Match } from '@/lib/mockData';
import type { RosterPlayer, StatusGroup } from '../../MatchBoard/types';
import { useOpponentTeamData } from './useOpponentTeamData';
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
        { title: 'Coming', players: present, color: 'var(--ok)' },
        { title: 'Maybe', players: maybe, color: 'var(--warn)' },
        { title: 'Not Coming', players: absent, color: 'var(--no)' },
        { title: 'No Response', players: unknown, color: 'var(--tbd)' },
    ];

    // Current user status for calendar
    const myStatus = roster.find(p => p.id === currentPlayerId)?.status;
    const calendarTitle = myStatus === 'Present' ? `${match.name} (Confirmed ✅)` : match.name;

    // Determine opponent team (the team that isn't ours)
    const teams = match.name.split('-').map(t => t.trim());
    const ownTeam = match.teamName || teams[0] || null;
    const opponentTeam = teams.find(t => ownTeam && !isSameTeamName(t, ownTeam)) || teams[1] || null;

    // Fetch opponent team data
    const {
        opponentExternalId,
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
        open,
        enabled: activeTab === 'opponent',
        knownOpponentId: match.opponentLzvId ?? null,
    });

    // Details data
    const mapUrl = match.location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(match.location)}` : null;
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(calendarTitle)}&dates=${dateObj.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${new Date(dateObj.getTime() + 2 * 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0]}Z&location=${encodeURIComponent(match.location || '')}`;

    const paneStyle: React.CSSProperties = {
        minWidth: '100%',
        scrollSnapAlign: 'center',
        scrollSnapStop: 'always',
        overflowY: 'auto',
    };

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    className="flow-page"
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                    onClick={(e) => e.stopPropagation()}
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Match ${match.name.replace(/-/g, ' versus ')}`}
                >
                    {/* Header */}
                    <div className="flow-header">
                        <div className="flow-header-inner">
                            <button
                                className="icon-action press"
                                onClick={() => {
                                    hapticPatterns.tap();
                                    onClose();
                                }}
                                aria-label="Back"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <h2
                                    style={{
                                        fontSize: 'var(--fs-sm)',
                                        fontWeight: 700,
                                        letterSpacing: '-0.01em',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                >
                                    {match.name.replace(/-/g, ' vs ')}
                                </h2>
                                <p
                                    className="t-caption t-num"
                                    style={{
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        marginTop: -1,
                                    }}
                                >
                                    {formatMatchDate(dateObj)} · {formatTimeSafe(dateObj)}
                                    {match.location ? ` · ${match.location}` : ''}
                                </p>
                            </div>
                            <button
                                className="icon-action press"
                                onClick={() => {
                                    hapticPatterns.tap();
                                    setShowMenu(prev => !prev);
                                }}
                                aria-label="More"
                                aria-expanded={showMenu}
                                style={showMenu ? { background: 'var(--bg-subtle-strong)', color: 'var(--text-1)' } : undefined}
                            >
                                <MoreHorizontal size={17} />
                            </button>
                        </div>

                        {/* Segmented tabs */}
                        <div
                            style={{
                                maxWidth: 'calc(var(--content-max) + 2 * var(--screen-x))',
                                margin: '0 auto',
                                padding: '0 var(--screen-x) 10px',
                                width: '100%',
                            }}
                        >
                            <div className="seg" role="tablist" aria-label="Match views">
                                {modalTabs.map(tab => {
                                    const isActive = activeTab === tab;
                                    const label = tab === 'squad' ? 'Squad' : 'Opponent';
                                    return (
                                        <button
                                            key={tab}
                                            role="tab"
                                            aria-selected={isActive}
                                            className="seg-item"
                                            onClick={() => {
                                                hapticPatterns.tap();
                                                lastTabRef.current = tab;
                                                setActiveTab(tab);
                                                scrollToView(tab);
                                            }}
                                        >
                                            {label}
                                            {tab === 'squad' && present.length > 0 && (
                                                <span
                                                    className="t-num"
                                                    style={{
                                                        fontSize: '0.625rem',
                                                        fontWeight: 800,
                                                        color: isActive ? 'var(--ok)' : 'var(--text-3)',
                                                    }}
                                                >
                                                    {present.length}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
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
                        <div data-view="squad" className="scrollbar-hide" style={paneStyle}>
                            <div className="flow-body-inner">
                                <SquadView statusGroups={statusGroups} currentPlayerId={currentPlayerId} />
                            </div>
                        </div>

                        {/* Opponent View */}
                        <div data-view="opponent" className="scrollbar-hide" style={paneStyle}>
                            <div className="flow-body-inner">
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
                    </div>

                    {/* More menu (Directions / Add to Calendar / View opponent on LZV Cup) */}
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
                                    className="menu"
                                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                    transition={{ duration: 0.14, ease: 'easeOut' }}
                                    style={{
                                        top: 'calc(var(--safe-top) + var(--header-h))',
                                        right: 'var(--screen-x)',
                                        zIndex: 10025,
                                        transformOrigin: 'top right',
                                    }}
                                >
                                    {match.location && (
                                        <button
                                            className="menu-item"
                                            onClick={() => {
                                                hapticPatterns.tap();
                                                window.open(mapUrl!, '_blank');
                                                setShowMenu(false);
                                            }}
                                        >
                                            <MapPin size={16} style={{ color: 'var(--text-2)' }} />
                                            Directions
                                        </button>
                                    )}
                                    <button
                                        className="menu-item"
                                        onClick={() => {
                                            hapticPatterns.tap();
                                            window.open(calendarUrl, '_blank');
                                            setShowMenu(false);
                                        }}
                                    >
                                        <Calendar size={16} style={{ color: 'var(--text-2)' }} />
                                        Add to Calendar
                                    </button>
                                    {opponentExternalId && (
                                        <button
                                            className="menu-item"
                                            onClick={() => {
                                                hapticPatterns.tap();
                                                window.open(`https://www.lzvcup.be/teams/detail/${opponentExternalId}`, '_blank');
                                                setShowMenu(false);
                                            }}
                                        >
                                            <ExternalLink size={16} style={{ color: 'var(--text-2)' }} />
                                            View opponent on LZV Cup
                                        </button>
                                    )}
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>

                    {/* Full Screen Image Overlay */}
                    <AnimatePresence>
                        {showImage && opponentData?.imageBase64 && (
                            <motion.div
                                className="backdrop flex-center"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => {
                                    hapticPatterns.tap();
                                    setShowImage(false);
                                }}
                                style={{ zIndex: 10026, padding: 20 }}
                            >
                                <motion.img
                                    initial={{ scale: 0.9 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 0.9 }}
                                    src={opponentData.imageBase64}
                                    alt={opponentTeam || 'Opponent'}
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '80vh',
                                        borderRadius: 'var(--r-lg)',
                                        objectFit: 'contain',
                                    }}
                                />
                                <button
                                    className="icon-action press"
                                    onClick={() => {
                                        hapticPatterns.tap();
                                        setShowImage(false);
                                    }}
                                    aria-label="Close image"
                                    style={{ position: 'absolute', top: 'calc(var(--safe-top) + 16px)', right: 16 }}
                                >
                                    <X size={16} />
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
