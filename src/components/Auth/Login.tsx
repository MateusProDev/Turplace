
import { useState } from "react";
// import { useEffect } from "react";
// import { useAuth } from "../../hooks/useAuth";
// import { useNavigate } from "react-router-dom";
import { auth, db } from "../../utils/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

const googleProvider = new GoogleAuthProvider();


export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // const navigate = useNavigate();
  // const { user } = useAuth();
  // Log para depuração
  // console.log("Login.tsx: user:", user);
  // Redireciona se já estiver autenticado
  // useEffect(() => {
  //   if (user) {
  //     console.log("Login.tsx: Redirecionando para /provider");
  //     navigate("/provider", { replace: true });
  //   }
  // }, [user, navigate]);
  // if (user) {
  //   return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  // }

  const handleSubmit = async (e: any) => {
    console.log("Login.tsx: handleSubmit chamado", { isLogin, email });
    e.preventDefault();
    setError("");
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
          role: "prestador",
          createdAt: serverTimestamp(),
        });
      }
      // O redirecionamento será feito pelo efeito do useAuth
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        setError("E-mail já cadastrado. Tente fazer login ou use o botão 'Entrar com Google'.");
      } else {
        setError(err.message);
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
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        await setDoc(
          doc(db, "users", result.user.uid),
          {
            id: result.user.uid,
            name: result.user.displayName,
            email: result.user.email,
            role: "prestador",
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
      // O redirecionamento será feito pelo efeito do useAuth
    } catch (err: any) {
      setError("Falha ao entrar com Google: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-emerald-100">
      <div className="bg-white/90 shadow-xl rounded-2xl p-8 w-full max-w-md flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <img src="/src/assets/logosemfundo.png" alt="Turplace" className="w-24 h-16 object-contain" />
          <h1 className="text-3xl font-bold text-blue-700">Turplace</h1>
          <p className="text-gray-500 text-center">Acesse sua conta ou cadastre-se para explorar o marketplace de turismo local.</p>
        </div>
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          {!isLogin && (
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome completo" className="w-full px-4 py-2 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200" required />
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
        <button
          type="button"
          className="w-full px-4 py-2 border-0 bg-transparent text-blue-600 hover:underline transition"
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin ? "Criar conta" : "Já tenho conta"}
        </button>
        {error && <div className="text-red-500 text-sm text-center w-full">{error}</div>}
      </div>
    </div>
  );
}
