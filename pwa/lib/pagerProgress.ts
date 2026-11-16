/**
 * Live position of the horizontal page swiper (0 = Home … 3 = Settings),
 * published on every scroll frame of a user swipe so the tab bar pill can
 * follow the finger without a React render. `tracking` turns false once
 * the swipe has settled.
 */
type Listener = (position: number, tracking: boolean) => void;

const listeners = new Set<Listener>();

export function publishPagerProgress(position: number, tracking: boolean) {
    listeners.forEach((listener) => listener(position, tracking));
}

export function subscribePagerProgress(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
