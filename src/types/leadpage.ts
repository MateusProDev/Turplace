export interface LeadPageSection {
  id: string;
  type: 'hero' | 'about' | 'benefits' | 'social-proof' | 'cta' | 'contact' | 'features' | 'cinematic' | 'documentary' | 'montage' | 'manuscript' | 'alchemical' | 'bestiary' | 'dreamscape' | 'lucid' | 'quest' | 'horological' | 'mechanical' | 'complication' | 'revolutionary' | 'demands' | 'propaganda' | 'hero-modern' | 'features-modern' | 'pricing-modern' | 'cta-modern' | 'hero-luxury' | 'products-showcase' | 'testimonials-luxury' | 'cta-luxury' | 'hero-disruptive' | 'mission-vision' | 'team-showcase' | 'cta-disruptive' | 'hero-creative' | 'portfolio-showcase' | 'services-creative' | 'cta-creative' | 'hero-wellness' | 'services-wellness' | 'testimonials-wellness' | 'cta-wellness' | 'hero-financial' | 'investment-options' | 'success-stories' | 'cta-financial';
  title?: string;
  content?: string;
  image?: string;
  buttonText?: string;
  buttonLink?: string;
  items?: string[] | unknown[]; // for benefits, testimonials, pricing cards, etc.
  enabled: boolean;
  // Modern template properties
  subtitle?: string;
  stats?: string[] | any[];
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
  features?: any[];
  cta?: string;
  bonus?: string;
  description?: string;
  contactInfo?: {
    phone?: string;
    email?: string;
  };
  // New template properties
  filmGrain?: boolean;
  aspectRatio?: string;
  director?: string;
  year?: string;
  uniqueElements?: any;
  subject?: any;
  questions?: string[];
  clips?: any[];
  inkType?: string;
  signature?: string;
  elements?: any[];
  transmutation?: string;
  creatures?: any[];
  dreamElements?: any[];
  lucidControls?: any[];
  questStages?: any[];
  callToAdventure?: string;
  time?: string;
  date?: string;
  timepieces?: any[];
  mechanisms?: any[];
  grandMechanism?: string;
  complications?: any[];
  resolution?: string;
  manifesto?: string;
  revolutionaryElements?: any[];
  demands?: any[];
  slogan?: string;
  propagandaElements?: any[];
  // Modern 2025 template properties
  plans?: any[];
  products?: any[];
  testimonials?: any[];
  mission?: string;
  vision?: string;
  values?: string[];
  team?: any[];
  projects?: any[];
  services?: any[];
  options?: any[];
  stories?: any[];
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

  // Draft/Publish system
  publishedTemplateId?: string; // Template ID that is currently published
  publishedCustomData?: { [sectionId: string]: Partial<LeadPageSection> }; // Custom data that is currently published
  isPublished?: boolean; // Whether there are unpublished changes
  lastPublishedAt?: Date; // When it was last published
}