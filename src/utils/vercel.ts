// Utilitários para integração com Vercel API
// Permite adicionar/remover domínios automaticamente

const VERCEL_API_BASE = 'https://api.vercel.com';

export interface VercelDomainConfig {
  name: string;
  projectId?: string;
}

/**
 * Adiciona um domínio personalizado no Vercel
 */
export async function addVercelDomain(domain: string): Promise<boolean> {
  try {
    const accessToken = import.meta.env.VERCEL_ACCESS_TOKEN;
    const teamId = import.meta.env.VERCEL_TEAM_ID;

    if (!accessToken) {
      console.warn('VERCEL_ACCESS_TOKEN não configurado');
      return false;
    }

    const url = teamId
      ? `${VERCEL_API_BASE}/v10/projects/${import.meta.env.VITE_FIREBASE_PROJECT_ID}/domains?teamId=${teamId}`
      : `${VERCEL_API_BASE}/v10/projects/${import.meta.env.VITE_FIREBASE_PROJECT_ID}/domains`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: domain,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Erro ao adicionar domínio no Vercel:', error);
      return false;
    }

    const result = await response.json();
    console.log('Domínio adicionado no Vercel:', result);
    return true;
  } catch (error) {
    console.error('Erro na API do Vercel:', error);
    return false;
  }
}

/**
 * Remove um domínio personalizado do Vercel
 */
export async function removeVercelDomain(domain: string): Promise<boolean> {
  try {
    const accessToken = import.meta.env.VERCEL_ACCESS_TOKEN;
    const teamId = import.meta.env.VERCEL_TEAM_ID;

    if (!accessToken) {
      console.warn('VERCEL_ACCESS_TOKEN não configurado');
      return false;
    }

    const url = teamId
      ? `${VERCEL_API_BASE}/v9/projects/${import.meta.env.VITE_FIREBASE_PROJECT_ID}/domains/${domain}?teamId=${teamId}`
      : `${VERCEL_API_BASE}/v9/projects/${import.meta.env.VITE_FIREBASE_PROJECT_ID}/domains/${domain}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Erro ao remover domínio do Vercel:', error);
      return false;
    }

    console.log('Domínio removido do Vercel:', domain);
    return true;
  } catch (error) {
    console.error('Erro na API do Vercel:', error);
    return false;
  }
}

/**
 * Verifica se um domínio já está configurado no Vercel
 */
export async function checkVercelDomain(domain: string): Promise<boolean> {
  try {
    const accessToken = import.meta.env.VERCEL_ACCESS_TOKEN;
    const teamId = import.meta.env.VERCEL_TEAM_ID;

    if (!accessToken) {
      return false;
    }

    const url = teamId
      ? `${VERCEL_API_BASE}/v9/projects/${import.meta.env.VITE_FIREBASE_PROJECT_ID}/domains?teamId=${teamId}`
      : `${VERCEL_API_BASE}/v9/projects/${import.meta.env.VITE_FIREBASE_PROJECT_ID}/domains`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return false;
    }

    const result = await response.json();
    return result.domains?.some((d: any) => d.name === domain) || false;
  } catch (error) {
    console.error('Erro ao verificar domínio no Vercel:', error);
    return false;
  }
}