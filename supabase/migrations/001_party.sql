-- All gameplay state is private. Only the server service role may access it.
create table public.party_rooms (
  pin text primary key check (pin ~ '^[A-Z2-9]{6}$'),
  version integer not null default 0,
  state jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.party_rooms enable row level security;
revoke all on public.party_rooms from anon, authenticated;
grant all on public.party_rooms to service_role;

-- Public realtime transports ONLY random topics and version numbers. No secrets,
-- answers, player names, submissions, votes or host tokens enter this table.
create table public.party_signals (
  topic text primary key,
  version integer not null default 0
);
alter table public.party_signals enable row level security;
revoke all on public.party_signals from anon, authenticated;
grant select on public.party_signals to anon, authenticated;
grant all on public.party_signals to service_role;
create policy "read non-sensitive wakeup signals" on public.party_signals for select to anon, authenticated using (true);

create function public.party_compare_swap(p_pin text, p_version integer, p_state jsonb)
returns boolean language plpgsql security invoker set search_path = public as $$
begin
  if (p_state->>'version')::integer <> p_version + 1 or p_state->>'pin' <> p_pin then
    raise exception 'invalid version or pin';
  end if;
  update public.party_rooms set state = p_state, version = p_version + 1
    where pin = p_pin and version = p_version;
  return found;
end;
$$;
revoke all on function public.party_compare_swap(text,integer,jsonb) from public, anon, authenticated;
grant execute on function public.party_compare_swap(text,integer,jsonb) to service_role;

create function public.party_notify() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.party_signals(topic,version) values (new.state->>'topic',new.version)
  on conflict (topic) do update set version=excluded.version;
  return new;
end;
$$;
revoke all on function public.party_notify() from public, anon, authenticated;
create trigger party_changed after insert or update on public.party_rooms for each row execute function public.party_notify();
alter publication supabase_realtime add table public.party_signals;

-- Optional manual cleanup, run in the SQL editor after a party:
-- delete from public.party_signals where topic in
--   (select state->>'topic' from public.party_rooms where created_at < now()-interval '2 days');
-- delete from public.party_rooms where created_at < now()-interval '2 days';
