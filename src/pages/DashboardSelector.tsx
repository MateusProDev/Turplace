import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Store, ShoppingBag, ArrowRight } from 'lucide-react';
import logoSemFundo from '../assets/logosemfundo.png';

/**
 * Página de seleção de dashboard para usuários que são cliente e prestador
 */
export default function DashboardSelector() {
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const [showSelector, setShowSelector] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Aguardar um pouco para os dados carregarem
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        navigate('/login', { replace: true });
        return;
      }

      // Admin sempre vai para /admin
      if (userData?.isAdmin) {
        navigate('/admin', { replace: true });
        return;
      }

      // Verificar se pode ser ambos
      const canBeProvider = userData?.role === 'prestador' || userData?.mpConnected;
      const isClient = userData?.role === 'cliente';

      // Se é apenas prestador, vai para provider
      if (canBeProvider && !isClient) {
        navigate('/provider', { replace: true });
        return;
      }

      // Se é apenas cliente, vai para client
      if (!canBeProvider && isClient) {
        navigate('/client', { replace: true });
        return;
      }

      // Se pode ser ambos (é prestador e também pode ser cliente), mostra o seletor
      if (canBeProvider) {
        setShowSelector(true);
      } else {
        // Default: vai para client se não tem role definida
        navigate('/client', { replace: true });
      }
    }
  }, [user, userData, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-emerald-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!showSelector) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-emerald-100 p-4">
      <div className="bg-white/90 shadow-xl rounded-2xl p-8 w-full max-w-xl">
        <div className="flex flex-col items-center gap-4 mb-8">
          <img src={logoSemFundo} alt="Lucrazi" className="w-32 h-20 object-contain" />
          <h1 className="text-2xl font-bold text-gray-800">Olá, {userData?.name || 'Usuário'}!</h1>
          <p className="text-gray-500 text-center">
            Você pode acessar como cliente ou como prestador. O que deseja fazer agora?
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Opção Cliente */}
          <button
            onClick={() => navigate('/client')}
            className="group p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200 hover:border-blue-400 hover:shadow-lg transition-all text-left"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-blue-500 rounded-lg">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Área do Cliente</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Veja suas compras, acesse conteúdos e gerencie suas assinaturas.
            </p>
            <div className="flex items-center text-blue-600 font-medium text-sm group-hover:gap-2 transition-all">
              Acessar <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </button>

          {/* Opção Prestador */}
          <button
            onClick={() => navigate('/provider')}
            className="group p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border-2 border-emerald-200 hover:border-emerald-400 hover:shadow-lg transition-all text-left"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-emerald-500 rounded-lg">
                <Store className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Área do Prestador</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Gerencie seus produtos, veja vendas e configure recebimentos.
            </p>
            <div className="flex items-center text-emerald-600 font-medium text-sm group-hover:gap-2 transition-all">
              Acessar <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </button>
        </div>

        <p className="text-center text-gray-400 text-xs mt-6">
          Você pode alternar entre os painéis a qualquer momento.
        </p>
      </div>
    </div>
  );
}
