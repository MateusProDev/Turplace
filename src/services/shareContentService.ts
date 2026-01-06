// import ShareContent from '@sharecontent/sdk'; // Removed for security

import { generateCustomDomainUrl } from '../utils/leadpage';

class ShareContentService {
  constructor() {
    // All operations go through the API route for security
  }

  // setToken and setProjectId removed for security - all operations via API route

  // Método para criar um link encurtado via API route (opcional - com fallback)
  async createShortLink(url: string, title?: string, shortCode?: string, useFallback: boolean = true) {
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
      console.warn('ShareContent não disponível, usando URL nativa:', error instanceof Error ? error.message : String(error));
      if (useFallback) {
        // Retornar objeto compatível com fallback
        return {
          short_url: url,
          original_url: url,
          title: title || 'Link',
          short_code: shortCode || 'native',
          note: 'Link nativo (ShareContent não disponível)'
        };
      }
      throw error;
    }
  }

  // Método para obter analytics de um link via API route
  async getLinkAnalytics(shortCode: string) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch('/api/sharecontent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'getLinkAnalytics',
          shortCode,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const contentType = response.headers.get('content-type') || '';

      if (!response.ok) {
        let errorMessage = `Erro ao obter analytics (status ${response.status})`;
        
        if (contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch (e) {
            errorMessage = 'Resposta de erro inválida do servidor';
          }
        } else {
          const text = await response.text();
          if (text) {
            errorMessage = text.length > 100 ? 'Erro interno do servidor' : text;
          }
        }
        
        throw new Error(errorMessage);
      }

      if (contentType.includes('application/json')) {
        const analytics = await response.json();
        return analytics;
      }

      // Se não for JSON, tentar parsear como JSON mesmo assim
      const textBody = await response.text();
      try {
        return JSON.parse(textBody);
      } catch (_e) {
        throw new Error('Resposta inválida do servidor ao obter analytics');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Timeout ao carregar analytics. Tente novamente.');
      }
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

  // Método para criar link encurtado com domínio personalizado do usuário
  async createCustomDomainShortLink(userId: string, path: string, title?: string, shortCode?: string) {
    try {
      // Gerar URL personalizada baseada no domínio do usuário
      const customUrl = await generateCustomDomainUrl(userId, path);

      // Criar link encurtado usando a URL personalizada
      return await this.createShortLink(customUrl, title, shortCode);
    } catch (error) {
      console.error('Erro ao criar link com domínio personalizado:', error);
      throw error;
    }
  }

  // Outros métodos podem ser adicionados conforme necessário
}

export default ShareContentService;