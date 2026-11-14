-- ============================================================================
-- MIGRATION: Absence periods ("I'm away from 12 to 26 July")
-- Run this in your Supabase SQL Editor. Safe to run more than once.
--
-- * player_absences: one row per away period (inclusive dates, Brussels days).
-- * attendances.auto_absence_id: set on answers the app filled in because of
--   an absence ("Away" badge). Any later manual answer clears it again.
-- * Trigger on core_matches: matches inserted later (backend iCal sync does a
--   plain INSERT per new match; a rescheduled match is a DELETE + INSERT) get
--   a NotPresent answer for every player away on that day. Existing answers
--   are never overwritten.
-- * apply_player_absence / remove_player_absence: called by the PWA API (with
--   the service key) to apply an absence to matches that already exist.
--
-- Everything is limited to future matches: past answers stay as they are.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS player_absences (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES core_players(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT player_absences_range CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_player_absences_player_dates
ON player_absences(player_id, start_date, end_date);

ALTER TABLE player_absences ENABLE ROW LEVEL SECURITY;

-- Public read, like attendances. Writes go through the service key.
DROP POLICY IF EXISTS "Public read access" ON player_absences;
CREATE POLICY "Public read access" ON player_absences FOR SELECT USING (true);

DROP TRIGGER IF EXISTS update_player_absences_updated_at ON player_absences;
CREATE TRIGGER update_player_absences_updated_at BEFORE UPDATE ON player_absences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Marker for answers set automatically by an absence. Deleting the absence
-- keeps the answer but turns it into a normal one (SET NULL).
ALTER TABLE attendances
ADD COLUMN IF NOT EXISTS auto_absence_id INTEGER REFERENCES player_absences(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_attendances_auto_absence_id
ON attendances(auto_absence_id) WHERE auto_absence_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- A manual answer clears the marker. Fires when an UPDATE sets status
-- (the app's attendance upsert always does). Updates that set the marker
-- themselves (the apply function) keep it.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION clear_attendance_auto_absence()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.auto_absence_id IS NOT NULL
       AND NEW.auto_absence_id IS NOT DISTINCT FROM OLD.auto_absence_id THEN
        NEW.auto_absence_id := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS clear_attendances_auto_absence ON attendances;
CREATE TRIGGER clear_attendances_auto_absence BEFORE UPDATE OF status ON attendances
    FOR EACH ROW EXECUTE FUNCTION clear_attendance_auto_absence();

-- ----------------------------------------------------------------------------
-- New (or rescheduled) matches: auto-decline players who are away that day.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION apply_player_absences_to_match()
RETURNS TRIGGER AS $$
DECLARE
    match_day DATE := (NEW.date AT TIME ZONE 'Europe/Brussels')::date;
BEGIN
    IF TG_OP = 'UPDATE'
       AND NEW.date IS NOT DISTINCT FROM OLD.date
       AND NEW.team_id IS NOT DISTINCT FROM OLD.team_id THEN
        RETURN NEW;
    END IF;

    IF NEW.date <= NOW() THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        -- Moved out of someone's away period: auto answers go back to "no response".
        DELETE FROM attendances att
        WHERE att.match_id = NEW.id
          AND att.auto_absence_id IS NOT NULL
          AND NOT EXISTS (
              SELECT 1
              FROM player_absences a
              JOIN core_players p ON p.id = a.player_id
              WHERE a.player_id = att.player_id
                AND NEW.team_id = ANY(p.team_ids)
                AND match_day BETWEEN a.start_date AND a.end_date
          );
    END IF;

    IF NEW.team_id IS NULL THEN
        RETURN NEW;
    END IF;

    INSERT INTO attendances (match_id, player_id, status, auto_absence_id)
    SELECT DISTINCT ON (a.player_id) NEW.id, a.player_id, 'NotPresent', a.id
    FROM player_absences a
    JOIN core_players p ON p.id = a.player_id
    WHERE NEW.team_id = ANY(p.team_ids)
      AND match_day BETWEEN a.start_date AND a.end_date
    ORDER BY a.player_id, a.id
    ON CONFLICT (match_id, player_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS apply_player_absences_on_core_matches ON core_matches;
CREATE TRIGGER apply_player_absences_on_core_matches
    AFTER INSERT OR UPDATE OF date, team_id ON core_matches
    FOR EACH ROW EXECUTE FUNCTION apply_player_absences_to_match();

-- ----------------------------------------------------------------------------
-- Apply one absence to existing future matches (after create or edit).
-- * no answer / Maybe  -> NotPresent, marked as auto
-- * Present / NotPresent set by hand -> untouched
-- * auto answers of this absence that fell out of its range (edit) -> moved to
--   another covering absence, or back to "no response"
-- Returns how many matches were newly marked.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION apply_player_absence(p_absence_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    ab player_absences%ROWTYPE;
    inserted INTEGER := 0;
    updated INTEGER := 0;
BEGIN
    SELECT * INTO ab FROM player_absences WHERE id = p_absence_id;
    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    -- Stale auto answers: re-point to another absence that still covers them...
    UPDATE attendances att
    SET auto_absence_id = other.id
    FROM core_matches m, player_absences other
    WHERE att.auto_absence_id = ab.id
      AND m.id = att.match_id
      AND m.date > NOW()
      AND (m.date AT TIME ZONE 'Europe/Brussels')::date NOT BETWEEN ab.start_date AND ab.end_date
      AND other.player_id = ab.player_id
      AND other.id <> ab.id
      AND (m.date AT TIME ZONE 'Europe/Brussels')::date BETWEEN other.start_date AND other.end_date;

    -- ...or drop them (back to "no response").
    DELETE FROM attendances att
    USING core_matches m
    WHERE att.auto_absence_id = ab.id
      AND m.id = att.match_id
      AND m.date > NOW()
      AND (m.date AT TIME ZONE 'Europe/Brussels')::date NOT BETWEEN ab.start_date AND ab.end_date;

    -- Matches in range without an answer.
    INSERT INTO attendances (match_id, player_id, status, auto_absence_id)
    SELECT m.id, ab.player_id, 'NotPresent', ab.id
    FROM core_matches m
    JOIN core_players p ON p.id = ab.player_id
    WHERE m.team_id = ANY(p.team_ids)
      AND m.date > NOW()
      AND (m.date AT TIME ZONE 'Europe/Brussels')::date BETWEEN ab.start_date AND ab.end_date
    ON CONFLICT (match_id, player_id) DO NOTHING;
    GET DIAGNOSTICS inserted = ROW_COUNT;

    -- "Maybe" answers in range.
    UPDATE attendances att
    SET status = 'NotPresent', auto_absence_id = ab.id
    FROM core_matches m, core_players p
    WHERE att.player_id = ab.player_id
      AND att.status = 'Maybe'
      AND m.id = att.match_id
      AND p.id = ab.player_id
      AND m.team_id = ANY(p.team_ids)
      AND m.date > NOW()
      AND (m.date AT TIME ZONE 'Europe/Brussels')::date BETWEEN ab.start_date AND ab.end_date;
    GET DIAGNOSTICS updated = ROW_COUNT;

    RETURN inserted + updated;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Delete one absence. Future auto answers still covered by another absence
-- move to it. With p_reset the rest go back to "no response"; without it they
-- stay NotPresent as normal answers (the FK sets the marker to NULL).
-- Returns how many answers were reset.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION remove_player_absence(p_absence_id INTEGER, p_reset BOOLEAN)
RETURNS INTEGER AS $$
DECLARE
    ab player_absences%ROWTYPE;
    reset_count INTEGER := 0;
BEGIN
    SELECT * INTO ab FROM player_absences WHERE id = p_absence_id;
    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    UPDATE attendances att
    SET auto_absence_id = other.id
    FROM core_matches m, player_absences other
    WHERE att.auto_absence_id = ab.id
      AND m.id = att.match_id
      AND m.date > NOW()
      AND other.player_id = ab.player_id
      AND other.id <> ab.id
      AND (m.date AT TIME ZONE 'Europe/Brussels')::date BETWEEN other.start_date AND other.end_date;

    IF p_reset THEN
        DELETE FROM attendances att
        USING core_matches m
        WHERE att.auto_absence_id = ab.id
          AND m.id = att.match_id
          AND m.date > NOW();
        GET DIAGNOSTICS reset_count = ROW_COUNT;
    END IF;

    DELETE FROM player_absences WHERE id = ab.id;
    RETURN reset_count;
END;
$$ LANGUAGE plpgsql;

-- Only the service key may call these through PostgREST. (They run as the
-- caller, so anon could not write anyway: attendances has no write policy.)
REVOKE ALL ON FUNCTION apply_player_absence(INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION remove_player_absence(INTEGER, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION apply_player_absence(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION remove_player_absence(INTEGER, BOOLEAN) TO service_role;

COMMIT;

-- Let PostgREST see the new table, column and functions.
NOTIFY pgrst, 'reload schema';
