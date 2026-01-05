// Serviço de envio de email via Brevo (SendinBlue)
// Variáveis de ambiente necessárias:
// - BREVO_API_KEY: Chave da API do Brevo
// - FRONTEND_URL: URL do frontend (ex: https://lucrazi.com.br)

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * Envia email de primeiro acesso após compra aprovada
 * Inclui link para redefinir senha
 */
export async function sendFirstAccessEmail({
  customerEmail,
  customerName,
  serviceTitle,
  providerName,
  amount,
  orderId,
  resetToken
}) {
  const apiKey = process.env.BREVO_API_KEY;
  
  if (!apiKey) {
    console.error('[Brevo] BREVO_API_KEY não configurada');
    throw new Error('Serviço de email não configurado');
  }

  const frontendUrl = process.env.FRONTEND_URL || 'https://lucrazi.com.br';
  const resetPasswordLink = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(customerEmail)}`;
  const loginLink = `${frontendUrl}/login`;
  const clientDashboardLink = `${frontendUrl}/client-dashboard`;

  const emailData = {
    sender: {
      name: 'Lucrazi',
      email: process.env.BREVO_SENDER_EMAIL || 'noreply@lucrazi.com.br'
    },
    to: [
      {
        email: customerEmail,
        name: customerName || 'Cliente'
      }
    ],
    subject: `🎉 Acesso liberado: ${serviceTitle}`,
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">
        🎉 Pagamento Aprovado!
      </h1>
      <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">
        Seu acesso já está liberado
      </p>
    </div>

    <!-- Content -->
    <div style="background-color: #ffffff; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Olá <strong>${customerName || 'Cliente'}</strong>!
      </p>

      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
        Sua compra foi confirmada com sucesso. Aqui estão os detalhes:
      </p>

      <!-- Order Details -->
      <div style="background-color: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 30px; border-left: 4px solid #2563eb;">
        <h3 style="color: #1e293b; margin: 0 0 16px 0; font-size: 18px;">📦 Detalhes da Compra</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="color: #64748b; padding: 8px 0; font-size: 14px;">Produto:</td>
            <td style="color: #1e293b; padding: 8px 0; font-size: 14px; font-weight: 600; text-align: right;">${serviceTitle}</td>
          </tr>
          <tr>
            <td style="color: #64748b; padding: 8px 0; font-size: 14px;">Vendedor:</td>
            <td style="color: #1e293b; padding: 8px 0; font-size: 14px; text-align: right;">${providerName || 'Lucrazi'}</td>
          </tr>
          <tr>
            <td style="color: #64748b; padding: 8px 0; font-size: 14px;">Valor:</td>
            <td style="color: #10b981; padding: 8px 0; font-size: 14px; font-weight: 600; text-align: right;">R$ ${amount}</td>
          </tr>
          <tr>
            <td style="color: #64748b; padding: 8px 0; font-size: 14px;">ID do Pedido:</td>
            <td style="color: #1e293b; padding: 8px 0; font-size: 14px; text-align: right;">${orderId}</td>
          </tr>
        </table>
      </div>

      <!-- First Access Section -->
      <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 12px; padding: 24px; margin-bottom: 30px; border: 1px solid #10b981;">
        <h3 style="color: #065f46; margin: 0 0 16px 0; font-size: 18px;">🔐 Configure seu Primeiro Acesso</h3>
        <p style="color: #047857; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
          Clique no botão abaixo para criar sua senha e acessar seu conteúdo:
        </p>
        <a href="${resetPasswordLink}" 
           style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
          Criar Minha Senha
        </a>
      </div>

      <!-- Already have account -->
      <div style="text-align: center; padding: 20px 0; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 16px 0;">
          Já tem uma conta? Acesse diretamente:
        </p>
        <a href="${loginLink}" 
           style="display: inline-block; background-color: #ffffff; color: #2563eb; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; border: 2px solid #2563eb;">
          Fazer Login
        </a>
      </div>

      <!-- Steps -->
      <div style="margin-top: 30px; padding-top: 30px; border-top: 1px solid #e5e7eb;">
        <h3 style="color: #1e293b; margin: 0 0 20px 0; font-size: 16px;">📋 Próximos passos:</h3>
        <ol style="color: #374151; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
          <li>Clique em "Criar Minha Senha" acima</li>
          <li>Defina uma senha segura para sua conta</li>
          <li>Acesse o <a href="${clientDashboardLink}" style="color: #2563eb; text-decoration: none;">Painel do Cliente</a></li>
          <li>Aproveite seu conteúdo! 🚀</li>
        </ol>
      </div>

    </div>

    <!-- Footer -->
    <div style="text-align: center; padding: 30px 20px;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0 0 10px 0;">
        Este email foi enviado por Lucrazi
      </p>
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        Se você não realizou esta compra, por favor ignore este email.
      </p>
    </div>

  </div>
</body>
</html>
    `,
    textContent: `
Pagamento Aprovado! 🎉

Olá ${customerName || 'Cliente'}!

Sua compra foi confirmada com sucesso.

DETALHES DA COMPRA:
- Produto: ${serviceTitle}
- Vendedor: ${providerName || 'Lucrazi'}
- Valor: R$ ${amount}
- ID do Pedido: ${orderId}

CONFIGURE SEU PRIMEIRO ACESSO:
Acesse o link abaixo para criar sua senha:
${resetPasswordLink}

Já tem uma conta? Faça login em:
${loginLink}

PRÓXIMOS PASSOS:
1. Clique no link acima para criar sua senha
2. Defina uma senha segura para sua conta
3. Acesse o Painel do Cliente
4. Aproveite seu conteúdo!

Atenciosamente,
Equipe Lucrazi
    `
  };

  console.log('[Brevo] Enviando email para:', customerEmail);

  try {
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify(emailData)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[Brevo] Erro ao enviar email:', result);
      throw new Error(result.message || 'Erro ao enviar email');
    }

    console.log('[Brevo] Email enviado com sucesso:', result);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('[Brevo] Erro:', error.message);
    throw error;
  }
}

/**
 * Gera um token único para reset de senha
 */
export function generateResetToken() {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  const randomPart2 = Math.random().toString(36).substring(2, 15);
  return `${timestamp}${randomPart}${randomPart2}`;
}

export default { sendFirstAccessEmail, generateResetToken };

