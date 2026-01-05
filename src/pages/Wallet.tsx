import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Loader, Wallet as WalletIcon, TrendingUp, Clock, AlertCircle, DollarSign, CreditCard, Smartphone, RefreshCw, Download, History, PiggyBank } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Sale {
  id: string;
  amount: number;
  commission: number;
  received: number;
  date: string;
  serviceId: string;
}

interface PendingSale {
  id: string;
  amount: number;
  date: string;
  serviceId: string;
}

interface Payout {
  id: string;
  amount: number;
  method: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  processedAt?: string;
  chavePix?: string;
  mercadoPagoTransferId?: string;
}

interface WalletData {
  totalSales: number;
  totalCommissions: number;
  totalReceived: number;
  availableBalance: number;
  pendingAmount: number;
  sales: Sale[];
  pendingSales: PendingSale[];
  payouts: Payout[];
  mpConnected: boolean;
  mpUserId: string | null;
  chavePix: string;
}

const Wallet = () => {
  const { user } = useAuth();
  const [data, setData] = useState<WalletData>({
    totalSales: 0,
    totalCommissions: 0,
    totalReceived: 0,
    availableBalance: 0,
    pendingAmount: 0,
    sales: [],
    pendingSales: [],
    payouts: [],
    mpConnected: false,
    mpUserId: null,
    chavePix: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingExpanded, setPendingExpanded] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      loadWalletData();
    }
  }, [user]);

  const loadWalletData = (forceRefresh = false) => {
    if (!user?.uid) return;

    setRefreshing(true);
    
    // Load from cache first if recent (within 5 minutes) and not forcing refresh
    if (!forceRefresh) {
      const cached = localStorage.getItem(`wallet_${user.uid}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          const now = Date.now();
          if (parsed.timestamp && (now - parsed.timestamp) < 5 * 60 * 1000) {
            setData(parsed.data);
            setLoading(false);
          }
        } catch (e) {
          console.error('Erro ao carregar cache:', e);
        }
      }
    }

    fetch(`/api/wallet?userId=${user.uid}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch wallet data');
        return res.json();
      })
      .then(freshData => {
        // Buscar payouts do usuário
        fetch(`/api/payouts?userId=${user.uid}`)
          .then(payoutRes => payoutRes.json())
          .then(payoutData => {
            const updatedData = {
              ...freshData,
              payouts: payoutData.payouts || []
            };
            
            setData(updatedData);
            
            // Cache the data with timestamp
            localStorage.setItem(`wallet_${user.uid}`, JSON.stringify({
              data: updatedData,
              timestamp: Date.now()
            }));
          })
          .catch(payoutError => {
            console.error('Erro ao buscar payouts:', payoutError);
            setData(freshData);
            
            // Cache the data with timestamp
            localStorage.setItem(`wallet_${user.uid}`, JSON.stringify({
              data: freshData,
              timestamp: Date.now()
            }));
          });
      })
      .catch(err => {
        console.error(err);
        setError('Erro ao carregar dados.');
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  // Constantes de saque
  const PAYOUT_FEE = 4.99;
  const MIN_PAYOUT = 19.99;

  const handleWithdraw = async (amount: number, method: 'mercadopago' | 'pix') => {
    if (!user?.uid || amount <= 0) return;
    
    // Validar saque mínimo
    if (method === 'pix' && amount < MIN_PAYOUT) {
      alert(`Saque mínimo via PIX é R$ ${MIN_PAYOUT.toFixed(2)}.\nVocê receberá R$ ${(MIN_PAYOUT - PAYOUT_FEE).toFixed(2)} após a taxa de R$ ${PAYOUT_FEE.toFixed(2)}.`);
      return;
    }
    
    // Confirmar saque mostrando valor líquido
    const netAmount = amount - PAYOUT_FEE;
    const confirmMessage = method === 'pix' 
      ? `Confirmar saque de ${formatCurrency(amount)}?\n\nTaxa de saque: ${formatCurrency(PAYOUT_FEE)}\nVocê receberá: ${formatCurrency(netAmount)}\n\nA transferência será enviada para sua chave PIX.`
      : `Confirmar saque de ${formatCurrency(amount)}?`;
    
    if (!confirm(confirmMessage)) return;
    
    setLoading(true);
    try {
      // Obter token de autenticação
      const token = await user.getIdToken();
      
      const response = await fetch('/api/payout', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId: user.uid, amount, method }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao processar saque');
      }

      // Modal de sucesso
      alert(`✅ ${result.message}`);

      // Refresh data
      loadWalletData(true);
    } catch (error) {
      console.error('Erro no saque:', error);
      alert(`Erro ao solicitar saque: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading && !refreshing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="mt-6 text-gray-600 font-medium">Carregando carteira...</p>
          <p className="text-sm text-gray-400 mt-2">Preparando seus dados financeiros</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center">
                  <WalletIcon className="w-6 h-6 text-white" />
                </div>
                Carteira Financeira
              </h1>
              <p className="text-gray-600 mt-2">Gerencie seus ganhos e saques</p>
            </div>
            
            <button
              onClick={() => loadWalletData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm hover:shadow disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="font-medium text-gray-700">Atualizar</span>
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {refreshing ? <Loader className="animate-spin" size={20} /> : formatCurrency(data.totalSales)}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Total em Vendas</h3>
            <p className="text-sm text-gray-600">Valor bruto de todas as vendas</p>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-pink-50 border border-red-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-400 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {refreshing ? <Loader className="animate-spin" size={20} /> : formatCurrency(data.totalCommissions)}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Comissões</h3>
            <p className="text-sm text-gray-600">Taxas e comissões pagas</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-400 rounded-xl flex items-center justify-center">
                <Download className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {refreshing ? <Loader className="animate-spin" size={20} /> : formatCurrency(data.totalReceived)}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Recebido</h3>
            <p className="text-sm text-gray-600">Valor líquido recebido</p>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-400 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {refreshing ? <Loader className="animate-spin" size={20} /> : formatCurrency(data.pendingAmount)}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Pendente</h3>
            <p className="text-sm text-gray-600">Aguardando liberação</p>
          </div>
        </div>

        {/* Saldo Disponível e Saque */}
        <div className="bg-gradient-to-r from-gray-900 via-blue-900 to-gray-900 rounded-2xl shadow-xl p-6 md:p-8 mb-8 text-white">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Saldo Disponível</h2>
              <div className="text-4xl md:text-5xl font-bold mb-4">
                {refreshing ? (
                  <Loader className="animate-spin" size={32} />
                ) : (
                  formatCurrency(data.availableBalance)
                )}
              </div>
              <p className="text-gray-300">Pronto para saque imediato</p>
            </div>
            
            {data.mpConnected || data.chavePix ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  {data.mpConnected && (
                    <button
                      onClick={() => handleWithdraw(data.availableBalance, 'mercadopago')}
                      disabled={data.availableBalance <= 0 || loading}
                      className="px-6 py-3.5 bg-[#009ee3] text-white font-semibold rounded-xl hover:bg-[#0077b5] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                    >
                      <CreditCard className="w-5 h-5" />
                      Sacar via Mercado Pago
                    </button>
                  )}
                  
                  {data.chavePix && (
                    <button
                      onClick={() => handleWithdraw(data.availableBalance, 'pix')}
                      disabled={data.availableBalance < MIN_PAYOUT || loading}
                      className="px-6 py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                    >
                      <Smartphone className="w-5 h-5" />
                      Sacar via PIX (Taxa: R$ {PAYOUT_FEE.toFixed(2)})
                    </button>
                  )}
                </div>
                
                {data.chavePix && data.availableBalance < MIN_PAYOUT && data.availableBalance > 0 && (
                  <p className="text-amber-200 text-sm">
                    Saldo mínimo para saque PIX: R$ {MIN_PAYOUT.toFixed(2)} (você recebe R$ {(MIN_PAYOUT - PAYOUT_FEE).toFixed(2)})
                  </p>
                )}
                
                {data.chavePix && data.availableBalance >= MIN_PAYOUT && (
                  <p className="text-green-300 text-sm">
                    💰 Você receberá {formatCurrency(data.availableBalance - PAYOUT_FEE)} líquido (taxa de R$ {PAYOUT_FEE.toFixed(2)})
                  </p>
                )}
                
                {data.availableBalance <= 0 && (
                  <p className="text-gray-300 text-sm">
                    Adicione mais serviços para aumentar seu saldo
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <h3 className="font-semibold text-lg mb-2">Configure seu saque</h3>
                <p className="text-gray-300 mb-4">Conecte uma conta para receber seus pagamentos</p>
                <div className="flex flex-wrap gap-3">
                  <Link 
                    to="/profile/settings" 
                    className="px-4 py-2.5 bg-white text-gray-900 font-medium rounded-lg hover:bg-gray-100 transition flex items-center gap-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    Conectar Mercado Pago
                  </Link>
                  <Link 
                    to="/profile/settings" 
                    className="px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium rounded-lg hover:from-green-600 hover:to-emerald-700 transition flex items-center gap-2"
                  >
                    <Smartphone className="w-4 h-4" />
                    Cadastrar PIX
                  </Link>
                </div>
              </div>
            )}
          </div>
          
          {data.chavePix && (
            <div className="mt-6 pt-6 border-t border-white/20">
              <div className="flex items-center gap-3">
                <PiggyBank className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-sm text-gray-300">Chave PIX cadastrada:</p>
                  <p className="font-mono bg-white/10 px-3 py-1.5 rounded-lg mt-1">{data.chavePix}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Vendas Realizadas */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Vendas Realizadas
                </h2>
                <span className="text-sm text-gray-500">{data.sales.length} transações</span>
              </div>
            </div>
            
            {/* Tabela para desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Valor</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Comissão</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Recebido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {refreshing && data.sales.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center">
                        <Loader className="animate-spin mx-auto" size={24} />
                      </td>
                    </tr>
                  ) : data.sales.length > 0 ? (
                    data.sales.map(sale => (
                      <tr key={sale.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(sale.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(sale.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                          -{formatCurrency(sale.commission)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          {formatCurrency(sale.received)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                        Nenhuma venda realizada ainda
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Cards para mobile */}
            <div className="md:hidden p-6">
              {refreshing && data.sales.length === 0 ? (
                <div className="text-center py-8">
                  <Loader className="animate-spin mx-auto" size={24} />
                </div>
              ) : data.sales.length > 0 ? (
                <div className="space-y-4">
                  {data.sales.map(sale => (
                    <div key={sale.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-gray-600">{formatDate(sale.date)}</span>
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Valor</p>
                          <p className="text-sm font-medium text-gray-900">{formatCurrency(sale.amount)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Comissão</p>
                          <p className="text-sm text-red-600">-{formatCurrency(sale.commission)}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Recebido</p>
                          <p className="text-lg font-bold text-green-600">{formatCurrency(sale.received)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma venda realizada ainda
                </div>
              )}
            </div>
          </div>

          {/* Vendas Pendentes */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div 
              className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => setPendingExpanded(!pendingExpanded)}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                  Vendas Pendentes
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">{data.pendingSales.length} pendentes</span>
                  <svg 
                    className={`w-5 h-5 text-gray-500 transition-transform ${pendingExpanded ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            
            {pendingExpanded && (
              <div className="p-6">
                {refreshing && data.pendingSales.length === 0 ? (
                  <div className="text-center py-8">
                    <Loader className="animate-spin mx-auto" size={24} />
                  </div>
                ) : data.pendingSales.length > 0 ? (
                  <div className="space-y-4">
                    {data.pendingSales.map(sale => (
                      <div key={sale.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="w-4 h-4 text-amber-600" />
                              <span className="text-sm font-medium text-gray-900">{formatDate(sale.date)}</span>
                            </div>
                            <p className="text-lg font-bold text-gray-900">{formatCurrency(sale.amount)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                              Pendente
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Nenhuma venda pendente
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Histórico de Saques */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mt-8">
          <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <History className="w-5 h-5 text-purple-600" />
                Histórico de Saques
              </h2>
              <span className="text-sm text-gray-500">{data.payouts?.length || 0} saques</span>
            </div>
          </div>
          
          {/* Tabela para desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Valor</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Método</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {refreshing && (!data.payouts || data.payouts.length === 0) ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center">
                      <Loader className="animate-spin mx-auto" size={24} />
                    </td>
                  </tr>
                ) : data.payouts && data.payouts.length > 0 ? (
                  data.payouts.map(payout => (
                    <tr key={payout.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(payout.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(payout.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {payout.method === 'pix' ? (
                            <>
                              <Smartphone className="w-4 h-4 text-green-600" />
                              <span className="text-sm">PIX</span>
                            </>
                          ) : (
                            <>
                              <CreditCard className="w-4 h-4 text-purple-600" />
                              <span className="text-sm">Stripe</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            payout.status === 'completed' ? 'bg-green-500' :
                            payout.status === 'processing' ? 'bg-blue-500' :
                            payout.status === 'failed' ? 'bg-red-500' :
                            'bg-gray-500'
                          }`} />
                          <span className={`text-sm font-medium ${
                            payout.status === 'completed' ? 'text-green-700' :
                            payout.status === 'processing' ? 'text-blue-700' :
                            payout.status === 'failed' ? 'text-red-700' :
                            'text-gray-700'
                          }`}>
                            {payout.status === 'completed' ? 'Concluído' :
                             payout.status === 'processing' ? 'Processando' :
                             payout.status === 'failed' ? 'Falhou' :
                             'Pendente'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-mono">
                        {payout.id.substring(0, 8)}...
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <History className="w-12 h-12 text-gray-300" />
                        <p>Nenhum saque realizado ainda</p>
                        <p className="text-sm text-gray-400">Seu histórico de saques aparecerá aqui</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Cards para mobile */}
          <div className="md:hidden p-6">
            {refreshing && (!data.payouts || data.payouts.length === 0) ? (
              <div className="text-center py-8">
                <Loader className="animate-spin mx-auto" size={24} />
              </div>
            ) : data.payouts && data.payouts.length > 0 ? (
              <div className="space-y-4">
                {data.payouts.map(payout => (
                  <div key={payout.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-600">{formatDate(payout.createdAt)}</span>
                      <div className="flex items-center gap-2">
                        {payout.method === 'pix' ? (
                          <Smartphone className="w-4 h-4 text-green-600" />
                        ) : (
                          <CreditCard className="w-4 h-4 text-purple-600" />
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Valor</p>
                        <p className="text-sm font-medium text-gray-900">{formatCurrency(payout.amount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Método</p>
                        <p className="text-sm">{payout.method === 'pix' ? 'PIX' : 'Stripe'}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          payout.status === 'completed' ? 'bg-green-500' :
                          payout.status === 'processing' ? 'bg-blue-500' :
                          payout.status === 'failed' ? 'bg-red-500' :
                          'bg-gray-500'
                        }`} />
                        <span className={`text-sm font-medium ${
                          payout.status === 'completed' ? 'text-green-700' :
                          payout.status === 'processing' ? 'text-blue-700' :
                          payout.status === 'failed' ? 'text-red-700' :
                          'text-gray-700'
                        }`}>
                          {payout.status === 'completed' ? 'Concluído' :
                           payout.status === 'processing' ? 'Processando' :
                           payout.status === 'failed' ? 'Falhou' :
                           'Pendente'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 font-mono">{payout.id.substring(0, 8)}...</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="flex flex-col items-center gap-2">
                  <History className="w-12 h-12 text-gray-300" />
                  <p>Nenhum saque realizado ainda</p>
                  <p className="text-sm text-gray-400">Seu histórico de saques aparecerá aqui</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Estilos CSS adicionais */}
      <style>{`
        .shadow-sm {
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
        }
        
        .shadow-lg {
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        }
        
        .shadow-xl {
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        
        .divide-y > :not([hidden]) ~ :not([hidden]) {
          border-top-width: 1px;
        }
        
        .divide-gray-100 > :not([hidden]) ~ :not([hidden]) {
          border-color: #f3f4f6;
        }
        
        .tracking-wider {
          letter-spacing: 0.05em;
        }
        
        .hover\:bg-gray-50:hover {
          background-color: #f9fafb;
        }
      `}</style>
    </div>
  );
};

export default Wallet;