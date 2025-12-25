import ShareContent from '@sharecontent/sdk';

class ShareContentService {
  private client: ShareContent;

  constructor(token?: string) {
    this.client = new ShareContent({
      token: token || import.meta.env.VITE_SHARECONTENT_TOKEN, // Use variável de ambiente para o token
      timeout: 30000,
    });
  }

  setToken(token: string) {
    this.client.setToken(token);
  }

  setProjectId(projectId: string) {
    this.client.setProjectId(projectId);
  }

  // Método para criar um link encurtado
  async createShortLink(url: string, title?: string, shortCode?: string) {
    try {
      const shortLink = await this.client.shortLinks.create({
        url,
        title,
        short_code: shortCode,
      });
      return shortLink;
    } catch (error) {
      console.error('Erro ao criar link encurtado:', error);
      throw error;
    }
  }

  // Método para listar links
  async listShortLinks() {
    try {
      const links = await this.client.shortLinks.list();
      return links;
    } catch (error) {
      console.error('Erro ao listar links:', error);
      throw error;
    }
  }

  // Método para obter analytics de um link
  async getLinkAnalytics(shortCode: string) {
    try {
      const analytics = await this.client.analytics.getByLink(shortCode);
      return analytics;
    } catch (error) {
      console.error('Erro ao obter analytics:', error);
      throw error;
    }
  }

  // Outros métodos podem ser adicionados conforme necessário
}

export default ShareContentService;