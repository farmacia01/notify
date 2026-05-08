# Supabase setup

## 1. Criar projeto

Crie um projeto no Supabase e copie:

1. Project URL
2. anon key
3. service_role key

Use a `service_role` somente nas variaveis de ambiente do servidor/Vercel. Ela nunca deve entrar no frontend.

## 2. Rodar SQL

No SQL Editor do Supabase, execute o arquivo:

```text
supabase/schema.sql
```

O SQL cria:

1. `push_subscriptions`
2. `notifications`
3. indices
4. trigger de `updated_at`
5. check constraint para `demo`, `teste`, `real`
6. RLS e policies por usuario
7. grants para a Data API

Os grants sao importantes para projetos novos do Supabase em que tabelas no schema `public` podem nao ficar expostas automaticamente para a Data API.

## 3. Configurar Auth

No painel do Supabase:

1. Habilite Email/Password em Authentication > Providers.
2. Para teste rapido, voce pode desabilitar confirmacao obrigatoria de email.
3. Em production, configure SMTP e URLs de redirect do dominio Vercel.

## 4. Variaveis locais

Crie `.env.local` a partir de `.env.example`:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@seudominio.com

N8N_SECRET_TOKEN=
```

## 5. Gerar VAPID

Com as dependencias instaladas:

```bash
npx web-push generate-vapid-keys
```

Copie a chave publica para `NEXT_PUBLIC_VAPID_PUBLIC_KEY` e a privada para `VAPID_PRIVATE_KEY`.

## 6. Verificacao de RLS

Com um usuario logado, o dashboard deve mostrar apenas registros cujo `user_id` seja o dele. A API `/api/push/send` usa service role no servidor para inserir historico e limpar subscriptions invalidas.
