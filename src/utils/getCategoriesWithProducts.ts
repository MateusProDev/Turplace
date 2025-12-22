
import { db } from "./firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

interface Service {
  id: string;
  category?: string;
  [key: string]: unknown;
}

// Busca categorias e até N produtos por categoria
export async function getCategoriesWithProducts(maxProductsPerCategory = 5) {
  try {
    // Tenta buscar da coleção categories
    const categoriesSnap = await getDocs(collection(db, "categories"));
    if (!categoriesSnap.empty) {
      return categoriesSnap.docs.map(doc => {
        const data = doc.data() || {};
        return {
          category: typeof data.category === 'string' ? data.category : String(doc.id),
          products: Array.isArray(data.products)
            ? data.products.slice(0, maxProductsPerCategory)
            : [],
        };
      });
    }
  } catch (e) {
    // Apenas loga o erro, não quebra
    console.error("Erro ao buscar categories:", e);
  }

  try {
    // Fallback: agrupa por services aprovados
    const servicesSnap = await getDocs(query(collection(db, "services"), where("status", "==", "approved")));
    const services: Service[] = servicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const categoriesMap: Record<string, Service[]> = {};
    for (const service of services) {
      if (!service.category) continue;
      if (!categoriesMap[service.category]) {
        categoriesMap[service.category] = [];
      }
      if (categoriesMap[service.category].length < maxProductsPerCategory) {
        categoriesMap[service.category].push(service);
      }
    }
    return Object.entries(categoriesMap).map(([category, products]) => ({
      category,
      products,
    }));
  } catch (e) {
    console.error("Erro ao buscar services:", e);
  }
  // Nunca retorna undefined, sempre array
  return [];
}
