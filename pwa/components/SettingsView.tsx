'use client';

import { useState, useEffect } from 'react';
import { Check, LogOut, Database, Wifi, WifiOff, Bell, Smartphone, RefreshCw, Users, UserCog, Trophy, Palette, UserCheck, Flag, User, History } from 'lucide-react';
import { getUseMockData, setUseMockData, fetchAllScraperTeams } from '@/lib/useData';
import { disableMatchPush, enableMatchPush } from '@/lib/pushSettings';
import { isWebPushSupported } from '@/lib/webPushClient';
import { hapticPatterns } from '@/lib/haptic';
import { useVersionChecker } from './VersionChecker';
import PlayerManagementPage from './Pages/PlayerManagementPage';
import VersionHistoryPage from './Pages/VersionHistoryPage';
import HiddenAdminPage from './Pages/HiddenAdminPage';
import RespondAsPlayerPage from './Pages/RespondAsPlayerPage';
import ForfaitMatchesPage from './Pages/ForfaitMatchesPage';
import { ListSection, Row } from './ui/ListSection';
import { Switch } from './ui/controls';
import Sheet from './ui/Sheet';

interface SettingsViewProps {
    onLogout: () => void;
    playerId: number;
    playerName?: string;
    onPlayerManagementOpenChange?: (isOpen: boolean) => void;
    onOpenVersion: () => void;
    isVersionOpen: boolean;
    onCloseVersion: () => void;
    isHiddenAdminUnlocked?: boolean;
    isPlayerManagementOpen?: boolean;
    onOpenPlayerManagement?: () => void;
    onClosePlayerManagement?: () => void;
    isRespondAsPlayerOpen?: boolean;
    onOpenRespondAsPlayer?: () => void;
    onCloseRespondAsPlayer?: () => void;
    isHiddenAdminOpen?: boolean;
    onOpenHiddenAdmin?: () => void;
    onCloseHiddenAdmin?: () => void;
    isForfaitOpen?: boolean;
    onOpenForfait?: () => void;
    onCloseForfait?: () => void;
}

const themeLabels: Record<string, string> = {
    oled: 'OLED Black',
    white: 'White',
};

export default function SettingsView({
    onLogout,
    playerId,
    playerName,
    onPlayerManagementOpenChange,
    onOpenVersion,
    isVersionOpen,
    onCloseVersion,
    isHiddenAdminUnlocked = false,
    isPlayerManagementOpen = false,
    onOpenPlayerManagement,
    onClosePlayerManagement,
    isRespondAsPlayerOpen = false,
    onOpenRespondAsPlayer,
    onCloseRespondAsPlayer,
    isHiddenAdminOpen = false,
    onOpenHiddenAdmin,
    onCloseHiddenAdmin,
    isForfaitOpen = false,
    onOpenForfait,
    onCloseForfait,
}: SettingsViewProps) {
    const [useMock, setUseMock] = useState(true);
    const [isLocalhost, setIsLocalhost] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [notificationsBusy, setNotificationsBusy] = useState(false);
    const [notificationsMessage, setNotificationsMessage] = useState<string | null>(null);
    const [pushSupported, setPushSupported] = useState(true);
    const [hapticFeedback, setHapticFeedback] = useState(true);
    const [showFullNames, setShowFullNames] = useState(true);
    const [showPastMatches, setShowPastMatches] = useState(true);
    const [defaultLeague, setDefaultLeague] = useState<string>('');
    const [leagues, setLeagues] = useState<string[]>([]);
    const [showLeagueSelector, setShowLeagueSelector] = useState(false);
    const [theme, setTheme] = useState<string>('oled');
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
        setPushSupported(isWebPushSupported());
        const hapticPref = localStorage.getItem('hapticFeedback');
        setHapticFeedback(hapticPref !== 'false');
        const fullNamesPref = localStorage.getItem('showFullNames');
        setShowFullNames(fullNamesPref === null ? true : fullNamesPref === 'true');
        const pastMatchesPref = localStorage.getItem('showPastMatches');
        setShowPastMatches(pastMatchesPref === null ? true : pastMatchesPref === 'true');
        const savedLeague = localStorage.getItem('defaultLeague');
        if (savedLeague) setDefaultLeague(savedLeague);
        const savedTheme = localStorage.getItem('theme');
        const resolvedTheme = !savedTheme || savedTheme === 'original' ? 'oled' : savedTheme;
        if (resolvedTheme !== savedTheme) {
            localStorage.setItem('theme', resolvedTheme);
            document.documentElement.setAttribute('data-theme', resolvedTheme);
        }
        setTheme(resolvedTheme);

        // Fetch leagues for the selector (only leagues where our team plays)
        const loadLeagues = async () => {
            try {
                const teams = await fetchAllScraperTeams();
                const ourTeams = teams.filter(t => t.name.toLowerCase().includes('wille ma ni'));
                const ourLeagues = Array.from(new Set(ourTeams.map(t => t.leagueName).filter(Boolean))) as string[];
                const targetLeagues = ourLeagues.length > 0 ? ourLeagues.sort() : [];
                setLeagues(targetLeagues);
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
        if (notificationsBusy) return;
        hapticPatterns.toggle();
        setNotificationsBusy(true);
        setNotificationsMessage(null);
        try {
            if (!notificationsEnabled) {
                const result = await enableMatchPush(playerId);
                setNotificationsEnabled(true);
                localStorage.setItem('notificationsEnabled', 'true');
                setNotificationsMessage(result.message);
            } else {
                const result = await disableMatchPush();
                setNotificationsEnabled(false);
                localStorage.setItem('notificationsEnabled', 'false');
                setNotificationsMessage(result.message);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Could not update notifications.';
            setNotificationsMessage(message);
        } finally {
            setNotificationsBusy(false);
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

    const handleTogglePastMatches = () => {
        hapticPatterns.toggle();
        const newValue = !showPastMatches;
        setShowPastMatches(newValue);
        localStorage.setItem('showPastMatches', newValue.toString());
        window.dispatchEvent(new CustomEvent('showPastMatchesChanged', { detail: newValue }));
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
            oled: '#000000',
            white: '#f2f2f6',
        };
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
            meta.setAttribute('content', themeColors[newTheme]);
        }
        // Dispatch custom event for other components
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: newTheme }));
        setShowThemeSelector(false);
    };

    const notificationsSubtitle = !pushSupported
        ? 'Install Shotten to your home screen first'
        : notificationsBusy
            ? 'Updating…'
            : notificationsMessage
                ? notificationsMessage
                : notificationsEnabled
                    ? 'Attendance and kickoff alerts on this phone'
                    : 'Attendance and kickoff alerts';

    return (
        <div className="screen">
            {/* Preferences */}
            <ListSection label="Preferences">
                <div style={{ opacity: notificationsBusy || !pushSupported ? 0.6 : 1 }}>
                    <Row
                        icon={<Bell size={16} />}
                        iconTone="warn"
                        title="Notifications"
                        subtitle={notificationsSubtitle}
                        trailing={
                            <Switch
                                checked={notificationsEnabled}
                                onChange={() => pushSupported && handleToggleNotifications()}
                                disabled={!pushSupported || notificationsBusy}
                                aria-label="Notifications"
                            />
                        }
                    />
                </div>

                <Row
                    icon={<Smartphone size={16} />}
                    iconTone="accent"
                    title="Haptic Feedback"
                    subtitle="Vibration on actions"
                    trailing={
                        <Switch
                            checked={hapticFeedback}
                            onChange={handleToggleHaptic}
                            aria-label="Haptic feedback"
                        />
                    }
                />

                <Row
                    icon={<Users size={16} />}
                    iconTone="accent"
                    title="Show Full Names"
                    subtitle={showFullNames ? 'Names visible on cards' : 'Compact attendance on cards'}
                    trailing={
                        <Switch
                            checked={showFullNames}
                            onChange={handleToggleFullNames}
                            aria-label="Show full names"
                        />
                    }
                />

                <Row
                    icon={<History size={16} />}
                    iconTone="accent"
                    title="Show Past Matches"
                    subtitle={showPastMatches ? 'History on the board, scrolls to next' : 'Upcoming matches only'}
                    trailing={
                        <Switch
                            checked={showPastMatches}
                            onChange={handleTogglePastMatches}
                            aria-label="Show past matches"
                        />
                    }
                />

                <Row
                    icon={<Palette size={16} />}
                    iconTone="accent"
                    title="Appearance"
                    subtitle={themeLabels[theme]}
                    chevron
                    onClick={() => {
                        hapticPatterns.tap();
                        setShowThemeSelector(true);
                    }}
                />

                {leagues.length > 1 && (
                    <Row
                        icon={<Trophy size={16} />}
                        iconTone="warn"
                        title="Default League"
                        subtitle={defaultLeague || 'Auto-select (Mechelen preferred)'}
                        chevron
                        onClick={() => {
                            hapticPatterns.tap();
                            setShowLeagueSelector(true);
                        }}
                    />
                )}
            </ListSection>

            {/* Management */}
            <ListSection label="Management">
                <Row
                    icon={<UserCheck size={16} />}
                    iconTone="ok"
                    title="Respond as Player"
                    subtitle="Fill in attendance for someone else"
                    chevron
                    onClick={() => {
                        hapticPatterns.tap();
                        onOpenRespondAsPlayer?.();
                    }}
                />
                <Row
                    icon={<UserCog size={16} />}
                    iconTone="ok"
                    title="Manage Players"
                    subtitle="Add, edit or remove players"
                    chevron
                    onClick={() => {
                        hapticPatterns.tap();
                        onOpenPlayerManagement?.();
                    }}
                />
                <Row
                    icon={<Flag size={16} />}
                    iconTone="no"
                    title="Forfait Matches"
                    subtitle="Mark matches as forfait"
                    chevron
                    onClick={() => {
                        hapticPatterns.tap();
                        onOpenForfait?.();
                    }}
                />
                <Row
                    icon={<RefreshCw size={16} />}
                    iconTone="accent"
                    title="Version History"
                    subtitle={hasUpdate ? 'New version available' : 'View changelog and updates'}
                    chevron={!hasUpdate}
                    trailing={
                        hasUpdate ? (
                            <button
                                className="btn btn-primary press"
                                style={{ minHeight: 32, padding: '0 12px', fontSize: 'var(--fs-2xs)' }}
                                disabled={isChecking}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    hapticPatterns.tap();
                                    updateApp();
                                }}
                            >
                                {isChecking ? 'Updating…' : 'Update'}
                            </button>
                        ) : undefined
                    }
                    onClick={() => {
                        hapticPatterns.tap();
                        onOpenVersion();
                    }}
                />
                {isHiddenAdminUnlocked && (
                    <Row
                        icon={<Bell size={16} />}
                        iconTone="accent"
                        title="Hidden Admin"
                        subtitle="Worker dashboard for private network"
                        chevron
                        onClick={() => {
                            hapticPatterns.tap();
                            onOpenHiddenAdmin?.();
                        }}
                    />
                )}
            </ListSection>

            {/* Developer Settings - Only on localhost */}
            {isLocalhost && (
                <ListSection label="Developer">
                    <Row
                        icon={useMock ? <Database size={16} /> : <Wifi size={16} />}
                        iconTone={useMock ? 'warn' : 'ok'}
                        title="Data Source"
                        subtitle={useMock ? 'Mock data' : 'Live backend'}
                        trailing={
                            <Switch
                                checked={!useMock}
                                onChange={handleToggleMock}
                                aria-label="Use live backend"
                            />
                        }
                    />
                    <Row
                        icon={useMock ? <WifiOff size={16} /> : <Wifi size={16} />}
                        iconTone={useMock ? 'no' : 'ok'}
                        title="Backend Status"
                        subtitle={useMock ? 'Offline' : 'Connected'}
                    />
                </ListSection>
            )}

            {/* Account */}
            <ListSection label="Account">
                <Row
                    icon={<User size={16} />}
                    iconTone="accent"
                    title={playerName || 'Player'}
                    subtitle="Signed in on this device"
                />
                <Row
                    icon={<LogOut size={16} />}
                    iconTone="no"
                    title="Sign Out"
                    subtitle="Switch to a different player"
                    destructive
                    onClick={() => {
                        hapticPatterns.tap();
                        onLogout();
                    }}
                />
            </ListSection>

            {/* Default League Selector */}
            <Sheet
                open={showLeagueSelector}
                onClose={() => setShowLeagueSelector(false)}
                title="Default League"
            >
                <div className="list-section" role="listbox" aria-label="Default league">
                    <button
                        className="row"
                        role="option"
                        aria-selected={defaultLeague === ''}
                        onClick={handleClearDefaultLeague}
                    >
                        <span style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ display: 'block', fontWeight: 600, fontSize: 'var(--fs-sm)' }}>
                                Auto-select
                            </span>
                            <span style={{ display: 'block', fontSize: 'var(--fs-2xs)', color: 'var(--text-3)' }}>
                                Prefer Mechelen if available
                            </span>
                        </span>
                        {defaultLeague === '' && <Check size={17} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
                    </button>
                    {leagues.map((league) => (
                        <button
                            key={league}
                            className="row"
                            role="option"
                            aria-selected={defaultLeague === league}
                            onClick={() => handleSelectLeague(league)}
                        >
                            <span style={{ flex: 1, fontWeight: 600, fontSize: 'var(--fs-sm)', textAlign: 'left' }}>
                                {league}
                            </span>
                            {defaultLeague === league && (
                                <Check size={17} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                            )}
                        </button>
                    ))}
                </div>
            </Sheet>

            {/* Theme Selector */}
            <Sheet
                open={showThemeSelector}
                onClose={() => setShowThemeSelector(false)}
                title="Appearance"
            >
                <div className="list-section" role="listbox" aria-label="Theme">
                    {([
                        { id: 'oled', label: 'OLED Black', description: 'Pure black for OLED displays', swatch: '#000000', swatchBorder: 'rgba(255,255,255,0.2)' },
                        { id: 'white', label: 'White', description: 'Clean light theme', swatch: '#ffffff', swatchBorder: 'rgba(0,0,0,0.2)' },
                    ] as const).map((option) => (
                        <button
                            key={option.id}
                            className="row"
                            role="option"
                            aria-selected={theme === option.id}
                            onClick={() => handleSelectTheme(option.id)}
                            style={{ minHeight: 60 }}
                        >
                            <span
                                aria-hidden
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 10,
                                    background: option.swatch,
                                    border: `1px solid ${option.swatchBorder}`,
                                    flexShrink: 0,
                                }}
                            />
                            <span style={{ flex: 1, minWidth: 0 }}>
                                <span style={{ display: 'block', fontWeight: 600, fontSize: 'var(--fs-sm)' }}>
                                    {option.label}
                                </span>
                                <span style={{ display: 'block', fontSize: 'var(--fs-2xs)', color: 'var(--text-3)' }}>
                                    {option.description}
                                </span>
                            </span>
                            {theme === option.id && <Check size={17} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
                        </button>
                    ))}
                </div>
            </Sheet>

            {/* Forfait Matches Page */}
            <ForfaitMatchesPage
                isOpen={isForfaitOpen}
                onClose={() => onCloseForfait?.()}
            />

            {/* Player Management Page */}
            <PlayerManagementPage
                isOpen={isPlayerManagementOpen}
                onClose={() => onClosePlayerManagement?.()}
            />
            <VersionHistoryPage open={isVersionOpen} onClose={onCloseVersion} />
            <HiddenAdminPage open={isHiddenAdminOpen} onClose={() => onCloseHiddenAdmin?.()} />
            <RespondAsPlayerPage
                isOpen={isRespondAsPlayerOpen}
                onClose={() => onCloseRespondAsPlayer?.()}
            />
        </div>
    );
}
