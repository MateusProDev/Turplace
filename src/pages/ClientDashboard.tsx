import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Download,
  LogOut,
  Settings,
  ShoppingBag,
  User,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  FileText,
  Video,
  ExternalLink,
  Store
} from "lucide-react";
import { auth } from "../utils/firebase";
import { signOut } from "firebase/auth";

interface Order {
  id: string;
  serviceId: string;
  serviceTitle: string;
  serviceDescription: string;
  serviceImageUrl?: string;
  providerName: string;
  amount: number;
  status: 'pending' | 'paid' | 'completed' | 'cancelled';
  createdAt: string;
  billingType: 'one-time' | 'subscription';
  customerEmail: string;
  accessLink?: string;
  contentType?: 'course' | 'infoproduct' | 'service';
  sections?: Array<{
    id: string;
    title: string;
    content: string;
    type: 'video' | 'text' | 'download';
    url?: string;
  }>;
}

export default function ClientDashboard() {
  const { user, userData } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'content' | 'profile'>('orders');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchUserOrders();
  }, [user, navigate]);

  const fetchUserOrders = async () => {
    try {
      const token = await user?.getIdToken();
      if (!token) {
        console.error('Token de autenticação não encontrado');
        return;
      }

      const response = await fetch('/api/user-orders', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      } else {
        console.error('Erro ao buscar pedidos');
      }
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'cancelled':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Pago';
      case 'completed':
        return 'Concluído';
      case 'pending':
        return 'Pendente';
      case 'cancelled':
        return 'Cancelado';
      default:
        return 'Desconhecido';
    }
  };

  const getContentTypeIcon = (type?: string) => {
    switch (type) {
      case 'course':
        return <BookOpen className="w-4 h-4" />;
      case 'infoproduct':
        return <FileText className="w-4 h-4" />;
      case 'service':
        return <Video className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando seu dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="text-2xl font-bold text-blue-600">
                Lucrazi
              </Link>
              <span className="text-gray-500">|</span>
              <span className="text-gray-600">Área do Cliente</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {userData?.name || user?.email}
                </span>
              </div>

              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeTab === 'orders'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <ShoppingBag className="w-5 h-5" />
                  <span className="font-medium">Meus Pedidos</span>
                </button>

                <button
                  onClick={() => setActiveTab('content')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeTab === 'content'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <BookOpen className="w-5 h-5" />
                  <span className="font-medium">Meu Conteúdo</span>
                </button>

                <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeTab === 'profile'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Settings className="w-5 h-5" />
                  <span className="font-medium">Perfil</span>
                </button>
              </nav>

              {/* Botão para ir para o painel de prestador */}
              <div className="mt-6 pt-6 border-t">
                <button
                  onClick={() => navigate('/provider')}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                >
                  <Store className="w-5 h-5" />
                  <div>
                    <span className="font-medium block">Painel do Prestador</span>
                    <span className="text-xs text-emerald-600">Vender produtos e serviços</span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === 'orders' && (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b">
                  <h2 className="text-2xl font-bold text-gray-900">Meus Pedidos</h2>
                  <p className="text-gray-600 mt-1">Gerencie suas compras e assinaturas</p>
                </div>

                <div className="p-6">
                  {orders.length === 0 ? (
                    <div className="text-center py-12">
                      <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum pedido encontrado</h3>
                      <p className="text-gray-600 mb-6">Você ainda não fez nenhuma compra.</p>
                      <Link
                        to="/catalog"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        Explorar Catálogo
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order) => (
                        <div
                          key={order.id}
                          className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                                {getContentTypeIcon(order.contentType)}
                              </div>

                              <div className="flex-1">
                                <h3 className="font-semibold text-gray-900 mb-1">
                                  {order.serviceTitle}
                                </h3>
                                <p className="text-sm text-gray-600 mb-2">
                                  Por {order.providerName}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {order.serviceDescription}
                                </p>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="flex items-center gap-2 mb-2">
                                {getStatusIcon(order.status)}
                                <span className={`text-sm font-medium ${
                                  order.status === 'paid' || order.status === 'completed'
                                    ? 'text-green-600'
                                    : order.status === 'pending'
                                    ? 'text-yellow-600'
                                    : 'text-red-600'
                                }`}>
                                  {getStatusText(order.status)}
                                </span>
                              </div>

                              <div className="text-lg font-bold text-gray-900">
                                R$ {Number(order.amount).toFixed(2).replace('.', ',')}
                              </div>

                              <div className="text-sm text-gray-500">
                                {order.billingType === 'subscription' ? 'Assinatura mensal' : 'Compra única'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                              </div>
                            </div>

                            <div className="flex gap-2">
                              {(order.status === 'paid' || order.status === 'completed') && (
                                <button
                                  onClick={() => setSelectedOrder(order)}
                                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                  Acessar Conteúdo
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'content' && (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b">
                  <h2 className="text-2xl font-bold text-gray-900">Meu Conteúdo</h2>
                  <p className="text-gray-600 mt-1">Acesse seus cursos e materiais adquiridos</p>
                </div>

                <div className="p-6">
                  {orders.filter(o => o.status === 'paid' || o.status === 'completed').length === 0 ? (
                    <div className="text-center py-12">
                      <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum conteúdo disponível</h3>
                      <p className="text-gray-600">Seus conteúdos aparecerão aqui após a confirmação do pagamento.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {orders
                        .filter(o => o.status === 'paid' || o.status === 'completed')
                        .map((order) => (
                        <div
                          key={order.id}
                          className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                              {getContentTypeIcon(order.contentType)}
                            </div>

                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 mb-1">
                                {order.serviceTitle}
                              </h3>
                              <p className="text-sm text-gray-600 mb-3">
                                {order.providerName}
                              </p>

                              <button
                                onClick={() => setSelectedOrder(order)}
                                className="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                              >
                                <Play className="w-4 h-4" />
                                Acessar Conteúdo
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b">
                  <h2 className="text-2xl font-bold text-gray-900">Meu Perfil</h2>
                  <p className="text-gray-600 mt-1">Gerencie suas informações pessoais</p>
                </div>

                <div className="p-6">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nome
                      </label>
                      <div className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                        {userData?.name || 'Não informado'}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <div className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                        {user?.email}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo de Conta
                      </label>
                      <div className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                        Cliente
                      </div>
                    </div>

                    <div className="pt-4">
                      <Link
                        to="/profile/settings"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        Editar Perfil
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Conteúdo */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedOrder.serviceTitle}
                </h3>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <p className="text-gray-600 mt-1">Por {selectedOrder.providerName}</p>
            </div>

            <div className="p-6 overflow-y-auto max-h-96">
              {selectedOrder.contentType === 'course' && selectedOrder.sections ? (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 mb-4">Conteúdo do Curso</h4>
                  {selectedOrder.sections.map((section, index) => (
                    <div key={section.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        {section.type === 'video' && <Video className="w-5 h-5 text-blue-600" />}
                        {section.type === 'text' && <FileText className="w-5 h-5 text-green-600" />}
                        {section.type === 'download' && <Download className="w-5 h-5 text-purple-600" />}
                        <span className="font-medium text-gray-900">
                          {index + 1}. {section.title}
                        </span>
                      </div>

                      {section.type === 'text' && (
                        <div className="text-gray-700 mt-2">
                          {section.content}
                        </div>
                      )}

                      {(section.type === 'video' || section.type === 'download') && section.url && (
                        <a
                          href={section.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors mt-2"
                        >
                          {section.type === 'video' ? <Play className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                          {section.type === 'video' ? 'Assistir' : 'Download'}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    Conteúdo em Preparação
                  </h4>
                  <p className="text-gray-600">
                    O conteúdo será liberado em breve pelo prestador.
                  </p>
                  {selectedOrder.accessLink && (
                    <a
                      href={selectedOrder.accessLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mt-4"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Acessar Link Externo
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}