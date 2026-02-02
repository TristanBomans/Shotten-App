'use client';

import { useRef, useState, useCallback, ReactNode } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: ReactNode;
    threshold?: number;
    maxPullDistance?: number;
}

export default function PullToRefresh({
    onRefresh,
    children,
    threshold = 80,
    maxPullDistance = 120,
}: PullToRefreshProps) {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const touchStartY = useRef(0);
    const scrollY = useMotionValue(0);
    const isPulling = useRef(false);

    // Transform scroll distance to indicator position with resistance
    const indicatorY = useTransform(scrollY, [0, maxPullDistance], [0, maxPullDistance]);
    const indicatorOpacity = useTransform(scrollY, [0, threshold / 2, threshold], [0, 0.5, 1]);
    const indicatorRotation = useTransform(scrollY, [0, maxPullDistance], [0, 360]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        const container = containerRef.current;
        if (!container || isRefreshing) return;

        // Only trigger if scrolled to the very top
        if (container.scrollTop === 0) {
            touchStartY.current = e.touches[0].clientY;
            isPulling.current = true;
        }
    }, [isRefreshing]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isPulling.current || isRefreshing) return;

        const container = containerRef.current;
        if (!container) return;

        const touchY = e.touches[0].clientY;
        const pullDistance = touchY - touchStartY.current;

        // Only pull down if we're at the top AND pulling downward
        if (container.scrollTop === 0 && pullDistance > 0) {
            // Prevent default scroll behavior to avoid page refresh
            e.preventDefault();

            // Apply resistance to pull distance
            const resistance = 0.5;
            const resistedDistance = Math.min(pullDistance * resistance, maxPullDistance);
            scrollY.set(resistedDistance);
        }
    }, [isRefreshing, maxPullDistance, scrollY]);

    const handleTouchEnd = useCallback(async () => {
        if (!isPulling.current || isRefreshing) return;

        const currentScrollY = scrollY.get();
        isPulling.current = false;

        // If pulled beyond threshold, trigger refresh
        if (currentScrollY >= threshold) {
            setIsRefreshing(true);

            // Animate to loading position
            await animate(scrollY, 60, {
                type: 'spring',
                stiffness: 300,
                damping: 30,
            });

            try {
                await onRefresh();
            } finally {
                // Animate back to top
                await animate(scrollY, 0, {
                    type: 'spring',
                    stiffness: 300,
                    damping: 30,
                });
                setIsRefreshing(false);
            }
        } else {
            // Animate back to start
            animate(scrollY, 0, {
                type: 'spring',
                stiffness: 300,
                damping: 30,
            });
        }
    }, [isRefreshing, scrollY, threshold, onRefresh]);

    return (
        <div
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
                width: '100%',
                height: '100%',
                overflowY: 'auto',
                overflowX: 'hidden',
                position: 'relative',
                WebkitOverflowScrolling: 'touch',
            }}
        >
            {/* Pull to Refresh Indicator */}
            <motion.div
                style={{
                    position: 'absolute',
                    top: -60,
                    left: 0,
                    right: 0,
                    height: 60,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    y: indicatorY,
                    opacity: indicatorOpacity,
                    zIndex: 1000,
                }}
            >
                <motion.div
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        backgroundColor: 'var(--color-surface)',
                        backdropFilter: 'blur(20px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        rotate: isRefreshing ? 0 : indicatorRotation,
                    }}
                    animate={isRefreshing ? { rotate: 360 } : {}}
                    transition={isRefreshing ? {
                        duration: 1,
                        repeat: Infinity,
                        ease: 'linear',
                    } : {}}
                >
                    <RefreshCw
                        size={20}
                        style={{
                            color: 'var(--color-accent)',
                        }}
                    />
                </motion.div>
            </motion.div>

            {/* Content */}
            <motion.div
                style={{
                    y: scrollY,
                }}
            >
                {children}
            </motion.div>
        </div>
    );
}
