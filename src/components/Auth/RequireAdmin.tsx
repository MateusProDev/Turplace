import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, userData } = useAuth();
  const location = useLocation();

  // Se não está logado, vai para login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Se está logado mas não é admin, vai para o painel do prestador
  if (!userData?.isAdmin) {
    return <Navigate to="/provider" state={{ from: location }} replace />;
  }

  // Se é admin, mostra o conteúdo
  return <>{children}</>;
}