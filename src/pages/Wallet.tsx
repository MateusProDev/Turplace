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

interface WalletData {
  totalSales: number;
  totalCommissions: number;
  totalReceived: number;
  availableBalance: number;
  pendingAmount: number;
  sales: Sale[];
  pendingSales: PendingSale[];
  stripeAccountId: string;
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
    stripeAccountId: '',
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
          setData(freshData);
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
      if (!response.ok) throw new Error('Erro ao processar saque');
      const { delayHours } = await response.json();
      alert(`Saque solicitado com sucesso! O dinheiro será enviado ${method === 'stripe' ? 'via Stripe' : 'via PIX'} em aproximadamente ${delayHours} horas.`);
      // Refresh data
      window.location.reload();
    } catch (error) {
      console.error('Erro no saque:', error);
      alert('Erro ao solicitar saque. Tente novamente.');
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

      {/* Withdrawal Section */}
      <div className="mt-8 bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">Sacar Dinheiro</h2>
        {data.stripeAccountId ? (
          <div>
            <p className="mb-2">Conta Stripe conectada</p>
            <p className="mb-4">Saldo disponível: R$ {data.availableBalance.toFixed(2)}</p>
            <button
              onClick={() => handleWithdraw(data.availableBalance, 'stripe')}
              disabled={data.availableBalance <= 0 || loading}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 mr-4"
            >
              Sacar via Stripe
            </button>
          </div>
        ) : data.chavePix ? (
          <div>
            <p className="mb-2">Chave PIX: {data.chavePix}</p>
            <p className="mb-4">Saldo disponível: R$ {data.availableBalance.toFixed(2)}</p>
            <button
              onClick={() => handleWithdraw(data.availableBalance, 'pix')}
              disabled={data.availableBalance <= 0 || loading}
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
            >
              Sacar via PIX
            </button>
          </div>
        ) : (
          <div>
            <p className="mb-4">Para sacar dinheiro, conecte sua conta Stripe ou cadastre sua chave PIX no perfil.</p>
            <Link to="/profile" className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 mr-4">
              Conectar Stripe
            </Link>
            <Link to="/profile" className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700">
              Cadastrar PIX
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Wallet;