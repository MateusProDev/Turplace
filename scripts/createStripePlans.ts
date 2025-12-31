import fs from 'fs';
import path from 'path';
import Stripe from 'stripe';
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
  console.error('STRIPE_SECRET_KEY não encontrado em .env');
  process.exit(1);
}

const stripe = new Stripe(stripeKey, { apiVersion: '2022-11-15' });

// Inicializa Firebase Admin se variáveis estiverem presentes
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY;

if (firebaseProjectId && firebaseClientEmail && firebasePrivateKey) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: firebaseProjectId,
      clientEmail: firebaseClientEmail,
      // Ajusta quebras de linha se necessário
      privateKey: firebasePrivateKey.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.apps.length ? admin.firestore() : null;

async function createProductsAndPrices() {
  // Definição dos planos conforme especificado
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
      // preço simbólico mensal (em centavos) para criar um preço Stripe; se quiser grátis use 0 e tipo=one_time
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

  const results: Record<string, unknown>[] = [];

  for (const plan of plans) {
    console.log(`Criando produto: ${plan.name}`);

    // Cria produto no Stripe (idempotente usando metadata.custom_id)
    const product = await stripe.products.create({
      name: `Lucrazi - ${plan.name}`,
      metadata: { planId: plan.id },
    });

    // Cria preço mensal (recorrente)
    const price = await stripe.prices.create({
      unit_amount: plan.price_cents,
      currency: 'brl',
      recurring: { interval: 'month' },
      product: product.id,
    });

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

    // Salva no Firestore se disponível
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
