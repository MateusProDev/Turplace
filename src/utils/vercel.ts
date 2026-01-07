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
    // Usar apenas variáveis do Vite (disponíveis tanto local quanto no Vercel)
    const accessToken = import.meta.env.VITE_VERCEL_ACCESS_TOKEN;
    const teamId = import.meta.env.VERCEL_TEAM_ID;

    if (!accessToken) {
      console.warn('VITE_VERCEL_ACCESS_TOKEN não configurado');
      return false;
    }

    // Usar o ID correto do projeto Vercel (turplace)
    const projectId = 'prj_Co6irMeZcJlH4rOuckPmO5NYCmrj';

    const url = teamId
      ? `${VERCEL_API_BASE}/v10/projects/${projectId}/domains?teamId=${teamId}`
      : `${VERCEL_API_BASE}/v10/projects/${projectId}/domains`;

    console.log('🔧 Tentando adicionar domínio:', domain);
    console.log('📋 Projeto ID:', projectId);
    console.log('🔗 URL da API:', url);
    console.log('🔑 Token presente:', !!accessToken);

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

    console.log('📊 Status da resposta:', response.status);
    console.log('📝 Headers da resposta:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Erro ao adicionar domínio no Vercel:', error);
      console.error('❌ Status:', response.status, 'URL:', url);
      console.error('❌ Request body:', { name: domain });

      // Se o domínio já existe, considerar como sucesso
      if (error.error?.code === 'domain_already_in_use') {
        console.log('Domínio já existe no Vercel:', domain);
        return true;
      }

      return false;
    }

    const result = await response.json();
    console.log('✅ Domínio adicionado no Vercel:', result);
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
    // Usar apenas variáveis do Vite (disponíveis tanto local quanto no Vercel)
    const accessToken = import.meta.env.VITE_VERCEL_ACCESS_TOKEN;
    const teamId = import.meta.env.VERCEL_TEAM_ID;

    if (!accessToken) {
      console.warn('VITE_VERCEL_ACCESS_TOKEN não configurado');
      return false;
    }

    // Usar o ID correto do projeto Vercel (turplace)
    const projectId = 'prj_Co6irMeZcJlH4rOuckPmO5NYCmrj';

    const url = teamId
      ? `${VERCEL_API_BASE}/v9/projects/${projectId}/domains/${domain}?teamId=${teamId}`
      : `${VERCEL_API_BASE}/v9/projects/${projectId}/domains/${domain}`;

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
    // Usar apenas variáveis do Vite (disponíveis tanto local quanto no Vercel)
    const accessToken = import.meta.env.VITE_VERCEL_ACCESS_TOKEN;
    const teamId = import.meta.env.VERCEL_TEAM_ID;

    if (!accessToken) {
      return false;
    }

    // Usar o ID correto do projeto Vercel (turplace)
    const projectId = 'prj_Co6irMeZcJlH4rOuckPmO5NYCmrj';

    const url = teamId
      ? `${VERCEL_API_BASE}/v9/projects/${projectId}/domains?teamId=${teamId}`
      : `${VERCEL_API_BASE}/v9/projects/${projectId}/domains`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return false;
    }

    const result = await response.json();
    const exists = result.domains?.some((d: any) => d.name === domain) || false;
    console.log('Verificação de domínio:', domain, 'existe:', exists);
    return exists;
  } catch (error) {
    console.error('Erro ao verificar domínio no Vercel:', error);
    return false;
  }
}