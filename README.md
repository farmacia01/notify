## Sales Alert PWA

PWA em Next.js App Router para simular notificacoes de vendas por Web Push.
O app usa Supabase Auth/Database/RLS, service worker, VAPID e rotas server-side para disparos via n8n.

## Setup rapido

1. Instale dependencias:

```bash
npm install
```

2. Crie `.env.local` a partir de `.env.example`.
3. Rode `supabase/schema.sql` no SQL Editor do Supabase.
4. Gere VAPID keys:

```bash
npx web-push generate-vapid-keys
```

5. Inicie localmente:

```bash
npm run dev
```

Abra `http://localhost:3000`.

## Documentacao

- Supabase: `docs/supabase-setup.md`
- n8n: `docs/n8n-setup.md`
- Vercel: `docs/vercel-deploy.md`

## Rotas

- `/login`
- `/register`
- `/dashboard`
- `POST /api/push/subscribe`
- `POST /api/push/test`
- `POST /api/push/send`

Notificacoes `demo` e `teste` sao simulacoes internas. O tipo `real` esta preparado para uma integracao futura com webhook real da Cakto.
