/**
 * Safely parse a date string from various formats (ISO, Supabase TIMESTAMPTZ, etc.)
 * Returns a valid Date object or null if parsing fails
 */
export function parseDate(dateStr: string | Date | null | undefined): Date | null {
    if (!dateStr) return null;

    // Already a Date object
    if (dateStr instanceof Date) {
        return isNaN(dateStr.getTime()) ? null : dateStr;
    }

    // Try standard Date parsing first
    let date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
        return date;
    }

    // Handle Supabase/PostgreSQL TIMESTAMPTZ format: "2025-01-15 22:00:00+00"
    // Convert space to T for ISO compatibility
    if (typeof dateStr === 'string' && dateStr.includes(' ')) {
        const isoLike = dateStr.replace(' ', 'T');
        date = new Date(isoLike);
        if (!isNaN(date.getTime())) {
            return date;
        }
    }

    return null;
}

/**
 * Safely parse a date and return timestamp (for sorting/comparison)
 * Returns 0 if parsing fails
 */
export function parseDateToTimestamp(dateStr: string | Date | null | undefined): number {
    const date = parseDate(dateStr);
    return date ? date.getTime() : 0;
}

/** Shared locale for every user-facing date in the app. */
export const DATE_LOCALE = 'en-GB';

/**
 * Format a date safely, returning fallback if invalid
 */
export function formatDateSafe(
    dateStr: string | Date | null | undefined,
    options: Intl.DateTimeFormatOptions,
    fallback: string = 'Invalid Date'
): string {
    const date = parseDate(dateStr);
    if (!date) return fallback;

    try {
        return date.toLocaleDateString(DATE_LOCALE, options);
    } catch {
        return fallback;
    }
}

/**
 * Match dates: "Sat 12 Sept", with a year only when it isn't the current one
 * ("Wed 28 Apr 2027").
 */
export function formatMatchDate(
    dateStr: string | Date | null | undefined,
    fallback: string = 'Invalid Date'
): string {
    const date = parseDate(dateStr);
    if (!date) return fallback;

    const includeYear = date.getFullYear() !== new Date().getFullYear();
    return formatDateSafe(
        date,
        {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            ...(includeYear ? { year: 'numeric' } : {}),
        },
        fallback
    ).replace(/,/g, '');
}

/**
 * Format a time safely, returning fallback if invalid
 */
export function formatTimeSafe(
    dateStr: string | Date | null | undefined,
    options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' },
    fallback: string = '--:--'
): string {
    const date = parseDate(dateStr);
    if (!date) return fallback;

    try {
        return date.toLocaleTimeString(DATE_LOCALE, options);
    } catch {
        return fallback;
    }
}
