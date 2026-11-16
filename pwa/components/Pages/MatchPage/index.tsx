'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, MapPin, Calendar, MoreHorizontal, ExternalLink, X, Shield, UserCheck, Flag } from 'lucide-react';
import { hapticPatterns } from '@/lib/haptic';
import { isSameTeamName } from '@/lib/teamNameMatching';
import { formatMatchDate, formatTimeSafe } from '@/lib/dateUtils';
import type { Match } from '@/lib/mockData';
import type { RosterPlayer, StatusGroup } from '../../MatchBoard/types';
import { useOpponentTeamData } from './useOpponentTeamData';
import { ResponsePicker, SegmentedControl } from '../../ui/controls';
import GlassMenu from '../../ui/GlassMenu';
import { pageZIndex, useBackClose, useNavLevel } from '@/lib/navHistory';
import type { AttendanceStatus } from '../../MatchBoard/types';
import SquadView from './SquadView';
import OpponentView from './OpponentView';
import { MatchScoreboard } from '../../MatchBoard/MatchResult';
import MotmVoteSection from '../../Motm/MotmVoteSection';
import AwayChip from '../../Absences/AwayChip';

interface MatchPageProps {
    match: Match;
    dateObj: Date;
    roster: RosterPlayer[];
    currentPlayerId: number;
    /** Finished matches drop the opponent scouting tab and show the final score. */
    isFinished?: boolean;
    open: boolean;
    onClose: () => void;
    /** Tab to show when the page opens (kept in the URL by the caller). */
    initialTab?: MatchTab;
    onTabChange?: (tab: MatchTab) => void;
    /** The current player's response control; omitted for finished/forfait matches. */
    onRespond?: (status: AttendanceStatus) => void;
    respondUpdating?: AttendanceStatus | null;
    /** Pulse the response control once (opened from a reminder). */
    highlightResponse?: boolean;
    onOpenTeam?: (lzvTeamId: number) => void;
    onOpenPlayer?: (playerId: number) => void;
    /** Captain tools for this match, shown in the ⋯ menu. */
    captainActions?: {
        onRespondForPlayers: () => void;
        onToggleForfait: () => void;
        forfaitBusy?: boolean;
    };
}

export type MatchTab = 'squad' | 'opponent';
const modalTabs = ['squad', 'opponent'] as const;

export default function MatchPage({
    match,
    dateObj,
    roster,
    currentPlayerId,
    isFinished = false,
    open,
    onClose,
    initialTab = 'squad',
    onTabChange,
    onRespond,
    respondUpdating = null,
    highlightResponse = false,
    onOpenTeam,
    onOpenPlayer,
    captainActions,
}: MatchPageProps) {
    const level = useNavLevel();
    const zBase = pageZIndex(level);
    const startTab: MatchTab = isFinished ? 'squad' : initialTab;
    const [activeTab, setActiveTab] = useState<MatchTab>(startTab);
    const [showImage, setShowImage] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const lastTabRef = useRef<MatchTab>(startTab);
    const onTabChangeRef = useRef(onTabChange);
    useEffect(() => {
        onTabChangeRef.current = onTabChange;
    }, [onTabChange]);
    const selectTab = useCallback((tab: MatchTab) => {
        lastTabRef.current = tab;
        setActiveTab(tab);
        onTabChangeRef.current?.(tab);
    }, []);

    useBackClose(open && showMenu, () => setShowMenu(false));
    // Set while a tab tap drives a smooth scroll, so the in-between scroll
    // positions aren't mistaken for a swipe back to the previous tab.
    const programmaticScrollRef = useRef<number | null>(null);

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
            if (Math.abs(scrollRef.current.scrollLeft - left) > 1) {
                programmaticScrollRef.current = left;
                // Fallback in case the scroll never lands exactly on target.
                window.setTimeout(() => {
                    if (programmaticScrollRef.current === left) programmaticScrollRef.current = null;
                }, 1000);
            }
            scrollRef.current.scrollTo({ left, behavior: 'smooth' });
        }
    }, []);

    const handleScroll = useCallback(() => {
        const target = programmaticScrollRef.current;
        if (target !== null && scrollRef.current) {
            if (Math.abs(scrollRef.current.scrollLeft - target) <= 1) {
                programmaticScrollRef.current = null;
            }
            return;
        }

        const nextTab = getTabFromScroll();

        if (nextTab !== lastTabRef.current) {
            hapticPatterns.swipe();
            selectTab(nextTab);
        }
    }, [getTabFromScroll, selectTab]);

    // Reset tab state when the page opens so indicator and content stay aligned.
    // Deliberately keyed on `open` only: later tab changes come from the user.
    useEffect(() => {
        if (open) {
            setActiveTab(startTab);
            setShowMenu(false);
            lastTabRef.current = startTab;
            programmaticScrollRef.current = null;
            const el = scrollRef.current;
            if (el) {
                el.style.scrollBehavior = 'auto';
                el.scrollLeft = startTab === 'opponent' ? el.clientWidth : 0;
                el.style.scrollBehavior = '';
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // Squad data
    const present = roster.filter(p => p.status === 'Present');
    const maybe = roster.filter(p => p.status === 'Maybe');
    const absent = roster.filter(p => p.status === 'NotPresent');
    const unknown = roster.filter(p => p.status === 'Unknown');

    const statusGroups: StatusGroup[] = [
        { title: isFinished ? 'Present' : 'Coming', players: present, color: 'var(--ok)' },
        { title: 'Maybe', players: maybe, color: 'var(--warn)' },
        { title: isFinished ? 'Absent' : 'Not coming', players: absent, color: 'var(--no)' },
        { title: 'No response', players: unknown, color: 'var(--tbd)' },
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
        matchId: match.id,
        opponentTeam,
        ownTeam,
        open,
        enabled: activeTab === 'opponent',
        knownOpponentId: match.opponentLzvId ?? null,
    });

    const imageOpen = open && showImage && !!opponentData?.imageBase64;
    useBackClose(imageOpen, () => setShowImage(false));
    const openOpponentTeam = onOpenTeam && opponentExternalId
        ? () => onOpenTeam(opponentExternalId)
        : undefined;
    const myResponse = (roster.find(p => p.id === currentPlayerId)?.status || 'Unknown') as AttendanceStatus | 'Unknown';

    if (typeof document === 'undefined') return null;

    // Details data
    const mapUrl = match.location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(match.location)}` : null;
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(calendarTitle)}&dates=${dateObj.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${new Date(dateObj.getTime() + 2 * 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0]}Z&location=${encodeURIComponent(match.location || '')}`;

    const showResponseDock = Boolean(onRespond) && !isFinished && !match.forfait;

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
                    data-has-dock={showResponseDock || undefined}
                    style={{ zIndex: zBase }}
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
                                        fontWeight: 600,
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
                        {!isFinished && (
                            <div className="flow-header-tabs">
                                <SegmentedControl
                                    pagerRef={scrollRef}
                                    aria-label="Match views"
                                    value={activeTab}
                                    onChange={(tab) => {
                                        hapticPatterns.tap();
                                        selectTab(tab);
                                        scrollToView(tab);
                                    }}
                                    options={modalTabs.map((tab) => ({
                                        value: tab,
                                        label: (
                                            <>
                                                {tab === 'squad' ? 'Squad' : 'Opponent'}
                                                {tab === 'squad' && present.length > 0 && (
                                                    <span className="t-num seg-count">{present.length}</span>
                                                )}
                                            </>
                                        ),
                                    }))}
                                />
                            </div>
                        )}
                    </div>

                    {/* Scrollable Container */}
                    <div
                        ref={scrollRef}
                        onScroll={handleScroll}
                        onTouchStart={() => {
                            // A manual swipe takes over from any tap-driven scroll.
                            programmaticScrollRef.current = null;
                        }}
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
                                {isFinished && match.result && teams.length === 2 && (
                                    <MatchScoreboard result={match.result} homeTeam={teams[0]} awayTeam={teams[1]} />
                                )}
                                {isFinished && (
                                    <MotmVoteSection match={match} roster={roster} currentPlayerId={currentPlayerId} />
                                )}
                                                                {match.forfait ? (
                                    <div className="panel" style={{ padding: '12px 14px', marginBottom: 'var(--sp-5)', display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <span className="forfait-badge">Forfait</span>
                                        <span className="t-caption">This match will not be played.</span>
                                    </div>
                                ) : null}
                                <SquadView statusGroups={statusGroups} currentPlayerId={currentPlayerId} onOpenPlayer={onOpenPlayer} />
                            </div>
                        </div>

                        {/* Opponent View */}
                        {!isFinished && (
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
                                        onOpenTeam={openOpponentTeam}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Your response: docked at the bottom, in thumb reach on both tabs */}
                    {showResponseDock && onRespond && (
                        <ResponsePicker
                            status={myResponse}
                            updating={respondUpdating}
                            onSelect={onRespond}
                            highlight={highlightResponse}
                            note={roster.find(p => p.id === currentPlayerId)?.away ? <AwayChip label="Away period" /> : undefined}
                        />
                    )}

                    {/* More menu (Directions / Add to Calendar / View opponent on LZV Cup) */}
                    <GlassMenu open={showMenu} zIndex={zBase + 4} onDismiss={() => setShowMenu(false)}>
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
                        {openOpponentTeam && (
                            <button
                                className="menu-item"
                                onClick={() => {
                                    hapticPatterns.tap();
                                    setShowMenu(false);
                                    openOpponentTeam();
                                }}
                            >
                                <Shield size={16} style={{ color: 'var(--text-2)' }} />
                                Opponent team page
                            </button>
                        )}
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
                        {captainActions && (
                            <>
                                <div
                                    className="t-caption"
                                    role="presentation"
                                    style={{
                                        padding: '8px var(--sp-3) 4px',
                                        borderTop: '1px solid var(--separator)',
                                        marginTop: 4,
                                    }}
                                >
                                    Captain
                                </div>
                                <button
                                    className="menu-item"
                                    onClick={() => {
                                        hapticPatterns.tap();
                                        setShowMenu(false);
                                        captainActions.onRespondForPlayers();
                                    }}
                                >
                                    <UserCheck size={16} style={{ color: 'var(--text-2)' }} />
                                    Respond for players
                                </button>
                                <button
                                    className="menu-item"
                                    disabled={captainActions.forfaitBusy}
                                    onClick={() => {
                                        hapticPatterns.tap();
                                        setShowMenu(false);
                                        captainActions.onToggleForfait();
                                    }}
                                    style={match.forfait ? undefined : { color: 'var(--no)' }}
                                >
                                    <Flag size={16} style={{ color: match.forfait ? 'var(--text-2)' : 'var(--no)' }} />
                                    {match.forfait ? 'Undo forfait' : 'Mark as forfait'}
                                </button>
                            </>
                        )}
                    </GlassMenu>

                    {/* Full Screen Image Overlay */}
                    <AnimatePresence>
                        {imageOpen && opponentData?.imageBase64 && (
                            <motion.div
                                className="backdrop flex-center"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => {
                                    hapticPatterns.tap();
                                    setShowImage(false);
                                }}
                                style={{ zIndex: zBase + 6, padding: 20 }}
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
