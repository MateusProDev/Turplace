
import { useState } from "react";
import { useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../../utils/firebase";
import logoSemFundo from "../../assets/logosemfundo.png";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

const googleProvider = new GoogleAuthProvider();
// Configure Google provider
googleProvider.setCustomParameters({
  prompt: 'select_account'
});


export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [showFirstAccess, setShowFirstAccess] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userData } = useAuth();

  // Determinar se é login de cliente baseado na rota
  const isClientLogin = location.pathname === '/client-login';
  // Log para depuração
  // console.log("Login.tsx: user:", user);
  // Redireciona se já estiver autenticado
  useEffect(() => {
    if (user) {
      console.log("Login.tsx: Usuário logado, verificando dados...", { user: user.email, userData });

      // Aguardar os dados carregarem
      const checkAndRedirect = () => {
        console.log("Login.tsx: Verificando userData", { userData, isAdmin: userData?.isAdmin });

        if (userData !== null) {
          // Verifica se há um destino salvo no state
          const from = location.state?.from?.pathname;
          console.log("Login.tsx: Redirecionando usuário", { isAdmin: userData?.isAdmin, from });

          if (userData?.isAdmin) {
            // Admin vai para /admin ou para o destino salvo
            console.log("Login.tsx: Redirecionando admin para:", from || "/admin");
            navigate(from || "/admin", { replace: true });
          } else {
            // Verificar se pode ser cliente e prestador
            const canBeProvider = userData?.role === 'prestador' || userData?.mpConnected;
            const canBeClient = userData?.role === 'cliente' || userData?.hasOrders;
            
            // Se pode ser ambos, vai para seletor
            if (canBeProvider && canBeClient) {
              console.log("Login.tsx: Usuário pode ser ambos, indo para seletor");
              navigate("/select-dashboard", { replace: true });
            } else if (canBeProvider) {
              // Prestador vai para /provider ou para o destino salvo (se não for /admin)
              const destination = from && from !== "/admin" ? from : "/provider";
              console.log("Login.tsx: Redirecionando prestador para:", destination);
              navigate(destination, { replace: true });
            } else {
              // Cliente vai para /client ou para o destino salvo (se não for /admin)
              const destination = from && from !== "/admin" ? from : "/client";
              console.log("Login.tsx: Redirecionando cliente para:", destination);
              navigate(destination, { replace: true });
            }
          }
        } else {
          console.log("Login.tsx: userData ainda null, tentando novamente em 500ms");
          // Tentar novamente se userData ainda não carregou
          setTimeout(checkAndRedirect, 500);
        }
      };

      // Iniciar verificação após 500ms
      const timer = setTimeout(checkAndRedirect, 500);

      return () => clearTimeout(timer);
    }
  }, [user, userData, navigate, location]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    console.log("Login.tsx: handleSubmit chamado", { isLogin, email });
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", cred.user.uid), {
          id: cred.user.uid,
          name,
          email,
          role: isClientLogin ? "cliente" : "prestador",
          planId: "free",
          createdAt: serverTimestamp(),
        });
      }
      navigate(isClientLogin ? "/client" : "/provider");
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error.code === "auth/email-already-in-use") {
        setError("E-mail já cadastrado. Tente fazer login ou use o botão 'Entrar com Google'.");
      } else {
        setError(error.message || "Erro desconhecido");
      }
    } finally {
      setLoading(false);
    }
  };

  // Handler para primeiro acesso (cliente que comprou)
  const handleFirstAccess = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch('/api/first-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message);
        if (data.hint) {
          setError(data.hint);
        }
      } else {
        setError(data.error || 'Erro ao enviar email. Tente novamente.');
      }
    } catch (err) {
      console.error("Erro no primeiro acesso:", err);
      setError("Erro ao conectar com o servidor. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // Handler para esqueci minha senha
  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess("Email de recuperação enviado! Verifique sua caixa de entrada.");
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error.code === "auth/user-not-found") {
        setError("Email não encontrado. Verifique ou crie uma conta.");
      } else if (error.code === "auth/invalid-email") {
        setError("Email inválido.");
      } else {
        setError(error.message || "Erro ao enviar email de recuperação.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    console.log("Login.tsx: handleGoogleLogin chamado");
    setError("");
    setLoading(true);
    try {
      console.log("Login.tsx: Iniciando signInWithPopup");
      const result = await signInWithPopup(auth, googleProvider);
      console.log("Login.tsx: signInWithPopup sucesso", result.user.email);

      if (result.user) {
        console.log("Login.tsx: Salvando dados do usuário no Firestore");
        await setDoc(
          doc(db, "users", result.user.uid),
          {
            id: result.user.uid,
            name: result.user.displayName,
            email: result.user.email,
            role: isClientLogin ? "cliente" : "prestador",
            planId: "free",
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );
        console.log("Login.tsx: Dados salvos com sucesso");
      }
      navigate(isClientLogin ? "/client" : "/provider");
    } catch (err: unknown) {
      console.error("Login.tsx: Erro no Google login", err);

      // Tratamento específico de erros do Firebase Auth
      let errorMessage = "Falha ao entrar com Google";

      const error = err as { code?: string };
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = "Login cancelado pelo usuário";
      } else if ((err as any).code === 'auth/popup-blocked') {
        errorMessage = "Popup bloqueado pelo navegador. Permita popups para este site.";
      } else if ((err as any).code === 'auth/cancelled-popup-request') {
        errorMessage = "Login cancelado";
      } else if ((err as any).code === 'auth/network-request-failed') {
        errorMessage = "Erro de rede. Verifique sua conexão.";
      } else if ((err as any).message) {
        errorMessage += ": " + (err as any).message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-emerald-100">
      <div className="bg-white/90 shadow-xl rounded-2xl p-8 w-full max-w-md flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <img src={logoSemFundo} alt="Lucrazi" className="w-40 h-24 object-contain" />
          <p className="text-gray-500 text-center">
            {showFirstAccess 
              ? "Comprou e é seu primeiro acesso? Digite seu email para receber o link de configuração de senha."
              : showForgotPassword
              ? "Esqueceu sua senha? Digite seu email para receber o link de recuperação."
              : isClientLogin 
              ? "Acesse sua conta de cliente para explorar e comprar no marketplace." 
              : "Acesse sua conta de prestador para gerenciar seus serviços."}
          </p>
        </div>

        {/* Formulário de Primeiro Acesso */}
        {showFirstAccess && (
          <form onSubmit={handleFirstAccess} className="w-full flex flex-col gap-3">
            <input 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="E-mail usado na compra" 
              className="w-full px-4 py-2 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-200" 
              required 
              autoComplete="email" 
            />
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold text-center hover:bg-emerald-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Enviando..." : "Enviar Link de Acesso"}
            </button>
            <button
              type="button"
              className="text-sm text-gray-500 hover:text-blue-600 transition"
              onClick={() => { setShowFirstAccess(false); setError(""); setSuccess(""); }}
            >
              ← Voltar ao login
            </button>
          </form>
        )}

        {/* Formulário de Esqueci Minha Senha */}
        {showForgotPassword && (
          <form onSubmit={handleForgotPassword} className="w-full flex flex-col gap-3">
            <input 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="Seu e-mail" 
              className="w-full px-4 py-2 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200" 
              required 
              autoComplete="email" 
            />
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold text-center hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Enviando..." : "Enviar Link de Recuperação"}
            </button>
            <button
              type="button"
              className="text-sm text-gray-500 hover:text-blue-600 transition"
              onClick={() => { setShowForgotPassword(false); setError(""); setSuccess(""); }}
            >
              ← Voltar ao login
            </button>
          </form>
        )}

        {/* Formulário de Login/Cadastro */}
        {!showFirstAccess && !showForgotPassword && (
          <>
            <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
              {!isLogin && (
                <input value={name} onChange={e => setName(e.target.value)} placeholder={isClientLogin ? "Seu nome completo" : "Nome do seu negócio"} className="w-full px-4 py-2 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200" required />
              )}
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="E-mail" className="w-full px-4 py-2 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200" required autoComplete="email" />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha" className="w-full px-4 py-2 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200" required autoComplete="current-password" />
              <button type="submit" disabled={loading} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold text-center hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed">
                {loading ? (isLogin ? "Entrando..." : "Cadastrando...") : isLogin ? "Entrar" : "Cadastrar"}
              </button>
            </form>
            <div className="w-full flex flex-col gap-2">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-gray-700 font-medium shadow-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <svg width="22" height="22" viewBox="0 0 48 48" className="inline-block"><g><path fill="#4285F4" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.1-5.5 7-10.3 7-6.1 0-11-4.9-11-11s4.9-11 11-11c2.4 0 4.6.8 6.4 2.1l6.4-6.4C34.5 6.5 29.6 4.5 24 4.5 12.7 4.5 3.5 13.7 3.5 25S12.7 45.5 24 45.5c10.5 0 19.5-8.5 19.5-19 0-1.3-.1-2.2-.3-3z"/><path fill="#34A853" d="M6.3 14.1l6.6 4.8C14.5 16.1 18.9 13 24 13c2.4 0 4.6.8 6.4 2.1l6.4-6.4C34.5 6.5 29.6 4.5 24 4.5c-7.1 0-13.2 3.7-16.7 9.6z"/><path fill="#FBBC05" d="M24 45.5c5.4 0 10.3-1.8 14.1-4.9l-6.5-5.3c-2 1.4-4.5 2.2-7.6 2.2-4.8 0-8.7-2.9-10.3-7H6.2l-6.5 5.1C7.1 41.7 15 45.5 24 45.5z"/><path fill="#EA4335" d="M43.6 20.5h-1.9V20H24v8h11.3c-.8 2.2-2.3 4.1-4.2 5.4l6.5 5.3c3.8-3.5 6.4-8.7 6.4-14.7 0-1.3-.1-2.2-.3-3z"/></g></svg>
                Entrar com Google
              </button>
            </div>
            
            {/* Links de ação */}
            <div className="w-full flex flex-col gap-2 text-center">
              <button
                type="button"
                className="px-4 py-2 border-0 bg-transparent text-blue-600 hover:underline transition"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin ? "Criar conta" : "Já tenho conta"}
              </button>
              
              {isLogin && (
                <div className="flex justify-center gap-4 text-sm">
                  <button
                    type="button"
                    className="text-emerald-600 hover:underline transition"
                    onClick={() => { setShowFirstAccess(true); setError(""); setSuccess(""); }}
                  >
                    🛒 Primeiro Acesso (comprei algo)
                  </button>
                  <button
                    type="button"
                    className="text-gray-500 hover:text-blue-600 transition"
                    onClick={() => { setShowForgotPassword(true); setError(""); setSuccess(""); }}
                  >
                    Esqueci minha senha
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Mensagens de sucesso e erro */}
        {success && <div className="text-emerald-600 text-sm text-center w-full bg-emerald-50 p-3 rounded-lg">{success}</div>}
        {error && <div className="text-red-500 text-sm text-center w-full">{error}</div>}
      </div>
    </div>
  );
}
