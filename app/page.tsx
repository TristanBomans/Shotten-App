'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import PlayerSelect from '@/components/PlayerSelect';
import Dashboard from '@/components/Dashboard';
import FloatingNav from '@/components/FloatingNav';

type View = 'home' | 'stats' | 'league' | 'settings';

const views: View[] = ['home', 'stats', 'league', 'settings'];

function HomeContent() {
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isPlayerManagementOpen, setIsPlayerManagementOpen] = useState(false);
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const [currentView, setCurrentView] = useState<View>(() => {
        // Initialize state from URL param if present to avoid initial flash
        if (typeof window !== 'undefined') {
            const viewParam = new URLSearchParams(window.location.search).get('view');
            if (viewParam && views.includes(viewParam as View)) {
                return viewParam as View;
            }
        }
        return 'home';
    });

    useEffect(() => {
        const stored = localStorage.getItem('selectedPlayerId');
        if (stored) {
            // Validate that the stored ID is a valid Convex ID (20+ character alphanumeric string)
            // Old Supabase integer IDs like "7" or short strings should be cleared
            const isValidConvexId = /^[a-z0-9]{20,}$/.test(stored);
            if (isValidConvexId) {
                setSelectedPlayerId(stored);
            } else {
                console.log('Clearing invalid player ID from localStorage:', stored);
                localStorage.removeItem('selectedPlayerId');
            }
        }

        // Check for view parameter in URL to handle navigation from version page
        // Only update if different to avoid redundant state updates
        const viewParam = searchParams?.get('view');
        if (viewParam && views.includes(viewParam as View) && viewParam !== currentView) {
            setCurrentView(viewParam as View);
        }

        setLoading(false);
    }, [searchParams]);

    const handlePlayerSelect = (id: string) => {
        localStorage.setItem('selectedPlayerId', id);
        setSelectedPlayerId(id);
    };

    const handleLogout = () => {
        localStorage.removeItem('selectedPlayerId');
        setSelectedPlayerId(null);
        setCurrentView('home');

        // Reset URL when logging out
        router.replace(pathname, { scroll: false });
    };

    const handleNavChange = useCallback((view: View) => {
        setCurrentView(view);

        // Update URL with view parameter
        const params = new URLSearchParams(searchParams.toString());
        if (view === 'home') {
            params.delete('view'); // Clean URL for home view
        } else {
            params.set('view', view);
        }

        // Use router.replace to update URL without reloading
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });

        // Scroll to top on view change
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [searchParams, router, pathname]);

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
