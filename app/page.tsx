'use client';

import { useEffect, useState, useCallback, Suspense, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import PlayerSelect from '@/components/PlayerSelect';
import Dashboard from '@/components/Dashboard';
import FloatingNav from '@/components/FloatingNav';

type View = 'home' | 'stats' | 'league' | 'settings';
type Modal = 'version' | null;

const views: View[] = ['home', 'stats', 'league', 'settings'];

type SearchParamsLike = {
    get: (name: string) => string | null;
    toString: () => string;
};

const getViewFromParams = (params: SearchParamsLike | null): View => {
    const viewParam = params?.get('view');
    if (viewParam && views.includes(viewParam as View)) {
        return viewParam as View;
    }

    return params?.get('modal') === 'version' ? 'settings' : 'home';
};

const getModalFromParams = (params: SearchParamsLike | null, resolvedView: View): Modal => {
    if (resolvedView !== 'settings') return null;
    return params?.get('modal') === 'version' ? 'version' : null;
};

function HomeContent() {
    const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [isPlayerManagementOpen, setIsPlayerManagementOpen] = useState(false);
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const [currentView, setCurrentView] = useState<View>(() => {
        if (typeof window !== 'undefined') {
            return getViewFromParams(new URLSearchParams(window.location.search));
        }
        return 'home';
    });
    const [currentModal, setCurrentModal] = useState<Modal>(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const resolvedView = getViewFromParams(params);
            return getModalFromParams(params, resolvedView);
        }
        return null;
    });
    const versionModalOpenedFromDashboardRef = useRef(false);

    useEffect(() => {
        const stored = localStorage.getItem('selectedPlayerId');
        if (stored) {
            setSelectedPlayerId(parseInt(stored, 10));
        }

        const resolvedView = getViewFromParams(searchParams);
        const resolvedModal = getModalFromParams(searchParams, resolvedView);

        setCurrentView((prev) => (prev === resolvedView ? prev : resolvedView));
        setCurrentModal((prev) => (prev === resolvedModal ? prev : resolvedModal));
        if (!resolvedModal) {
            versionModalOpenedFromDashboardRef.current = false;
        }

        setLoading(false);
    }, [searchParams]);

    const buildAppUrl = useCallback((view: View, modal: Modal) => {
        const params = new URLSearchParams(searchParams.toString());

        if (view === 'home') {
            params.delete('view');
        } else {
            params.set('view', view);
        }

        if (modal && view === 'settings') {
            params.set('modal', modal);
        } else {
            params.delete('modal');
        }

        const query = params.toString();
        return query ? `${pathname}?${query}` : pathname;
    }, [pathname, searchParams]);

    const handlePlayerSelect = (id: number) => {
        localStorage.setItem('selectedPlayerId', id.toString());
        setSelectedPlayerId(id);
    };

    const handleLogout = () => {
        localStorage.removeItem('selectedPlayerId');
        setSelectedPlayerId(null);
        setCurrentView('home');
        setCurrentModal(null);
        versionModalOpenedFromDashboardRef.current = false;

        // Reset URL when logging out
        router.replace(pathname, { scroll: false });
    };

    const handleNavChange = useCallback((view: View) => {
        setCurrentView(view);
        const nextModal = view === 'settings' ? currentModal : null;
        setCurrentModal(nextModal);
        if (!nextModal) {
            versionModalOpenedFromDashboardRef.current = false;
        }

        router.replace(buildAppUrl(view, nextModal), { scroll: false });

        // Scroll to top on view change
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [buildAppUrl, currentModal, router]);

    const handleOpenVersion = useCallback(() => {
        if (currentModal === 'version') return;

        versionModalOpenedFromDashboardRef.current = true;
        setCurrentView('settings');
        setCurrentModal('version');
        router.push(buildAppUrl('settings', 'version'), { scroll: false });
    }, [buildAppUrl, currentModal, router]);

    const handleCloseVersion = useCallback(() => {
        if (currentModal !== 'version') return;

        setCurrentModal(null);

        if (versionModalOpenedFromDashboardRef.current && typeof window !== 'undefined' && window.history.length > 1) {
            versionModalOpenedFromDashboardRef.current = false;
            router.back();
            return;
        }

        router.replace(buildAppUrl('settings', null), { scroll: false });
    }, [buildAppUrl, currentModal, router]);

    // Scroll to top on initial load
    useEffect(() => {
        window.scrollTo({ top: 0 });
    }, [selectedPlayerId]);

    // Loading state
    if (loading) {
        return (
            <div className="flex-center" style={{ minHeight: '100dvh' }}>
                <div className="spinner" />
            </div>
        );
    }

    return (
        <main style={{ overflow: 'hidden' }}>
            <AnimatePresence initial={false} mode="popLayout">
                {!selectedPlayerId ? (
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
                            onOpenVersion={handleOpenVersion}
                            isVersionOpen={currentModal === 'version'}
                            onCloseVersion={handleCloseVersion}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Navigation */}
            {selectedPlayerId && (
                <FloatingNav
                    currentView={currentView}
                    onNavigate={(view) => handleNavChange(view)}
                    isHidden={isPlayerManagementOpen}
                />
            )}
        </main>
    );
}

export default function Home() {
    return (
        <Suspense fallback={(
            <div className="flex-center" style={{ minHeight: '100dvh' }}>
                <div className="spinner" />
            </div>
        )}>
            <HomeContent />
        </Suspense>
    );
}
