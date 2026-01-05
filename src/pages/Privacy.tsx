import React from 'react';

const Privacy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Política de Privacidade</h1>
        
        <div className="bg-white shadow-lg rounded-lg p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">1. Introdução</h2>
            <p className="text-gray-600 leading-relaxed">
              A sua privacidade é importante para nós. Esta Política de Privacidade explica como coletamos, usamos, 
              divulgamos e protegemos suas informações quando você usa nossa plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">2. Informações que Coletamos</h2>
            <h3 className="text-lg font-medium text-gray-700 mb-2">2.1 Informações Fornecidas por Você</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              Quando você se registra em nossa plataforma, coletamos informações como nome, e-mail, 
              telefone e outras informações necessárias para criar sua conta.
            </p>
            
            <h3 className="text-lg font-medium text-gray-700 mb-2">2.2 Informações Coletadas Automaticamente</h3>
            <p className="text-gray-600 leading-relaxed">
              Coletamos informações automaticamente sobre seu uso da plataforma, incluindo endereço IP, 
              tipo de navegador, páginas visitadas e tempo de permanência.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">3. Como Usamos suas Informações</h2>
            <ul className="list-disc list-inside text-gray-600 leading-relaxed space-y-2">
              <li>Fornecer e manter nossos serviços</li>
              <li>Processar pagamentos e transações</li>
              <li>Comunicar sobre atualizações e suporte</li>
              <li>Melhorar nossos serviços através de análise de dados</li>
              <li>Cumprir obrigações legais</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">4. Compartilhamento de Informações</h2>
            <p className="text-gray-600 leading-relaxed">
              Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros, 
              exceto quando necessário para fornecer nossos serviços ou conforme exigido por lei.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">5. Segurança dos Dados</h2>
            <p className="text-gray-600 leading-relaxed">
              Implementamos medidas de segurança técnicas e organizacionais apropriadas para proteger 
              suas informações pessoais contra acesso não autorizado, alteração, divulgação ou destruição.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">6. Seus Direitos</h2>
            <p className="text-gray-600 leading-relaxed">
              Você tem o direito de acessar, corrigir, excluir ou restringir o processamento de suas 
              informações pessoais. Para exercer esses direitos, entre em contato conosco.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">7. Cookies</h2>
            <p className="text-gray-600 leading-relaxed">
              Usamos cookies para melhorar sua experiência em nossa plataforma. Você pode controlar 
              o uso de cookies através das configurações do seu navegador.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">8. Alterações nesta Política</h2>
            <p className="text-gray-600 leading-relaxed">
              Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos sobre 
              mudanças significativas através de e-mail ou aviso em nossa plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">9. Contato</h2>
            <p className="text-gray-600 leading-relaxed">
              Se você tiver dúvidas sobre esta Política de Privacidade, entre em contato conosco 
              através do e-mail: suporte@lucrazi.com.br
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

export default Privacy;