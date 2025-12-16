const fs = require('fs');
const path = require('path');
const Stripe = require('stripe');
const admin = require('firebase-admin');
require('dotenv').config();

const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
  console.error('STRIPE_SECRET_KEY não encontrado em .env');
  process.exit(1);
}

// Use a versão padrão da SDK/servidor (não forçamos uma apiVersion aqui)
const stripe = new Stripe(stripeKey);

const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY;

if (firebaseProjectId && firebaseClientEmail && firebasePrivateKey) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: firebaseProjectId,
      clientEmail: firebaseClientEmail,
      privateKey: firebasePrivateKey.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.apps.length ? admin.firestore() : null;

async function createProductsAndPrices() {
  const plans = [
    {
      id: 'free',
      name: 'Free',
      commissionPercent: 15,
      features: ['Sem destaque', 'Sem analytics'],
      price_cents: 0,
    },
    {
      id: 'professional',
      name: 'Profissional',
      commissionPercent: 8,
      features: ['Destaque no catálogo', 'Perfil verificado'],
      price_cents: 990,
    },
    {
      id: 'premium',
      name: 'Premium',
      commissionPercent: 5,
      features: ['Topo da categoria', 'Leads prioritários', 'Analytics avançado'],
      price_cents: 1990,
    },
  ];

  const results = [];

  for (const plan of plans) {
    console.log(`Processando plano: ${plan.name}`);

    // Tenta encontrar produto já existente com metadata.planId
    let product = null;
    try {
      const existing = await stripe.products.list({ limit: 100 });
      product = existing.data.find(p => p.metadata && p.metadata.planId === plan.id) || null;
    } catch (err) {
      console.warn('Erro buscando produtos existentes, continuará criando novo produto', err.message || err);
    }

    if (!product) {
      product = await stripe.products.create({
        name: `Turplace - ${plan.name}`,
        metadata: { planId: plan.id },
      });
      console.log(`Produto criado: ${product.id}`);
    } else {
      console.log(`Produto existente reutilizado: ${product.id}`);
    }

    // Verifica se há preço existente com mesmo amount/currency/recurring
    let price = null;
    try {
      const prices = await stripe.prices.list({ product: product.id, limit: 100 });
      price = prices.data.find(p => p.unit_amount === plan.price_cents && p.currency === 'brl' && p.recurring && p.recurring.interval === 'month') || null;
    } catch (err) {
      console.warn('Erro buscando preços existentes, continuará criando novo preço', err.message || err);
    }

    if (!price) {
      price = await stripe.prices.create({
        unit_amount: plan.price_cents,
        currency: 'brl',
        recurring: { interval: 'month' },
        product: product.id,
      });
      console.log(`Preço criado: ${price.id}`);
    } else {
      console.log(`Preço existente reutilizado: ${price.id}`);
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
      await db.collection('plans').doc(plan.id).set(record);
      console.log(`Salvo no Firestore: plans/${plan.id}`);
    }
  }

  const outFile = process.env.OUTFILE || path.join(process.cwd(), 'stripe-plans.json');
  fs.writeFileSync(outFile, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`Plano(s) gravado(s) em: ${outFile}`);
}

createProductsAndPrices().then(() => {
  console.log('Todos os planos foram criados.');
}).catch((err) => {
  console.error('Erro criando planos:', err);
  process.exit(1);
});
