'use client';

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { prefersReducedMotion } from '@/lib/motion';

interface ModeSwapProps<T extends string> {
    /** The visible mode. */
    mode: T;
    /** Left-to-right order of the modes, matching the switch above. */
    order: readonly T[];
    render: (mode: T) => ReactNode;
}

const DURATION = 300;
const EXIT_DURATION = 220;
const SHIFT = 28; // px
const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

/**
 * Swaps between views with a short directional glass transition: the old view
 * slides away and blurs out, the new one comes in from the side of its tab.
 * The incoming view is live (tappable) from the first frame; the outgoing one
 * is inert. The container height eases between the two so content below
 * doesn't jump. Reduced motion: a plain crossfade.
 */
export default function ModeSwap<T extends string>({ mode, order, render }: ModeSwapProps<T>) {
    const [outgoing, setOutgoing] = useState<T | null>(null);
    const [shown, setShown] = useState(mode);
    const rootRef = useRef<HTMLDivElement>(null);
    const inRef = useRef<HTMLDivElement>(null);
    const outRef = useRef<HTMLDivElement>(null);

    // Start a swap when the mode prop changes (adjusting state during render).
    if (mode !== shown) {
        setOutgoing(shown);
        setShown(mode);
    }

    useLayoutEffect(() => {
        const root = rootRef.current;
        const incoming = inRef.current;
        const leaving = outRef.current;
        if (outgoing === null || !root || !incoming || !leaving) return;
        if (typeof incoming.animate !== 'function') {
            setOutgoing(null);
            return;
        }

        const dir = order.indexOf(mode) > order.indexOf(outgoing) ? 1 : -1;
        const reduced = prefersReducedMotion();
        const runs: Animation[] = [];
        root.dataset.animating = '';

        if (reduced) {
            runs.push(
                incoming.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'linear' }),
                leaving.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: 'linear', fill: 'forwards' }),
            );
        } else {
            runs.push(
                incoming.animate(
                    [
                        { transform: `translateX(${dir * SHIFT}px) scale(0.985)`, opacity: 0, filter: 'blur(6px)' },
                        { transform: 'none', opacity: 1, filter: 'blur(0)' },
                    ],
                    { duration: DURATION, easing: EASE },
                ),
                leaving.animate(
                    [
                        { transform: 'none', opacity: 1, filter: 'blur(0)' },
                        { transform: `translateX(${-dir * SHIFT}px) scale(0.985)`, opacity: 0, filter: 'blur(6px)' },
                    ],
                    { duration: EXIT_DURATION, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' },
                ),
            );
            const from = leaving.offsetHeight;
            const to = incoming.offsetHeight;
            if (Math.abs(from - to) > 1) {
                runs.push(
                    root.animate([{ height: `${from}px` }, { height: `${to}px` }], { duration: DURATION, easing: EASE }),
                );
            }
        }

        let cancelled = false;
        Promise.all(runs.map((run) => run.finished)).then(
            () => {
                if (!cancelled) setOutgoing(null);
            },
            () => {},
        );
        return () => {
            cancelled = true;
            runs.forEach((run) => run.cancel());
            delete root.dataset.animating;
        };
    }, [outgoing, mode, order]);

    return (
        <div ref={rootRef} className="mode-swap">
            {outgoing !== null && (
                <div ref={outRef} key={outgoing} className="mode-swap-pane" inert aria-hidden>
                    {render(outgoing)}
                </div>
            )}
            <div ref={inRef} key={shown} className="mode-swap-pane">
                {render(shown)}
            </div>
        </div>
    );
}
