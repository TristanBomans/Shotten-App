'use client';

import { useState, useEffect } from 'react';
import { Check, LogOut, Database, Wifi, WifiOff, Bell, Smartphone, RefreshCw, Users, UserCog, Trophy, Palette, Flag, User, History, Languages, Minimize2 } from 'lucide-react';
import { getUseMockData, setUseMockData, fetchAllScraperTeams } from '@/lib/useData';
import { disableMatchPush, enableMatchPush } from '@/lib/pushSettings';
import { isWebPushSupported } from '@/lib/webPushClient';
import { hapticPatterns } from '@/lib/haptic';
import { formatRelativeTime, useWhatsNew } from '@/lib/whatsNew';
import PlayerManagementPage from './Pages/PlayerManagementPage';
import VersionHistoryPage from './Pages/VersionHistoryPage';
import HiddenAdminPage from './Pages/HiddenAdminPage';
import RespondAsPlayerPage from './Pages/RespondAsPlayerPage';
import ForfaitMatchesPage from './Pages/ForfaitMatchesPage';
import AbsencesSettingsSection from './Absences/AbsencesSettingsSection';
import { INCLUDE_FORFAIT_EVENT, INCLUDE_FORFAIT_STORAGE_KEY } from './StatsView';
import { ListSection, Row } from './ui/ListSection';
import { Switch } from './ui/controls';
import Sheet from './ui/Sheet';
import { useNav } from '@/lib/navContext';
import type { NavEntry, PageKind } from '@/lib/navStack';
import { useLanguage } from '@/lib/i18n';
import { getLanguage, type Language } from '@/lib/language';
import { useReduceMotionPref } from '@/lib/motionSettings';

interface SettingsViewProps {
    onLogout: () => void;
    playerId: number;
    playerName?: string;
    onPlayerManagementOpenChange?: (isOpen: boolean) => void;
    isHiddenAdminUnlocked?: boolean;
}

/** Settings-owned pages: open when anywhere in the stack (legacy `respond` without a match id only). */
const isOpenIn = (stack: NavEntry[], kind: PageKind) =>
    stack.some((entry) => entry.kind === kind && (kind !== 'respond' || !entry.id));

function getVersionSubtitle(
    t: (key: string, vars?: Record<string, string | number>) => string,
    { build, latestDate, unseenCount }: ReturnType<typeof useWhatsNew>,
) {
    if (build === null || !latestDate) return t('set.viewChangelog');
    const updated = t('set.updated', { when: formatRelativeTime(latestDate).toLowerCase() });
    if (unseenCount > 0) {
        return `${updated} · ${t('set.newReleases', { count: unseenCount })}`;
    }
    return t('set.version', { build, when: updated });
}

const themeLabels: Record<string, string> = {
    oled: 'OLED Black',
    white: 'White',
    mistral: 'Mistral',
};

const LANGUAGE_OPTIONS: { id: Language; native: string }[] = [
    { id: 'nl', native: 'Nederlands' },
    { id: 'fr', native: 'Français' },
    { id: 'en', native: 'English' },
];

export default function SettingsView({
    onLogout,
    playerId,
    playerName,
    onPlayerManagementOpenChange,
    isHiddenAdminUnlocked = false,
}: SettingsViewProps) {
    const { stack, push, pop } = useNav();
    const isPlayerManagementOpen = isOpenIn(stack, 'players');
    const isVersionOpen = isOpenIn(stack, 'version');
    const isHiddenAdminOpen = isOpenIn(stack, 'admin');
    const isRespondAsPlayerOpen = isOpenIn(stack, 'respond');
    const isForfaitOpen = isOpenIn(stack, 'forfait');
    const [useMock, setUseMock] = useState(true);
    const [isLocalhost, setIsLocalhost] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [notificationsBusy, setNotificationsBusy] = useState(false);
    const [notificationsMessage, setNotificationsMessage] = useState<string | null>(null);
    const [pushSupported, setPushSupported] = useState(true);
    const [hapticFeedback, setHapticFeedback] = useState(true);
    const [showFullNames, setShowFullNames] = useState(true);
    const [showPastMatches, setShowPastMatches] = useState(true);
    const [includeForfait, setIncludeForfait] = useState(false);
    const [defaultLeague, setDefaultLeague] = useState<string>('');
    const [leagues, setLeagues] = useState<string[]>([]);
    const [showLeagueSelector, setShowLeagueSelector] = useState(false);
    const [theme, setTheme] = useState<string>('oled');
    const [showThemeSelector, setShowThemeSelector] = useState(false);
    const [showLanguageSelector, setShowLanguageSelector] = useState(false);
    const [language, setLanguageState] = useState<Language>('en');
    const whatsNew = useWhatsNew();
    const { t, changeLanguage } = useLanguage();
    const { reduced, setReduceMotion } = useReduceMotionPref();

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
        setIncludeForfait(localStorage.getItem(INCLUDE_FORFAIT_STORAGE_KEY) === 'true');
        const savedLeague = localStorage.getItem('defaultLeague');
        if (savedLeague) setDefaultLeague(savedLeague);
        setLanguageState(getLanguage());
        const savedTheme = localStorage.getItem('theme');
        const resolvedTheme = !savedTheme
            || savedTheme === 'original'
                ? 'oled'
                : savedTheme;
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

    const handleToggleIncludeForfait = () => {
        hapticPatterns.toggle();
        const newValue = !includeForfait;
        setIncludeForfait(newValue);
        localStorage.setItem(INCLUDE_FORFAIT_STORAGE_KEY, newValue.toString());
        window.dispatchEvent(new CustomEvent(INCLUDE_FORFAIT_EVENT, { detail: newValue }));
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

    const handleSelectLanguage = (option: Language) => {
        hapticPatterns.tap();
        setLanguageState(option);
        changeLanguage(option);
        setShowLanguageSelector(false);
    };

    const handleToggleReduceMotion = () => {
        hapticPatterns.toggle();
        setReduceMotion(!reduced);
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
            mistral: '#000000',
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
        ? t('set.installFirst')
        : notificationsBusy
            ? t('set.updating')
            : notificationsMessage
                ? notificationsMessage
                : notificationsEnabled
                    ? t('set.notifOnSub')
                    : t('set.notifOffSub');

    return (
        <div className="screen">
            <AbsencesSettingsSection playerId={playerId} />

            {/* Preferences */}
            <ListSection label={t('set.prefs')}>
                <div style={{ opacity: notificationsBusy || !pushSupported ? 0.6 : 1 }}>
                    <Row
                        icon={<Bell size={16} />}
                        title={t('set.notifications')}
                        subtitle={notificationsSubtitle}
                        trailing={
                            <Switch
                                checked={notificationsEnabled}
                                onChange={() => pushSupported && handleToggleNotifications()}
                                disabled={!pushSupported || notificationsBusy}
                                aria-label={t('set.notifications')}
                            />
                        }
                    />
                </div>

                <Row
                    icon={<Smartphone size={16} />}
                    title={t('set.haptic')}
                    subtitle={t('set.hapticSub')}
                    trailing={
                        <Switch
                            checked={hapticFeedback}
                            onChange={handleToggleHaptic}
                            aria-label={t('set.haptic')}
                        />
                    }
                />

                <Row
                    icon={<Minimize2 size={16} />}
                    title={t('set.reduceMotion')}
                    subtitle={reduced ? t('set.reduceMotionOn') : t('set.reduceMotionOff')}
                    trailing={
                        <Switch
                            checked={reduced}
                            onChange={handleToggleReduceMotion}
                            aria-label={t('set.reduceMotion')}
                        />
                    }
                />

                <Row
                    icon={<Users size={16} />}
                    title={t('set.fullNames')}
                    subtitle={showFullNames ? t('set.fullNamesOn') : t('set.fullNamesOff')}
                    trailing={
                        <Switch
                            checked={showFullNames}
                            onChange={handleToggleFullNames}
                            aria-label={t('set.fullNames')}
                        />
                    }
                />

                <Row
                    icon={<History size={16} />}
                    title={t('set.pastMatches')}
                    subtitle={showPastMatches ? t('set.pastOn') : t('set.pastOff')}
                    trailing={
                        <Switch
                            checked={showPastMatches}
                            onChange={handleTogglePastMatches}
                            aria-label={t('set.pastMatches')}
                        />
                    }
                />

                <Row
                    icon={<Flag size={16} />}
                    title={t('set.forfait')}
                    subtitle={includeForfait ? t('set.forfaitOn') : t('set.forfaitOff')}
                    trailing={
                        <Switch
                            checked={includeForfait}
                            onChange={handleToggleIncludeForfait}
                            aria-label={t('set.forfait')}
                        />
                    }
                />

                <Row
                    icon={<Languages size={16} />}
                    title={t('set.language')}
                    subtitle={LANGUAGE_OPTIONS.find(o => o.id === language)?.native ?? t('set.languageSub')}
                    chevron
                    onClick={() => {
                        hapticPatterns.tap();
                        setShowLanguageSelector(true);
                    }}
                />

                <Row
                    icon={<Palette size={16} />}
                    title={t('set.appearance')}
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
                        title={t('set.league')}
                        subtitle={defaultLeague || `${t('set.leagueAuto')} (${t('set.leagueAutoSub').toLowerCase()})`}
                        chevron
                        onClick={() => {
                            hapticPatterns.tap();
                            setShowLeagueSelector(true);
                        }}
                    />
                )}
            </ListSection>

            {/* Team: per-match captain tools live in each match's ⋯ menu */}
            <ListSection label={t('set.teamSection')}>
                <Row
                    icon={<UserCog size={16} />}
                    title={t('set.managePlayers')}
                    subtitle={t('set.managePlayersSub')}
                    chevron
                    onClick={() => {
                        hapticPatterns.tap();
                        push({ kind: 'players' });
                    }}
                />
            </ListSection>

            {/* App */}
            <ListSection label={t('set.appSection')}>
                <Row
                    icon={<RefreshCw size={16} />}
                    title={t('set.versionHistory')}
                    subtitle={getVersionSubtitle(t, whatsNew)}
                    chevron
                    trailing={
                        whatsNew.unseenCount > 0 ? (
                            <span className="chip" data-tone="accent">{t('set.new')}</span>
                        ) : undefined
                    }
                    onClick={() => {
                        hapticPatterns.tap();
                        push({ kind: 'version' });
                    }}
                />
                {isHiddenAdminUnlocked && (
                    <Row
                        icon={<Bell size={16} />}
                        title={t('set.hiddenAdmin')}
                        subtitle={t('set.hiddenAdminSub')}
                        chevron
                        onClick={() => {
                            hapticPatterns.tap();
                            push({ kind: 'admin' });
                        }}
                    />
                )}
            </ListSection>

            {/* Developer Settings - Only on localhost */}
            {isLocalhost && (
                <ListSection label={t('set.devSection')}>
                    <Row
                        icon={useMock ? <Database size={16} /> : <Wifi size={16} />}
                        title={t('set.dataSource')}
                        subtitle={useMock ? t('set.mockData') : t('set.liveBackend')}
                        trailing={
                            <Switch
                                checked={!useMock}
                                onChange={handleToggleMock}
                                aria-label={t('set.liveBackend')}
                            />
                        }
                    />
                    <Row
                        icon={useMock ? <WifiOff size={16} /> : <Wifi size={16} />}
                        title={t('set.backendStatus')}
                        subtitle={useMock ? t('set.offline') : t('set.connected')}
                    />
                </ListSection>
            )}

            {/* Account */}
            <ListSection label={t('set.accountSection')}>
                <Row
                    icon={<User size={16} />}
                    title={playerName || t('set.player')}
                    subtitle={t('set.signedInSub')}
                />
                <Row
                    icon={<LogOut size={16} />}
                    title={t('set.signOut')}
                    subtitle={t('set.signOutSub')}
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
                title={t('set.league')}
            >
                <div className="list-section" role="listbox" aria-label={t('set.league')}>
                    <button
                        className="row"
                        role="option"
                        aria-selected={defaultLeague === ''}
                        onClick={handleClearDefaultLeague}
                    >
                        <span style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ display: 'block', fontWeight: 600, fontSize: 'var(--fs-sm)' }}>
                                {t('set.leagueAuto')}
                            </span>
                            <span style={{ display: 'block', fontSize: 'var(--fs-2xs)', color: 'var(--text-3)' }}>
                                {t('set.leagueAutoSub')}
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

            {/* Language Selector */}
            <Sheet
                open={showLanguageSelector}
                onClose={() => setShowLanguageSelector(false)}
                title={t('set.language')}
            >
                <div className="list-section" role="listbox" aria-label={t('set.language')}>
                    {LANGUAGE_OPTIONS.map((option) => (
                        <button
                            key={option.id}
                            className="row"
                            role="option"
                            aria-selected={language === option.id}
                            onClick={() => handleSelectLanguage(option.id)}
                            style={{ minHeight: 52 }}
                        >
                            <span style={{ flex: 1, fontWeight: 600, fontSize: 'var(--fs-sm)', textAlign: 'left' }}>
                                {option.native}
                            </span>
                            {language === option.id && (
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
                title={t('set.appearance')}
            >
                <div className="list-section" role="listbox" aria-label={t('set.appearance')}>
                    {([
                        { id: 'oled', label: t('set.oledBlack'), description: t('set.oledDesc'), swatch: '#000000', swatchBorder: 'rgba(255,255,255,0.2)' },
                        { id: 'white', label: t('set.white'), description: t('set.whiteDesc'), swatch: '#ffffff', swatchBorder: 'rgba(0,0,0,0.2)' },
                        { id: 'mistral', label: t('set.mistral'), description: t('set.mistralDesc'), swatch: 'linear-gradient(135deg, #ffd800, #ff8205 55%, #fa500f)', swatchBorder: 'rgba(255,130,5,0.45)' },
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

            {/* Legacy deep links (?modal=forfait / ?modal=respond) still land here. */}
            <ForfaitMatchesPage
                isOpen={isForfaitOpen}
                onClose={pop}
            />

            {/* Player Management Page */}
            <PlayerManagementPage
                isOpen={isPlayerManagementOpen}
                onClose={pop}
            />
            <VersionHistoryPage open={isVersionOpen} onClose={pop} />
            <HiddenAdminPage open={isHiddenAdminOpen} onClose={pop} />
            <RespondAsPlayerPage
                isOpen={isRespondAsPlayerOpen}
                onClose={pop}
            />
        </div>
    );
}
