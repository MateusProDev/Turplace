import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { generateSlug } from '../utils/slug';
import {
  ArrowLeft,
  Clock,
  Users,
  Star,
  Play,
  BookOpen,
  CheckCircle,
  ShoppingCart,
  Heart
} from 'lucide-react';

interface CourseSection {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  duration?: string;
  order: number;
}

interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
  image?: string;
  sections: CourseSection[];
  status: 'draft' | 'published';
  createdAt: any;
  updatedAt: any;
  instructorId: string;
  totalStudents?: number;
  rating?: number;
}

export default function CourseDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourse = async () => {
      if (!slug) return;

      try {
        // Buscar todos os cursos publicados
        const coursesRef = collection(db, 'courses');
        const q = query(coursesRef, where('status', '==', 'published'));
        const snapshot = await getDocs(q);

        // Encontrar o curso pelo slug do título
        const courseDoc = snapshot.docs.find(doc => {
          const courseData = doc.data() as Course;
          return generateSlug(courseData.title) === slug;
        });

        if (courseDoc) {
          setCourse({ id: courseDoc.id, ...courseDoc.data() } as Course);
        } else {
          setError('Curso não encontrado');
        }
      } catch (err) {
        console.error('Erro ao buscar curso:', err);
        setError('Erro ao carregar o curso');
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Curso não encontrado</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            to="/catalog"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Voltar ao Catálogo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Link
            to="/catalog"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
          >
            <ArrowLeft size={20} />
            Voltar ao catálogo
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Conteúdo Principal */}
          <div className="lg:col-span-2">
            {/* Imagem do Curso */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
              {course.image ? (
                <img
                  src={course.image}
                  alt={course.title}
                  className="w-full h-64 object-cover"
                />
              ) : (
                <div className="w-full h-64 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                  <BookOpen className="text-blue-400" size={64} />
                </div>
              )}
            </div>

            {/* Informações do Curso */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{course.title}</h1>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-1">
                  <Star className="text-yellow-400 fill-current" size={16} />
                  <span className="font-semibold">{course.rating || 0}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <Users size={16} />
                  <span>{course.totalStudents || 0} alunos</span>
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <Clock size={16} />
                  <span>{course.sections?.length || 0} aulas</span>
                </div>
              </div>

              <div className="prose max-w-none">
                <p className="text-gray-700 leading-relaxed">{course.description}</p>
              </div>
            </div>

            {/* Seções do Curso */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Conteúdo do Curso</h2>

              <div className="space-y-4">
                {course.sections?.map((section, index) => (
                  <div
                    key={section.id}
                    className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                      {index + 1}
                    </div>

                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{section.title}</h3>
                      {section.description && (
                        <p className="text-sm text-gray-600 mt-1">{section.description}</p>
                      )}
                    </div>

                    {section.duration && (
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock size={14} />
                        {section.duration}
                      </div>
                    )}

                    <Play className="text-blue-600" size={20} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
              <div className="text-center mb-6">
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  R$ {course.price?.toFixed(2).replace('.', ',') || '0,00'}
                </div>
                <p className="text-sm text-gray-500">valor único</p>
              </div>

              <button className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition mb-4 flex items-center justify-center gap-2">
                <ShoppingCart size={20} />
                Comprar Agora
              </button>

              <button className="w-full border border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-2">
                <Heart size={20} />
                Adicionar aos Favoritos
              </button>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4">Este curso inclui:</h3>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="text-green-500" size={16} />
                    <span className="text-sm">Acesso vitalício</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="text-green-500" size={16} />
                    <span className="text-sm">{course.sections?.length || 0} aulas em vídeo</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="text-green-500" size={16} />
                    <span className="text-sm">Certificado de conclusão</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="text-green-500" size={16} />
                    <span className="text-sm">Suporte do instrutor</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}