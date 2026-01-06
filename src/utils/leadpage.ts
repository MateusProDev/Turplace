import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import type { LeadPageTemplate, UserLeadPage } from '../types/leadpage.js';

// Funções auxiliares para detectar informações do usuário
function detectBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Opera')) return 'Opera';
  return 'Other';
}

function detectOS(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Other';
}

function getScreenResolution(): string {
  return `${screen.width}x${screen.height}`;
}

async function getLocationInfo(): Promise<{ country?: string; city?: string }> {
  try {
    // Usar IP-API (gratuito) para obter localização aproximada
    const response = await fetch('https://ipapi.co/json/');
    if (response.ok) {
      const data = await response.json();
      return {
        country: data.country_name,
        city: data.city
      };
    }
  } catch (error) {
    console.warn('Não foi possível obter localização:', error);
  }
  return {};
}

// Função para obter template padrão
export async function getDefaultTemplate(): Promise<LeadPageTemplate | null> {
  const templateRef = doc(db, 'templates', 'default-modern');
  const snap = await getDoc(templateRef);
  if (snap.exists()) {
    return snap.data() as LeadPageTemplate;
  }
  return null;
}

// Função para obter template específico
export async function getTemplate(templateId: string): Promise<LeadPageTemplate | null> {
  const templateRef = doc(db, 'templates', templateId);
  const snap = await getDoc(templateRef);
  if (snap.exists()) {
    return snap.data() as LeadPageTemplate;
  }
  return null;
}

// Função para obter todos os templates disponíveis
export async function getAllTemplates(): Promise<LeadPageTemplate[]> {
  const templatesRef = collection(db, 'templates');
  const snap = await getDocs(templatesRef);
  return snap.docs.map(doc => doc.data() as LeadPageTemplate);
}

// Função para obter lead page do usuário
export async function getUserLeadPage(userId: string): Promise<UserLeadPage | null> {
  const leadPageRef = doc(db, 'users', userId, 'leadpage', 'data');
  const snap = await getDoc(leadPageRef);
  if (snap.exists()) {
    return snap.data() as UserLeadPage;
  }
  return null;
}

// Função para salvar lead page do usuário
export async function saveUserLeadPage(userId: string, data: UserLeadPage) {
  const leadPageRef = doc(db, 'users', userId, 'leadpage', 'data');
  await setDoc(leadPageRef, data);
}

// Função para atualizar seção específica
export async function updateLeadPageSection(userId: string, sectionId: string, updates: Record<string, unknown>) {
  const leadPageRef = doc(db, 'users', userId, 'leadpage', 'data');
  await updateDoc(leadPageRef, {
    [`customData.${sectionId}`]: updates
  });
}

// Tipos para estatísticas da leadpage
export interface LeadPageStats {
  totalViews: number;
  uniqueViews: number;
  leads: number;
  clicks: number;
  sessions: Array<{
    id: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    converted: boolean;
    source?: string;
    device?: string;
    browser?: string;
    os?: string;
    country?: string;
    city?: string;
    referrer?: string;
    screenResolution?: string;
    language?: string;
  }>;
  lastUpdated: number;
  topSources: Record<string, number>;
  topDevices: Record<string, number>;
  topBrowsers: Record<string, number>;
  topCountries: Record<string, number>;
  topCities: Record<string, number>;
  viewsByHour: Record<string, number>;
  viewsByDay: Record<string, number>;
}

// Função para obter estatísticas da leadpage
export async function getLeadPageStats(userId: string): Promise<LeadPageStats | null> {
  const statsRef = doc(db, 'users', userId, 'leadpage', 'stats');
  const snap = await getDoc(statsRef);
  if (snap.exists()) {
    return snap.data() as LeadPageStats;
  }
  return null;
}

// Função para registrar uma visualização
export async function trackLeadPageView(userId: string, sessionId: string, source?: string, device?: string) {
  const statsRef = doc(db, 'users', userId, 'leadpage', 'stats');
  const now = Date.now();

  // Coletar informações detalhadas
  const browser = detectBrowser();
  const os = detectOS();
  const screenResolution = getScreenResolution();
  const language = navigator.language;
  const referrer = document.referrer;
  const locationInfo = await getLocationInfo();

  // Dados de tempo
  const date = new Date(now);
  const hourKey = `${date.getHours().toString().padStart(2, '0')}:00`;
  const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

  const existingStats = await getLeadPageStats(userId);
  if (!existingStats) {
    // Criar estatísticas iniciais
    const initialStats: LeadPageStats = {
      totalViews: 1,
      uniqueViews: 1,
      leads: 0,
      clicks: 0,
      sessions: [{
        id: sessionId,
        startTime: now,
        converted: false,
        source,
        device,
        browser,
        os,
        country: locationInfo.country,
        city: locationInfo.city,
        referrer,
        screenResolution,
        language
      }],
      lastUpdated: now,
      topSources: source ? { [source]: 1 } : {},
      topDevices: device ? { [device]: 1 } : {},
      topBrowsers: { [browser]: 1 },
      topCountries: locationInfo.country ? { [locationInfo.country]: 1 } : {},
      topCities: locationInfo.city ? { [locationInfo.city]: 1 } : {},
      viewsByHour: { [hourKey]: 1 },
      viewsByDay: { [dayKey]: 1 }
    };
    await setDoc(statsRef, initialStats);
  } else {
    // Atualizar estatísticas existentes
    const isNewSession = !existingStats.sessions.some(s => s.id === sessionId);
    const updatedStats: LeadPageStats = {
      ...existingStats,
      totalViews: existingStats.totalViews + 1,
      uniqueViews: isNewSession ? existingStats.uniqueViews + 1 : existingStats.uniqueViews,
      sessions: isNewSession
        ? [...existingStats.sessions, {
            id: sessionId,
            startTime: now,
            converted: false,
            source,
            device,
            browser,
            os,
            country: locationInfo.country,
            city: locationInfo.city,
            referrer,
            screenResolution,
            language
          }]
        : existingStats.sessions.map(s =>
            s.id === sessionId
              ? { ...s, startTime: now }
              : s
          ),
      lastUpdated: now,
      // Atualizar contadores agregados
      topSources: {
        ...existingStats.topSources,
        [source || 'direct']: (existingStats.topSources[source || 'direct'] || 0) + 1
      },
      topDevices: {
        ...existingStats.topDevices,
        [device || 'unknown']: (existingStats.topDevices[device || 'unknown'] || 0) + 1
      },
      topBrowsers: {
        ...existingStats.topBrowsers,
        [browser]: (existingStats.topBrowsers[browser] || 0) + 1
      },
      topCountries: locationInfo.country ? {
        ...existingStats.topCountries,
        [locationInfo.country]: (existingStats.topCountries[locationInfo.country] || 0) + 1
      } : existingStats.topCountries,
      topCities: locationInfo.city ? {
        ...existingStats.topCities,
        [locationInfo.city]: (existingStats.topCities[locationInfo.city] || 0) + 1
      } : existingStats.topCities,
      viewsByHour: {
        ...existingStats.viewsByHour,
        [hourKey]: (existingStats.viewsByHour[hourKey] || 0) + 1
      },
      viewsByDay: {
        ...existingStats.viewsByDay,
        [dayKey]: (existingStats.viewsByDay[dayKey] || 0) + 1
      }
    };
    await setDoc(statsRef, updatedStats);
  }
}

// Função para registrar um lead
export async function trackLeadPageLead(userId: string, sessionId: string) {
  const statsRef = doc(db, 'users', userId, 'leadpage', 'stats');
  const now = Date.now();

  const existingStats = await getLeadPageStats(userId);
  if (existingStats) {
    const updatedStats: LeadPageStats = {
      ...existingStats,
      leads: existingStats.leads + 1,
      sessions: existingStats.sessions.map(s =>
        s.id === sessionId
          ? { ...s, converted: true, endTime: now, duration: now - s.startTime }
          : s
      ),
      lastUpdated: now
    };
    await setDoc(statsRef, updatedStats);
  }
}

// Função para registrar um clique
export async function trackLeadPageClick(userId: string) {
  const statsRef = doc(db, 'users', userId, 'leadpage', 'stats');
  const now = Date.now();

  const existingStats = await getLeadPageStats(userId);
  if (existingStats) {
    const updatedStats: LeadPageStats = {
      ...existingStats,
      clicks: existingStats.clicks + 1,
      lastUpdated: now
    };
    await setDoc(statsRef, updatedStats);
  }
}

// Função para finalizar uma sessão (quando usuário sai da página)
export async function trackLeadPageSessionEnd(userId: string, sessionId: string) {
  const statsRef = doc(db, 'users', userId, 'leadpage', 'stats');
  const now = Date.now();

  const existingStats = await getLeadPageStats(userId);
  if (existingStats) {
    const updatedStats: LeadPageStats = {
      ...existingStats,
      sessions: existingStats.sessions.map(s =>
        s.id === sessionId && !s.endTime
          ? { ...s, endTime: now, duration: now - s.startTime }
          : s
      ),
      lastUpdated: now
    };
    await setDoc(statsRef, updatedStats);
  }
}

// Função para calcular métricas derivadas
export function calculateLeadPageMetrics(stats: LeadPageStats) {
  const totalViews = stats.totalViews;
  const leads = stats.leads;
  const clicks = stats.clicks;

  // Taxa de conversão: leads / visualizações * 100
  const conversionRate = totalViews > 0 ? (leads / totalViews) * 100 : 0;

  // Tempo médio: média da duração das sessões que têm duração
  const sessionsWithDuration = stats.sessions.filter(s => s.duration && s.duration > 0);
  const avgDuration = sessionsWithDuration.length > 0
    ? sessionsWithDuration.reduce((sum, s) => sum + (s.duration || 0), 0) / sessionsWithDuration.length
    : 0;

  // Taxa de rejeição: sessões que duraram menos de 10 segundos / total de sessões * 100
  const bouncedSessions = stats.sessions.filter(s => (s.duration || 0) < 10000).length;
  const bounceRate = stats.sessions.length > 0 ? (bouncedSessions / stats.sessions.length) * 100 : 0;

  // Calcular top 5 de cada categoria
  const getTop5 = (obj: Record<string, number>) =>
    Object.entries(obj)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([key, value]) => ({ name: key, value }));

  return {
    conversionRate: Math.round(conversionRate * 10) / 10, // 1 casa decimal
    avgDuration: Math.round(avgDuration / 1000), // em segundos
    bounceRate: Math.round(bounceRate * 10) / 10, // 1 casa decimal
    totalViews,
    uniqueViews: stats.uniqueViews,
    leads,
    clicks,
    // Dados detalhados
    topSources: getTop5(stats.topSources || {}),
    topDevices: getTop5(stats.topDevices || {}),
    topBrowsers: getTop5(stats.topBrowsers || {}),
    topCountries: getTop5(stats.topCountries || {}),
    topCities: getTop5(stats.topCities || {}),
    viewsByHour: stats.viewsByHour || {},
    viewsByDay: stats.viewsByDay || {},
    // Métricas adicionais
    totalSessions: stats.sessions.length,
    convertedSessions: stats.sessions.filter(s => s.converted).length,
    avgSessionDuration: Math.round(avgDuration / 1000),
    mostActiveHour: Object.entries(stats.viewsByHour || {}).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'
  };
}

// Função para gerar URL personalizada baseada no domínio do usuário
export async function generateCustomDomainUrl(userId: string, path: string = ''): Promise<string> {
  const userLeadPage = await getUserLeadPage(userId);

  if (userLeadPage?.domain) {
    // Se tem domínio personalizado, usar https://dominio-personalizado/path
    const baseUrl = `https://${userLeadPage.domain}`;
    return path ? `${baseUrl}/${path}` : baseUrl;
  } else {
    // Caso contrário, usar o domínio padrão da plataforma
    const baseUrl = window?.location?.origin || 'https://lucrazi.com.br';
    return path ? `${baseUrl}/${path}` : baseUrl;
  }
}