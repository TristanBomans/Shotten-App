'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Database, Wifi, WifiOff, Settings, Bell, Smartphone, Info, ChevronRight, RefreshCw, Users, UserCog, Trophy, Palette } from 'lucide-react';
import { getUseMockData, setUseMockData, fetchAllScraperTeams } from '@/lib/useData';
import { hapticPatterns } from '@/lib/haptic';
import { useVersionChecker } from './VersionChecker';
import VersionChecker from './VersionChecker';
import PlayerManagementSheet from './PlayerManagementSheet';
import Link from 'next/link';

interface SettingsViewProps {
    onLogout: () => void;
    onPlayerManagementOpenChange?: (isOpen: boolean) => void;
}

export default function SettingsView({ onLogout, onPlayerManagementOpenChange }: SettingsViewProps) {
    const [useMock, setUseMock] = useState(true);
    const [isLocalhost, setIsLocalhost] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [hapticFeedback, setHapticFeedback] = useState(true);
    const [showFullNames, setShowFullNames] = useState(true);
    const [isPlayerManagementOpen, setIsPlayerManagementOpen] = useState(false);
    const [defaultLeague, setDefaultLeague] = useState<string>('');
    const [leagues, setLeagues] = useState<string[]>([]);
    const [showLeagueSelector, setShowLeagueSelector] = useState(false);
    const [theme, setTheme] = useState<string>('original');
    const [showThemeSelector, setShowThemeSelector] = useState(false);
    const { hasUpdate, updateApp, isChecking } = useVersionChecker();

    useEffect(() => {
        setUseMock(getUseMockData());
        setIsLocalhost(
            typeof window !== 'undefined' &&
            (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        );
        const notifPref = localStorage.getItem('notificationsEnabled');
        setNotificationsEnabled(notifPref === 'true');
        const hapticPref = localStorage.getItem('hapticFeedback');
        setHapticFeedback(hapticPref !== 'false');
        const fullNamesPref = localStorage.getItem('showFullNames');
        setShowFullNames(fullNamesPref === null ? true : fullNamesPref === 'true');
        const savedLeague = localStorage.getItem('defaultLeague');
        if (savedLeague) setDefaultLeague(savedLeague);
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) setTheme(savedTheme);

        // Fetch leagues for the selector
        const loadLeagues = async () => {
            try {
                const teams = await fetchAllScraperTeams();
                const unique = Array.from(new Set(teams.map(t => t.leagueName).filter(Boolean))) as string[];
                setLeagues(unique.sort());
            } catch {
                console.warn('Failed to load leagues for settings');
            }
        };
        loadLeagues();
    }, []);

    useEffect(() => {
        onPlayerManagementOpenChange?.(isPlayerManagementOpen);
    }, [isPlayerManagementOpen, onPlayerManagementOpenChange]);

    const handleToggleMock = () => {
        hapticPatterns.toggle();
        const newValue = !useMock;
        setUseMock(newValue);
        setUseMockData(newValue);
    };

    const handleToggleNotifications = async () => {
        hapticPatterns.toggle();
        if (!notificationsEnabled && 'Notification' in window) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                setNotificationsEnabled(true);
                localStorage.setItem('notificationsEnabled', 'true');
            }
        } else {
            setNotificationsEnabled(!notificationsEnabled);
            localStorage.setItem('notificationsEnabled', (!notificationsEnabled).toString());
        }
    };

    const handleToggleHaptic = () => {
        const newValue = !hapticFeedback;
        setHapticFeedback(newValue);
        localStorage.setItem('hapticFeedback', newValue.toString());
        // Trigger test haptic using our utility
        if (newValue) {
            hapticPatterns.toggle();
        }
    };

    const handleToggleFullNames = () => {
        hapticPatterns.toggle();
        const newValue = !showFullNames;
        setShowFullNames(newValue);
        localStorage.setItem('showFullNames', newValue.toString());

        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent('showFullNamesChanged', { detail: newValue }));
    };

    const handleSelectLeague = (league: string) => {
        hapticPatterns.tap();
        setDefaultLeague(league);
        localStorage.setItem('defaultLeague', league);
        setShowLeagueSelector(false);
        // Dispatch event to notify LeagueView
        window.dispatchEvent(new CustomEvent('defaultLeagueChanged', { detail: league }));
    };

    const handleClearDefaultLeague = () => {
        hapticPatterns.tap();
        setDefaultLeague('');
        localStorage.removeItem('defaultLeague');
        setShowLeagueSelector(false);
        window.dispatchEvent(new CustomEvent('defaultLeagueChanged', { detail: null }));
    };

    const handleSelectTheme = (newTheme: string) => {
        hapticPatterns.tap();
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        // Update meta theme-color
        const themeColors: Record<string, string> = {
            original: '#050508',
            oled: '#000000',
            white: '#ffffff'
        };
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
            meta.setAttribute('content', themeColors[newTheme]);
        }
        // Dispatch custom event for other components
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: newTheme }));
        setShowThemeSelector(false);
    };

    const themeLabels: Record<string, string> = {
        original: 'Original (Purple)',
        oled: 'OLED Black',
        white: 'White'
    };

    return (
        <div className="container">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                {/* Header */}
                <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            marginBottom: 8,
                        }}>
                            <Settings size={16} style={{ color: 'var(--color-accent)' }} />
                            <span style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: 'var(--color-accent)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                            }}>
                                Preferences
                            </span>
                        </div>
                        <h1 style={{
                            fontSize: '1.75rem',
                            fontWeight: 700,
                            color: 'var(--color-text-primary)',
                            margin: 0,
                        }}>
                            Settings
                        </h1>
                    </div>
                    <VersionChecker />
                </div>

                {/* Notifications & Feedback */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    style={{
                        background: 'var(--color-surface)',
                        backdropFilter: 'blur(40px)',
                        WebkitBackdropFilter: 'blur(40px)',
                        borderRadius: 20,
                        border: '0.5px solid var(--color-border)',
                        overflow: 'hidden',
                        marginBottom: 16,
                    }}
                >
                    {/* Notifications Toggle - Disabled until future update */}
                    <div style={{ opacity: 0.5, pointerEvents: 'none' }}>
                        <SettingRow
                            icon={<Bell size={20} />}
                            iconBg="rgb(var(--color-warning-rgb) / 0.15)"
                            iconColor="var(--color-warning)"
                            title="Notifications"
                            subtitle="Coming in future update"
                            toggle
                            toggleValue={false}
                            onToggle={() => {}}
                            hasBorder
                        />
                    </div>

                    {/* Haptic Feedback */}
                    <SettingRow
                        icon={<Smartphone size={20} />}
                        iconBg="rgb(var(--color-accent-rgb) / 0.15)"
                        iconColor="var(--color-accent)"
                        title="Haptic Feedback"
                        subtitle="Vibration on actions"
                        toggle
                        toggleValue={hapticFeedback}
                        onToggle={handleToggleHaptic}
                        hasBorder
                    />

                    {/* Show Full Names */}
                    <SettingRow
                        icon={<Users size={20} />}
                        iconBg="rgb(var(--color-accent-rgb) / 0.15)"
                        iconColor="var(--color-accent)"
                        title="Show Full Names"
                        subtitle={showFullNames ? 'Names visible on cards' : 'Avatars only'}
                        toggle
                        toggleValue={showFullNames}
                        onToggle={handleToggleFullNames}
                        hasBorder
                    />

                    {/* Appearance / Theme */}
                    <motion.div
                        onClick={() => {
                            hapticPatterns.tap();
                            setShowThemeSelector(true);
                        }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                            padding: 16,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            cursor: 'pointer',
                        }}
                    >
                        <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            background: 'rgb(var(--color-accent-rgb) / 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--color-accent)',
                            flexShrink: 0,
                        }}>
                            <Palette size={20} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--color-text-primary)' }}>Appearance</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                                {themeLabels[theme]}
                            </div>
                        </div>
                        <ChevronRight size={18} style={{ color: 'var(--color-text-tertiary)' }} />
                    </motion.div>
                </motion.div>

                {/* Default League */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.11 }}
                    style={{
                        background: 'var(--color-surface)',
                        backdropFilter: 'blur(40px)',
                        WebkitBackdropFilter: 'blur(40px)',
                        borderRadius: 20,
                        border: '0.5px solid var(--color-border)',
                        overflow: 'hidden',
                        marginBottom: 16,
                    }}
                >
                    <motion.div
                        onClick={() => {
                            hapticPatterns.tap();
                            setShowLeagueSelector(true);
                        }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                            padding: 16,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            cursor: 'pointer',
                        }}
                    >
                        <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            background: 'rgb(var(--color-warning-rgb) / 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--color-warning)',
                            flexShrink: 0,
                        }}>
                            <Trophy size={20} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--color-text-primary)' }}>Default League</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                                {defaultLeague || 'Auto-select (Mechelen preferred)'}
                            </div>
                        </div>
                        <ChevronRight size={18} style={{ color: 'var(--color-text-tertiary)' }} />
                    </motion.div>
                </motion.div>

                {/* Player Management */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.12 }}
                    style={{
                        background: 'var(--color-surface)',
                        backdropFilter: 'blur(40px)',
                        WebkitBackdropFilter: 'blur(40px)',
                        borderRadius: 20,
                        border: '0.5px solid var(--color-border)',
                        overflow: 'hidden',
                        marginBottom: 16,
                    }}
                >
                    <motion.div
                        onClick={() => {
                            hapticPatterns.tap();
                            setIsPlayerManagementOpen(true);
                        }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                            padding: 16,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            cursor: 'pointer',
                        }}
                    >
                        <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            background: 'rgb(var(--color-success-rgb) / 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--color-success)',
                            flexShrink: 0,
                        }}>
                            <UserCog size={20} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--color-text-primary)' }}>Manage Players</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                                Add, edit or remove players
                            </div>
                        </div>
                        <ChevronRight size={18} style={{ color: 'var(--color-text-tertiary)' }} />
                    </motion.div>
                </motion.div>

                {/* Developer Settings - Only on localhost */}
                {isLocalhost && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.15 }}
                        style={{
                            background: 'var(--color-surface)',
                            backdropFilter: 'blur(40px)',
                            WebkitBackdropFilter: 'blur(40px)',
                            borderRadius: 20,
                            border: '0.5px solid var(--color-border)',
                            overflow: 'hidden',
                            marginBottom: 16,
                        }}
                    >
                        <div style={{
                            padding: '12px 16px 8px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            color: 'var(--color-text-tertiary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                        }}>
                            Developer
                        </div>

                        {/* Data Source Toggle */}
                        <SettingRow
                            icon={useMock ? <Database size={20} /> : <Wifi size={20} />}
                            iconBg={useMock ? 'rgb(var(--color-warning-rgb) / 0.15)' : 'rgb(var(--color-success-rgb) / 0.15)'}
                            iconColor={useMock ? 'var(--color-warning)' : 'var(--color-success)'}
                            title="Data Source"
                            subtitle={useMock ? 'Mock data' : 'Live backend'}
                            toggle
                            toggleValue={!useMock}
                            toggleColor={useMock ? 'var(--color-warning)' : 'var(--color-success)'}
                            onToggle={handleToggleMock}
                            hasBorder
                        />

                        {/* Connection Status */}
                        <SettingRow
                            icon={useMock ? <WifiOff size={20} /> : <Wifi size={20} />}
                            iconBg={useMock ? 'rgb(var(--color-danger-rgb) / 0.15)' : 'rgb(var(--color-success-rgb) / 0.15)'}
                            iconColor={useMock ? 'var(--color-danger)' : 'var(--color-success)'}
                            title="Backend Status"
                            subtitle={useMock ? 'Offline' : 'Connected'}
                        />
                    </motion.div>
                )}

                {/* About Section */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    style={{
                        background: 'var(--color-surface)',
                        backdropFilter: 'blur(40px)',
                        WebkitBackdropFilter: 'blur(40px)',
                        borderRadius: 20,
                        border: '0.5px solid var(--color-border)',
                        overflow: 'hidden',
                        marginBottom: 16,
                    }}
                >
                    <VersionRow
                        icon={<Info size={20} />}
                        iconBg="rgb(var(--color-accent-rgb) / 0.15)"
                        iconColor="var(--color-accent)"
                        title="About Shotten"
                        hasUpdate={hasUpdate}
                        onUpdate={updateApp}
                        isChecking={isChecking}
                    />
                    <Link href="/version/?from=settings" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <VersionInfoRow
                            icon={<RefreshCw size={18} />}
                            iconBg="var(--color-surface-hover)"
                            iconColor="var(--color-text-tertiary)"
                            label="Version Details"
                            value="View build info"
                            hasChevron
                        />
                    </Link>
                </motion.div>

                {/* Account Section */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25 }}
                    style={{
                        background: 'var(--color-surface)',
                        backdropFilter: 'blur(40px)',
                        WebkitBackdropFilter: 'blur(40px)',
                        borderRadius: 20,
                        border: '0.5px solid var(--color-border)',
                        overflow: 'hidden',
                    }}
                >
                    <motion.button
                        onClick={() => {
                            hapticPatterns.tap();
                            onLogout();
                        }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                            width: '100%',
                            padding: 16,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                        }}
                    >
                        <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            background: 'rgb(var(--color-danger-rgb) / 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--color-danger)',
                            flexShrink: 0,
                        }}>
                            <LogOut size={20} />
                        </div>
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--color-danger)' }}>Sign Out</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                                Switch to a different player
                            </div>
                        </div>
                    </motion.button>
                </motion.div>
            </motion.div>

            {/* League Selector Modal */}
            <AnimatePresence>
                {showLeagueSelector && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowLeagueSelector(false)}
                            style={{
                                position: 'fixed',
                                inset: 0,
                                background: 'var(--color-overlay)',
                                backdropFilter: 'blur(10px)',
                                zIndex: 10000,
                            }}
                        />
                        <div style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 10001,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 20,
                            pointerEvents: 'none',
                        }}>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                style={{
                                    width: '100%',
                                    maxWidth: 320,
                                    maxHeight: '70vh',
                                    background: 'var(--color-surface)',
                                    backdropFilter: 'blur(40px)',
                                    WebkitBackdropFilter: 'blur(40px)',
                                    borderRadius: 20,
                                    padding: 20,
                                    border: '0.5px solid var(--color-border)',
                                    pointerEvents: 'auto',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    flexDirection: 'column',
                                }}
                            >
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: 16,
                                }}>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                                        Select Default League
                                    </div>
                                    <button
                                        onClick={() => setShowLeagueSelector(false)}
                                        style={{
                                            background: 'var(--color-surface-hover)',
                                            border: 'none',
                                            borderRadius: '50%',
                                            width: 30,
                                            height: 30,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'var(--color-text-secondary)',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>

                                <div style={{
                                    overflowY: 'auto',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 8,
                                }}>
                                    {/* Auto option */}
                                    <motion.button
                                        onClick={handleClearDefaultLeague}
                                        whileTap={{ scale: 0.98 }}
                                        style={{
                                            padding: '14px 16px',
                                            background: defaultLeague === '' ? 'rgb(var(--color-warning-rgb) / 0.15)' : 'var(--color-surface-hover)',
                                            border: `1px solid ${defaultLeague === '' ? 'rgb(var(--color-warning-rgb) / 0.3)' : 'var(--color-border)'}`,
                                            borderRadius: 12,
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                        }}
                                    >
                                        <div style={{ fontWeight: 600, color: defaultLeague === '' ? 'var(--color-warning)' : 'var(--color-text-primary)' }}>
                                            Auto-select
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                                            Prefer Mechelen if available
                                        </div>
                                    </motion.button>

                                    {leagues.map((league) => (
                                        <motion.button
                                            key={league}
                                            onClick={() => handleSelectLeague(league)}
                                            whileTap={{ scale: 0.98 }}
                                            style={{
                                                padding: '14px 16px',
                                                background: defaultLeague === league ? 'rgb(var(--color-accent-rgb) / 0.15)' : 'var(--color-surface-hover)',
                                                border: `1px solid ${defaultLeague === league ? 'rgb(var(--color-accent-rgb) / 0.3)' : 'var(--color-border)'}`,
                                                borderRadius: 12,
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                            }}
                                        >
                                            <div style={{
                                                fontWeight: 600,
                                                color: defaultLeague === league ? 'var(--color-accent)' : 'var(--color-text-primary)',
                                                fontSize: '0.95rem',
                                            }}>
                                                {league}
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>

            {/* Theme Selector Modal */}
            <AnimatePresence>
                {showThemeSelector && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowThemeSelector(false)}
                            style={{
                                position: 'fixed',
                                inset: 0,
                                background: 'var(--color-overlay)',
                                backdropFilter: 'blur(10px)',
                                zIndex: 10000,
                            }}
                        />
                        <div style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 10001,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 20,
                            pointerEvents: 'none',
                        }}>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                style={{
                                    width: '100%',
                                    maxWidth: 320,
                                    background: 'var(--color-surface)',
                                    backdropFilter: 'blur(40px)',
                                    WebkitBackdropFilter: 'blur(40px)',
                                    borderRadius: 20,
                                    padding: 20,
                                    border: '1px solid var(--color-border)',
                                    pointerEvents: 'auto',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    flexDirection: 'column',
                                }}
                            >
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: 16,
                                }}>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                                        Select Theme
                                    </div>
                                    <button
                                        onClick={() => setShowThemeSelector(false)}
                                        style={{
                                            background: 'var(--color-surface-hover)',
                                            border: 'none',
                                            borderRadius: '50%',
                                            width: 30,
                                            height: 30,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'var(--color-text-secondary)',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>

                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 12,
                                }}>
                                    {/* Original Theme */}
                                    <motion.button
                                        onClick={() => handleSelectTheme('original')}
                                        whileTap={{ scale: 0.98 }}
                                        style={{
                                            padding: 16,
                                            background: theme === 'original' ? 'rgb(var(--color-accent-rgb) / 0.15)' : 'var(--color-surface-hover)',
                                            border: `1px solid ${theme === 'original' ? 'rgb(var(--color-accent-rgb) / 0.3)' : 'var(--color-border)'}`,
                                            borderRadius: 12,
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 12,
                                        }}
                                    >
                                        <div style={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: 10,
                                            background: '#050508',
                                            border: '1px solid rgba(255, 255, 255, 0.12)',
                                            position: 'relative',
                                            overflow: 'hidden',
                                        }}>
                                            <div style={{
                                                position: 'absolute',
                                                inset: 0,
                                                background: 'radial-gradient(ellipse at 30% 30%, rgba(175, 82, 222, 0.4) 0%, transparent 60%)',
                                            }}/>
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, color: theme === 'original' ? 'var(--color-accent)' : 'var(--color-text-primary)' }}>
                                                Original
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                                                Purple ethereal with gradient
                                            </div>
                                        </div>
                                    </motion.button>

                                    {/* OLED Black Theme */}
                                    <motion.button
                                        onClick={() => handleSelectTheme('oled')}
                                        whileTap={{ scale: 0.98 }}
                                        style={{
                                            padding: 16,
                                            background: theme === 'oled' ? 'rgba(10, 132, 255, 0.15)' : 'var(--color-surface-hover)',
                                            border: `1px solid ${theme === 'oled' ? 'rgba(10, 132, 255, 0.3)' : 'var(--color-border)'}`,
                                            borderRadius: 12,
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 12,
                                        }}
                                    >
                                        <div style={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: 10,
                                            background: '#000000',
                                            border: '1px solid #333333',
                                        }}/>
                                        <div>
                                            <div style={{ fontWeight: 600, color: theme === 'oled' ? 'var(--color-accent)' : 'var(--color-text-primary)' }}>
                                                OLED Black
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                                                Pure black for OLED displays
                                            </div>
                                        </div>
                                    </motion.button>

                                    {/* White Theme */}
                                    <motion.button
                                        onClick={() => handleSelectTheme('white')}
                                        whileTap={{ scale: 0.98 }}
                                        style={{
                                            padding: 16,
                                            background: theme === 'white' ? 'rgb(var(--color-accent-rgb) / 0.15)' : 'var(--color-surface-hover)',
                                            border: `1px solid ${theme === 'white' ? 'rgb(var(--color-accent-rgb) / 0.3)' : 'var(--color-border)'}`,
                                            borderRadius: 12,
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 12,
                                        }}
                                    >
                                        <div style={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: 10,
                                            background: '#ffffff',
                                            border: '1px solid var(--color-border)',
                                        }}/>
                                        <div>
                                            <div style={{ fontWeight: 600, color: theme === 'white' ? 'var(--color-accent)' : 'var(--color-text-primary)' }}>
                                                White
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                                                Clean light theme
                                            </div>
                                        </div>
                                    </motion.button>
                                </div>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>

            {/* Player Management Sheet */}
            <PlayerManagementSheet
                isOpen={isPlayerManagementOpen}
                onClose={() => setIsPlayerManagementOpen(false)}
            />
        </div>
    );
}

function SettingRow({
    icon, iconBg, iconColor, title, subtitle, toggle, toggleValue, toggleColor, onToggle, chevron, hasBorder
}: {
    icon: React.ReactNode;
    iconBg: string;
    iconColor: string;
    title: string;
    subtitle: string;
    toggle?: boolean;
    toggleValue?: boolean;
    toggleColor?: string;
    onToggle?: () => void;
    chevron?: boolean;
    hasBorder?: boolean;
}) {
    return (
        <motion.div
            onClick={toggle ? onToggle : undefined}
            whileTap={toggle ? { scale: 0.98 } : undefined}
            style={{
                padding: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                cursor: toggle ? 'pointer' : 'default',
                borderBottom: hasBorder ? '0.5px solid var(--color-border-subtle)' : 'none',
            }}
        >
            <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: iconColor,
                flexShrink: 0,
            }}>
                {icon}
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--color-text-primary)' }}>{title}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{subtitle}</div>
            </div>

            {toggle && (
                <div style={{
                    width: 48,
                    height: 28,
                    borderRadius: 9999,
                    background: toggleValue ? (toggleColor || 'var(--color-success)') : 'var(--color-text-tertiary)',
                    opacity: toggleValue ? 1 : 0.4,
                    padding: 2,
                    flexShrink: 0,
                    transition: 'background 0.2s, opacity 0.2s',
                }}>
                    <motion.div
                        animate={{ x: toggleValue ? 20 : 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: 'var(--color-bg)',
                            boxShadow: '0 2px 4px var(--color-overlay)',
                        }}
                    />
                </div>
            )}

            {chevron && (
                <ChevronRight size={18} style={{ color: 'var(--color-text-tertiary)' }} />
            )}
        </motion.div>
    );
}

function VersionRow({
    icon, iconBg, iconColor, title, hasUpdate, onUpdate, isChecking
}: {
    icon: React.ReactNode;
    iconBg: string;
    iconColor: string;
    title: string;
    hasUpdate: boolean;
    onUpdate: () => void;
    isChecking: boolean;
}) {
    return (
        <div style={{
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
        }}>
            <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: iconColor,
                flexShrink: 0,
            }}>
                {icon}
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--color-text-primary)' }}>{title}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                    {hasUpdate ? 'New version available' : 'Up to date'}
                </div>
            </div>
            {hasUpdate && (
                <motion.button
                    onClick={() => {
                        hapticPatterns.tap();
                        onUpdate();
                    }}
                    disabled={isChecking}
                    whileTap={{ scale: 0.95 }}
                    style={{
                        padding: '8px 16px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: 'var(--color-bg)',
                        background: 'var(--color-success)',
                        border: 'none',
                        borderRadius: 8,
                        cursor: isChecking ? 'wait' : 'pointer',
                        opacity: isChecking ? 0.7 : 1,
                    }}
                >
                    {isChecking ? 'Updating...' : 'Update'}
                </motion.button>
            )}
        </div>
    );
}

function VersionInfoRow({
    icon, iconBg, iconColor, label, value, hasChevron
}: {
    icon: React.ReactNode;
    iconBg: string;
    iconColor: string;
    label: string;
    value: string;
    hasChevron?: boolean;
}) {
    return (
        <motion.div
            style={{
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                borderTop: '0.5px solid var(--color-border-subtle)',
                cursor: 'pointer',
            }}
        >
            <div style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: iconColor,
                flexShrink: 0,
            }}>
                {icon}
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{label}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{value}</div>
            </div>
            {hasChevron && (
                <ChevronRight size={18} style={{ color: 'var(--color-text-tertiary)' }} />
            )}
        </motion.div>
    );
}
