import { useNavigate } from 'react-router-dom';
import { Users, Shield } from 'lucide-react';

export default function Pricing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Taxas da Plataforma
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Taxas simples e transparentes para todos os prestadores. Tudo liberado gratuitamente.
          </p>

          <div className="bg-white rounded-2xl shadow-lg p-6 max-w-4xl mx-auto mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Taxas Fixas</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <h3 className="text-lg font-semibold text-green-800 mb-2">💳 Pagamento por Cartão</h3>
                <p className="text-sm text-green-700">
                  <strong>Taxa: 8% TOTAL</strong><br/>
                  Incluindo todas as taxas dos processadores.
                </p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">💰 Pagamento por PIX</h3>
                <p className="text-sm text-blue-700">
                  <strong>Taxa: 2,99% + R$0,80 TOTAL</strong><br/>
                  A menor taxa do Brasil, incluindo processadores.
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              * Sem planos mensais. Sem surpresas. Taxas fixas por transação.
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-16 text-center">
          <div className="bg-gray-50 rounded-2xl p-8 max-w-4xl mx-auto mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Recursos Disponíveis</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Acesso Completo
                </h4>
                <p className="text-sm text-gray-600">
                  Cadastre serviços ilimitados, use lead pages e tenha suporte básico.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-600" />
                  Sem Custos Ocultos
                </h4>
                <p className="text-sm text-gray-600">
                  Taxas transparentes, sem mensalidades ou taxas extras.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-600 hover:text-gray-800 transition-colors"
          >
            ← Voltar ao Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

