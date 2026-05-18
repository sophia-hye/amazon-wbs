-- Amazon Ops · Supabase schema
-- Run this once in Supabase SQL Editor (project dashboard → SQL Editor → New query)
-- Safe to re-run: uses IF NOT EXISTS / ON CONFLICT.

-- ============================================================
-- 1. WBS tasks (self-referencing tree)
-- ============================================================
CREATE TABLE IF NOT EXISTS wbs_tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   UUID REFERENCES wbs_tasks(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  owner       TEXT DEFAULT '',
  start_date  DATE,
  end_date    DATE,
  status      TEXT DEFAULT 'todo',
  position    INT  DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS wbs_tasks_parent_idx ON wbs_tasks(parent_id);

-- ============================================================
-- 2. Task done flags  (separated from wbs_tasks to keep mental model simple)
-- ============================================================
CREATE TABLE IF NOT EXISTS task_done (
  task_id     UUID PRIMARY KEY REFERENCES wbs_tasks(id) ON DELETE CASCADE,
  done        BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. Daily logs
-- ============================================================
CREATE TABLE IF NOT EXISTS logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date             DATE NOT NULL,
  title            TEXT DEFAULT '',
  weather          TEXT,
  mood             TEXT,
  body             TEXT DEFAULT '',
  tags             TEXT[] DEFAULT '{}',
  linked_task_ids  UUID[] DEFAULT '{}',
  metrics          JSONB  DEFAULT '{"sales":0,"orders":0,"acos":0}'::jsonb,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS logs_date_idx ON logs(date DESC);

-- ============================================================
-- 4. Calendar events
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date            DATE NOT NULL,
  title           TEXT NOT NULL,
  color           TEXT DEFAULT 'blue',
  linked_task_id  UUID REFERENCES wbs_tasks(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS events_date_idx ON events(date);

-- ============================================================
-- 5. SKU master  (sku is its own primary key – natural identifier)
-- ============================================================
CREATE TABLE IF NOT EXISTS skus (
  sku         TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  asin        TEXT DEFAULT '',
  price       NUMERIC DEFAULT 0,
  units       INT     DEFAULT 0,
  sales       NUMERIC DEFAULT 0,
  acos        NUMERIC DEFAULT 0,
  roas        NUMERIC DEFAULT 0,
  stock       INT     DEFAULT 0,
  bsr         INT     DEFAULT 0,
  status      TEXT    DEFAULT 'active',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. PPC campaigns  (bids array stored as JSONB to keep it close to its parent)
-- ============================================================
CREATE TABLE IF NOT EXISTS campaigns (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku          TEXT REFERENCES skus(sku) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  type         TEXT,
  targeting    TEXT,
  status       TEXT DEFAULT 'active',
  start_date   DATE,
  budget       NUMERIC DEFAULT 0,
  impressions  INT     DEFAULT 0,
  clicks       INT     DEFAULT 0,
  spend        NUMERIC DEFAULT 0,
  sales        NUMERIC DEFAULT 0,
  orders       INT     DEFAULT 0,
  bids         JSONB   DEFAULT '[]'::jsonb,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS campaigns_sku_idx ON campaigns(sku);

-- ============================================================
-- 7. Daily sales metrics  (SKU × date granularity)
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_metrics (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  date        DATE    NOT NULL,
  sku         TEXT    REFERENCES skus(sku) ON DELETE CASCADE,
  sales       NUMERIC DEFAULT 0,
  orders      INT     DEFAULT 0,
  acos        NUMERIC DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, sku)
);
CREATE INDEX IF NOT EXISTS daily_metrics_date_idx ON daily_metrics(date DESC);
CREATE INDEX IF NOT EXISTS daily_metrics_sku_idx  ON daily_metrics(sku);

-- ============================================================
-- 8. Weekly wrap-ups
-- ============================================================
CREATE TABLE IF NOT EXISTS weekly_wraps (
  week_key      TEXT PRIMARY KEY,                 -- e.g. '2026-W19'
  highlights    TEXT DEFAULT '',
  learnings     TEXT DEFAULT '',
  next_week     TEXT DEFAULT '',
  ai_generated  BOOLEAN DEFAULT FALSE,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. Profile (single-row table)
-- ============================================================
CREATE TABLE IF NOT EXISTS profile (
  id          INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  name        TEXT DEFAULT '',
  role        TEXT DEFAULT '',
  market      TEXT DEFAULT 'Amazon US',
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO profile (id) VALUES (1) ON CONFLICT DO NOTHING;

-- ============================================================
-- 9. Row-Level Security
-- ============================================================
-- For the single-user phase we keep RLS *enabled* with a permissive
-- policy so that the anon key (shipped in the browser bundle) can read
-- and write everything.
--
-- ⚠ Anyone who finds your Supabase URL + anon key can read/modify your
--   data while these policies remain. Tighten the policies (or attach
--   them to `auth.uid()`) before exposing the deployed site publicly.

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'wbs_tasks','task_done','logs','events','skus',
    'campaigns','daily_metrics','weekly_wraps','profile'
  ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format(
      'DROP POLICY IF EXISTS "allow_all" ON %I;', t
    );
    EXECUTE format(
      'CREATE POLICY "allow_all" ON %I FOR ALL USING (true) WITH CHECK (true);',
      t
    );
  END LOOP;
END $$;

-- ============================================================
-- 10. truncate-all helper (for "Reset all data" button)
-- ============================================================
CREATE OR REPLACE FUNCTION truncate_all_user_data() RETURNS void AS $$
BEGIN
  TRUNCATE
    wbs_tasks, task_done, logs, events, skus, campaigns, daily_metrics, weekly_wraps
  RESTART IDENTITY CASCADE;
  UPDATE profile SET name = '', role = '', market = 'Amazon US' WHERE id = 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION truncate_all_user_data() TO anon, authenticated;

-- ============================================================
-- 11. updated_at auto-touch trigger (optional but useful)
-- ============================================================
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'wbs_tasks','task_done','logs','skus',
    'campaigns','daily_metrics','weekly_wraps','profile'
  ])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_touch ON %I;', t, t);
    EXECUTE format(
      'CREATE TRIGGER %I_touch BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION touch_updated_at();',
      t, t
    );
  END LOOP;
END $$;
