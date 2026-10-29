-- =====================================================================
-- ذِكري — جدول «ملاحظاتي» + حماية RLS
-- الصق هذا كاملًا في: Supabase Dashboard ← SQL Editor ← New query ← Run
--
-- لا يحتاج أي مفتاح ولا يُكتب أي سرّ هنا — كل شيء ينفَّذ من داخل مشروعك.
-- بعد النجاح راجع docs/SUPABASE-SETUP.md لخطوات الإعداد الأخرى
-- (روابط الدخول، ومتغيّرات المستودع، وإبطال المفتاح السري القديم).
-- =====================================================================

-- 1) الجدول — لكل صف مالك واحد (auth.uid() يملأه من توكن المستخدم تلقائيًا)
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  body text not null default '' check (char_length(body) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- الأحدث أولًا لكل مستخدم (فهرس الاستعلام الأساسي في الواجهة)
create index if not exists notes_user_updated_idx
  on public.notes (user_id, updated_at desc);

-- 2) updated_at يُحدَّث من قاعدة البيانات نفسها عند أي تعديل
--    (الواجهة لا ترسله — فلا يستطيع أحد تزوير تاريخ التعديل)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at
  before update on public.notes
  for each row
  execute function public.set_updated_at();

-- 3) تفعيل RLS — بدون هذا السطر يصل كل من يملك المفتاح إلى كل الصفوف
alter table public.notes enable row level security;

-- 4) سياسات الملكية: كل مستخدم (وأنت معه) يرى ويُدخل ويُعدّل ويحذف
--    ملاحظاته وحدها — لا زائر ولا مستخدم آخر يرى أي صف
drop policy if exists "notes_select_own" on public.notes;
create policy "notes_select_own" on public.notes
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "notes_insert_own" on public.notes;
create policy "notes_insert_own" on public.notes
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "notes_update_own" on public.notes;
create policy "notes_update_own" on public.notes
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "notes_delete_own" on public.notes;
create policy "notes_delete_own" on public.notes
  for delete to authenticated
  using (auth.uid() = user_id);

-- 5) المنح: «authenticated» وحده — دور anon (المفتاح القابل للنشر بلا دخول)
--    لا يملك أي صلاحية على الجدول أصلًا، حتى مع وجود سياسات RLS
revoke all on table public.notes from anon;
grant select, insert, update, delete on table public.notes to authenticated;

-- =====================================================================
-- تحقّق سريع بعد اللصق (في SQL Editor):
--   select count(*) from public.notes;
-- يجب أن ترجع 0 صفوف ولا تعرض أي بيانات حتى وأنت مالك المشروع —
-- فالدخول لم يتحقق بعد في هذه الجلسة، وهذا هو السلوك الصحيح.
-- =====================================================================
