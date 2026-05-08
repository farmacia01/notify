# Deploy na Vercel

## 1. Importar projeto

Conecte o repositorio na Vercel e mantenha o framework como Next.js.

## 2. Configurar variaveis

Adicione em Project Settings > Environment Variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT
N8N_SECRET_TOKEN
```

`SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PRIVATE_KEY` e `N8N_SECRET_TOKEN` devem ficar somente no servidor.

## 3. Build

Comando:

```bash
npm run build
```

## 4. Pos-deploy

1. Abra `https://SEU_DOMINIO.vercel.app/register`.
2. Crie uma conta e entre no dashboard.
3. Instale o PWA pelo navegador.
4. Clique em `Ativar notificacoes`.
5. Clique em `Enviar notificacao de teste`.
6. Configure o HTTP Request do n8n apontando para `/api/push/send`.

Web Push exige HTTPS em producao. Localhost tambem e aceito pelos navegadores para desenvolvimento.
