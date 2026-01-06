import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs, updateDoc, doc, increment } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { generateSlug } from '../utils/slug';
import {
  ArrowLeft,
  Download,
  FileText,
  CheckCircle,
  ShoppingCart,
  Heart,
  Share2,
  Eye
} from 'lucide-react';

interface Ebook {
  id: string;
  title: string;
  description: string;
  price: number;
  coverImage?: string;
  fileUrl?: string;
  status: 'draft' | 'published';
  createdAt: any;
  updatedAt: any;
  authorId: string;
  downloads?: number;
  views?: number;
}

export default function EbookDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [ebook, setEbook] = useState<Ebook | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  useEffect(() => {
    const loadEbook = async () => {
      if (!slug) return;

      try {
        // Buscar eBook pelo slug
        const ebooksRef = collection(db, 'ebooks');
        const q = query(ebooksRef, where('status', '==', 'published'));
        const snapshot = await getDocs(q);

        const ebookDoc = snapshot.docs.find(doc => {
          const data = doc.data() as Ebook;
          return generateSlug(data.title) === slug;
        });

        if (ebookDoc) {
          const ebookData = { id: ebookDoc.id, ...ebookDoc.data() } as Ebook;
          setEbook(ebookData);

          // Incrementar visualizações
          await updateDoc(doc(db, 'ebooks', ebookDoc.id), {
            views: increment(1)
          });
        }
      } catch (error) {
        console.error('Erro ao carregar eBook:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEbook();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!ebook) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">eBook não encontrado</h1>
          <p className="text-gray-600 mb-6">O eBook que você está procurando não existe ou foi removido.</p>
          <Link
            to="/marketplace"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Voltar ao Marketplace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} />
            Voltar ao Marketplace
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Conteúdo Principal */}
          <div className="lg:col-span-2 space-y-8">
            {/* Capa e Informações Básicas */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="md:flex">
                <div className="md:w-1/3">
                  <img
                    src={ebook.coverImage || 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&h=600&fit=crop'}
                    alt={ebook.title}
                    className="w-full h-64 md:h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&h=600&fit=crop';
                    }}
                  />
                </div>
                <div className="md:w-2/3 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900 mb-2">{ebook.title}</h1>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                        <div className="flex items-center gap-1">
                          <Eye size={16} />
                          {ebook.views || 0} visualizações
                        </div>
                        <div className="flex items-center gap-1">
                          <Download size={16} />
                          {ebook.downloads || 0} downloads
                        </div>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-orange-100 text-orange-800 text-sm font-medium rounded-full">
                      eBook Digital
                    </span>
                  </div>

                  <div className="text-gray-700 leading-relaxed mb-6">
                    {isDescriptionExpanded ? ebook.description : ebook.description.slice(0, 200) + '...'}
                    {ebook.description.length > 200 && (
                      <button
                        onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-2 transition-colors"
                      >
                        {isDescriptionExpanded ? 'Ver menos' : 'Ver mais'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Conteúdo do eBook */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Sobre este eBook</h2>

              <div className="prose prose-gray max-w-none">
                <p className="text-gray-700 leading-relaxed">
                  Este eBook contém todo o conhecimento necessário para você dominar o assunto.
                  Após a compra, você terá acesso vitalício ao arquivo digital.
                </p>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg">
                    <Download className="w-6 h-6 text-orange-600" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Download Imediato</h3>
                      <p className="text-sm text-gray-600">Acesso instantâneo após a compra</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Acesso Vitalício</h3>
                      <p className="text-sm text-gray-600">Download ilimitado para sempre</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Card de Compra */}
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  R$ {ebook.price.toFixed(2).replace('.', ',')}
                </div>
                <p className="text-gray-600">Acesso vitalício</p>
              </div>

              <div className="space-y-4">
                <button className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-orange-700 transition-colors flex items-center justify-center gap-2">
                  <ShoppingCart size={20} />
                  Comprar eBook - R$ {ebook.price.toFixed(2).replace('.', ',')}
                </button>
                <button className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                  <Heart size={20} />
                  Adicionar aos Favoritos
                </button>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <button className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                  <Share2 size={16} />
                  Compartilhar
                </button>
              </div>
            </div>

            {/* Informações Adicionais */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Informações do Produto</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Formato:</span>
                  <span className="font-medium">PDF/ePub</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Idioma:</span>
                  <span className="font-medium">Português</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Última atualização:</span>
                  <span className="font-medium">
                    {ebook.updatedAt?.toDate?.()?.toLocaleDateString('pt-BR') || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}