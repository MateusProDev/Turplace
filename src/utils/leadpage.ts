import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import type { LeadPageTemplate, UserLeadPage } from '../types/leadpage';

// Função para obter template padrão
export async function getDefaultTemplate(): Promise<LeadPageTemplate | null> {
  const templateRef = doc(db, 'templates', 'default-tourism');
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
  }>;
  lastUpdated: number;
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
        device
      }],
      lastUpdated: now
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
        ? [...existingStats.sessions, { id: sessionId, startTime: now, converted: false, source, device }]
        : existingStats.sessions.map(s =>
            s.id === sessionId
              ? { ...s, startTime: now } // Atualizar timestamp se sessão já existe
              : s
          ),
      lastUpdated: now
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

  return {
    conversionRate: Math.round(conversionRate * 10) / 10, // 1 casa decimal
    avgDuration: Math.round(avgDuration / 1000), // em segundos
    bounceRate: Math.round(bounceRate * 10) / 10, // 1 casa decimal
    totalViews,
    uniqueViews: stats.uniqueViews,
    leads,
    clicks
  };
}