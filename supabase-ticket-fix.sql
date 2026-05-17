-- FE-SERVICE Schritt 2: Ticket-Speichern für Techniker/Kunden/Admin stabilisieren
-- Ausführen in Supabase: SQL Editor -> New query -> Run

alter table public.tickets enable row level security;

-- Falls die Spalte noch fehlt, wird sie ergänzt. Falls sie schon existiert, passiert nichts.
alter table public.tickets
  add column if not exists assigned_to uuid;

drop policy if exists "fe_tickets_select" on public.tickets;
drop policy if exists "fe_tickets_insert" on public.tickets;
drop policy if exists "fe_tickets_update" on public.tickets;
drop policy if exists "fe_tickets_delete" on public.tickets;

create policy "fe_tickets_select"
on public.tickets
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'technician')
  )
  or customer_id = (
    select p.customer_id
    from public.profiles p
    where p.id = auth.uid()
  )
);

create policy "fe_tickets_insert"
on public.tickets
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'technician')
  )
  or customer_id = (
    select p.customer_id
    from public.profiles p
    where p.id = auth.uid()
  )
);

create policy "fe_tickets_update"
on public.tickets
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'technician')
  )
  or customer_id = (
    select p.customer_id
    from public.profiles p
    where p.id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'technician')
  )
  or customer_id = (
    select p.customer_id
    from public.profiles p
    where p.id = auth.uid()
  )
);

create policy "fe_tickets_delete"
on public.tickets
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);
