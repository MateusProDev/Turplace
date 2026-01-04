import { useEffect, useState } from "react";
import { db } from "../utils/firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { BarChart3, Users, DollarSign, ShoppingCart, CreditCard, TrendingUp, CheckCircle, XCircle, Shield, AlertTriangle, Eye, Lock } from 'lucide-react';

interface Stats {
  totalUsers: number;
  totalProviders: number;
  totalOrders: number;
  totalSales: number;
  pendingPayouts: number;
  totalPayouts: number;
}

interface Order {
  id: string;
  amount: number;
  status: string;
  createdAt: any; // Firestore Timestamp or string
  serviceId: string;
  userId: string;
}

interface Payout {
  id: string;
  amount: number;
  status: string;
  createdAt: any; // Firestore Timestamp or string
  userId: string;
  chavePix: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  plan: string;
  createdAt: any; // Firestore Timestamp or string
}

interface Service {
  id: string;
  title: string;
  status: string;
  ownerId: string;
}

interface SecurityLog {
  id: string;
  level: string;
  message: string;
  context: any;
  timestamp: any;
  ip: string;
  endpoint: string;
  userAgent: string;
  attackType: string;
}

interface SecurityStats {
  totalLogs: number;
  rateLimitEvents: number;
  attackAttempts: number;
  validationFailures: number;
  webhookSecurity: number;
  sqlInjectionAttempts: number;
  xssAttempts: number;
  pathTraversalAttempts: number;
  commandInjectionAttempts: number;
  signatureValidations: number;
  uniqueIPs: number;
  recentAttacks: SecurityLog[];
}

export default function AdminDashboard() {
  // Helper function to format dates safely
  const formatDate = (date: any): string => {
    if (!date) return 'N/A';
    try {
      if (date.toDate) {
        // Firestore Timestamp
        return date.toDate().toLocaleDateString('pt-BR');
      } else if (typeof date === 'string') {
        return new Date(date).toLocaleDateString('pt-BR');
      } else if (date instanceof Date) {
        return date.toLocaleDateString('pt-BR');
      }
      return 'N/A';
    } catch (error) {
      console.error('Error formatting date:', error, date);
      return 'N/A';
    }
  };

  // Helper function to format currency safely
  const formatCurrency = (value: any): string => {
    const num = Number(value) || 0;
    return `R$ ${num.toFixed(2).replace('.', ',')}`;
  };
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'payouts' | 'users' | 'services' | 'security'>('overview');
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalProviders: 0,
    totalOrders: 0,
    totalSales: 0,
    pendingPayouts: 0,
    totalPayouts: 0,
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [securityStats, setSecurityStats] = useState<SecurityStats>({
    totalLogs: 0,
    rateLimitEvents: 0,
    attackAttempts: 0,
    validationFailures: 0,
    webhookSecurity: 0,
    sqlInjectionAttempts: 0,
    xssAttempts: 0,
    pathTraversalAttempts: 0,
    commandInjectionAttempts: 0,
    signatureValidations: 0,
    uniqueIPs: 0,
    recentAttacks: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load users
      const usersSnap = await getDocs(collection(db, 'users'));
      const usersData = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as User[];
      setUsers(usersData);

      // Load orders
      const ordersSnap = await getDocs(collection(db, 'orders'));
      const ordersData = ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
      setOrders(ordersData);

      // Load payouts
      const payoutsSnap = await getDocs(collection(db, 'payouts'));
      const payoutsData = payoutsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Payout[];
      setPayouts(payoutsData);

      // Load services
      const servicesSnap = await getDocs(collection(db, 'services'));
      const servicesData = servicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Service[];
      setServices(servicesData);

      // Load security logs
      const securitySnap = await getDocs(collection(db, 'security_logs'));
      const securityData = securitySnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SecurityLog[];
      setSecurityLogs(securityData);

      // Calculate stats
      const totalUsers = usersData.length;
      const totalProviders = usersData.filter(u => u.plan && u.plan !== 'free').length;
      const totalOrders = ordersData.length;
      const totalSales = ordersData.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
      const pendingPayouts = payoutsData.filter(p => p.status === 'pending').length;
      const totalPayouts = payoutsData.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      setStats({
        totalUsers: Number(totalUsers) || 0,
        totalProviders: Number(totalProviders) || 0,
        totalOrders: Number(totalOrders) || 0,
        totalSales: Number(totalSales) || 0,
        pendingPayouts: Number(pendingPayouts) || 0,
        totalPayouts: Number(totalPayouts) || 0,
      });

      // Calculate security stats
      const totalLogs = securityData.length;
      const rateLimitEvents = securityData.filter(log => log.attackType === 'rate_limiting').length;
      const attackAttempts = securityData.filter(log => log.attackType === 'attack_attempt').length;
      const validationFailures = securityData.filter(log => log.attackType === 'input_validation').length;
      const webhookSecurity = securityData.filter(log => log.attackType === 'webhook_security').length;
      const sqlInjectionAttempts = securityData.filter(log => log.attackType === 'sql_injection').length;
      const xssAttempts = securityData.filter(log => log.attackType === 'xss_attempt').length;
      const pathTraversalAttempts = securityData.filter(log => log.attackType === 'path_traversal').length;
      const commandInjectionAttempts = securityData.filter(log => log.attackType === 'command_injection').length;
      const signatureValidations = securityData.filter(log => log.attackType === 'signature_validation').length;

      // Unique IPs
      const uniqueIPs = new Set(securityData.map(log => log.ip).filter(ip => ip)).size;

      // Recent attacks (last 24 hours)
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      const recentAttacks = securityData
        .filter(log => {
          const logDate = log.timestamp?.toDate?.() || new Date(log.timestamp);
          return logDate > oneDayAgo && (log.level === 'error' || log.level === 'warn');
        })
        .sort((a, b) => {
          const aDate = a.timestamp?.toDate?.() || new Date(a.timestamp);
          const bDate = b.timestamp?.toDate?.() || new Date(b.timestamp);
          return bDate.getTime() - aDate.getTime();
        })
        .slice(0, 10);

      setSecurityStats({
        totalLogs,
        rateLimitEvents,
        attackAttempts,
        validationFailures,
        webhookSecurity,
        sqlInjectionAttempts,
        xssAttempts,
        pathTraversalAttempts,
        commandInjectionAttempts,
        signatureValidations,
        uniqueIPs,
        recentAttacks
      });
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveService = async (id: string, status: string) => {
    await updateDoc(doc(db, "services", id), { status });
    setServices(s => s.map(sv => sv.id === id ? { ...sv, status } : sv));
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Dashboard Administrativo</h1>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded ${activeTab === 'overview' ? 'bg-blue-600 text-white' : 'bg-white'}`}
          >
            Visão Geral
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded ${activeTab === 'orders' ? 'bg-blue-600 text-white' : 'bg-white'}`}
          >
            Pedidos
          </button>
          <button
            onClick={() => setActiveTab('payouts')}
            className={`px-4 py-2 rounded ${activeTab === 'payouts' ? 'bg-blue-600 text-white' : 'bg-white'}`}
          >
            Saques
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'bg-white'}`}
          >
            Usuários
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`px-4 py-2 rounded ${activeTab === 'services' ? 'bg-blue-600 text-white' : 'bg-white'}`}
          >
            Serviços
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2 rounded ${activeTab === 'security' ? 'bg-red-600 text-white' : 'bg-white'}`}
          >
            <Shield className="inline mr-1" size={16} />
            Segurança
          </button>
        </div>

        {activeTab === 'overview' && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <Users className="text-blue-600 mb-2" size={24} />
                <h3 className="text-lg font-semibold">Total Usuários</h3>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <BarChart3 className="text-green-600 mb-2" size={24} />
                <h3 className="text-lg font-semibold">Produtores</h3>
                <p className="text-2xl font-bold">{stats.totalProviders}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <ShoppingCart className="text-purple-600 mb-2" size={24} />
                <h3 className="text-lg font-semibold">Total Pedidos</h3>
                <p className="text-2xl font-bold">{stats.totalOrders}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <DollarSign className="text-yellow-600 mb-2" size={24} />
                <h3 className="text-lg font-semibold">Vendas Totais</h3>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalSales)}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <CreditCard className="text-red-600 mb-2" size={24} />
                <h3 className="text-lg font-semibold">Saques Pendentes</h3>
                <p className="text-2xl font-bold">{stats.pendingPayouts}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <TrendingUp className="text-indigo-600 mb-2" size={24} />
                <h3 className="text-lg font-semibold">Total Saques</h3>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalPayouts)}</p>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold mb-4">Pedidos Recentes</h2>
                <div className="space-y-2">
                  {orders.slice(0, 5).map(order => (
                    <div key={order.id} className="flex justify-between">
                      <span>{order.id.slice(0, 8)}...</span>
                      <span>{formatCurrency(order.amount)}</span>
                      <span className={`px-2 py-1 rounded text-xs ${order.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {order.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold mb-4">Saques Recentes</h2>
                <div className="space-y-2">
                  {payouts.slice(0, 5).map(payout => (
                    <div key={payout.id} className="flex justify-between">
                      <span>{(payout.userId || '').slice(0, 8)}...</span>
                      <span>{formatCurrency(payout.amount)}</span>
                      <span className={`px-2 py-1 rounded text-xs ${payout.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {payout.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'orders' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Todos os Pedidos</h2>
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left p-2">ID</th>
                  <th className="text-left p-2">Usuário</th>
                  <th className="text-left p-2">Serviço</th>
                  <th className="text-left p-2">Valor</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Data</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id} className="border-t">
                    <td className="p-2">{order.id.slice(0, 8)}...</td>
                    <td className="p-2">{(order.userId || '').slice(0, 8)}...</td>
                    <td className="p-2">{(order.serviceId || '').slice(0, 8)}...</td>
                    <td className="p-2">{formatCurrency(order.amount)}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs ${order.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="p-2">{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'payouts' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Todos os Saques</h2>
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left p-2">ID</th>
                  <th className="text-left p-2">Usuário</th>
                  <th className="text-left p-2">Chave PIX</th>
                  <th className="text-left p-2">Valor</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Data</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map(payout => (
                  <tr key={payout.id} className="border-t">
                    <td className="p-2">{payout.id.slice(0, 8)}...</td>
                    <td className="p-2">{(payout.userId || '').slice(0, 8)}...</td>
                    <td className="p-2">{payout.chavePix || 'N/A'}</td>
                    <td className="p-2">{formatCurrency(payout.amount)}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs ${payout.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {payout.status}
                      </span>
                    </td>
                    <td className="p-2">{formatDate(payout.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Todos os Usuários</h2>
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left p-2">ID</th>
                  <th className="text-left p-2">Nome</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Plano</th>
                  <th className="text-left p-2">Data Cadastro</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-t">
                    <td className="p-2">{user.id.slice(0, 8)}...</td>
                    <td className="p-2">{user.name || 'N/A'}</td>
                    <td className="p-2">{user.email}</td>
                    <td className="p-2">{user.plan || 'free'}</td>
                    <td className="p-2">{formatDate(user.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'services' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Aprovação de Serviços</h2>
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left p-2">Título</th>
                  <th className="text-left p-2">Proprietário</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {services.map(service => (
                  <tr key={service.id} className="border-t">
                    <td className="p-2">{service.title}</td>
                    <td className="p-2">{service.ownerId.slice(0, 8)}...</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        service.status === 'approved' ? 'bg-green-100 text-green-800' :
                        service.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {service.status}
                      </span>
                    </td>
                    <td className="p-2">
                      {service.status !== "approved" && (
                        <button
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm mr-2 hover:bg-green-700"
                          onClick={() => handleApproveService(service.id, "approved")}
                        >
                          <CheckCircle size={16} className="inline mr-1" />
                          Aprovar
                        </button>
                      )}
                      {service.status !== "rejected" && (
                        <button
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                          onClick={() => handleApproveService(service.id, "rejected")}
                        >
                          <XCircle size={16} className="inline mr-1" />
                          Rejeitar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-8">
            {/* Security Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
                <Shield className="text-red-600 mb-2" size={24} />
                <h3 className="text-lg font-semibold">Total de Eventos</h3>
                <p className="text-2xl font-bold">{securityStats.totalLogs}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow border-l-4 border-orange-500">
                <AlertTriangle className="text-orange-600 mb-2" size={24} />
                <h3 className="text-lg font-semibold">Rate Limiting</h3>
                <p className="text-2xl font-bold">{securityStats.rateLimitEvents}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
                <Lock className="text-red-600 mb-2" size={24} />
                <h3 className="text-lg font-semibold">Tentativas de Ataque</h3>
                <p className="text-2xl font-bold">{securityStats.attackAttempts}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
                <Eye className="text-yellow-600 mb-2" size={24} />
                <h3 className="text-lg font-semibold">IPs Únicos</h3>
                <p className="text-2xl font-bold">{securityStats.uniqueIPs}</p>
              </div>
            </div>

            {/* Attack Types Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold mb-4">Tipos de Ataques Detectados</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Rate Limiting</span>
                    <div className="flex items-center">
                      <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-orange-500 h-2 rounded-full"
                          style={{ width: `${securityStats.totalLogs > 0 ? (securityStats.rateLimitEvents / securityStats.totalLogs) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold">{securityStats.rateLimitEvents}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Tentativas de Ataque</span>
                    <div className="flex items-center">
                      <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-red-500 h-2 rounded-full"
                          style={{ width: `${securityStats.totalLogs > 0 ? (securityStats.attackAttempts / securityStats.totalLogs) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold">{securityStats.attackAttempts}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Falhas de Validação</span>
                    <div className="flex items-center">
                      <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${securityStats.totalLogs > 0 ? (securityStats.validationFailures / securityStats.totalLogs) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold">{securityStats.validationFailures}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Segurança Webhook</span>
                    <div className="flex items-center">
                      <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full"
                          style={{ width: `${securityStats.totalLogs > 0 ? (securityStats.webhookSecurity / securityStats.totalLogs) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold">{securityStats.webhookSecurity}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">SQL Injection</span>
                    <div className="flex items-center">
                      <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-red-600 h-2 rounded-full"
                          style={{ width: `${securityStats.totalLogs > 0 ? (securityStats.sqlInjectionAttempts / securityStats.totalLogs) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold">{securityStats.sqlInjectionAttempts}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">XSS Attempts</span>
                    <div className="flex items-center">
                      <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-red-700 h-2 rounded-full"
                          style={{ width: `${securityStats.totalLogs > 0 ? (securityStats.xssAttempts / securityStats.totalLogs) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold">{securityStats.xssAttempts}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Path Traversal</span>
                    <div className="flex items-center">
                      <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-red-500 h-2 rounded-full"
                          style={{ width: `${securityStats.totalLogs > 0 ? (securityStats.pathTraversalAttempts / securityStats.totalLogs) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold">{securityStats.pathTraversalAttempts}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Command Injection</span>
                    <div className="flex items-center">
                      <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-red-800 h-2 rounded-full"
                          style={{ width: `${securityStats.totalLogs > 0 ? (securityStats.commandInjectionAttempts / securityStats.totalLogs) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold">{securityStats.commandInjectionAttempts}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold mb-4">Ataques Recentes (24h)</h2>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {securityStats.recentAttacks.length > 0 ? (
                    securityStats.recentAttacks.map(attack => (
                      <div key={attack.id} className="border rounded p-3">
                        <div className="flex justify-between items-start mb-1">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            attack.level === 'error' ? 'bg-red-100 text-red-800' :
                            attack.level === 'warn' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {attack.level.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(attack.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm font-medium mb-1">{attack.message}</p>
                        <div className="text-xs text-gray-600">
                          <span>IP: {attack.ip || 'N/A'}</span>
                          {attack.endpoint && <span> | Endpoint: {attack.endpoint}</span>}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Tipo: {attack.attackType?.replace('_', ' ').toUpperCase() || 'DESCONHECIDO'}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">Nenhum ataque recente detectado</p>
                  )}
                </div>
              </div>
            </div>

            {/* Security Logs Table */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-4">Logs de Segurança Detalhados</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left p-2">Data/Hora</th>
                      <th className="text-left p-2">Nível</th>
                      <th className="text-left p-2">Mensagem</th>
                      <th className="text-left p-2">IP</th>
                      <th className="text-left p-2">Tipo de Ataque</th>
                      <th className="text-left p-2">Endpoint</th>
                    </tr>
                  </thead>
                  <tbody>
                    {securityLogs.slice(0, 50).map(log => (
                      <tr key={log.id} className="border-t">
                        <td className="p-2 text-sm">
                          {formatDate(log.timestamp)}
                        </td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            log.level === 'error' ? 'bg-red-100 text-red-800' :
                            log.level === 'warn' ? 'bg-yellow-100 text-yellow-800' :
                            log.level === 'info' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {log.level.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-2 text-sm max-w-xs truncate" title={log.message}>
                          {log.message}
                        </td>
                        <td className="p-2 text-sm font-mono">{log.ip || 'N/A'}</td>
                        <td className="p-2 text-sm">
                          <span className={`px-2 py-1 rounded text-xs ${
                            log.attackType === 'rate_limiting' ? 'bg-orange-100 text-orange-800' :
                            log.attackType === 'attack_attempt' ? 'bg-red-100 text-red-800' :
                            log.attackType === 'sql_injection' ? 'bg-red-600 text-white' :
                            log.attackType === 'xss_attempt' ? 'bg-red-700 text-white' :
                            log.attackType === 'path_traversal' ? 'bg-red-500 text-white' :
                            log.attackType === 'command_injection' ? 'bg-red-800 text-white' :
                            log.attackType === 'webhook_security' ? 'bg-purple-100 text-purple-800' :
                            log.attackType === 'input_validation' ? 'bg-blue-100 text-blue-800' :
                            log.attackType === 'cors_violation' ? 'bg-yellow-200 text-yellow-900' :
                            log.attackType === 'suspicious_request' ? 'bg-pink-100 text-pink-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {log.attackType?.replace(/_/g, ' ').toUpperCase() || 'DESCONHECIDO'}
                          </span>
                        </td>
                        <td className="p-2 text-sm">{log.endpoint || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {securityLogs.length === 0 && (
                <p className="text-gray-500 text-center py-8">Nenhum log de segurança encontrado</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
