-- Nexus Tips — schema inicial (MVP)
-- Rode este arquivo no SQL Editor do seu projeto Supabase (ou via `supabase db push`).

-- ========== EXTENSIONS ==========
create extension if not exists "pgcrypto";

-- ========== PROFILES ==========
-- Espelha auth.users com os campos que o produto precisa (nome, papel, time do coração, banca).
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  time_coracao text,
  banca_inicial numeric,
  created_at timestamptz not null default now()
);

-- Cria automaticamente uma linha em profiles sempre que alguém se cadastra (auth.users).
-- É isso que faz o cadastro "subir sozinho" pro admin: nenhum código do app precisa lembrar de fazer esse insert.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''), new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Função auxiliar para políticas RLS: evita recursão (uma policy em profiles que consulta profiles).
create function public.is_admin()
returns boolean
language sql
security definer stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ========== SUBSCRIPTIONS ==========
-- Uma linha por assinatura. status muda (ativa/cancelada/atrasada) e isso é o que o
-- admin acompanha em tempo real na aba Assinaturas — sem nenhum job ou refresh manual.
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plano text not null check (plano in ('mensal', 'semestral', 'anual')),
  valor numeric not null,
  status text not null default 'ativa' check (status in ('ativa', 'cancelada', 'atrasada')),
  provider text not null default 'manual', -- 'manual' agora; vira 'asaas' na fase 2
  provider_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  canceled_at timestamptz
);

create index subscriptions_user_id_idx on public.subscriptions(user_id);

-- ========== SIGNALS (sinais publicados pelo admin) ==========
create table public.signals (
  id uuid primary key default gen_random_uuid(),
  competicao text not null,
  time_a text not null,
  time_b text not null,
  mercado text not null,
  odd numeric not null,
  estrategia text,
  rationale text,
  status text not null default 'no_ar' check (status in ('no_ar', 'green', 'red')),
  live boolean not null default false,
  published_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index signals_status_idx on public.signals(status);

-- ========== OPERATIONS (usuário marca um sinal como operação) ==========
create table public.operations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  signal_id uuid not null references public.signals(id) on delete cascade,
  valor numeric not null default 100,
  status text not null default 'andamento' check (status in ('andamento', 'green', 'red')),
  created_at timestamptz not null default now(),
  unique (user_id, signal_id)
);

-- ========== SUPPORT ==========
create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  assunto text not null,
  status text not null default 'aberto' check (status in ('aberto', 'respondido', 'fechado')),
  prioridade text not null default 'media' check (prioridade in ('alta', 'media', 'baixa')),
  created_at timestamptz not null default now()
);

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender text not null check (sender in ('user', 'admin')),
  text text not null,
  created_at timestamptz not null default now()
);

-- ========== ROW LEVEL SECURITY ==========
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.signals enable row level security;
alter table public.operations enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;

-- PROFILES: usuário vê/edita o próprio; admin vê todos.
create policy "profiles: user reads own" on public.profiles
  for select using (auth.uid() = id or public.is_admin());
create policy "profiles: user updates own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- SUBSCRIPTIONS: usuário vê/cria/cancela a própria; admin vê e atualiza todas.
create policy "subscriptions: user reads own" on public.subscriptions
  for select using (auth.uid() = user_id or public.is_admin());
create policy "subscriptions: user creates own" on public.subscriptions
  for insert with check (auth.uid() = user_id);
create policy "subscriptions: user cancels own" on public.subscriptions
  for update using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

-- SIGNALS: qualquer usuário autenticado lê; só admin publica/edita.
create policy "signals: authenticated read" on public.signals
  for select using (auth.role() = 'authenticated');
create policy "signals: admin writes" on public.signals
  for insert with check (public.is_admin());
create policy "signals: admin updates" on public.signals
  for update using (public.is_admin());

-- OPERATIONS: usuário vê/cria as próprias; admin vê todas.
create policy "operations: user reads own" on public.operations
  for select using (auth.uid() = user_id or public.is_admin());
create policy "operations: user creates own" on public.operations
  for insert with check (auth.uid() = user_id);
create policy "operations: user updates own" on public.operations
  for update using (auth.uid() = user_id or public.is_admin());

-- SUPPORT_TICKETS: usuário vê/cria os próprios; admin vê e atualiza todos.
create policy "tickets: user reads own" on public.support_tickets
  for select using (auth.uid() = user_id or public.is_admin());
create policy "tickets: user creates own" on public.support_tickets
  for insert with check (auth.uid() = user_id);
create policy "tickets: admin updates" on public.support_tickets
  for update using (public.is_admin());

-- SUPPORT_MESSAGES: visível para o dono do ticket e para o admin; ambos podem escrever
-- na conversa (o dono só no próprio ticket, o admin em qualquer um).
create policy "messages: read own ticket or admin" on public.support_messages
  for select using (
    public.is_admin()
    or exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = auth.uid())
  );
create policy "messages: write own ticket or admin" on public.support_messages
  for insert with check (
    public.is_admin()
    or exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = auth.uid())
  );

-- ========== REALTIME ==========
-- Habilita a replicação em tempo real dessas tabelas (usado pelo admin e pelo dashboard
-- do usuário via supabase.channel(...).on('postgres_changes', ...)).
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.subscriptions;
alter publication supabase_realtime add table public.signals;
alter publication supabase_realtime add table public.operations;
alter publication supabase_realtime add table public.support_tickets;
alter publication supabase_realtime add table public.support_messages;

-- ========== PRIMEIRO ADMIN ==========
-- Depois de criar sua própria conta pelo /cadastro, rode isto trocando o e-mail
-- para virar admin (só assim você acessa /admin):
--   update public.profiles set role = 'admin' where email = 'voce@seuemail.com';
