import { db } from "./firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

export interface Product {
  id: string;
  name?: string;
  title?: string;
  imageUrl?: string;
  price?: number;
  rating?: number;
  views?: number;
  bookings?: number;
  category?: string;
  provider?: string;
  author?: string;
  badge?: string;
  billingType?: string;
}

export async function getTopRatedProducts(limit = 5): Promise<Product[]> {
  try {
    const servicesSnap = await getDocs(query(collection(db, "services"), where("status", "==", "approved")));
    const services: Product[] = servicesSnap.docs.map(doc => {
      const data = doc.data();
      
      // Função para parsear preço brasileiro (string com vírgula)
      const parsePrice = (price: unknown): number => {
        if (typeof price === 'number') return price;
        if (typeof price === 'string') {
          // Remove R$, espaços, etc., e converte vírgula para ponto
          const cleaned = price.replace(/[^\d,.-]/g, '').replace(',', '.');
          const parsed = parseFloat(cleaned);
          return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
      };
      
      return {
        id: doc.id,
        title: data.name || data.title || "Serviço sem nome",
        category: data.category || "Geral",
        imageUrl: Array.isArray(data.images) && data.images.length > 0 ? data.images[0] : "https://via.placeholder.com/800x600?text=Imagem+não+disponível",
        author: data.ownerName || data.providerName || data.author || "Prestador",
        rating: typeof data.rating === 'number' ? data.rating : 0,
        views: typeof data.views === 'number' ? data.views : 0,
        bookings: typeof data.bookings === 'number' ? data.bookings : 0,
        price: parsePrice(data.price),
        badge: data.badge || "Premium",
        billingType: data.billingType || "one-time"
      };
    });

    // Se limit for 0 ou negativo, retornar todos sem ordenar
    if (limit <= 0) {
      return services;
    }

    // Ordenar: primeiro por rating desc (se existir e > 0), senão por views desc
    services.sort((a, b) => {
      const aRating = a.rating && a.rating > 0 ? a.rating : 0;
      const bRating = b.rating && b.rating > 0 ? b.rating : 0;

      if (aRating !== bRating) {
        return bRating - aRating; // Maior rating primeiro
      }

      // Se ratings iguais ou ambos 0, ordenar por views
      const aViews = a.views || 0;
      const bViews = b.views || 0;
      return bViews - aViews;
    });

    return services.slice(0, limit);
  } catch (error) {
    console.error("Erro ao buscar produtos top rated:", error);
    return [];
  }
}