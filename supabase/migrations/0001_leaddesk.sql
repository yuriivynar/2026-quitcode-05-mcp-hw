-- LeadDesk: таблиця лідів (поля за materials/leads.json)
create table public.leads (
  id         text primary key,
  full_name  text not null,
  company    text not null,
  email      text not null,
  source     text not null,
  status     text not null default 'new'
             check (status in ('new', 'contacted', 'qualified', 'won', 'lost')),
  budget     integer check (budget >= 0),
  message    text not null,
  created_at timestamptz not null default now()
);

-- RLS увімкнено без політик: ролі anon і authenticated не бачать жодного рядка;
-- service_role і власник таблиці обходять RLS.
alter table public.leads enable row level security;
