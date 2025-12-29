const fs = require('fs');
const path = require('path');
const Stripe = require('stripe');
const admin = require('firebase-admin');
require('dotenv').config();

async function createProductsAndPrices() {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    console.error('STRIPE_SECRET_KEY não encontrado em .env');
    process.exit(1);
  }

  // Use a versão padrão da SDK/servidor (não forçamos uma apiVersion aqui)
  const stripe = new Stripe(stripeKey);

  console.log('✅ Stripe inicializado com sucesso');

  // Testar conexão com Stripe
  try {
    await stripe.balance.retrieve();
    console.log('✅ Conexão com Stripe verificada');
  } catch (err) {
    console.error('❌ Erro na conexão com Stripe:', err.message);
    process.exit(1);
  }

  const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
  const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY;
  const firebaseServiceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (firebaseServiceAccountJson) {
    // Usar FIREBASE_SERVICE_ACCOUNT_JSON se disponível
    try {
      const sa = JSON.parse(firebaseServiceAccountJson);
      admin.initializeApp({ credential: admin.credential.cert(sa) });
    } catch (err) {
      console.error('FIREBASE_SERVICE_ACCOUNT_JSON é inválido:', err.message);
      process.exit(1);
    }
  } else if (firebaseProjectId && firebaseClientEmail && firebasePrivateKey) {
    // Fallback para variáveis separadas
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: firebaseProjectId,
        clientEmail: firebaseClientEmail,
        privateKey: firebasePrivateKey.replace(/\\n/g, '\n'),
      }),
    });
  } else {
    console.error('Credenciais Firebase não encontradas. Configure FIREBASE_SERVICE_ACCOUNT_JSON ou as variáveis separadas.');
    process.exit(1);
  }

  const db = admin.apps.length ? admin.firestore() : null;

  if (!db) {
    console.error('Erro: Firestore não foi inicializado corretamente');
    process.exit(1);
  }

  console.log('✅ Firebase Admin inicializado com sucesso');
  console.log('✅ Firestore conectado');
  console.log('🚀 Iniciando criação/atualização de planos...\n');

  const plans = [
    {
      id: 'free',
      name: 'Free',
      commissionPercent: 9,
      features: [
        'Taxa de 9% por transação',
        'Acesso completo à plataforma',
        'Até 10 serviços cadastrados',
        'Lead page personalizada',
        'Suporte básico'
      ],
      price_cents: 0,
    },
    {
      id: 'professional',
      name: 'Pro',
      commissionPercent: 7,
      features: [
        'Taxa reduzida de 7% por transação',
        'Destaque no catálogo',
        'Perfil verificado',
        'Até 20 serviços cadastrados',
        '3 modelos de lead page',
        'Domínio personalizado',
        'Suporte prioritário'
      ],
      price_cents: 999,
    },
    {
      id: 'premium',
      name: 'Premium',
      commissionPercent: 6,
      features: [
        'Taxa mínima de 6% por transação',
        'Topo da categoria',
        'Leads prioritários',
        'Até 100 serviços cadastrados',
        '5 modelos de lead page',
        'Domínio personalizado',
        'Analytics avançado',
        'Suporte VIP 24/7',
        'Relatórios personalizados'
      ],
      price_cents: 1999,
    },
  ];

  console.log(`📋 Processando ${plans.length} planos...\n`);
  const results = [];

  for (const plan of plans) {
    console.log(`\n📦 Processando plano: ${plan.name} (${plan.id})`);
    console.log(`   💰 Comissão: ${plan.commissionPercent}%`);
    console.log(`   💵 Preço: R$ ${(plan.price_cents / 100).toFixed(2)}`);

    // Tenta encontrar produto já existente com metadata.planId
    let product = null;
    try {
      console.log('   🔍 Buscando produto existente...');
      const existing = await stripe.products.list({ limit: 100 });
      product = existing.data.find(p => p.metadata && p.metadata.planId === plan.id) || null;
      if (product) {
        console.log(`   ✅ Produto encontrado: ${product.id}`);
      } else {
        console.log('   ℹ️ Produto não encontrado, será criado');
      }
    } catch (err) {
      console.warn('   ⚠️ Erro buscando produtos existentes:', err.message || err);
    }

    if (!product) {
      console.log('   🆕 Criando novo produto...');
      product = await stripe.products.create({
        name: `Turplace - ${plan.name}`,
        metadata: { planId: plan.id },
      });
      console.log(`   ✅ Produto criado: ${product.id}`);
    } else {
      console.log(`   ♻️ Produto existente reutilizado: ${product.id}`);
    }

    // Verifica se há preço existente com mesmo amount/currency/recurring
    let price = null;
    try {
      console.log('   🔍 Verificando preço existente...');
      const prices = await stripe.prices.list({ product: product.id, limit: 100 });
      price = prices.data.find(p => p.unit_amount === plan.price_cents && p.currency === 'brl' && p.recurring && p.recurring.interval === 'month') || null;
      if (price) {
        console.log(`   ✅ Preço encontrado: ${price.id}`);
      } else {
        console.log('   ℹ️ Preço não encontrado, será criado');
      }
    } catch (err) {
      console.warn('   ⚠️ Erro buscando preços existentes:', err.message || err);
    }

    if (!price) {
      console.log('   🆕 Criando novo preço...');
      price = await stripe.prices.create({
        unit_amount: plan.price_cents,
        currency: 'brl',
        recurring: { interval: 'month' },
        product: product.id,
      });
      console.log(`   ✅ Preço criado: ${price.id}`);
    } else {
      console.log(`   ♻️ Preço existente reutilizado: ${price.id}`);
    }

    const record = {
      planId: plan.id,
      stripeProductId: product.id,
      stripePriceId: price.id,
      name: plan.name,
      commissionPercent: plan.commissionPercent,
      features: plan.features,
      price_cents: plan.price_cents,
      createdAt: new Date().toISOString(),
    };

    results.push(record);

    if (db) {
      console.log('   💾 Salvando no Firestore...');
      await db.collection('plans').doc(plan.id).set(record);
      console.log(`   ✅ Salvo no Firestore: plans/${plan.id}`);
    }

    console.log(`   🎉 Plano ${plan.name} processado com sucesso!\n`);
  }

  const outFile = process.env.OUTFILE || path.join(process.cwd(), 'stripe-plans.json');
  console.log(`\n💾 Salvando arquivo JSON: ${outFile}`);
  fs.writeFileSync(outFile, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`✅ Arquivo JSON gravado com sucesso`);

  console.log('\n🎊 RESUMO DA EXECUÇÃO:');
  console.log(`   📊 Total de planos processados: ${results.length}`);
  results.forEach(plan => {
    console.log(`   ✅ ${plan.name}: ${plan.commissionPercent}% comissão`);
  });
  console.log(`\n🚀 Todos os planos foram criados/atualizados com sucesso!`);
}

createProductsAndPrices().then(() => {
  console.log('\n🎉 Script executado com sucesso!');
  process.exit(0);
}).catch((err) => {
  console.error('\n❌ Erro executando script:', err);
  console.error('Stack trace:', err.stack);
  process.exit(1);
});
