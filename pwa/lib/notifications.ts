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
    if (urgency === 'high') return reason === 'maybe' ? 'Still Deciding?' : 'Response Needed';
    if (urgency === 'medium') return reason === 'maybe' ? 'Pick a Side' : 'Reminder';
    return reason === 'maybe' ? 'Make a Call' : 'Heads Up';
}

function getDaysText(daysLeft: number): string {
    if (daysLeft <= 0) return 'today';
    if (daysLeft === 1) return 'tomorrow';
    return `in ${daysLeft} days`;
}

function buildMessage(matchId: number, reason: ReminderReason, urgency: ReminderUrgency, daysLeft: number): string {
    const daysText = getDaysText(daysLeft);

    const missingTemplates: Record<ReminderUrgency, string[]> = {
        high: [
            `Match is ${daysText} — let us know if you're in.`,
            `Coach needs your answer ${daysText}.`,
            `Help the team plan — respond ${daysText}.`,
        ],
        medium: [
            `Don't forget to fill in your attendance ${daysText}.`,
            `Team is counting on you — answer ${daysText}.`,
            `A quick response helps everyone plan ${daysText}.`,
        ],
        low: [
            `Match coming up ${daysText}. Mark your calendar.`,
            `Plan ahead — let us know ${daysText}.`,
            `Friendly reminder to respond ${daysText}.`,
        ],
    };

    const maybeTemplates: Record<ReminderUrgency, string[]> = {
        high: [
            `"Maybe" won't cut it — pick in or out ${daysText}.`,
            `We need a definite answer ${daysText}.`,
            `Final call: confirm your status ${daysText}.`,
        ],
        medium: [
            `Still on "Maybe"? Time to decide ${daysText}.`,
            `Help us plan — make a choice ${daysText}.`,
            `Your team needs clarity ${daysText}.`,
        ],
        low: [
            `No rush, but a definite answer helps ${daysText}.`,
            `When you're ready, lock in your status.`,
            `Turn that "Maybe" into a "Yes" or "No".`,
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
