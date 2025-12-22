import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../utils/firebase";

interface ServiceToFix {
  id: string;
  data: Record<string, unknown>;
  missingFields: string[];
}

export const diagnoseServices = async () => {
  console.log("🔍 Iniciando diagnóstico de serviços...");

  try {
    const servicesRef = collection(db, "services");
    const snapshot = await getDocs(servicesRef);

    console.log(`📊 Total de serviços encontrados: ${snapshot.docs.length}`);

    let validServices = 0;
    let invalidServices = 0;
    const servicesToFix: ServiceToFix[] = [];

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const serviceId = docSnap.id;

      console.log(`\n🔍 Verificando serviço: ${serviceId}`);
      console.log("Dados:", data);

      // Verificar campos obrigatórios
      const requiredFields = ['title', 'description', 'ownerId'];
      const missingFields = requiredFields.filter(field => !data[field]);

      if (missingFields.length > 0) {
        console.log(`❌ Serviço ${serviceId} faltando campos: ${missingFields.join(', ')}`);
        invalidServices++;
        servicesToFix.push({ id: serviceId, data, missingFields });
      } else {
        console.log(`✅ Serviço ${serviceId} válido`);
        validServices++;
      }

      // Verificar se ownerId existe na coleção users
      if (data.ownerId) {
        try {
          const userDoc = await getDocs(collection(db, "users"));
          const userExists = userDoc.docs.some(user => user.id === data.ownerId);
          if (!userExists) {
            console.log(`⚠️  Serviço ${serviceId} tem ownerId ${data.ownerId} que não existe na coleção users`);
          }
        } catch (error) {
          console.log(`❌ Erro ao verificar ownerId para serviço ${serviceId}:`, error);
        }
      }
    }

    console.log(`\n📈 Resumo:`);
    console.log(`✅ Serviços válidos: ${validServices}`);
    console.log(`❌ Serviços inválidos: ${invalidServices}`);

    if (servicesToFix.length > 0) {
      console.log(`\n🔧 Serviços que precisam de correção:`);
      servicesToFix.forEach(service => {
        console.log(`- ${service.id}: faltando ${service.missingFields.join(', ')}`);
      });

      // Perguntar se quer corrigir
      const shouldFix = confirm(`Encontrados ${invalidServices} serviços com problemas. Deseja tentar corrigir automaticamente?`);
      if (shouldFix) {
        await fixServices(servicesToFix);
      }
    }

  } catch (error) {
    console.error("❌ Erro no diagnóstico:", error);
  }
};

const fixServices = async (servicesToFix: ServiceToFix[]) => {
  console.log("🔧 Iniciando correção automática...");

  for (const service of servicesToFix) {
    try {
      const updates: Record<string, unknown> = {};

      // Adicionar campos padrão se estiverem faltando
      if (service.missingFields.includes('title')) {
        updates.title = 'Serviço sem título';
      }
      if (service.missingFields.includes('description')) {
        updates.description = 'Descrição não fornecida';
      }
      if (service.missingFields.includes('ownerId')) {
        // Tentar encontrar um ownerId válido ou usar um padrão
        updates.ownerId = 'unknown';
      }

      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, "services", service.id), updates);
        console.log(`✅ Serviço ${service.id} corrigido`);
      }
    } catch (error) {
      console.error(`❌ Erro ao corrigir serviço ${service.id}:`, error);
    }
  }

  console.log("🔧 Correção concluída!");
};

// Função para executar diagnóstico (chame no console do navegador)
(window as any).diagnoseServices = diagnoseServices;