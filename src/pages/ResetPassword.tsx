import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../utils/firebase';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, ArrowLeft, Mail } from 'lucide-react';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);

  // Validar token ao carregar
  useEffect(() => {
    async function validateToken() {
      if (!token || !email) {
        setError('Link inválido ou expirado. Solicite um novo link de acesso.');
        setValidating(false);
        return;
      }

      try {
        // Buscar pedido com esse token
        const ordersRef = collection(db, 'orders');
        const q = query(
          ordersRef, 
          where('resetToken', '==', token),
          where('customerEmail', '==', decodeURIComponent(email))
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setError('Link inválido ou já utilizado. Entre em contato com o suporte.');
          setValidating(false);
          return;
        }

        const orderDoc = snapshot.docs[0];
        const data = orderDoc.data();
        
        // Verificar se token expirou
        if (data.resetTokenExpiry && new Date(data.resetTokenExpiry) < new Date()) {
          setError('Link expirado. Solicite um novo link de acesso.');
          setValidating(false);
          return;
        }

        // Verificar se senha já foi definida
        if (data.passwordSet) {
          setError('Você já configurou sua senha. Faça login com seu email e senha.');
          setValidating(false);
          return;
        }

        setOrderData({ id: orderDoc.id, ...data });
        setValidating(false);
      } catch (err) {
        console.error('Erro ao validar token:', err);
        setError('Erro ao validar link. Tente novamente.');
        setValidating(false);
      }
    }

    validateToken();
  }, [token, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validações
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setLoading(true);

    try {
      const decodedEmail = decodeURIComponent(email || '');
      
      // Tentar criar novo usuário
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, decodedEmail, password);
        console.log('Novo usuário criado:', userCredential.user.uid);
      } catch (createError: any) {
        // Se usuário já existe, fazer login e atualizar senha
        if (createError.code === 'auth/email-already-in-use') {
          // Usuário já existe, tentar fazer login com senha temporária ou antiga
          // Neste caso, vamos apenas criar a conta com a nova senha via re-autenticação
          setError('Este email já possui uma conta. Faça login normalmente ou use "Esqueci minha senha".');
          setLoading(false);
          return;
        } else {
          throw createError;
        }
      }

      // Atualizar pedido para marcar senha como definida
      if (orderData?.id) {
        const orderRef = doc(db, 'orders', orderData.id);
        await updateDoc(orderRef, {
          passwordSet: true,
          passwordSetAt: new Date().toISOString(),
          resetToken: null, // Limpar token
          resetTokenExpiry: null
        });
      }

      setSuccess(true);
      
      // Redirecionar após 3 segundos
      setTimeout(() => {
        navigate('/client');
      }, 3000);

    } catch (err: any) {
      console.error('Erro ao criar senha:', err);
      
      if (err.code === 'auth/weak-password') {
        setError('A senha é muito fraca. Use pelo menos 6 caracteres.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Email inválido.');
      } else {
        setError('Erro ao configurar senha. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (validating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Validando seu link de acesso...</p>
        </div>
      </div>
    );
  }

  // Error state (invalid token)
  if (error && !orderData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Link Inválido</h1>
          <p className="text-gray-600 mb-8">{error}</p>
          <div className="space-y-3">
            <Link 
              to="/login" 
              className="block w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
            >
              Fazer Login
            </Link>
            <Link 
              to="/" 
              className="block w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition"
            >
              Voltar ao Início
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Senha Criada com Sucesso!</h1>
          <p className="text-gray-600 mb-4">
            Sua conta foi configurada. Você será redirecionado para o painel do cliente...
          </p>
          <div className="flex items-center justify-center gap-2 text-blue-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Redirecionando...</span>
          </div>
        </div>
      </div>
    );
  }

  // Form state
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Back link */}
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao início
        </Link>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Configure sua Senha
            </h1>
            <p className="text-gray-600">
              Crie uma senha para acessar seu conteúdo
            </p>
          </div>

          {/* Email display */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6 flex items-center gap-3">
            <Mail className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="font-medium text-gray-900">{decodeURIComponent(email || '')}</p>
            </div>
          </div>

          {/* Order info */}
          {orderData && (
            <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-100">
              <p className="text-xs text-blue-600 font-medium mb-1">Seu produto</p>
              <p className="font-semibold text-gray-900">
                {orderData.serviceTitle || orderData.title || 'Produto Digital'}
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nova Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none"
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar Senha
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none"
                  placeholder="Digite a senha novamente"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Password match indicator */}
            {confirmPassword && (
              <div className={`flex items-center gap-2 text-sm ${
                password === confirmPassword ? 'text-green-600' : 'text-red-600'
              }`}>
                {password === confirmPassword ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Senhas coincidem
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    Senhas não coincidem
                  </>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || password.length < 6 || password !== confirmPassword}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Configurando...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  Criar Senha e Acessar
                </>
              )}
            </button>
          </form>

          {/* Help text */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Após criar sua senha, você será direcionado para o painel do cliente onde poderá acessar seu conteúdo.
          </p>
        </div>
      </div>
    </div>
  );
}
