Segurança — chaves secretas

1) Não commite chaves secretas no repositório. Use `.env` local e adicione `.env` ao `.gitignore`.
2) Se uma chave foi exposta (por exemplo, postada publicamente), revogue/rotacione imediatamente via Stripe Dashboard: https://dashboard.stripe.com/apikeys
3) Para uso local, crie um arquivo `.env` com as variáveis necessárias. Exemplo:

STRIPE_SECRET_KEY=sk_live_xxx
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

4) Para rodar o script de criação de planos localmente (PowerShell):

powershell
# cria .env com conteúdo seguro (substitua pela sua chave)
$envContent = @"
STRIPE_SECRET_KEY=sk_live_SEU_VALOR_AQUI
OUTFILE=./stripe-plans.json
"@
Set-Content -Path .\.env -Value $envContent -Encoding UTF8

npm install
npm run create:stripe-plans

5) Depois de rodar, remova a chave do arquivo se for temporária e rotacione quando achar necessário.
