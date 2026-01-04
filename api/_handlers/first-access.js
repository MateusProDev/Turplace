/**
 * First Access Handler
 * Endpoint para clientes que compraram mas ainda não configuraram senha
 * Envia email de primeiro acesso com link para criar senha
 */

import initFirestore from '../_lib/firebaseAdmin.js';
import { sendFirstAccessEmail, generateResetToken } from '../_lib/brevoEmail.js';
import { setSecurityHeaders, logSecurityEvent } from '../_lib/security.js';

export default async function handler(req, res) {
  setSecurityHeaders(res);

  // Health check
  if (req.method === 'GET') {
    return res.status(200).json({ 
      ok: true, 
      route: '/api/first-access',
      description: 'Envia email de primeiro acesso para clientes que já compraram'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email é obrigatório' 
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email inválido' 
      });
    }

    const db = initFirestore();
    const normalizedEmail = email.toLowerCase().trim();

    // Buscar pedidos aprovados deste cliente
    const ordersSnapshot = await db.collection('orders')
      .where('customerEmail', '==', normalizedEmail)
      .where('status', 'in', ['approved', 'paid', 'completed'])
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    // Também buscar em subscriptions
    let subscriptionData = null;
    if (ordersSnapshot.empty) {
      const subscriptionsSnapshot = await db.collection('subscriptions')
        .where('customerEmail', '==', normalizedEmail)
        .where('status', 'in', ['active', 'authorized'])
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
      
      if (!subscriptionsSnapshot.empty) {
        subscriptionData = { 
          id: subscriptionsSnapshot.docs[0].id, 
          ...subscriptionsSnapshot.docs[0].data(),
          collection: 'subscriptions'
        };
      }
    }

    // Se não encontrou nem pedido nem assinatura
    if (ordersSnapshot.empty && !subscriptionData) {
      // Por segurança, não revelamos se o email existe ou não
      // Mas logamos internamente
      await logSecurityEvent(req, 'info', 'First access attempted for unknown email', {
        email: normalizedEmail
      }, 'first_access_not_found');

      // Retornamos sucesso para não revelar informação
      return res.status(200).json({ 
        success: true, 
        message: 'Se você possui uma compra com este email, receberá um link de acesso.' 
      });
    }

    // Pegar os dados do pedido ou assinatura
    const data = ordersSnapshot.empty 
      ? subscriptionData 
      : { id: ordersSnapshot.docs[0].id, ...ordersSnapshot.docs[0].data(), collection: 'orders' };

    const collectionName = data.collection;

    // Verificar se já tem senha configurada
    if (data.passwordSet) {
      // Usuário já configurou senha, deve usar "Esqueci minha senha"
      return res.status(200).json({ 
        success: true, 
        message: 'Se você possui uma compra com este email, receberá um link de acesso.',
        hint: 'Se você já configurou sua senha anteriormente, use a opção "Esqueci minha senha".'
      });
    }

    // Gerar novo token e atualizar pedido/assinatura
    const resetToken = generateResetToken();
    const docRef = db.collection(collectionName).doc(data.id);
    
    await docRef.update({
      resetToken: resetToken,
      resetTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      accessEmailSent: true,
      firstAccessRequestedAt: new Date().toISOString()
    });

    // Enviar email
    await sendFirstAccessEmail({
      customerEmail: normalizedEmail,
      customerName: data.customerName || 'Cliente',
      serviceTitle: data.serviceTitle || data.planName || 'Sua compra',
      providerName: data.providerName,
      amount: data.amount || data.price || 0,
      orderId: data.id,
      resetToken: resetToken
    });

    await logSecurityEvent(req, 'info', 'First access email sent', {
      email: normalizedEmail,
      orderId: data.id,
      collection: collectionName
    }, 'first_access_sent');

    console.log('[FirstAccess] Email enviado para:', normalizedEmail);

    return res.status(200).json({ 
      success: true, 
      message: 'Email de primeiro acesso enviado! Verifique sua caixa de entrada.' 
    });

  } catch (error) {
    console.error('[FirstAccess] Error:', error);
    
    await logSecurityEvent(req, 'error', 'First access error', {
      error: error.message
    }, 'first_access_error');

    return res.status(500).json({ 
      success: false, 
      error: 'Erro interno. Tente novamente.' 
    });
  }
}
