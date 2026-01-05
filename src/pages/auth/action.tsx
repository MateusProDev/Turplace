import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getAuth, applyActionCode, verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';

const ActionHandler: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'resetForm'>('loading');
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [oobCode, setOobCode] = useState<string | null>(null);

  useEffect(() => {
    const mode = searchParams.get('mode');
    const code = searchParams.get('oobCode');
    if (!mode || !code) {
      setStatus('error');
      setMessage('Link inválido ou expirado.');
      return;
    }
    setOobCode(code);
    const auth = getAuth();
    async function handleAction() {
      try {
        if (mode === 'resetPassword') {
          // Verificar se o código é válido
          await verifyPasswordResetCode(auth, code!);
          setStatus('resetForm');
          setMessage('Digite sua nova senha.');
        } else if (mode === 'verifyEmail') {
          await applyActionCode(auth, code!);
          setStatus('success');
          setMessage('E-mail verificado com sucesso! Faça login.');
        } else if (mode === 'recoverEmail') {
          await applyActionCode(auth, code!);
          setStatus('success');
          setMessage('Seu e-mail foi recuperado. Faça login.');
        } else {
          setStatus('error');
          setMessage('Ação desconhecida.');
        }
      } catch (err: unknown) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Erro ao processar o link.');
      }
    }
    handleAction();
    // eslint-disable-next-line
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oobCode) {
      setMessage('Código inválido.');
      return;
    }
    if (password !== confirmPassword) {
      setMessage('As senhas não coincidem.');
      return;
    }
    if (password.length < 6) {
      setMessage('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    try {
      const auth = getAuth();
      await confirmPasswordReset(auth, oobCode, password);
      setStatus('success');
      setMessage('Senha redefinida com sucesso! Faça login.');
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Erro ao redefinir senha.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <h1 className="text-2xl font-bold mb-4">Ação de Conta</h1>
      {status === 'loading' && <p>Processando...</p>}
      {status === 'resetForm' && (
        <form onSubmit={handleResetPassword} className="w-full max-w-md">
          <p className="mb-4">{message}</p>
          <input
            type="password"
            placeholder="Nova senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded mb-2"
            required
          />
          <input
            type="password"
            placeholder="Confirmar nova senha"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full p-2 border rounded mb-4"
            required
          />
          <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded">
            Redefinir Senha
          </button>
        </form>
      )}
      {(status === 'success' || status === 'error') && <p>{message}</p>}
    </div>
  );
};

export default ActionHandler;
