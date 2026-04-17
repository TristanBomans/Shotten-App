'use client';

import { useEffect, useState, useCallback, Suspense, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import PlayerSelect from '@/components/PlayerSelect';
import Dashboard from '@/components/Dashboard';
import FloatingNav from '@/components/FloatingNav';

type View = 'home' | 'stats' | 'league' | 'settings';
type Modal = 'version' | 'match' | 'players' | 'respond' | 'playerStats' | 'team' | 'rules' | 'playerDetail' | null;

const views: View[] = ['home', 'stats', 'league', 'settings'];

const modalToView = (modal: Modal): View => {
    switch (modal) {
        case 'match':
            return 'home';
        case 'rules':
        case 'playerDetail':
            return 'stats';
        case 'team':
        case 'playerStats':
            return 'league';
        case 'version':
        case 'players':
        case 'respond':
        default:
            return 'settings';
    }
};

type SearchParamsLike = {
    get: (name: string) => string | null;
    toString: () => string;
};

const getViewFromParams = (params: SearchParamsLike | null): View => {
    const viewParam = params?.get('view');
    if (viewParam && views.includes(viewParam as View)) {
        return viewParam as View;
    }

    const modalParam = params?.get('modal') as Modal;
    if (modalParam) {
        return modalToView(modalParam);
    }

    return 'home';
};

const getModalFromParams = (params: SearchParamsLike | null): Modal => {
    const modalParam = params?.get('modal') as Modal;
    if (!modalParam) return null;
    const knownModals: Modal[] = ['version', 'match', 'players', 'respond', 'playerStats', 'team', 'rules', 'playerDetail'];
    return knownModals.includes(modalParam) ? modalParam : null;
};

const getModalIdFromParams = (params: SearchParamsLike | null): string | null => {
    return params?.get('modalId') || null;
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
            return getModalFromParams(new URLSearchParams(window.location.search));
        }
        return null;
    });
    const [currentModalId, setCurrentModalId] = useState<string | null>(() => {
        if (typeof window !== 'undefined') {
            return getModalIdFromParams(new URLSearchParams(window.location.search));
        }
        return null;
    });

    const pushCountRef = useRef(0);

    useEffect(() => {
        const stored = localStorage.getItem('selectedPlayerId');
        if (stored) {
            setSelectedPlayerId(parseInt(stored, 10));
        }

        const resolvedView = getViewFromParams(searchParams);
        const resolvedModal = getModalFromParams(searchParams);
        const resolvedModalId = getModalIdFromParams(searchParams);

        setCurrentView((prev) => (prev === resolvedView ? prev : resolvedView));
        setCurrentModal((prev) => (prev === resolvedModal ? prev : resolvedModal));
        setCurrentModalId((prev) => (prev === resolvedModalId ? prev : resolvedModalId));
        if (!resolvedModal) {
            pushCountRef.current = 0;
        }

        setLoading(false);
    }, [searchParams]);

    const buildAppUrl = useCallback(
        (view: View, modal: Modal, modalId: string | null = null) => {
            const params = new URLSearchParams(searchParams.toString());

            if (view === 'home') {
                params.delete('view');
            } else {
                params.set('view', view);
            }

            if (modal) {
                params.set('modal', modal);
                if (modalId) {
                    params.set('modalId', modalId);
                } else {
                    params.delete('modalId');
                }
            } else {
                params.delete('modal');
                params.delete('modalId');
            }

            const query = params.toString();
            return query ? `${pathname}?${query}` : pathname;
        },
        [pathname, searchParams]
    );

    const handlePlayerSelect = (id: number) => {
        localStorage.setItem('selectedPlayerId', id.toString());
        setSelectedPlayerId(id);
    };

    const handleLogout = () => {
        localStorage.removeItem('selectedPlayerId');
        setSelectedPlayerId(null);
        setCurrentView('home');
        setCurrentModal(null);
        setCurrentModalId(null);
        pushCountRef.current = 0;

        router.replace(pathname, { scroll: false });
    };

    const handleNavChange = useCallback(
        (view: View) => {
            setCurrentView(view);
            setCurrentModal(null);
            setCurrentModalId(null);
            pushCountRef.current = 0;

            router.replace(buildAppUrl(view, null), { scroll: false });

            window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        [buildAppUrl, router]
    );

    const openModal = useCallback(
        (modal: Modal, modalId: string | null = null) => {
            if (currentModal === modal && currentModalId === modalId) return;

            const targetView = modalToView(modal);
            setCurrentView(targetView);
            setCurrentModal(modal);
            setCurrentModalId(modalId);
            pushCountRef.current += 1;
            router.push(buildAppUrl(targetView, modal, modalId), { scroll: false });
        },
        [buildAppUrl, currentModal, currentModalId, router]
    );

    const closeModal = useCallback(() => {
        if (!currentModal) return;

        setCurrentModal(null);
        setCurrentModalId(null);
        if (pushCountRef.current > 0) {
            pushCountRef.current -= 1;
            router.back();
            return;
        }

        router.replace(buildAppUrl(currentView, null), { scroll: false });
    }, [buildAppUrl, currentModal, currentView, router]);

    const handleOpenVersion = useCallback(() => {
        openModal('version');
    }, [openModal]);

    const handleCloseVersion = useCallback(() => {
        closeModal();
    }, [closeModal]);

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
                            currentModal={currentModal}
                            currentModalId={currentModalId}
                            onOpenModal={openModal}
                            onCloseModal={closeModal}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

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
