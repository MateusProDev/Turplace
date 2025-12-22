export interface LeadPageSection {
  id: string;
  type: 'hero' | 'about' | 'benefits' | 'social-proof' | 'cta' | 'contact';
  title?: string;
  content?: string;
  image?: string;
  buttonText?: string;
  buttonLink?: string;
  items?: string[] | unknown[]; // for benefits, testimonials, pricing cards, etc.
  enabled: boolean;
  // Modern template properties
  subtitle?: string;
  stats?: string[];
  urgencyText?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  popular?: boolean;
  video?: string;
  result?: string;
  location?: string;
  name?: string;
  text?: string;
  price?: string;
  period?: string;
  features?: string[];
  cta?: string;
  bonus?: string;
  description?: string;
}

export interface LeadPageTemplate {
  id: string;
  name: string;
  sections: LeadPageSection[];
}

export interface UserLeadPage {
  templateId: string;
  customData: { [sectionId: string]: Partial<LeadPageSection> };
  domain?: string; // for custom domains
}