-- ═══════════════════════════════════════════════════════════════
-- CONTENDER CLUB · Supabase Schema + Datos Demo
-- Pegar completo en: Supabase Dashboard → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════

-- ── TABLAS ──────────────────────────────────────────────────────

create table if not exists membresias (
  id          serial primary key,
  nombre      text unique not null,
  dias        int not null,
  precio      numeric(10,2) not null,
  descripcion text
);

create table if not exists socios (
  id                text primary key,
  nombre            text not null,
  apellido_paterno  text not null,
  apellido_materno  text,
  numero            text unique not null,
  correo            text,
  numero_emergencia text,
  plan              text,
  fecha_inicio      date,
  fecha_vencimiento date,
  visitas           int default 0,
  activo            boolean default true,
  sexo              char(1),
  fecha_nacimiento  date,
  notas             text,
  peso              numeric(5,2),
  musculo           numeric(5,2),
  color             text default '#C8F135',
  created_at        timestamptz default now()
);

create table if not exists abonos (
  id           serial primary key,
  socio_id     text references socios(id) on delete cascade,
  numero       int not null,
  monto        numeric(10,2) not null,
  fecha_limite date not null,
  pagado       boolean default false,
  fecha_pago   date
);

create table if not exists deudas (
  id         bigserial primary key,
  socio_id   text references socios(id) on delete cascade,
  producto   text not null,
  total      numeric(10,2) not null,
  fecha      date not null default current_date,
  created_at timestamptz default now()
);

create table if not exists checkins (
  id         serial primary key,
  socio_id   text references socios(id) on delete cascade,
  hora       text not null,
  fecha      date not null default current_date,
  created_at timestamptz default now()
);

create table if not exists ventas (
  id           serial primary key,
  socio_id     text references socios(id),
  socio_nombre text,
  producto     text not null,
  cantidad     int default 1,
  total        numeric(10,2) not null,
  fecha        date not null default current_date,
  status       text default 'debe',
  tipo         text,
  created_at   timestamptz default now()
);

create table if not exists clases (
  id     serial primary key,
  nombre text unique not null,
  hora   text not null,
  coach  text,
  cupo   int,
  dias   text[],
  color  text
);

create table if not exists productos (
  id     serial primary key,
  nombre text unique not null,
  costo  numeric(10,2) not null,
  stock  int default 0,
  cat    text
);

create table if not exists mensajes_wa (
  id     serial primary key,
  nombre text not null,
  cuerpo text not null
);

create table if not exists inscritos (
  id       serial primary key,
  clase_id int references clases(id) on delete cascade,
  socio_id text references socios(id) on delete cascade,
  unique(clase_id, socio_id)
);

create table if not exists rutinas (
  id       serial primary key,
  socio_id text references socios(id) on delete cascade,
  dia      int not null,
  grupo    text,
  icono    text
);

create table if not exists ejercicios (
  id        serial primary key,
  rutina_id int references rutinas(id) on delete cascade,
  nombre    text not null,
  series    text,
  notas     text,
  manual    boolean default false
);

create table if not exists historico (
  id    serial primary key,
  tipo  text not null,
  mes   text not null,
  valor int not null
);

create table if not exists cuentas (
  id       serial primary key,
  telefono text not null,
  codigo   text not null,
  socios   text[]
);

create table if not exists trainers (
  id       serial primary key,
  telefono text not null,
  codigo   text not null,
  nombre   text
);

-- ── DESHABILITAR RLS (demo/desarrollo) ──────────────────────────
-- En producción: reemplazar por políticas por rol

alter table membresias  disable row level security;
alter table socios      disable row level security;
alter table abonos      disable row level security;
alter table deudas      disable row level security;
alter table checkins    disable row level security;
alter table ventas      disable row level security;
alter table clases      disable row level security;
alter table productos   disable row level security;
alter table mensajes_wa disable row level security;
alter table inscritos   disable row level security;
alter table rutinas     disable row level security;
alter table ejercicios  disable row level security;
alter table historico   disable row level security;
alter table cuentas     disable row level security;
alter table trainers    disable row level security;

-- ── DATOS DEMO ───────────────────────────────────────────────────

insert into membresias (nombre, dias, precio, descripcion) values
  ('Mensual',    30,  1200,  'Acceso completo'),
  ('Trimestral', 90,  3200,  '3 meses'),
  ('Semestral',  180, 5800,  '6 meses'),
  ('Anual',      365, 11000, 'Mejor precio')
on conflict (nombre) do nothing;

insert into clases (nombre, hora, coach, cupo, dias, color) values
  ('CrossFit',  '07:00', 'Diego',   15, array['Lun','Mié','Vie'], '#FF5C35'),
  ('Yoga Flow', '09:00', 'Marta',   12, array['Lun','Mar','Jue'], '#4ECDC4'),
  ('Spinning',  '18:00', 'Rodrigo', 20, array['Mar','Jue','Sáb'], '#FFE66D'),
  ('Pilates',   '19:30', 'Sofía',   10, array['Lun','Mié','Vie'], '#A8DADC')
on conflict (nombre) do nothing;

insert into productos (nombre, costo, stock, cat) values
  ('Proteína Whey', 850, 12, 'Suplementos'),
  ('Creatina',      420, 8,  'Suplementos'),
  ('Guantes',       250, 20, 'Accesorios')
on conflict (nombre) do nothing;

insert into mensajes_wa (nombre, cuerpo) values
  ('Recordatorio de pago', 'Hola {nombre} 👋, tu membresía {plan} vence pronto. ¡Renuévala! 💪'),
  ('Membresía vencida',    'Hola {nombre}, tu membresía {plan} ha vencido. Realiza tu pago para reactivar.'),
  ('Abono pendiente',      'Hola {nombre}, tienes un abono pendiente de tu plan {plan}. Pasa a liquidarlo. 🙏'),
  ('Deuda de producto',    'Hola {nombre}, tienes productos pendientes de pago en Contender Club.'),
  ('Bienvenida',           '¡Bienvenido a Contender Club, {nombre}! Tu membresía {plan} ya está activa. 💪');

insert into socios (id, nombre, apellido_paterno, apellido_materno, numero, correo,
  numero_emergencia, plan, fecha_inicio, fecha_vencimiento,
  visitas, activo, sexo, fecha_nacimiento, notas, peso, musculo, color)
values
  ('001','Carlos','Mendoza','López',  '7221234567','carlos@mail.com','5512340099',
   'Mensual',   '2026-05-01','2026-05-31',18,true,'M','1990-03-15','',  78,44,'#C8F135'),
  ('006','Mateo', 'Mendoza','López',  '5512340006','mateo@mail.com', '5512340099',
   'Trimestral','2026-05-01','2026-07-30',8, true,'M','2010-06-20','Menor de edad',42,20,'#4ECDC4')
on conflict (id) do nothing;

insert into abonos (socio_id, numero, monto, fecha_limite, pagado, fecha_pago) values
  ('001', 1, 600,  '2026-05-08', true,  '2026-05-07'),
  ('001', 2, 600,  '2026-05-15', true,  '2026-05-14'),
  ('006', 1, 1600, '2026-05-15', true,  '2026-05-13'),
  ('006', 2, 1600, '2026-05-31', false, null);

insert into deudas (socio_id, producto, total, fecha) values
  ('001', 'Proteína Whey', 850, '2026-05-14'),
  ('001', 'Guantes',       250, '2026-05-10');

insert into ventas (socio_id, socio_nombre, producto, cantidad, total, fecha, status, tipo) values
  ('001', 'Carlos Mendoza', 'Proteína Whey', 1, 850, '2026-05-14', 'debe',   'prod'),
  ('006', 'Mateo Mendoza',  'Creatina',      1, 420, '2026-05-14', 'pagado', 'prod');

insert into inscritos (clase_id, socio_id)
select c.id, '001' from clases c where c.nombre = 'CrossFit'  on conflict do nothing;
insert into inscritos (clase_id, socio_id)
select c.id, '001' from clases c where c.nombre = 'Yoga Flow' on conflict do nothing;
insert into inscritos (clase_id, socio_id)
select c.id, '006' from clases c where c.nombre = 'Pilates'   on conflict do nothing;

insert into historico (tipo, mes, valor) values
  ('ventas','Ene',9800), ('ventas','Feb',10200),('ventas','Mar',11500),
  ('ventas','Abr',10800),('ventas','May',12270),
  ('checkins','Ene',62),('checkins','Feb',74), ('checkins','Mar',80),
  ('checkins','Abr',71),('checkins','May',88),
  ('socios','Ene',3),   ('socios','Feb',3),    ('socios','Mar',4),
  ('socios','Abr',4),   ('socios','May',4);

insert into cuentas (telefono, codigo, socios) values
  ('7221234567', '001', array['001','006']);

insert into trainers (telefono, codigo, nombre) values
  ('5512345678', 'TRAINER01', 'Diego');
