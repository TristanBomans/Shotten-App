// Sanity checks for lib/badges.ts (no test runner in this repo).
// Run: bun scripts/check-badges.ts

import assert from 'node:assert/strict';
import {
    BADGES,
    computeBadges,
    findNewBadges,
    snapshotBadges,
    sortBadges,
    type BadgeAttendanceStatus,
    type BadgeId,
    type BadgeMatch,
    type PlayerBadge,
} from '../lib/badges';

const NOW = new Date('2026-11-15T12:00:00').getTime();
const DAY = 24 * 60 * 60 * 1000;

/** Weekly matches ending a week before NOW, oldest first. */
function season(statuses: BadgeAttendanceStatus[], outcomes: ('W' | 'L' | 'D' | null)[] = []): BadgeMatch[] {
    return statuses.map((status, i) => ({
        matchId: i + 1,
        matchName: `Match ${i + 1}`,
        date: new Date(NOW - (statuses.length - i) * 7 * DAY),
        status,
        outcome: outcomes[i] ?? null,
    }));
}

function get(badges: PlayerBadge[], id: BadgeId) {
    const b = badges.find(x => x.def.id === id);
    assert.ok(b, `badge ${id} shown`);
    return b;
}

const P: BadgeAttendanceStatus = 'present';
const A: BadgeAttendanceStatus = 'notPresent';

// --- streaks -----------------------------------------------------------------
{
    const matches = season([P, P, P, P, P, A, P, P, P, P, P, P, P]);
    const badges = computeBadges({ matches, hasGoals: false, hasAssists: false, now: NOW });
    const habit = get(badges, 'creature-of-habit');
    assert.equal(habit.earned, true);
    assert.equal(habit.count, 2, 'two separate 5-runs');
    assert.equal(habit.firstEarned?.matchId, 5);
    assert.equal(habit.lastEarned?.matchId, 11);
    const iron = get(badges, 'iron-man');
    assert.equal(iron.earned, false);
    assert.deepEqual(iron.progress, { current: 7, target: 10, label: '7/10 in a row' });
    // Goal and MOTM badges hidden without their data.
    assert.equal(badges.some(b => b.def.source === 'goals' || b.def.source === 'motm'), false);
}

// A "maybe" breaks a streak, like calculatePlayerStats' best streak.
{
    const badges = computeBadges({ matches: season([P, P, 'maybe', P, P, P]), hasGoals: false, hasAssists: false, now: NOW });
    assert.equal(get(badges, 'creature-of-habit').earned, false);
    assert.equal(get(badges, 'creature-of-habit').progress?.current, 3);
}

// --- comeback ----------------------------------------------------------------
{
    const badges = computeBadges({ matches: season([P, A, A, 'ghost', A, P, A, A, P]), hasGoals: false, hasAssists: false, now: NOW });
    const comeback = get(badges, 'back-from-the-dead');
    assert.equal(comeback.count, 1, 'only the 4-match gap counts');
    assert.equal(comeback.firstEarned?.matchId, 6);
    // Never present before the gap: that's a debut, not a comeback.
    const debut = computeBadges({ matches: season([A, A, A, A, P]), hasGoals: false, hasAssists: false, now: NOW });
    assert.equal(get(debut, 'back-from-the-dead').earned, false);
}

// --- perfect month -----------------------------------------------------------
{
    const at = (id: number, iso: string, status: BadgeAttendanceStatus): BadgeMatch =>
        ({ matchId: id, matchName: `M${id}`, date: new Date(iso), status });
    const matches = [
        at(1, '2026-09-03T20:00', P), at(2, '2026-09-10T20:00', P), at(3, '2026-09-24T20:00', P), // perfect
        at(4, '2026-10-01T20:00', P), at(5, '2026-10-08T20:00', A), at(6, '2026-10-15T20:00', P), // one missed
        at(7, '2026-11-01T20:00', P), at(8, '2026-11-05T20:00', P), at(9, '2026-11-12T20:00', P), // month not over
    ];
    const pm = get(computeBadges({ matches, hasGoals: false, hasAssists: false, now: NOW }), 'perfect-month');
    assert.equal(pm.count, 1);
    assert.equal(pm.firstEarned?.matchId, 3, 'dated to the last match of the month');
}

// --- wins, totals ------------------------------------------------------------
{
    const matches = season([P, P, A, P, P, P, P], ['W', 'W', 'W', 'L', 'W', 'D', 'W']);
    const badges = computeBadges({ matches, hasGoals: false, hasAssists: false, now: NOW });
    const charm = get(badges, 'lucky-charm');
    assert.equal(charm.earned, false, 'the win they missed does not count');
    assert.equal(charm.progress?.label, '4/5 wins');
    assert.equal(get(badges, 'part-of-the-furniture').progress?.label, '6/25 matches');
}

// --- goals & assists ---------------------------------------------------------
{
    const matches = season([P, P, P, P]);
    const goalsByMatch = new Map([
        [1, { goals: 0, assists: 2 }],
        [2, { goals: 1, assists: 2 }],
        [3, { goals: 3, assists: 0 }],
        [4, { goals: 2, assists: 1 }],
    ]);
    const maxAssistsByMatch = new Map([[1, 2], [2, 3], [3, 1], [4, 1]]);
    const badges = computeBadges({ matches, goalsByMatch, maxAssistsByMatch, hasGoals: true, hasAssists: true, now: NOW });
    assert.equal(get(badges, 'off-the-mark').firstEarned?.matchId, 2);
    assert.equal(get(badges, 'off-the-mark').count, 1, 'single badge, no count');
    assert.equal(get(badges, 'double-trouble').count, 2);
    assert.equal(get(badges, 'hat-trick-hero').count, 1);
    const king = get(badges, 'assist-king');
    assert.equal(king.count, 1, 'match 2: someone had more assists');
    assert.equal(king.firstEarned?.matchId, 1);
    // No assists in the data: badge hidden.
    const noAssists = computeBadges({ matches, goalsByMatch, hasGoals: true, hasAssists: false, now: NOW });
    assert.equal(noAssists.some(b => b.def.id === 'assist-king'), false);
}

// --- man of the match --------------------------------------------------------
{
    const matches = season([P, P, P, P]);
    const one = computeBadges({ matches, hasGoals: false, hasAssists: false, motmWonMatchIds: [3], now: NOW });
    assert.equal(get(one, 'man-of-the-match').earned, true);
    assert.equal(get(one, 'fan-favourite').progress?.label, '1/2 awards');
    const two = computeBadges({ matches, hasGoals: false, hasAssists: false, motmWonMatchIds: [4, 2], now: NOW });
    assert.equal(get(two, 'man-of-the-match').count, 2);
    assert.equal(get(two, 'fan-favourite').firstEarned?.matchId, 4, 'second award in date order');
}

// --- sorting & "new" ---------------------------------------------------------
{
    const matches = season([P, P, P, P, P]);
    const goalsByMatch = new Map([[5, { goals: 3, assists: 0 }]]);
    const badges = computeBadges({ matches, goalsByMatch, hasGoals: true, hasAssists: false, motmWonMatchIds: [], now: NOW });
    const sorted = sortBadges(badges);
    assert.equal(sorted[0].def.id, 'hat-trick-hero', 'rare earned first');
    assert.ok(sorted.findIndex(b => !b.earned) > sorted.findLastIndex(b => b.earned), 'locked after earned');

    // First run: only badges whose latest earn is within a week. Match 5 is 7 days old.
    assert.ok(findNewBadges(badges, null, NOW).length > 0);
    assert.equal(findNewBadges(badges, null, NOW + 2 * DAY).length, 0);
    const seen = snapshotBadges(badges);
    assert.equal(findNewBadges(badges, seen, NOW).length, 0);
    // Earned again -> new again.
    const again = computeBadges({
        matches: [...matches, { matchId: 6, matchName: 'M6', date: new Date(NOW - DAY), status: P }],
        goalsByMatch: new Map([...goalsByMatch, [6, { goals: 3, assists: 0 }]]),
        hasGoals: true, hasAssists: false, motmWonMatchIds: [], now: NOW,
    });
    assert.deepEqual(findNewBadges(again, seen, NOW).map(b => b.def.id), ['double-trouble', 'hat-trick-hero']);
}

assert.equal(new Set(BADGES.map(b => b.id)).size, BADGES.length);
console.log(`badges: all checks passed (${BADGES.length} badges)`);
