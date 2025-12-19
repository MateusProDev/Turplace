import { db } from "./firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

interface Product {
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
}

export async function getTopRatedProducts(limit = 5): Promise<Product[]> {
  try {
    const servicesSnap = await getDocs(query(collection(db, "services"), where("status", "==", "approved")));
    const services: Product[] = servicesSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.name || data.title || "Serviço sem nome",
        category: data.category || "Geral",
        imageUrl: data.imageUrl || "https://via.placeholder.com/800x600?text=Imagem+não+disponível",
        author: data.providerName || data.author || "Prestador",
        rating: data.rating || 0,
        views: data.views || 0,
        bookings: data.bookings || 0,
        price: data.price || 0,
        badge: data.badge || "Premium"
      };
    });

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