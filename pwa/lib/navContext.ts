'use client';

import { createContext, useContext } from 'react';
import type { NavEntry, PageKind } from './navStack';

export interface NavApi {
    stack: NavEntry[];
    /** Open a page on top of whatever is showing. One history entry. */
    push: (entry: NavEntry) => void;
    /** Close the topmost page (history back when possible). */
    pop: () => void;
    /** Update the topmost entry in place, e.g. a match page's tab. No new history entry. */
    replaceTop: (entry: NavEntry) => void;
}

const noop = () => {};

export const NavContext = createContext<NavApi>({ stack: [], push: noop, pop: noop, replaceTop: noop });

export function useNav(): NavApi {
    return useContext(NavContext);
}

/** Whether a page of `kind` is anywhere in the stack. */
export function isKindOpen(stack: NavEntry[], kind: PageKind): boolean {
    return stack.some((entry) => entry.kind === kind);
}
