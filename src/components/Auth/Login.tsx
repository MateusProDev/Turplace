import { useState } from "react";
import { auth, db } from "../../utils/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError("");
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
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-xs mx-auto p-4 flex flex-col gap-2">
      {!isLogin && (
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome completo" className="w-full px-4 py-2 border rounded" required />
      )}
      <input value={email} onChange={e => setEmail(e.target.value)} placeholder="E-mail" className="w-full px-4 py-2 border rounded" />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha" className="w-full px-4 py-2 border rounded" />
      <button type="submit" className="w-full px-4 py-2 bg-blue-600 text-white rounded font-semibold text-center hover:bg-blue-700 transition">{isLogin ? "Entrar" : "Cadastrar"}</button>
      <button type="button" className="w-full px-4 py-2 border rounded text-blue-600 hover:bg-blue-50 transition" onClick={() => setIsLogin(!isLogin)}>
        {isLogin ? "Criar conta" : "Já tenho conta"}
      </button>
      {error && <div className="text-red-500 text-sm">{error}</div>}
    </form>
  );
}
