import { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../utils/firebase";

interface ServiceData {
  id: string;
  title?: string;
  description?: string;
  ownerId?: string;
  status?: string;
  [key: string]: unknown;
}

export default function ServiceDiagnostics() {
  const [services, setServices] = useState<ServiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [fixing, setFixing] = useState(false);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      const servicesRef = collection(db, "services");
      const snapshot = await getDocs(servicesRef);
      const servicesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setServices(servicesData);
    } catch (error) {
      console.error("Erro ao carregar serviços:", error);
    } finally {
      setLoading(false);
    }
  };

  const fixService = async (service: ServiceData) => {
    try {
      const updates: Record<string, unknown> = {};

      if (!service.title) updates.title = 'Serviço sem título';
      if (!service.description) updates.description = 'Descrição não fornecida';
      if (!service.ownerId) updates.ownerId = 'unknown';
      if (!service.status) updates.status = 'approved';

      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, "services", service.id), updates);
        console.log(`Serviço ${service.id} corrigido`);
        await loadServices(); // Recarregar lista
      }
    } catch (error) {
      console.error(`Erro ao corrigir serviço ${service.id}:`, error);
    }
  };

  const deleteService = async (serviceId: string) => {
    if (confirm('Tem certeza que deseja excluir este serviço?')) {
      try {
        await deleteDoc(doc(db, "services", serviceId));
        console.log(`Serviço ${serviceId} excluído`);
        await loadServices(); // Recarregar lista
      } catch (error) {
        console.error(`Erro ao excluir serviço ${serviceId}:`, error);
      }
    }
  };

  const fixAllServices = async () => {
    setFixing(true);
    for (const service of services) {
      await fixService(service);
    }
    setFixing(false);
    alert('Correção concluída!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="mt-6 text-gray-600 font-medium">Carregando diagnóstico...</p>
          <p className="text-sm text-gray-400 mt-2">Verificando serviços</p>
        </div>
      </div>
    );
  }

  const invalidServices = services.filter(service =>
    !service.title || !service.description || !service.ownerId
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Diagnóstico de Serviços</h1>

          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{services.length}</div>
                <div className="text-blue-600">Total de Serviços</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{services.length - invalidServices.length}</div>
                <div className="text-green-600">Serviços Válidos</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{invalidServices.length}</div>
                <div className="text-red-600">Serviços com Problemas</div>
              </div>
            </div>

            {invalidServices.length > 0 && (
              <button
                onClick={fixAllServices}
                disabled={fixing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {fixing ? 'Corrigindo...' : 'Corrigir Todos os Problemas'}
              </button>
            )}
          </div>

          <div className="space-y-4">
            {services.map(service => {
              const isValid = service.title && service.description && service.ownerId;
              return (
                <div key={service.id} className={`p-4 rounded-lg border ${isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{service.title || 'SEM TÍTULO'}</h3>
                      <p className="text-sm text-gray-600 mt-1">{service.description || 'SEM DESCRIÇÃO'}</p>
                      <div className="mt-2 text-xs text-gray-500">
                        ID: {service.id} | Owner: {service.ownerId || 'N/A'} | Status: {service.status || 'N/A'}
                      </div>
                      {!isValid && (
                        <div className="mt-2 text-sm text-red-600">
                          Problemas: {!service.title && 'Título faltando '}
                          {!service.description && 'Descrição faltando '}
                          {!service.ownerId && 'Owner ID faltando'}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      {!isValid && (
                        <button
                          onClick={() => fixService(service)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          Corrigir
                        </button>
                      )}
                      <button
                        onClick={() => deleteService(service.id)}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}