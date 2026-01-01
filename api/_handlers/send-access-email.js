const admin = require('firebase-admin');

module.exports = async (req, res) => {
  // Verificar método
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { orderId, customerEmail, serviceTitle, providerName, amount } = req.body;

    if (!orderId || !customerEmail || !serviceTitle) {
      return res.status(400).json({ error: 'Dados obrigatórios faltando' });
    }

    console.log('[send-access-email] Enviando email de acesso para:', customerEmail);

    // Por enquanto, vamos simular o envio de email
    // TODO: Integrar com serviço de email (Brevo, SendGrid, etc.)

    // Construir o conteúdo do email
    const emailContent = {
      to: customerEmail,
      subject: `Acesso ao seu produto: ${serviceTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Bem-vindo à Lucrazi!</h1>

          <p>Olá!</p>

          <p>Seu pagamento foi aprovado com sucesso. Aqui estão os detalhes da sua compra:</p>

          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1e293b;">${serviceTitle}</h3>
            <p><strong>Prestador:</strong> ${providerName}</p>
            <p><strong>Valor:</strong> ${amount}</p>
            <p><strong>ID da Transação:</strong> ${orderId}</p>
          </div>

          <div style="background-color: #ecfdf5; border: 1px solid #10b981; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #065f46;">Como acessar seu conteúdo:</h3>
            <ol>
              <li>Faça login em sua conta na Lucrazi</li>
              <li>Acesse sua área do cliente</li>
              <li>Clique em "Meu Conteúdo" para acessar seus materiais</li>
            </ol>
          </div>

          <p>
            <a href="${process.env.FRONTEND_URL || 'https://lucrazi.com'}/login"
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Acessar Minha Conta
            </a>
          </p>

          <p>Se você tiver alguma dúvida, entre em contato conosco.</p>

          <p>Atenciosamente,<br>Equipe Lucrazi</p>
        </div>
      `,
      text: `
        Bem-vindo à Lucrazi!

        Seu pagamento foi aprovado com sucesso.

        Produto: ${serviceTitle}
        Prestador: ${providerName}
        Valor: ${amount}
        ID da Transação: ${orderId}

        Para acessar seu conteúdo:
        1. Faça login em sua conta na Lucrazi
        2. Acesse sua área do cliente
        3. Clique em "Meu Conteúdo" para acessar seus materiais

        Link: ${process.env.FRONTEND_URL || 'https://lucrazi.com'}/login

        Atenciosamente,
        Equipe Lucrazi
      `
    };

    // TODO: Implementar envio real de email
    // Por enquanto, apenas log do que seria enviado
    console.log('[send-access-email] Email preparado:', {
      to: emailContent.to,
      subject: emailContent.subject,
      // Não logar o HTML completo por segurança
    });

    // Simular sucesso do envio
    res.status(200).json({
      success: true,
      message: 'Email enviado com sucesso'
    });

  } catch (error) {
    console.error('[send-access-email] Erro geral:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
};