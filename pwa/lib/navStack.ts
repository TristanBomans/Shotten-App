/**
 * In-app page stack, serialized into the URL so refresh, deep links and the
 * browser history all agree on what is open.
 *
 * URL shape (legacy `modal` / `modalId` deep links keep working):
 *   ?view=league&modal=match&modalId=12&tab=opponent&stack=team:345,result:678:345
 * - `modal` / `modalId` / `tab` describe the bottom entry.
 * - `stack` lists the entries above it as `kind:id[:extra]`, comma separated.
 * - legacy `detail` (an LZV result id on top of a team or the recent sheet)
 *   is read as a `result` entry.
 */

export type PageKind =
    | 'match'
    | 'team'
    | 'result'
    | 'player'
    | 'rules'
    | 'recent'
    | 'version'
    | 'players'
    | 'respond'
    | 'admin'
    | 'forfait';

export const pageKinds: PageKind[] = [
    'match', 'team', 'result', 'player', 'rules', 'recent', 'version', 'players', 'respond', 'admin', 'forfait',
];

export interface NavEntry {
    kind: PageKind;
    id?: string | null;
    /**
     * Kind-specific extra: the active tab of a match page (`opponent`), or
     * the LZV team whose point of view a result page shows.
     */
    extra?: string | null;
}

export type View = 'home' | 'stats' | 'league' | 'settings';
export const views: View[] = ['home', 'stats', 'league', 'settings'];

type ParamsLike = { get: (name: string) => string | null };

const isPageKind = (value: string | null): value is PageKind =>
    value !== null && (pageKinds as string[]).includes(value);

const SAFE = /^[A-Za-z0-9_-]+$/;
const clean = (value: string | null | undefined): string | null =>
    value && SAFE.test(value) ? value : null;

export function getViewFromParams(params: ParamsLike): View {
    const view = params.get('view');
    return view && (views as string[]).includes(view) ? (view as View) : 'home';
}

export function parseStack(params: ParamsLike): NavEntry[] {
    const kind = params.get('modal');
    if (!isPageKind(kind)) return [];

    const stack: NavEntry[] = [{
        kind,
        id: clean(params.get('modalId')),
        extra: clean(params.get('tab')),
    }];

    const legacyDetail = clean(params.get('detail'));
    if (legacyDetail && (kind === 'team' || kind === 'recent')) {
        stack.push({ kind: 'result', id: legacyDetail, extra: kind === 'team' ? stack[0].id : null });
    }

    const rest = params.get('stack');
    if (rest) {
        for (const part of rest.split(',')) {
            const [k, id, extra] = part.split(':');
            if (!isPageKind(k)) continue;
            stack.push({ kind: k, id: clean(id), extra: clean(extra) });
        }
    }
    return stack;
}

export function buildUrl(pathname: string, search: string, view: View, stack: NavEntry[]): string {
    const params = new URLSearchParams(search);
    for (const key of ['view', 'modal', 'modalId', 'tab', 'detail', 'stack']) params.delete(key);

    if (view !== 'home') params.set('view', view);

    const [bottom, ...rest] = stack;
    if (bottom) {
        params.set('modal', bottom.kind);
        if (bottom.id) params.set('modalId', bottom.id);
        if (bottom.extra) params.set('tab', bottom.extra);
    }
    if (rest.length > 0) {
        params.set('stack', rest.map((entry) => {
            const parts: string[] = [entry.kind, entry.id ?? ''];
            if (entry.extra) parts.push(entry.extra);
            return parts.join(':').replace(/:+$/, '');
        }).join(','));
    }

    // Keep the commas and colons readable in the address bar.
    const query = params.toString().replace(/%2C/gi, ',').replace(/%3A/gi, ':');
    return query ? `${pathname}?${query}` : pathname;
}

export const sameEntry = (a: NavEntry | undefined, b: NavEntry | undefined): boolean =>
    !!a && !!b && a.kind === b.kind && (a.id ?? null) === (b.id ?? null) && (a.extra ?? null) === (b.extra ?? null);

export const sameStack = (a: NavEntry[], b: NavEntry[]): boolean =>
    a.length === b.length && a.every((entry, i) => sameEntry(entry, b[i]));

/** Index of the topmost entry of one of `kinds`, or -1. */
export function topIndexOf(stack: NavEntry[], ...kinds: PageKind[]): number {
    for (let i = stack.length - 1; i >= 0; i -= 1) {
        if (kinds.includes(stack[i].kind)) return i;
    }
    return -1;
}
