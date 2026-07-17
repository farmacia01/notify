# Evopay Notify — PWA de Notificações Push de Vendas

PWA em Next.js que dispara notificações push (Web Push) simulando alertas de venda/comissão, com autenticação, histórico e um endpoint feito para ser acionado por automações do n8n.

## O que é

O projeto é um simulador de notificações de vendas: o usuário cria conta, instala o app como PWA e ativa as notificações push do navegador. A partir daí, um endpoint autenticado (`POST /api/push/send`) pode ser chamado — manualmente ou por um workflow do n8n — para disparar uma ou várias notificações com valores e mensagens aleatórios, delays "humanizados" entre disparos e histórico salvo por usuário.

Os disparos são marcados por `type` (`demo`, `teste` ou `real`) para deixar claro quando é uma simulação interna e quando é um evento real de venda — o fluxo com webhook real da Evopay está preparado no código mas ainda não conectado a uma origem de produção.

É um projeto completo e funcional (não é um scaffold vazio): tem autenticação real via Supabase, banco com RLS, service worker de PWA, geração/validação de chaves VAPID e uma API com validação de payload via Zod.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS 4** para estilo
- **Supabase** (Auth + Postgres com Row Level Security) como backend
- **web-push** para envio de notificações via protocolo Web Push (VAPID)
- **Zod** para validação dos payloads da API
- **PWA** com service worker e manifest (`public/sw.js`, `public/manifest.json`)
- Deploy pensado para **Vercel**, com automação externa via **n8n**

## Estrutura principal

```
src/app/
  page.tsx                 # redireciona para /dashboard
  login/, register/        # autenticação
  dashboard/                # painel com estatísticas, histórico e ativação de push
  api/push/subscribe/       # salva a inscrição push do navegador
  api/push/test/            # dispara notificação de teste para o próprio usuário
  api/push/send/            # endpoint autenticado por Bearer token, usado pelo n8n
src/lib/
  push.ts                   # envio via web-push, sanitização de texto/URL
  supabase/                 # clients (browser, server, admin)
supabase/schema.sql          # tabelas push_subscriptions e notifications, RLS e policies
docs/                        # guias de setup (Supabase, n8n, deploy na Vercel)
```

## Rotas

- `/login`, `/register`, `/dashboard`
- `POST /api/push/subscribe` — registra a inscrição push do dispositivo
- `POST /api/push/test` — dispara uma notificação de teste para o usuário logado
- `POST /api/push/send` — protegida por `Authorization: Bearer <N8N_SECRET_TOKEN>`; aceita um disparo único ou múltiplos disparos (`quantity`, faixa de valores, mensagens e delays configuráveis)

## Como rodar localmente

```bash
npm install
```

1. Crie um projeto no Supabase e rode `supabase/schema.sql` no SQL Editor (cria tabelas, RLS e policies).
2. Gere as chaves VAPID:

```bash
npx web-push generate-vapid-keys
```

3. Crie um `.env.local` com:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@seudominio.com

N8N_SECRET_TOKEN=
```

4. Inicie o servidor:

```bash
npm run dev
```

Abra `http://localhost:3000`.

Guias mais detalhados em `docs/supabase-setup.md`, `docs/n8n-setup.md` e `docs/vercel-deploy.md`.

## Status

Projeto funcional e com poucos commits (fase inicial de branding/implementação). O fluxo de simulação (`demo`/`teste`) está pronto de ponta a ponta; a integração com um webhook real de vendas da Evopay ainda não foi conectada.
