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