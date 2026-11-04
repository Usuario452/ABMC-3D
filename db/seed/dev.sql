-- Administrador SOMENTE para desenvolvimento local (npm run db:seed:dev).
-- E-mail: admin@abmc3d.com
-- Senha:  admin123
-- Senha fraca e pública de propósito: o script db-seed-dev.mts recusa qualquer banco que não seja
-- local (127.0.0.1/localhost). Em produção, use npm run db:create-admin:prod.
insert into admin_users (email, password_hash)
values ('admin@abmc3d.com', 'scrypt$32768$8$1$yZ2JqZ3eklNW4sZlUOuM3Q$d9kI6_rLQim3-9wb5hSE33myT0S13LrJ3D0GS_ee8jQK0l5ztvY2K0uVgFeYHT2rHrgnt_1yneZjbe02-nNVGA')
on conflict (email) do update set password_hash = excluded.password_hash;
