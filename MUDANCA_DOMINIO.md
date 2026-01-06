# 🔄 Mudança de Domínio para lucrazi.com.br

## 📋 Resumo
Mudança de `turplace.turvia.com.br` para `lucrazi.com.br`

---

## 🔧 1. Arquivo `.env` - ALTERAÇÕES NECESSÁRIAS

### URLs que precisam ser alteradas:

```env
# DEPOIS (URLs ATUALIZADAS)
VITE_API_URL=https://lucrazi.com.br
FRONTEND_URL=https://lucrazi.com.br
MERCADO_PAGO_WEBHOOK_URL=https://lucrazi.com.br/api/mercadopago-webhook
ABACATEPAY_RETURN_URL=https://lucrazi.com.br/return
ABACATEPAY_COMPLETION_URL=https://lucrazi.com.br/payment/success
ABACATEPAY_WEBHOOK_URL=https://lucrazi.com.br/api/abacatepay-webhook

# DEPOIS
VITE_API_URL=https://lucrazi.com.br
FRONTEND_URL=https://lucrazi.com.br
MERCADO_PAGO_WEBHOOK_URL=https://lucrazi.com.br/api/mercadopago-webhook
ABACATEPAY_RETURN_URL=https://lucrazi.com.br/return
ABACATEPAY_COMPLETION_URL=https://lucrazi.com.br/payment/success
ABACATEPAY_WEBHOOK_URL=https://lucrazi.com.br/api/abacatepay-webhook

# OAUTH - Mercado Pago (para vendedores conectarem suas contas)
MERCADO_PAGO_REDIRECT_URI=https://lucrazi.com.br/auth/mercadopago/callback
```

---

## 🌐 2. ROTAS DO MARKETPLACE

✅ **As rotas já estão corretas!** 
- `/marketplace` funcionará automaticamente como `lucrazi.com.br/marketplace`
- `/catalog` funcionará como `lucrazi.com.br/catalog`
- `/service/nome-do-servico` funcionará como `lucrazi.com.br/service/nome-do-servico`

Você **NÃO precisa mudar nada** nos componentes React Router, pois são rotas relativas.

---

## 💳 3. WEBHOOKS - CONFIGURAÇÕES EXTERNAS

### 3.1 Mercado Pago

#### 🔴 IMPORTANTE: Você tem 2 configurações a fazer!

🔗 Acesse: https://www.mercadopago.com.br/developers/panel/app

#### A) **URLs de Redirecionamento** (OAuth - para vendedores conectarem suas contas)

Na tela **"Editar aplicação"** onde você está:

1. **URL do site em produção**: 
   ```
   https://lucrazi.com.br
   ```

2. **URLs de redirecionamento** (OAuth):
   ```
   https://lucrazi.com.br/auth/mercadopago/callback
   https://lucrazi.com.br/provider/connect/mercadopago
   https://lucrazi.com.br/dashboard/connect-success
   ```
   
3. **Usar o fluxo de código de autorização com o PKCE?**: Selecione **SIM** (mais seguro)

4. **Permissões da aplicação**: Marque:
   - ✅ Processar pagamentos
   - ✅ Gerenciar vendas e cobranças
   - ✅ Ler informações da conta

#### B) **Webhooks** (Notificações de pagamento)

1. Procure a aba/seção **"Webhooks"** ou **"Notificações"** no menu lateral
2. Adicione a URL do webhook:
   ```
   https://lucrazi.com.br/api/mercadopago-webhook
   ```
3. Selecione os eventos:
   - ✅ Pagamentos
   - ✅ Cobranças
   - ✅ Chargebacks
4. Salve as alterações

### 3.2 AbacatePay
🔗 Acesse: https://abacatepay.com/dashboard

1. Vá em **Configurações** → **Webhooks**
2. Altere as URLs:
   - **Webhook URL**: `https://lucrazi.com.br/api/abacatepay-webhook`
   - **Return URL**: `https://lucrazi.com.br/return`
   - **Completion URL**: `https://lucrazi.com.br/payment/success`
3. Salve as alterações

### 3.3 Stripe (se estiver usando)
🔗 Acesse: https://dashboard.stripe.com/webhooks

1. Encontre seu webhook endpoint
2. Altere de:
   ```
   https://turplace.turvia.com.br/api/stripe-webhook
   ```
   Para:
   ```
   https://lucrazi.com.br/api/stripe-webhook
   ```
3. Salve as alterações

---

## ☁️ 4. DEPLOY / HOSPEDAGEM

### 4.1 Vercel (se estiver usando)
1. Acesse https://vercel.com/dashboard
2. Vá no projeto
3. **Settings** → **Domains**
4. Adicione o domínio `lucrazi.com.br`
5. Configure os registros DNS conforme instruções da Vercel

### 4.2 Variáveis de Ambiente no Vercel
1. **Settings** → **Environment Variables**
2. Atualize as variáveis:
   - `FRONTEND_URL` → `https://lucrazi.com.br`
   - `VITE_API_URL` → `https://lucrazi.com.br`
   - `MERCADO_PAGO_WEBHOOK_URL` → `https://lucrazi.com.br/api/mercadopago-webhook`
   - `MERCADO_PAGO_REDIRECT_URI` → `https://lucrazi.com.br/auth/mercadopago/callback` (OAuth)
   - `ABACATEPAY_WEBHOOK_URL` → `https://lucrazi.com.br/api/abacatepay-webhook`
   - `ABACATEPAY_RETURN_URL` → `https://lucrazi.com.br/return`
   - `ABACATEPAY_COMPLETION_URL` → `https://lucrazi.com.br/payment/success`
3. Faça **Redeploy** do projeto

---

## 🌍 5. CONFIGURAÇÃO DE DNS

No seu provedor de DNS (Registro.br, Cloudflare, etc.):

```
Tipo: A ou CNAME
Nome: @ (ou deixe vazio para domínio raiz)
Valor: [IP do servidor Vercel] ou [CNAME da Vercel]

Tipo: CNAME
Nome: www
Valor: lucrazi.com.br
```

**Exemplo Vercel:**
```
A     @     76.76.21.21
CNAME www   cname.vercel-dns.com
```

---

## 📧 6. EMAILS DE RECUPERAÇÃO (Firebase Auth)

1. Acesse: https://console.firebase.google.com
2. Vá em **Authentication** → **Templates**
3. Para cada template (Redefinir senha, Verificação de e-mail):
   - Clique em **Editar**
   - Altere o domínio nas URLs de:
     ```
     https://turplace.turvia.com.br
     ```
     Para:
     ```
     https://lucrazi.com.br
     ```
4. Salve cada template

---

## 🔐 7. CORS / DOMÍNIOS AUTORIZADOS

### 7.1 Firebase
1. Acesse: https://console.firebase.google.com
2. Vá em **Authentication** → **Settings** → **Authorized domains**
3. Adicione `lucrazi.com.br`
4. (Opcional) Remova `turplace.turvia.com.br` depois que tudo estiver funcionando

### 7.2 APIs de Pagamento
- **Mercado Pago**: Adicione `lucrazi.com.br` nos domínios autorizados
- **AbacatePay**: Verifique se há lista de domínios permitidos
- **Stripe**: Adicione `lucrazi.com.br` nos domínios autorizados

---

## ✅ CHECKLIST DE VERIFICAÇÃO

Após fazer todas as mudanças, teste:

- [ ] Homepage carrega em `https://lucrazi.com.br`
- [ ] Marketplace carrega em `https://lucrazi.com.br/marketplace`
- [ ] Catálogo carrega em `https://lucrazi.com.br/catalog`
- [ ] Login/Cadastro funcionando
- [ ] Detalhes de produtos carregam corretamente
- [ ] Checkout do Mercado Pago funciona
- [ ] Checkout do AbacatePay funciona
- [ ] Webhooks de pagamento estão sendo recebidos
- [ ] Emails do Firebase têm o domínio correto
- [ ] Redirecionamentos após pagamento funcionam

---

## 🚨 IMPORTANTE

1. **Mantenha o domínio antigo ativo temporariamente** durante a transição
2. **Configure redirect 301** de `turplace.turvia.com.br` para `lucrazi.com.br`
3. **Teste todos os fluxos de pagamento** antes de desativar o domínio antigo
4. **Monitore os webhooks** nos primeiros dias para garantir que estão chegando
5. **Faça backup** do arquivo `.env` antes de qualquer alteração

---

## 📝 ORDEM RECOMENDADA DE EXECUÇÃO

1. ✅ Atualizar arquivo `.env` local
2. ✅ Atualizar variáveis no Vercel/hospedagem
3. ✅ Configurar DNS apontando para novo domínio
4. ✅ Aguardar propagação DNS (até 48h)
5. ✅ Atualizar webhooks no Mercado Pago
6. ✅ Atualizar webhooks no AbacatePay
7. ✅ Atualizar templates de email no Firebase
8. ✅ Adicionar domínio nos domínios autorizados (Firebase, APIs)
9. ✅ Fazer deploy
10. ✅ Testar todos os fluxos
11. ✅ Configurar redirect 301 do domínio antigo
12. ✅ Monitorar por alguns dias

---

## 🆘 SUPORTE

Se algo não funcionar:
1. Verifique o console do navegador (F12)
2. Verifique os logs no Vercel
3. Verifique se o DNS propagou: https://dnschecker.org
4. Teste os webhooks manualmente
