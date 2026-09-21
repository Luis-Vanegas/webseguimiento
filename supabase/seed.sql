-- Datos de prueba SOLO para desarrollo local (`supabase start` / `supabase db reset`).
-- Nunca se aplica a producción: `supabase db push` no ejecuta seed.sql.
--
-- Usuarios (contraseña de todos: 123456):
--   ingeniero@local.test     -> rol ingeniero
--   visitador@local.test     -> rol visitador
--   visualizador@local.test  -> rol visualizador
--
-- Nota: en producción un usuario son DOS filas (auth.users + usuarios_seguimiento);
-- scripts/crear-usuario.mjs hace ambas. Acá se hace directo por SQL.

do $$
declare
  u record;
begin
  for u in
    select * from (values
      ('00000000-0000-0000-0000-0000000000a1'::uuid, 'ingeniero@local.test',    'Ingeniero Local',    'ingeniero'),
      ('00000000-0000-0000-0000-0000000000a2'::uuid, 'visitador@local.test',    'Visitador Local',    'visitador'),
      ('00000000-0000-0000-0000-0000000000a3'::uuid, 'visualizador@local.test', 'Visualizador Local', 'visualizador')
    ) as t(id, email, nombre, rol)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new
    ) values (
      '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated',
      u.email, crypt('123456', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now(),
      '', '', '', ''
    );

    insert into auth.identities (
      id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), u.id, u.id::text, 'email',
      jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
      now(), now(), now()
    );

    insert into usuarios_seguimiento (id, nombre, rol) values (u.id, u.nombre, u.rol);
  end loop;
end
$$;
