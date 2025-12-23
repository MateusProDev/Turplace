import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Loader } from 'lucide-react';
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
  stripeAccountId: string | null;
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
    stripeAccountId: null,
    chavePix: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.uid) {
      // Load from cache first if recent (within 5 minutes)
      const cached = localStorage.getItem(`wallet_${user.uid}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          const now = Date.now();
          if (parsed.timestamp && (now - parsed.timestamp) < 5 * 60 * 1000) {
            setData(parsed.data);
          }
        } catch (e) {
          console.error('Erro ao carregar cache:', e);
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
              setData({
                ...freshData,
                payouts: payoutData.payouts || []
              });
            })
            .catch(payoutError => {
              console.error('Erro ao buscar payouts:', payoutError);
              setData(freshData);
            });

          // Cache the data with timestamp
          localStorage.setItem(`wallet_${user.uid}`, JSON.stringify({
            data: freshData,
            timestamp: Date.now()
          }));
        })
        .catch(err => {
          console.error(err);
          setError('Erro ao carregar dados.');
        })
        .finally(() => setLoading(false));
    }
  }, [user]);

  const handleWithdraw = async (amount: number, method: 'stripe' | 'pix') => {
    if (!user?.uid || amount <= 0) return;
    setLoading(true);
    try {
      const response = await fetch('/api/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, amount, method }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao processar saque');
      }

      alert(`${result.message}\n\nID da transação: ${result.payoutId}\nTempo estimado: ${result.estimatedTime}`);

      // Refresh data
      window.location.reload();
    } catch (error) {
      console.error('Erro no saque:', error);
      alert(`Erro ao solicitar saque: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  if (error) return <div>{error}</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Carteira Financeira</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-green-100 p-4 rounded">
          <h2 className="text-lg font-semibold">Total Vendas</h2>
          <p className="text-2xl flex items-center gap-2">
            {loading ? <Loader className="animate-spin" size={20} /> : `R$ ${data.totalSales.toFixed(2)}`}
          </p>
        </div>
        <div className="bg-red-100 p-4 rounded">
          <h2 className="text-lg font-semibold">Comissões Pagas</h2>
          <p className="text-2xl flex items-center gap-2">
            {loading ? <Loader className="animate-spin" size={20} /> : `R$ ${data.totalCommissions.toFixed(2)}`}
          </p>
        </div>
        <div className="bg-blue-100 p-4 rounded">
          <h2 className="text-lg font-semibold">Total Recebido</h2>
          <p className="text-2xl flex items-center gap-2">
            {loading ? <Loader className="animate-spin" size={20} /> : `R$ ${data.totalReceived.toFixed(2)}`}
          </p>
        </div>
        <div className="bg-yellow-100 p-4 rounded">
          <h2 className="text-lg font-semibold">Saldo Pendente</h2>
          <p className="text-2xl flex items-center gap-2">
            {loading ? <Loader className="animate-spin" size={20} /> : `R$ ${data.pendingAmount.toFixed(2)}`}
          </p>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Vendas Realizadas</h2>
        <table className="w-full table-auto">
          <thead>
            <tr>
              <th className="px-4 py-2">Data</th>
              <th className="px-4 py-2">Valor</th>
              <th className="px-4 py-2">Comissão</th>
              <th className="px-4 py-2">Recebido</th>
            </tr>
          </thead>
          <tbody>
            {loading && data.sales.length === 0 ? (
              <tr>
                <td colSpan={4} className="border px-4 py-2 text-center">
                  <Loader className="animate-spin mx-auto" size={20} />
                </td>
              </tr>
            ) : (
              data.sales.map(sale => (
                <tr key={sale.id}>
                  <td className="border px-4 py-2">{new Date(sale.date).toLocaleDateString()}</td>
                  <td className="border px-4 py-2">R$ {sale.amount.toFixed(2)}</td>
                  <td className="border px-4 py-2">R$ {sale.commission.toFixed(2)}</td>
                  <td className="border px-4 py-2">R$ {sale.received.toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Vendas Pendentes</h2>
        <table className="w-full table-auto">
          <thead>
            <tr>
              <th className="px-4 py-2">Data</th>
              <th className="px-4 py-2">Valor</th>
            </tr>
          </thead>
          <tbody>
            {loading && data.pendingSales.length === 0 ? (
              <tr>
                <td colSpan={2} className="border px-4 py-2 text-center">
                  <Loader className="animate-spin mx-auto" size={20} />
                </td>
              </tr>
            ) : (
              data.pendingSales.map(sale => (
                <tr key={sale.id}>
                  <td className="border px-4 py-2">{new Date(sale.date).toLocaleDateString()}</td>
                  <td className="border px-4 py-2">R$ {sale.amount.toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Payouts History Section */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Histórico de Saques</h2>
        <table className="w-full table-auto">
          <thead>
            <tr>
              <th className="px-4 py-2">Data</th>
              <th className="px-4 py-2">Valor</th>
              <th className="px-4 py-2">Método</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && (!data.payouts || data.payouts.length === 0) ? (
              <tr>
                <td colSpan={4} className="border px-4 py-2 text-center">
                  <Loader className="animate-spin mx-auto" size={20} />
                </td>
              </tr>
            ) : data.payouts && data.payouts.length > 0 ? (
              data.payouts.map(payout => (
                <tr key={payout.id}>
                  <td className="border px-4 py-2">{new Date(payout.createdAt).toLocaleDateString()}</td>
                  <td className="border px-4 py-2">R$ {payout.amount.toFixed(2)}</td>
                  <td className="border px-4 py-2">{payout.method === 'pix' ? 'PIX' : 'Stripe'}</td>
                  <td className="border px-4 py-2">
                    <span className={`px-2 py-1 rounded text-sm ${
                      payout.status === 'completed' ? 'bg-green-100 text-green-800' :
                      payout.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                      payout.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {payout.status === 'completed' ? 'Concluído' :
                       payout.status === 'processing' ? 'Processando' :
                       payout.status === 'failed' ? 'Falhou' :
                       'Pendente'}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="border px-4 py-2 text-center text-gray-500">
                  Nenhum saque realizado ainda
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Withdrawal Section */}
      <div className="mt-8 bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">Sacar Dinheiro</h2>
        {(data.stripeAccountId && data.stripeAccountId.trim() !== '') || data.chavePix ? (
          <div>
            {data.stripeAccountId && data.stripeAccountId.trim() !== '' && (
              <>
                <p className="mb-2">Conta Stripe conectada</p>
                <button
                  onClick={() => handleWithdraw(data.availableBalance, 'stripe')}
                  disabled={data.availableBalance < 10 || loading}
                  className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed mr-4"
                >
                  Sacar via Stripe
                </button>
                {data.availableBalance < 10 && data.availableBalance > 0 && (
                  <p className="text-sm text-amber-600 mt-2">
                    Saldo mínimo para saque: R$ 10,00. Você tem R$ {data.availableBalance.toFixed(2)}.
                  </p>
                )}
                {data.availableBalance <= 0 && (
                  <p className="text-sm text-red-600 mt-2">
                    Você não possui saldo disponível para saque.
                  </p>
                )}
              </>
            )}
            {data.chavePix && (
              <>
                <p className="mb-2">Chave PIX: {data.chavePix}</p>
                <button
                  onClick={() => handleWithdraw(data.availableBalance, 'pix')}
                  disabled={data.availableBalance < 10 || loading}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sacar via PIX
                </button>
                {data.availableBalance < 10 && data.availableBalance > 0 && (
                  <p className="text-sm text-amber-600 mt-2">
                    Saldo mínimo para saque: R$ 10,00. Você tem R$ {data.availableBalance.toFixed(2)}.
                  </p>
                )}
                {data.availableBalance <= 0 && (
                  <p className="text-sm text-red-600 mt-2">
                    Você não possui saldo disponível para saque.
                  </p>
                )}
              </>
            )}
            <p className="mb-4">Saldo disponível: R$ {data.availableBalance.toFixed(2)}</p>
          </div>
        ) : (
          <div>
            <p className="mb-4">Para sacar dinheiro, conecte sua conta Stripe ou cadastre sua chave PIX no perfil.</p>
            <Link to="/profile/settings" className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 mr-4">
              Conectar Stripe
            </Link>
            <Link to="/profile/settings" className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700">
              Cadastrar PIX
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Wallet;