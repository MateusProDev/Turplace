import ShareContent from '@sharecontent/sdk';

class ShareContentService {
  private client: ShareContent;

  constructor(token?: string) {
    // Mantém o cliente para uso futuro, mas usaremos API routes para evitar CORS
    this.client = new ShareContent({
      token: token || import.meta.env.VITE_SHARECONTENT_TOKEN,
      timeout: 30000,
    });
  }

  setToken(token: string) {
    this.client.setToken(token);
  }

  setProjectId(projectId: string) {
    this.client.setProjectId(projectId);
  }

  // Método para criar um link encurtado via API route
  async createShortLink(url: string, title?: string, shortCode?: string) {
    try {
      const response = await fetch('/api/sharecontent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'createShortLink',
          url,
          title,
          shortCode,
        }),
      });

      const contentType = response.headers.get('content-type') || '';

      if (!response.ok) {
        if (contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Erro ao criar link encurtado');
        } else {
          const text = await response.text();
          throw new Error(text || `Erro ao criar link encurtado (status ${response.status})`);
        }
      }

      if (contentType.includes('application/json')) {
        const shortLink = await response.json();
        return shortLink;
      }

      // Fallback: se o servidor retornar texto (HTML/plaintext), lançar como erro para tratamento upstream
      const textBody = await response.text();
      try {
        return JSON.parse(textBody);
      } catch (_e) {
        throw new Error(textBody || 'Resposta inválida do servidor ao criar link encurtado');
      }
    } catch (error) {
      console.error('Erro ao criar link encurtado:', error);
      throw error;
    }
  }

  // Método para obter analytics de um link via API route
  async getLinkAnalytics(shortCode: string) {
    try {
      const response = await fetch('/api/sharecontent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'getLinkAnalytics',
          shortCode,
        }),
      });

      const contentType = response.headers.get('content-type') || '';

      if (!response.ok) {
        if (contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Erro ao obter analytics');
        } else {
          const text = await response.text();
          throw new Error(text || `Erro ao obter analytics (status ${response.status})`);
        }
      }

      if (contentType.includes('application/json')) {
        const analytics = await response.json();
        return analytics;
      }

      const textBody = await response.text();
      try {
        return JSON.parse(textBody);
      } catch (_e) {
        throw new Error(textBody || 'Resposta inválida do servidor ao obter analytics');
      }
    } catch (error) {
      console.error('Erro ao obter analytics:', error);
      throw error;
    }
  }

  // Método para listar links via API route
  async listShortLinks() {
    try {
      const response = await fetch('/api/sharecontent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'listShortLinks',
        }),
      });

      const contentType = response.headers.get('content-type') || '';

      if (!response.ok) {
        if (contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Erro ao listar links');
        } else {
          const text = await response.text();
          throw new Error(text || `Erro ao listar links (status ${response.status})`);
        }
      }

      if (contentType.includes('application/json')) {
        const links = await response.json();
        return links;
      }

      const textBody = await response.text();
      try {
        return JSON.parse(textBody);
      } catch (_e) {
        throw new Error(textBody || 'Resposta inválida do servidor ao listar links');
      }
    } catch (error) {
      console.error('Erro ao listar links:', error);
      throw error;
    }
  }

  // Outros métodos podem ser adicionados conforme necessário
}

export default ShareContentService;