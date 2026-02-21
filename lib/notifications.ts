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
    if (daysLeft <= 0) return 'vandaag';
    if (daysLeft === 1) return 'morgen';
    return `binnen ${daysLeft} dagen`;
}

function buildMessage(matchId: number, reason: ReminderReason, urgency: ReminderUrgency, daysLeft: number): string {
    const daysText = getDaysText(daysLeft);

    const missingTemplates: Record<ReminderUrgency, string[]> = {
        high: [
            `Je social credit staat op rood: reageer ${daysText}.`,
            `De bank begint je naam te fluisteren. Antwoord ${daysText}.`,
            `Noodmelding: zonder reactie ga je full-time bankzitter.`,
        ],
        medium: [
            `Reminder met liefde en lichte druk: reageer ${daysText}.`,
            `Team wacht op jouw verdict. Niet ghosten ${daysText}.`,
            `Status check: dit is je vriendelijke schop onder de kont.`,
        ],
        low: [
            `Rustige heads-up: plan deze match ${daysText}.`,
            `Future-you bedankt je als je nu al reageert.`,
            `Mini ping: eentje invullen en klaar.`,
        ],
    };

    const maybeTemplates: Record<ReminderUrgency, string[]> = {
        high: [
            `'Maybe' is geen opstelling. Kies ${daysText}: in of out.`,
            `Coach leest geen waarzeggerij. Zet je status ${daysText}.`,
            `Final call: twijfelmodus uit, keuze aan ${daysText}.`,
        ],
        medium: [
            `Je staat op 'Maybe'. Tijd voor een echte keuze ${daysText}.`,
            `Miss Maybe-level detected. Beslis ${daysText}.`,
            `Kleine roast, grote waarheid: kies je status ${daysText}.`,
        ],
        low: [
            `Geen stress, wel graag een definitief antwoord ${daysText}.`,
            `Twijfel mag, maar niet eeuwig. Kies rustig ${daysText}.`,
            `Lichte ping: zet 'Maybe' om naar een echte keuze.`,
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
