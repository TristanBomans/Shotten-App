'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Calendar } from 'lucide-react';
import { hapticPatterns } from '@/lib/haptic';
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
    onClose: () => void;
}

const OWN_TEAMS = ['FC Degradé', 'Wille ma ni kunne'];

export default function MatchModal({ match, dateObj, roster, currentPlayerId, onClose }: MatchModalProps) {
    const [activeTab, setActiveTab] = useState<'squad' | 'opponent'>('squad');
    const [showImage, setShowImage] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const squadRef = useRef<HTMLDivElement>(null);
    const opponentRef = useRef<HTMLDivElement>(null);

    // Intersection Observer to update tabs on scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries.find((e) => e.isIntersecting);
                if (visible) {
                    const view = visible.target.getAttribute('data-view') as 'squad' | 'opponent';
                    if (view && view !== activeTab) {
                        hapticPatterns.tap();
                        setActiveTab(view);
                    }
                }
            },
            {
                root: scrollRef.current,
                threshold: 0.6,
            }
        );

        if (squadRef.current) observer.observe(squadRef.current);
        if (opponentRef.current) observer.observe(opponentRef.current);

        return () => observer.disconnect();
    }, [activeTab]);

    const scrollToView = (view: 'squad' | 'opponent') => {
        if (scrollRef.current) {
            const left = view === 'squad' ? 0 : scrollRef.current.clientWidth;
            scrollRef.current.scrollTo({ left, behavior: 'smooth' });
        }
    };

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
        t.toLowerCase().includes(own.toLowerCase()) || own.toLowerCase().includes(t.toLowerCase())
    )) || teams[1] || null;
    const ownTeam = teams.find(t => OWN_TEAMS.some(own =>
        t.toLowerCase().includes(own.toLowerCase()) || own.toLowerCase().includes(t.toLowerCase())
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

    const modalContent = (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={(e) => {
                    e.stopPropagation();
                    hapticPatterns.tap();
                    onClose();
                }}
                style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'var(--color-overlay)',
                    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                    zIndex: 10000,
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
                    transition={{ type: 'spring' as const, stiffness: 400, damping: 30 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        width: '100%', maxWidth: 360,
                        height: '90vh', maxHeight: 'calc(100dvh - 60px)',
                        display: 'flex', flexDirection: 'column',
                        pointerEvents: 'auto',
                        background: 'var(--color-surface)',
                        backdropFilter: 'blur(60px)', WebkitBackdropFilter: 'blur(60px)',
                        borderRadius: 24, border: '1px solid var(--color-border)',
                        boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
                    }}
                >
                    {/* Header */}
                    <div style={{
                        padding: '20px 20px 16px',
                        borderBottom: '0.5px solid var(--color-border)',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)', marginBottom: 6 }}>
                                    {match.name.replace(/-/g, ' vs ')}
                                </h2>
                                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                                    {dateObj.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} • {dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                                {match.location && (
                                    <p style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', margin: 0, marginTop: 4 }}>
                                        {match.location}
                                    </p>
                                )}
                            </div>
                            <motion.button
                                onClick={() => {
                                    hapticPatterns.tap();
                                    onClose();
                                }}
                                whileTap={{ scale: 0.9 }}
                                style={{
                                    width: 32, height: 32, borderRadius: 9999, border: 'none',
                                    background: 'var(--color-surface-hover)', color: 'var(--color-text-secondary)',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0,
                                }}
                            >
                                <X size={16} />
                            </motion.button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div style={{
                        display: 'flex', padding: '12px 16px', gap: 8,
                        borderBottom: '0.5px solid var(--color-border)',
                    }}>
                        {(['squad', 'opponent'] as const).map(tab => (
                            <motion.button
                                key={tab}
                                onClick={() => {
                                    hapticPatterns.tap();
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
                                {tab === 'squad' ? `Squad (${present.length + maybe.length})` : 'Opponent'}
                            </motion.button>
                        ))}
                    </div>

                    {/* Scrollable Container */}
                    <div
                        ref={scrollRef}
                        className="scrollbar-hide"
                        style={{
                            display: 'flex',
                            width: '100%',
                            flex: 1,
                            overflowX: 'auto',
                            scrollSnapType: 'x mandatory',
                            scrollBehavior: 'smooth',
                        }}
                    >
                        {/* Squad View */}
                        <div
                            ref={squadRef}
                            data-view="squad"
                            style={{
                                minWidth: '100%',
                                scrollSnapAlign: 'center',
                                scrollSnapStop: 'always',
                                padding: 16,
                                overflowY: 'auto'
                            }}
                        >
                            <SquadView statusGroups={statusGroups} currentPlayerId={currentPlayerId} />
                        </div>

                        {/* Opponent View */}
                        <div
                            ref={opponentRef}
                            data-view="opponent"
                            style={{
                                minWidth: '100%',
                                scrollSnapAlign: 'center',
                                scrollSnapStop: 'always',
                                padding: 16,
                                overflowY: 'auto'
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
                    <div style={{ padding: '12px 16px 16px', borderTop: '0.5px solid var(--color-border)' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {match.location && (
                                <motion.button
                                    onClick={() => window.open(mapUrl!, '_blank')}
                                    whileTap={{ scale: 0.96 }}
                                    style={{
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 6,
                                        padding: '10px 12px',
                                        background: 'var(--color-surface-hover)',
                                        border: '0.5px solid var(--color-border)',
                                        borderRadius: 10,
                                        color: 'var(--color-text-secondary)',
                                        fontSize: '0.8rem',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                    }}
                                >
                                    <MapPin size={14} />
                                    Maps
                                </motion.button>
                            )}
                            <motion.button
                                onClick={() => window.open(calendarUrl, '_blank')}
                                whileTap={{ scale: 0.96 }}
                                style={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                    padding: '10px 12px',
                                    background: 'var(--color-surface-hover)',
                                    border: '0.5px solid var(--color-border)',
                                    borderRadius: 10,
                                    color: 'var(--color-text-secondary)',
                                    fontSize: '0.8rem',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                }}
                            >
                                <Calendar size={14} />
                                Add to Calendar
                            </motion.button>
                        </div>
                    </div>
                </motion.div>
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
                            zIndex: 10002,
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
                            <X size={20} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );

    return createPortal(modalContent, document.body);
}
