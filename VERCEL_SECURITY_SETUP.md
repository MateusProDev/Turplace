# Configuração de Segurança - Vercel

## Variáveis de Ambiente Necessárias

Para que a funcionalidade de domínios personalizados funcione corretamente, você precisa configurar as seguintes variáveis de ambiente no painel do Vercel:

### Produção (Environment Variables)
- `VITE_VERCEL_ACCESS_TOKEN`: Token de acesso pessoal do Vercel (para API)
- `VERCEL_TEAM_ID`: ID do time do Vercel (opcional, se usar time)

### Desenvolvimento (Environment Variables)
- `VITE_VERCEL_ACCESS_TOKEN`: Token de acesso pessoal do Vercel (para desenvolvimento local)
- `VERCEL_TEAM_ID`: ID do time do Vercel (opcional, se usar time)

## Como Obter o Token de Acesso

1. Acesse [Vercel Account Settings](https://vercel.com/account/tokens)
2. Clique em "Create Token"
3. Dê um nome descritivo (ex: "Turplace API Access")
4. Copie o token gerado

## Como Configurar no Vercel

1. Acesse seu projeto no [Vercel Dashboard](https://vercel.com/dashboard)
2. Vá para Settings → Environment Variables
3. Adicione as variáveis acima
4. Certifique-se de marcar "Production", "Preview" e "Development" conforme necessário

## Segurança Importante

- **NUNCA** commite tokens no código
- Use sempre variáveis de ambiente
- O arquivo `.env` deve conter apenas placeholders
- Tokens reais devem ficar apenas no Vercel

## Verificação

Após configurar, teste a funcionalidade de domínios personalizados para garantir que está funcionando.