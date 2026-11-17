'use client';

import { useEffect, useState, useCallback, useMemo, useRef, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import PlayerSelect from '@/components/PlayerSelect';
import SetupWizard from '@/components/SetupWizard';
import Dashboard from '@/components/Dashboard';
import AppNav from '@/components/ui/AppNav';
import UpdateNotice from '@/components/UpdateNotice';
import { NavContext, type NavApi } from '@/lib/navContext';
import { navBack, navPush, navReplace } from '@/lib/navHistory';
import {
    buildUrl,
    getViewFromParams,
    parseStack,
    sameEntry,
    sameStack,
    type NavEntry,
    type View,
} from '@/lib/navStack';

const readLocation = () => {
    const params = new URLSearchParams(window.location.search);
    return { view: getViewFromParams(params), stack: parseStack(params) };
};

const urlFor = (view: View, stack: NavEntry[]) =>
    buildUrl(window.location.pathname, window.location.search, view, stack);

function HomeContent() {
    // Read once on mount. Safe for hydration: nothing renders from it while `loading` is true.
    const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(() => {
        if (typeof window === 'undefined') return null;
        const stored = localStorage.getItem('selectedPlayerId');
        return stored ? parseInt(stored, 10) : null;
    });
    const [loading, setLoading] = useState(true);
    const [needsSetup, setNeedsSetup] = useState(false);
    const [isPlayerManagementOpen, setIsPlayerManagementOpen] = useState(false);

    const [currentView, setCurrentView] = useState<View>(() =>
        typeof window !== 'undefined' ? readLocation().view : 'home'
    );
    const [stack, setStack] = useState<NavEntry[]>(() =>
        typeof window !== 'undefined' ? readLocation().stack : []
    );

    // Latest values for the stable callbacks below.
    const stackRef = useRef(stack);
    const viewRef = useRef(currentView);
    useEffect(() => {
        stackRef.current = stack;
        viewRef.current = currentView;
    }, [stack, currentView]);

    const applyStack = useCallback((next: NavEntry[]) => {
        stackRef.current = next;
        setStack(next);
    }, []);

    // Check whether the database has been initialized
    useEffect(() => {
        fetch('/api/setup')
            .then((res) => (res.ok ? res.json() : null))
            .then((status) => {
                if (status && (!status.tablesExist || !status.hasTeams)) {
                    setNeedsSetup(true);
                }
            })
            .catch(() => {
                // If the check fails, continue with the normal flow
            })
            .finally(() => setLoading(false));
    }, []);

    // Back / forward: the URL is the source of truth for view and stack.
    useEffect(() => {
        const sync = () => {
            const { view, stack: next } = readLocation();
            setCurrentView((prev) => (prev === view ? prev : view));
            if (!sameStack(stackRef.current, next)) applyStack(next);
        };
        window.addEventListener('popstate', sync);
        return () => window.removeEventListener('popstate', sync);
    }, [applyStack]);

    const push = useCallback((entry: NavEntry) => {
        const current = stackRef.current;
        if (sameEntry(current[current.length - 1], entry)) return;
        const next = [...current, entry];
        applyStack(next);
        navPush(urlFor(viewRef.current, next));
    }, [applyStack]);

    const pop = useCallback(() => {
        const current = stackRef.current;
        if (current.length === 0) return;
        const next = current.slice(0, -1);
        applyStack(next);
        navBack(urlFor(viewRef.current, next));
    }, [applyStack]);

    const replaceTop = useCallback((entry: NavEntry) => {
        const current = stackRef.current;
        if (current.length === 0 || sameEntry(current[current.length - 1], entry)) return;
        const next = [...current.slice(0, -1), entry];
        applyStack(next);
        navReplace(urlFor(viewRef.current, next));
    }, [applyStack]);

    const nav = useMemo<NavApi>(() => ({ stack, push, pop, replaceTop }), [stack, push, pop, replaceTop]);

    const handlePlayerSelect = (id: number) => {
        localStorage.setItem('selectedPlayerId', id.toString());
        setSelectedPlayerId(id);
    };

    const handleLogout = () => {
        localStorage.removeItem('selectedPlayerId');
        setSelectedPlayerId(null);
        setCurrentView('home');
        applyStack([]);

        window.history.replaceState(null, '', window.location.pathname);
    };

    // Switching bottom tabs keeps the history position; it is not a step.
    const handleNavChange = useCallback((view: View) => {
        viewRef.current = view;
        setCurrentView(view);
        navReplace(urlFor(view, stackRef.current));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    useEffect(() => {
        window.scrollTo({ top: 0 });
    }, [selectedPlayerId]);

    if (loading) {
        return (
            <div className="flex-center" style={{ minHeight: '100dvh' }}>
                <div className="spinner" />
            </div>
        );
    }

    return (
        <NavContext.Provider value={nav}>
            <main style={{ overflow: 'hidden' }}>
                <AnimatePresence initial={false} mode="popLayout">
                    {needsSetup ? (
                        <motion.div
                            key="setup"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.35 }}
                        >
                            <SetupWizard onComplete={() => setNeedsSetup(false)} />
                        </motion.div>
                    ) : !selectedPlayerId ? (
                        <motion.div
                            key="player-select"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                            transition={{ duration: 0.35 }}
                        >
                            <PlayerSelect onSelect={handlePlayerSelect} />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="dashboard"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Dashboard
                                playerId={selectedPlayerId}
                                currentView={currentView}
                                onLogout={handleLogout}
                                onViewChange={handleNavChange}
                                onPlayerManagementOpenChange={setIsPlayerManagementOpen}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {selectedPlayerId && !needsSetup && (
                    <UpdateNotice suppressed={stack.length > 0} onOpen={() => push({ kind: 'version' })} />
                )}

                {selectedPlayerId && (
                    <AppNav
                        currentView={currentView}
                        onNavigate={(view) => handleNavChange(view)}
                        isHidden={isPlayerManagementOpen}
                    />
                )}
            </main>
        </NavContext.Provider>
    );
}

export default function Home() {
    return (
        <Suspense
            fallback={(
                <div className="flex-center" style={{ minHeight: '100dvh' }}>
                    <div className="spinner" />
                </div>
            )}
        >
            <HomeContent />
        </Suspense>
    );
}
