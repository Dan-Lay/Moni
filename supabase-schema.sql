-- ============================================================
-- Moni — Supabase Schema
-- Execute este arquivo no SQL Editor do Supabase
-- (https://app.supabase.com → seu projeto → SQL Editor)
-- ============================================================

-- ── 1. Profiles (extends auth.users) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT,
  email           TEXT,
  avatar_url      TEXT,
  default_profile TEXT DEFAULT 'todos' CHECK (default_profile IN ('marido', 'esposa', 'todos')),
  mfa_enabled     BOOLEAN DEFAULT FALSE,
  is_admin        BOOLEAN DEFAULT FALSE,
  family_id       TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: cria profile automaticamente quando usuário se cadastra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', ''));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ── 2. Categories ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.categories (
  id    TEXT PRIMARY KEY,
  name  TEXT NOT NULL,
  icon  TEXT,
  color TEXT
);

INSERT INTO public.categories (id, name, icon, color) VALUES
  ('alimentacao',    'Alimentação',    '🍽️',  '#f97316'),
  ('transporte',     'Transporte',     '🚗',  '#3b82f6'),
  ('moradia',        'Moradia',        '🏠',  '#8b5cf6'),
  ('saude',          'Saúde',          '❤️',  '#ef4444'),
  ('educacao',       'Educação',       '📚',  '#06b6d4'),
  ('lazer',          'Lazer',          '🎉',  '#ec4899'),
  ('vestuario',      'Vestuário',      '👔',  '#a855f7'),
  ('viagem',         'Viagem',         '✈️',  '#14b8a6'),
  ('tecnologia',     'Tecnologia',     '💻',  '#6366f1'),
  ('investimentos',  'Investimentos',  '📈',  '#22c55e'),
  ('pet',            'Pet',            '🐾',  '#f59e0b'),
  ('presentes',      'Presentes',      '🎁',  '#fb923c'),
  ('streaming',      'Streaming',      '📺',  '#7c3aed'),
  ('assinaturas',    'Assinaturas',    '🔄',  '#0ea5e9'),
  ('restaurantes',   'Restaurantes',   '🍷',  '#f43f5e'),
  ('supermercado',   'Supermercado',   '🛒',  '#84cc16'),
  ('farmacia',       'Farmácia',       '💊',  '#10b981'),
  ('combustivel',    'Combustível',    '⛽',  '#f97316'),
  ('academia',       'Academia',       '💪',  '#6d28d9'),
  ('beleza',         'Beleza',         '💅',  '#db2777'),
  ('outros',         'Outros',         '📦',  '#9ca3af')
ON CONFLICT (id) DO NOTHING;

-- ── 3. Transactions ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transactions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date               DATE NOT NULL,
  description        TEXT NOT NULL,
  treated_name       TEXT,
  amount             NUMERIC(12, 2) NOT NULL DEFAULT 0,
  source             TEXT NOT NULL DEFAULT 'unknown',
  category           TEXT NOT NULL DEFAULT 'outros',
  miles_generated    NUMERIC(12, 2) DEFAULT 0,
  is_inefficient     BOOLEAN DEFAULT FALSE,
  is_international   BOOLEAN DEFAULT FALSE,
  iof_amount         NUMERIC(12, 2) DEFAULT 0,
  establishment      TEXT DEFAULT '',
  spouse_profile     TEXT DEFAULT 'familia' CHECK (spouse_profile IN ('marido', 'esposa', 'familia')),
  is_additional_card BOOLEAN DEFAULT FALSE,
  card_network       TEXT DEFAULT 'other',
  is_confirmed       BOOLEAN DEFAULT FALSE,
  reconciliation_status TEXT DEFAULT 'pendente' CHECK (reconciliation_status IN ('novo', 'ja_conciliado', 'conciliado_auto', 'pendente')),
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date    ON public.transactions(date DESC);

-- ── 4. Planned Entries ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.planned_entries (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  amount         NUMERIC(12, 2) NOT NULL DEFAULT 0,
  category       TEXT NOT NULL DEFAULT 'outros',
  due_date       DATE,
  recurrence     TEXT DEFAULT 'unico' CHECK (recurrence IN ('unico', 'mensal', 'anual')),
  spouse_profile TEXT DEFAULT 'familia' CHECK (spouse_profile IN ('marido', 'esposa', 'familia')),
  conciliado     BOOLEAN DEFAULT FALSE,
  real_amount    NUMERIC(12, 2),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_planned_user_id ON public.planned_entries(user_id);

-- ── 5. Financial Config ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.financial_config (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  salario_liquido       NUMERIC(12, 2) DEFAULT 0,
  milhas_atuais         NUMERIC(12, 2) DEFAULT 0,
  meta_disney           NUMERIC(12, 2) DEFAULT 0,
  cotacao_dolar         NUMERIC(8, 4)  DEFAULT 5.0,
  reserva_usd           NUMERIC(12, 2) DEFAULT 0,
  meta_usd              NUMERIC(12, 2) DEFAULT 0,
  cotacao_euro          NUMERIC(8, 4)  DEFAULT 5.65,
  reserva_eur           NUMERIC(12, 2) DEFAULT 0,
  meta_eur              NUMERIC(12, 2) DEFAULT 0,
  cotacao_media_dca     NUMERIC(8, 4)  DEFAULT 0,
  cotacao_media_dca_eur NUMERIC(8, 4)  DEFAULT 0,
  max_jantares_mes      INTEGER        DEFAULT 2,
  max_gasto_jantar      NUMERIC(12, 2) DEFAULT 250,
  aporte_percentual     NUMERIC(5, 2)  DEFAULT 15,
  iof_internacional     NUMERIC(5, 4)  DEFAULT 4.38,
  limite_seguranca      NUMERIC(12, 2) DEFAULT 0,
  max_cinemas_mes       INTEGER        DEFAULT 2,
  max_gasto_cinema      NUMERIC(12, 2) DEFAULT 60,
  jantares_usados       INTEGER        DEFAULT 0,
  cinemas_usados        INTEGER        DEFAULT 0,
  custom_categories     JSONB          DEFAULT '[]',
  created_at            TIMESTAMPTZ    DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_config_user_id ON public.financial_config(user_id);

-- ── 6. Desapego Items ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.desapego_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  value      NUMERIC(12, 2) DEFAULT 0,
  sold       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_desapego_user_id ON public.desapego_items(user_id);

-- ── 7. Categorization Rules ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.categorization_rules (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  keyword    TEXT NOT NULL,
  category   TEXT NOT NULL DEFAULT 'outros',
  profile    TEXT DEFAULT 'familia' CHECK (profile IN ('marido', 'esposa', 'familia')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rules_user_id ON public.categorization_rules(user_id);

-- ── 8. User Preferences ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dashboard_layout JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_prefs_user_id ON public.user_preferences(user_id);

-- ── 9. Row Level Security ─────────────────────────────────────
ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planned_entries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_config     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.desapego_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorization_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories           ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Categories: todos os autenticados podem ler
CREATE POLICY "categories_select" ON public.categories FOR SELECT USING (auth.role() = 'authenticated');

-- Transactions
CREATE POLICY "transactions_select" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "transactions_insert" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transactions_update" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "transactions_delete" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

-- Planned Entries
CREATE POLICY "planned_select" ON public.planned_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "planned_insert" ON public.planned_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "planned_update" ON public.planned_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "planned_delete" ON public.planned_entries FOR DELETE USING (auth.uid() = user_id);

-- Financial Config
CREATE POLICY "config_select" ON public.financial_config FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "config_insert" ON public.financial_config FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "config_update" ON public.financial_config FOR UPDATE USING (auth.uid() = user_id);

-- Desapego Items
CREATE POLICY "desapego_select" ON public.desapego_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "desapego_insert" ON public.desapego_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "desapego_update" ON public.desapego_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "desapego_delete" ON public.desapego_items FOR DELETE USING (auth.uid() = user_id);

-- Categorization Rules
CREATE POLICY "rules_select" ON public.categorization_rules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rules_insert" ON public.categorization_rules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rules_delete" ON public.categorization_rules FOR DELETE USING (auth.uid() = user_id);

-- User Preferences
CREATE POLICY "prefs_select" ON public.user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "prefs_insert" ON public.user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "prefs_update" ON public.user_preferences FOR UPDATE USING (auth.uid() = user_id);

-- ── 10. Admin ─────────────────────────────────────────────────
-- Execute APÓS criar a conta contato.dan@gmail.com no app:
-- UPDATE public.profiles SET is_admin = TRUE WHERE email = 'contato.dan@gmail.com';
