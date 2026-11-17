/**
 * Inline <script> that runs once during HTML parsing (before first paint).
 * On the client it renders as text/plain, so React doesn't warn about
 * rendering a script tag and the code never runs twice.
 * See node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md
 */
export default function InlineScript({ html }: { html: string }) {
    return (
        <script
            type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
            suppressHydrationWarning
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}
