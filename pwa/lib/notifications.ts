import type { Match } from './mockData';
import { parseDate } from './dateUtils';

export type ReminderReason = 'missing' | 'maybe';
export type ReminderUrgency = 'high' | 'medium' | 'low';

export interface MatchReminder {
    matchId: number;
    matchName: string;
    matchDate: Date;
    reason: ReminderReason;
    urgency: ReminderUrgency;
    rankLabel: string;
    message: string;
}

export interface NotificationSummary {
    count: number;
    items: MatchReminder[];
}

const REMINDER_WINDOW_DAYS = 14;
const SHEET_ITEM_LIMIT = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

function getUrgency(daysLeft: number): ReminderUrgency {
    if (daysLeft <= 2) return 'high';
    if (daysLeft <= 6) return 'medium';
    return 'low';
}

function getRankLabel(urgency: ReminderUrgency, reason: ReminderReason): string {
    if (urgency === 'high') return reason === 'maybe' ? 'Captain Doubt Alarm' : 'Bench Warmer Alert';
    if (urgency === 'medium') return reason === 'maybe' ? 'Chaos Strategist Ping' : 'Ghost Protocol Ping';
    return reason === 'maybe' ? 'Coin Flip Committee' : 'Social Credit Watch';
}

function getDaysText(daysLeft: number): string {
    if (daysLeft <= 0) return 'today';
    if (daysLeft === 1) return 'tomorrow';
    return `within ${daysLeft} days`;
}

function buildMessage(matchId: number, reason: ReminderReason, urgency: ReminderUrgency, daysLeft: number): string {
    const daysText = getDaysText(daysLeft);

    const missingTemplates: Record<ReminderUrgency, string[]> = {
        high: [
            `Your social credit is in the red: respond ${daysText}.`,
            `The bench is whispering your name. Answer ${daysText}.`,
            `Emergency alert: no response means full-time bench warmer status.`,
        ],
        medium: [
            `Reminder with love and gentle pressure: respond ${daysText}.`,
            `Team awaits your verdict. Don't ghost ${daysText}.`,
            `Status check: this is your friendly kick in the butt.`,
        ],
        low: [
            `Friendly heads-up: plan for this match ${daysText}.`,
            `Future-you will thank you if you respond now.`,
            `Mini ping: fill in once and done.`,
        ],
    };

    const maybeTemplates: Record<ReminderUrgency, string[]> = {
        high: [
            `'Maybe' is not a lineup. Pick ${daysText}: in or out.`,
            `Coach doesn't read tea leaves. Set your status ${daysText}.`,
            `Final call: doubt mode off, decision due ${daysText}.`,
        ],
        medium: [
            `You're on 'Maybe'. Time for a real choice ${daysText}.`,
            `Miss Maybe-level detected. Decide ${daysText}.`,
            `Small roast, big truth: pick your status ${daysText}.`,
        ],
        low: [
            `No stress, but would love a definite answer ${daysText}.`,
            `Doubt is fine, but not forever. Choose at your leisure ${daysText}.`,
            `Gentle ping: turn 'Maybe' into a real choice.`,
        ],
    };

    const templates = reason === 'maybe' ? maybeTemplates[urgency] : missingTemplates[urgency];
    return templates[matchId % templates.length];
}

export function buildMatchReminders(
    matches: Match[],
    playerId: number,
    now: Date = new Date()
): NotificationSummary {
    const nowTs = now.getTime();
    const latestTs = nowTs + REMINDER_WINDOW_DAYS * DAY_MS;

    const reminders = matches
        .map((match): MatchReminder | null => {
            const matchDate = parseDate(match.date);
            if (!matchDate) return null;

            const matchTs = matchDate.getTime();
            if (matchTs < nowTs || matchTs > latestTs) return null;

            const attendance = match.attendances?.find((item) => item.playerId === playerId);
            const reason: ReminderReason | null = !attendance
                ? 'missing'
                : attendance.status === 'Maybe'
                    ? 'maybe'
                    : null;

            if (!reason) return null;

            const daysLeft = Math.max(0, Math.ceil((matchTs - nowTs) / DAY_MS));
            const urgency = getUrgency(daysLeft);

            return {
                matchId: match.id,
                matchName: match.name,
                matchDate,
                reason,
                urgency,
                rankLabel: getRankLabel(urgency, reason),
                message: buildMessage(match.id, reason, urgency, daysLeft),
            };
        })
        .filter((item): item is MatchReminder => item !== null)
        .sort((a, b) => a.matchDate.getTime() - b.matchDate.getTime());

    return {
        count: reminders.length,
        items: reminders.slice(0, SHEET_ITEM_LIMIT),
    };
}
