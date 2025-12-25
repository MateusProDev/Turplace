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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao criar link encurtado');
      }

      const shortLink = await response.json();
      return shortLink;
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao obter analytics');
      }

      const analytics = await response.json();
      return analytics;
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao listar links');
      }

      const links = await response.json();
      return links;
    } catch (error) {
      console.error('Erro ao listar links:', error);
      throw error;
    }
  }

  // Outros métodos podem ser adicionados conforme necessário
}

export default ShareContentService;