import React from 'react';

const Terms: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Termos de Uso</h1>
        
        <div className="bg-white shadow-lg rounded-lg p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">1. Aceitação dos Termos</h2>
            <p className="text-gray-600 leading-relaxed">
              Ao acessar e usar nossa plataforma, você concorda em cumprir estes Termos de Uso. 
              Se você não concordar com estes termos, não use nossos serviços.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">2. Descrição do Serviço</h2>
            <p className="text-gray-600 leading-relaxed">
              Nossa plataforma conecta prestadores de serviços com clientes, permitindo a contratação 
              de serviços de forma segura e eficiente. Oferecemos ferramentas para agendamento, 
              pagamento e comunicação entre as partes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">3. Elegibilidade</h2>
            <p className="text-gray-600 leading-relaxed">
              Para usar nossos serviços, você deve ter pelo menos 18 anos ou ter autorização dos pais/responsáveis. 
              Você concorda em fornecer informações verdadeiras e atualizadas durante o registro.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">4. Contas de Usuário</h2>
            <h3 className="text-lg font-medium text-gray-700 mb-2">4.1 Criação de Conta</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              Você é responsável por manter a confidencialidade de sua senha e conta. 
              Notifique-nos imediatamente sobre qualquer uso não autorizado.
            </p>
            
            <h3 className="text-lg font-medium text-gray-700 mb-2">4.2 Responsabilidades do Usuário</h3>
            <p className="text-gray-600 leading-relaxed">
              Você concorda em usar a plataforma apenas para fins legais e de acordo com estes termos. 
              É proibido usar a plataforma para atividades fraudulentas, ilegais ou prejudiciais.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">5. Serviços e Pagamentos</h2>
            <h3 className="text-lg font-medium text-gray-700 mb-2">5.1 Contratação de Serviços</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              A contratação de serviços é feita diretamente entre prestadores e clientes. 
              Nossa plataforma facilita essa conexão, mas não somos responsáveis pela qualidade dos serviços.
            </p>
            
            <h3 className="text-lg font-medium text-gray-700 mb-2">5.2 Pagamentos</h3>
            <p className="text-gray-600 leading-relaxed">
              Os pagamentos são processados por terceiros. Você concorda com os termos desses 
              processadores de pagamento. Reembolsos estão sujeitos às políticas aplicáveis.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">6. Propriedade Intelectual</h2>
            <p className="text-gray-600 leading-relaxed">
              Todo o conteúdo da plataforma, incluindo textos, imagens, logos e software, 
              é protegido por direitos autorais. Você não pode copiar, distribuir ou usar 
              sem autorização prévia.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">7. Limitação de Responsabilidade</h2>
            <p className="text-gray-600 leading-relaxed">
              Nossa plataforma é fornecida "como está". Não garantimos que os serviços estarão 
              livres de erros ou interrupções. Não somos responsáveis por danos indiretos, 
              incidentais ou consequenciais.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">8. Indenização</h2>
            <p className="text-gray-600 leading-relaxed">
              Você concorda em indenizar e isentar nossa plataforma de qualquer reclamação, 
              perda ou dano decorrente do seu uso dos serviços ou violação destes termos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">9. Rescisão</h2>
            <p className="text-gray-600 leading-relaxed">
              Podemos suspender ou encerrar sua conta a qualquer momento por violação destes termos. 
              Você pode encerrar sua conta a qualquer momento.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">10. Lei Aplicável</h2>
            <p className="text-gray-600 leading-relaxed">
              Estes termos são regidos pelas leis brasileiras. Qualquer disputa será resolvida 
              nos tribunais competentes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">11. Alterações nos Termos</h2>
            <p className="text-gray-600 leading-relaxed">
              Podemos atualizar estes termos periodicamente. Continuar usando a plataforma após 
              alterações constitui aceitação dos novos termos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">12. Contato</h2>
            <p className="text-gray-600 leading-relaxed">
              Para dúvidas sobre estes Termos de Uso, entre em contato: suporte@lucrazi.com.br
            </p>
          </section>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center">
              Última atualização: Janeiro de 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;