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

1. **Acesse** [Vercel Dashboard](https://vercel.com/dashboard) → Seu Projeto → Settings → Environment Variables
2. **Adicione** as variáveis:
   - `VITE_VERCEL_ACCESS_TOKEN`: Seu token pessoal do Vercel
   - `VERCEL_TEAM_ID`: ID do time (opcional, se usar time)
3. **Marque** "Production", "Preview" e "Development"
4. **Re-deploy** o projeto

⚠️ **IMPORTANTE**: Use o prefixo `VITE_` para que a variável fique disponível no frontend durante o runtime.

## Segurança Importante

- **NUNCA** commite tokens no código
- Use sempre variáveis de ambiente
- O arquivo `.env` deve conter apenas placeholders
- Tokens reais devem ficar apenas no Vercel

## Verificação

Após configurar, teste a funcionalidade de domínios personalizados para garantir que está funcionando.