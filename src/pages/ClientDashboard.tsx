import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen,
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
  Store,
  CreditCard,
  XCircle,
  ChevronLeft,
  Trash2,
  ExternalLink
} from "lucide-react";
import { auth } from "../utils/firebase";
import { signOut } from "firebase/auth";

// Função para converter URL de vídeo em embed seguro (esconde origem)
const getSecureEmbedUrl = (url: string): string | null => {
  if (!url) return null;
  
  // YouTube - várias formas de URL
  const youtubePatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
  ];
  
  for (const pattern of youtubePatterns) {
    const match = url.match(pattern);
    if (match) {
      // Embed com configurações para esconder branding e desabilitar download
      return `https://www.youtube-nocookie.com/embed/${match[1]}?rel=0&modestbranding=1&showinfo=0&controls=1&disablekb=0&fs=1&playsinline=1`;
    }
  }
  
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}?title=0&byline=0&portrait=0&badge=0`;
  }
  
  // Google Drive
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  }
  
  // Se já for uma URL de embed, retornar como está
  if (url.includes('/embed/') || url.includes('/preview') || url.includes('player.vimeo')) {
    return url;
  }
  
  // URL direta de vídeo (mp4, webm, etc)
  if (url.match(/\.(mp4|webm|ogg)(\?.*)?$/i)) {
    return url; // Será tratado com tag <video>
  }
  
  return null;
};

// Verifica se é URL direta de vídeo
const isDirectVideoUrl = (url: string): boolean => {
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
};

interface Order {
  id: string;
  serviceId: string;
  serviceTitle: string;
  serviceDescription: string;
  serviceImageUrl?: string;
  servicePrice?: string;
  providerName: string;
  amount: number;
  status: 'pending' | 'paid' | 'completed' | 'cancelled';
  createdAt: string;
  billingType: 'one-time' | 'subscription';
  customerEmail: string;
  accessLink?: string;
  contentType?: 'course' | 'infoproduct' | 'service';
  subscriptionId?: string;
  sections?: Array<{
    id: string;
    title: string;
    content: string;
    type: 'video' | 'text' | 'download';
    url?: string;
  }>;
}

export default function ClientDashboard() {
  const { user, userData, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'content' | 'subscriptions' | 'profile'>('orders');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [cancellingSubscription, setCancellingSubscription] = useState<string | null>(null);
  const [playingVideo, setPlayingVideo] = useState<{ sectionId: string; url: string; title: string } | null>(null);

  useEffect(() => {
    // Não fazer nada enquanto o auth está carregando
    if (authLoading) return;
    
    if (!user) {
      navigate('/login');
      return;
    }

    fetchUserOrders();
  }, [user, authLoading, navigate]);

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

  const handleCancelSubscription = async (orderId: string, subscriptionId?: string) => {
    if (!subscriptionId) {
      alert('ID da assinatura não encontrado');
      return;
    }
    
    if (!confirm('Tem certeza que deseja cancelar esta assinatura? Você perderá o acesso ao conteúdo.')) {
      return;
    }

    setCancellingSubscription(orderId);
    try {
      const token = await user?.getIdToken();
      const response = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscriptionId, orderId }),
      });

      if (response.ok) {
        alert('Assinatura cancelada com sucesso');
        fetchUserOrders(); // Recarregar pedidos
      } else {
        const error = await response.json();
        alert(`Erro ao cancelar assinatura: ${error.message || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro ao cancelar assinatura:', error);
      alert('Erro ao cancelar assinatura');
    } finally {
      setCancellingSubscription(null);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm(`Tem certeza que deseja excluir o pedido ${orderId}?`)) {
      return;
    }

    try {
      // Como não temos endpoint para deletar, vamos usar uma abordagem simples
      // Em produção, você deveria ter um endpoint seguro para isso
      alert(`Funcionalidade de exclusão para pedido ${orderId} não implementada ainda. Entre em contato com o suporte.`);
    } catch (error) {
      console.error('Erro ao excluir pedido:', error);
      alert('Erro ao excluir pedido');
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
                  onClick={() => setActiveTab('subscriptions')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeTab === 'subscriptions'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <CreditCard className="w-5 h-5" />
                  <span className="font-medium">Minhas Assinaturas</span>
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
                                R$ {order.amount > 0 ? Number(order.amount).toFixed(2).replace('.', ',') : (order.servicePrice ? order.servicePrice : '0,00')}
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
                              {order.status === 'pending' && (
                                <button
                                  onClick={() => handleDeleteOrder(order.id)}
                                  className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Excluir
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

            {activeTab === 'subscriptions' && (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b">
                  <h2 className="text-2xl font-bold text-gray-900">Minhas Assinaturas</h2>
                  <p className="text-gray-600 mt-1">Gerencie suas assinaturas ativas</p>
                </div>

                <div className="p-6">
                  {orders.filter(o => o.billingType === 'subscription').length === 0 ? (
                    <div className="text-center py-12">
                      <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma assinatura encontrada</h3>
                      <p className="text-gray-600 mb-6">Você ainda não tem assinaturas ativas.</p>
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
                      {orders
                        .filter(o => o.billingType === 'subscription')
                        .map((order) => (
                        <div
                          key={order.id}
                          className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                              <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center">
                                <CreditCard className="w-8 h-8 text-purple-600" />
                              </div>

                              <div className="flex-1">
                                <h3 className="font-semibold text-gray-900 mb-1">
                                  {order.serviceTitle}
                                </h3>
                                <p className="text-sm text-gray-600 mb-2">
                                  Por {order.providerName}
                                </p>
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(order.status)}
                                  <span className={`text-sm font-medium ${
                                    order.status === 'paid' || order.status === 'completed'
                                      ? 'text-green-600'
                                      : order.status === 'pending'
                                      ? 'text-yellow-600'
                                      : 'text-red-600'
                                  }`}>
                                    {order.status === 'paid' || order.status === 'completed' ? 'Ativa' : 
                                     order.status === 'cancelled' ? 'Cancelada' : 'Pendente'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-lg font-bold text-gray-900">
                                R$ {Number(order.amount).toFixed(2).replace('.', ',')}/mês
                              </div>
                              <div className="text-sm text-gray-500 mb-3">
                                Desde {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                              </div>
                              
                              <div className="flex flex-col gap-2">
                                {(order.status === 'paid' || order.status === 'completed') && (
                                  <>
                                    <button
                                      onClick={() => setSelectedOrder(order)}
                                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                      Acessar Conteúdo
                                    </button>
                                    <button
                                      onClick={() => handleCancelSubscription(order.id, order.subscriptionId)}
                                      disabled={cancellingSubscription === order.id}
                                      className="px-4 py-2 bg-red-50 text-red-600 text-sm rounded-lg hover:bg-red-100 transition-colors border border-red-200 flex items-center justify-center gap-1"
                                    >
                                      {cancellingSubscription === order.id ? (
                                        <>
                                          <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                                          Cancelando...
                                        </>
                                      ) : (
                                        <>
                                          <XCircle className="w-4 h-4" />
                                          Cancelar Assinatura
                                        </>
                                      )}
                                    </button>
                                  </>
                                )}
                              </div>
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
                  onClick={() => { setPlayingVideo(null); setSelectedOrder(null); }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <p className="text-gray-600 mt-1">Por {selectedOrder.providerName}</p>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {selectedOrder.contentType === 'course' && selectedOrder.sections ? (
                <div className="space-y-4">
                  {/* Player de vídeo inline */}
                  {playingVideo && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <button
                          onClick={() => setPlayingVideo(null)}
                          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Voltar para lista
                        </button>
                        <span className="text-sm text-gray-500">Aula atual</span>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-3">{playingVideo.title}</h4>
                      <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ paddingBottom: '56.25%' }}>
                        {isDirectVideoUrl(playingVideo.url) ? (
                          <video
                            className="absolute inset-0 w-full h-full"
                            controls
                            controlsList="nodownload"
                            onContextMenu={(e) => e.preventDefault()}
                            autoPlay
                          >
                            <source src={playingVideo.url} type="video/mp4" />
                            Seu navegador não suporta vídeos HTML5.
                          </video>
                        ) : (
                          <iframe
                            className="absolute inset-0 w-full h-full"
                            src={getSecureEmbedUrl(playingVideo.url) || ''}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title={playingVideo.title}
                            style={{ border: 'none' }}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Lista de aulas */}
                  {!playingVideo && (
                    <>
                      <h4 className="font-semibold text-gray-900 mb-4">Conteúdo do Curso</h4>
                      {selectedOrder.sections.map((section, index) => (
                        <div key={section.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {section.type === 'video' && (
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                  <Play className="w-5 h-5 text-blue-600" />
                                </div>
                              )}
                              {section.type === 'text' && (
                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                  <FileText className="w-5 h-5 text-green-600" />
                                </div>
                              )}
                              <div>
                                <span className="font-medium text-gray-900 block">
                                  {index + 1}. {section.title}
                                </span>
                                <span className="text-sm text-gray-500">
                                  {section.type === 'video' ? 'Vídeo aula' : 'Material de texto'}
                                </span>
                              </div>
                            </div>

                            {section.type === 'video' && section.url && (
                              <button
                                onClick={() => setPlayingVideo({ 
                                  sectionId: section.id, 
                                  url: section.url!, 
                                  title: section.title 
                                })}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                <Play className="w-4 h-4" />
                                Assistir
                              </button>
                            )}
                          </div>

                          {section.type === 'text' && (
                            <div className="text-gray-700 mt-3 pt-3 border-t border-gray-100">
                              {section.content}
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  )}
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