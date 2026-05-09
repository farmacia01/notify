# n8n setup

Este app funciona como simulador de notificacoes de vendas. Payloads com `type` igual a `demo` ou `teste` devem ser tratados como simulacoes internas.

## Fluxo basico n8n

1. Schedule Trigger
2. Set
3. HTTP Request

## HTTP Request

Method: `POST`

URL:

```text
https://SEU_DOMINIO.vercel.app/api/push/send
```

Headers:

```text
Authorization: Bearer SEU_N8N_SECRET_TOKEN
Content-Type: application/json
```

Body JSON:

```json
{
  "title": "Nova venda aprovada",
  "body": "Venda de R$ 97,00 aprovada na Evopay",
  "url": "https://app.evopay.com.br",
  "type": "demo"
}
```

Para enviar a um usuario especifico, inclua `user_id`:

```json
{
  "user_id": "00000000-0000-0000-0000-000000000000",
  "title": "Nova venda aprovada",
  "body": "Venda de R$ 97,00 aprovada na Evopay",
  "url": "https://app.evopay.com.br",
  "type": "demo"
}
```

Sem `user_id`, a rota envia para todos os usuarios com dispositivos cadastrados.

## Fluxo futuro com Evopay

1. Webhook Trigger recebendo evento real da Evopay
2. Set formatando `title`, `body`, `url` e `type`
3. HTTP Request chamando `/api/push/send`

Quando a origem for um evento real e validado da Evopay, envie `type` como `real`. Enquanto estiver simulando, use `demo` ou `teste`.
