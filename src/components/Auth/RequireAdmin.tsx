import type { ReactNode } from "react";
import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../utils/firebase";

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, userData } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("admin@turplace.com");
  const [password, setPassword] = useState("Admin123!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  console.log('RequireAdmin Debug:', {
    user: !!user,
    userData,
    isAdmin: userData?.isAdmin,
    pathname: location.pathname
  });

  // Se não está logado, mostra formulário de login inline
  if (!user) {
    console.log('RequireAdmin: Usuário não logado, mostrando formulário de login');

    const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError("");

      try {
        await signInWithEmailAndPassword(auth, email, password);
        console.log('RequireAdmin: Login realizado com sucesso');
      } catch (err: any) {
        console.error('RequireAdmin: Erro no login:', err);
        setError(err.message || "Erro ao fazer login");
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Login Administrativo</h2>
            <p className="text-gray-600">Entre com suas credenciais de administrador</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Credenciais padrão: admin@turplace.com / Admin123!
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Aguardar os dados do usuário serem carregados
  if (userData === null) {
    console.log('RequireAdmin: Aguardando dados do usuário...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // Se está logado mas não é admin, vai para o painel do prestador
  if (!userData?.isAdmin) {
    console.log('RequireAdmin: Usuário não é admin, redirecionando para provider');
    return <Navigate to="/provider" state={{ from: location }} replace />;
  }

  console.log('RequireAdmin: Usuário é admin, mostrando conteúdo');
  // Se é admin, mostra o conteúdo
  return <>{children}</>;
}