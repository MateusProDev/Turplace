import { config } from "dotenv";
config({ path: ".env.local" });
import admin from "firebase-admin";
import initFirestore from "../api/_lib/firebaseAdmin.cjs";

const db = initFirestore();

// TEMPLATE 1: SAAS MODERN
const saasModernTemplate = {
  id: "saas-modern",
  name: "SaaS Modern - Design Minimalista 2025",
  sections: [
    {
      id: "hero-modern",
      type: "hero-modern",
      title: "Transforme seu negócio",
      subtitle: "A solução definitiva",
      content: "Automatize processos e escale seu negócio.",
      buttonText: "Começar",
      buttonLink: "#pricing",
      enabled: true
    },
    {
      id: "features-modern",
      type: "features-modern",
      title: "Recursos Inovadores",
      subtitle: "Tudo que você precisa em uma plataforma",
      features: [
        {
          icon: "",
          title: "Automação Inteligente",
          description: "Processos automatizados que economizam tempo"
        },
        {
          icon: "",
          title: "Segurança Avançada",
          description: "Proteção de dados de nível empresarial"
        },
        {
          icon: "",
          title: "Analytics em Tempo Real",
          description: "Insights valiosos para tomada de decisões"
        }
      ],
      enabled: true
    },
    {
      id: "pricing-modern",
      type: "pricing-modern",
      title: "Planos Flexíveis",
      subtitle: "Escolha o plano ideal para seu negócio",
      plans: [
        {
          name: "Starter",
          price: "R$ 29",
          period: "/mês",
          features: ["Até 100 usuários", "5GB armazenamento", "Suporte básico"],
          buttonText: "Começar Grátis",
          popular: false
        },
        {
          name: "Professional",
          price: "R$ 99",
          period: "/mês",
          features: ["Até 1000 usuários", "50GB armazenamento", "Suporte prioritário"],
          buttonText: "Assinar Agora",
          popular: true
        },
        {
          name: "Enterprise",
          price: "R$ 299",
          period: "/mês",
          features: ["Usuários ilimitados", "Armazenamento ilimitado", "Suporte 24/7"],
          buttonText: "Falar com Vendas",
          popular: false
        }
      ],
      enabled: true
    },
    {
      id: "cta-modern",
      type: "cta-modern",
      title: "Pronto para começar?",
      subtitle: "Junte-se a milhares de empresas que já transformaram seus negócios",
      buttonText: "Criar Conta Grátis",
      buttonLink: "#signup",
      enabled: true
    }
  ]
};

// TEMPLATE 2: E-COMMERCE PREMIUM
const ecommercePremiumTemplate = {
  id: "ecommerce-premium",
  name: "E-commerce Premium - Luxo Digital 2025",
  sections: [
    {
      id: "hero-luxury",
      type: "hero-luxury",
      title: "Elegância que você merece",
      subtitle: "Coleção exclusiva de produtos premium",
      content: "Descubra peças únicas, curadoria excepcional e atendimento personalizado.",
      buttonText: "Explorar Coleção",
      buttonLink: "#products",
      enabled: true
    },
    {
      id: "products-showcase",
      type: "products-showcase",
      title: "Destaques da Semana",
      subtitle: "Peças selecionadas com cuidado especial",
      products: [
        {
          image: "/api/placeholder/300/400",
          name: "Vestido Elegante",
          price: "R$ 1.299",
          originalPrice: "R$ 1.599",
          description: "Vestido de alta costura com detalhes em renda"
        },
        {
          image: "/api/placeholder/300/400",
          name: "Blazer Executivo",
          price: "R$ 899",
          originalPrice: "R$ 1.099",
          description: "Blazer confeccionado em tecido premium italiano"
        },
        {
          image: "/api/placeholder/300/400",
          name: "Sapatos Clássicos",
          price: "R$ 699",
          originalPrice: "R$ 799",
          description: "Sapatos artesanais com couro genuíno"
        }
      ],
      enabled: true
    },
    {
      id: "testimonials-luxury",
      type: "testimonials-luxury",
      title: "O que nossos clientes dizem",
      subtitle: "Experiências de excelência",
      testimonials: [
        {
          name: "Ana Carolina",
          role: "Empresária",
          content: "A qualidade e o atendimento são incomparáveis. Cada peça é uma obra de arte.",
          avatar: "/api/placeholder/60/60"
        },
        {
          name: "Roberto Santos",
          role: "Executivo",
          content: "Produtos premium com curadoria impecável. Minha experiência de compra foi excepcional.",
          avatar: "/api/placeholder/60/60"
        }
      ],
      enabled: true
    },
    {
      id: "cta-luxury",
      type: "cta-luxury",
      title: "VIP Experience",
      subtitle: "Acesse nossa coleção exclusiva e desfrute de benefícios únicos",
      buttonText: "Tornar-se Membro VIP",
      buttonLink: "#vip",
      enabled: true
    }
  ]
};

// TEMPLATE 3: STARTUP TECH
const startupTechTemplate = {
  id: "startup-tech",
  name: "Startup Tech - Inovação Disruptiva 2025",
  sections: [
    {
      id: "hero-disruptive",
      type: "hero-disruptive",
      title: "Revolucionando o futuro",
      subtitle: "Tecnologia que transforma realidades",
      content: "Somos uma startup de tecnologia criando soluções inovadoras.",
      buttonText: "Juntar-se à Startup",
      buttonLink: "#mission",
      enabled: true
    },
    {
      id: "mission-vision",
      type: "mission-vision",
      title: "Nossa Missão",
      subtitle: "Construindo o futuro da tecnologia",
      mission: "Democratizar o acesso à tecnologia avançada para todos.",
      vision: "Ser a referência global em soluções tecnológicas disruptivas.",
      values: ["Inovação", "Transparência", "Impacto Social"],
      enabled: true
    },
    {
      id: "team-showcase",
      type: "team-showcase",
      title: "Conheça o Time",
      subtitle: "Mentes brilhantes por trás da inovação",
      team: [
        {
          name: "João Silva",
          role: "CEO & Fundador",
          bio: "Ex-Google, especialista em IA e machine learning.",
          avatar: "/api/placeholder/150/150"
        },
        {
          name: "Maria Santos",
          role: "CTO",
          bio: "PhD em Ciência da Computação, pioneira em blockchain.",
          avatar: "/api/placeholder/150/150"
        }
      ],
      enabled: true
    },
    {
      id: "cta-disruptive",
      type: "cta-disruptive",
      title: "Faça Parte da Revolução",
      subtitle: "Junte-se a nós na construção do futuro",
      buttonText: "Investir na Startup",
      buttonLink: "#invest",
      enabled: true
    }
  ]
};

// TEMPLATE 4: CREATIVE AGENCY
const creativeAgencyTemplate = {
  id: "creative-agency",
  name: "Creative Agency - Design Inovador 2025",
  sections: [
    {
      id: "hero-creative",
      type: "hero-creative",
      title: "Criatividade sem limites",
      subtitle: "Transformando ideias em experiências extraordinárias",
      content: "Somos uma agência criativa que combina design excepcional com inovação digital.",
      buttonText: "Ver Nosso Trabalho",
      buttonLink: "#portfolio",
      enabled: true
    },
    {
      id: "portfolio-showcase",
      type: "portfolio-showcase",
      title: "Projetos em Destaque",
      subtitle: "Criatividade que gera resultados",
      projects: [
        {
          title: "Rebranding Corporativo",
          category: "Branding",
          image: "/api/placeholder/600/400",
          description: "Renovação completa da identidade visual de uma empresa Fortune 500."
        },
        {
          title: "App Mobile Inovador",
          category: "UX/UI Design",
          image: "/api/placeholder/600/400",
          description: "Design de interface premiado para aplicativo de saúde mental."
        }
      ],
      enabled: true
    },
    {
      id: "services-creative",
      type: "services-creative",
      title: "Nossos Serviços",
      subtitle: "Soluções criativas completas",
      services: [
        {
          icon: "",
          title: "Design Gráfico",
          description: "Identidade visual, materiais impressos e digitais"
        },
        {
          icon: "",
          title: "Design Digital",
          description: "Websites, apps e experiências interativas"
        },
        {
          icon: "",
          title: "Marketing Digital",
          description: "Estratégias criativas para mídias sociais e publicidade"
        }
      ],
      enabled: true
    },
    {
      id: "cta-creative",
      type: "cta-creative",
      title: "Vamos Criar Juntos",
      subtitle: "Transforme sua visão em realidade",
      buttonText: "Iniciar Projeto",
      buttonLink: "#contact",
      enabled: true
    }
  ]
};

// TEMPLATE 5: HEALTH & WELLNESS
const healthWellnessTemplate = {
  id: "health-wellness",
  name: "Health & Wellness - Bem-estar Moderno 2025",
  sections: [
    {
      id: "hero-wellness",
      type: "hero-wellness",
      title: "Sua jornada para o bem-estar começa aqui",
      subtitle: "Cuidados holísticos para corpo e mente",
      content: "Descubra um novo jeito de cuidar de si mesmo.",
      buttonText: "Agendar Consulta",
      buttonLink: "#booking",
      enabled: true
    },
    {
      id: "services-wellness",
      type: "services-wellness",
      title: "Nossos Serviços",
      subtitle: "Abordagem integrada ao bem-estar",
      services: [
        {
          icon: "",
          title: "Terapia Holística",
          description: "Tratamentos que cuidam do corpo e da mente"
        },
        {
          icon: "",
          title: "Nutrição Personalizada",
          description: "Planos alimentares adaptados ao seu estilo de vida"
        },
        {
          icon: "",
          title: "Treinamento Funcional",
          description: "Exercícios que fortalecem corpo e mente"
        }
      ],
      enabled: true
    },
    {
      id: "testimonials-wellness",
      type: "testimonials-wellness",
      title: "Histórias de Transformação",
      subtitle: "Resultados que falam por si",
      testimonials: [
        {
          name: "Carla Mendes",
          transformation: "Perdeu 15kg e ganhou vitalidade",
          content: "O acompanhamento holístico mudou minha relação com meu corpo.",
          avatar: "/api/placeholder/80/80"
        },
        {
          name: "Pedro Lima",
          transformation: "Reduziu estresse crônico",
          content: "Encontrei equilíbrio e paz interior através dos tratamentos.",
          avatar: "/api/placeholder/80/80"
        }
      ],
      enabled: true
    },
    {
      id: "cta-wellness",
      type: "cta-wellness",
      title: "Comece Sua Transformação",
      subtitle: "Primeira consulta gratuita",
      buttonText: "Agendar Agora",
      buttonLink: "#booking",
      enabled: true
    }
  ]
};

// TEMPLATE 6: FINANCIAL SERVICES
const financialServicesTemplate = {
  id: "financial-services",
  name: "Financial Services - Finanças Inteligentes 2025",
  sections: [
    {
      id: "hero-financial",
      type: "hero-financial",
      title: "Seu futuro financeiro começa agora",
      subtitle: "Tecnologia e expertise para multiplicar seu patrimônio",
      content: "Somos especialistas em investimentos inteligentes.",
      buttonText: "Abrir Conta",
      buttonLink: "#invest",
      enabled: true
    },
    {
      id: "investment-options",
      type: "investment-options",
      title: "Oportunidades de Investimento",
      subtitle: "Diversifique seu portfólio com segurança",
      options: [
        {
          type: "Renda Fixa",
          description: "Investimentos seguros com retorno garantido",
          risk: "Baixo",
          return: "8-12% a.a.",
          icon: ""
        },
        {
          type: "Renda Variável",
          description: "Ações e fundos com alto potencial de retorno",
          risk: "Médio-Alto",
          return: "15-25% a.a.",
          icon: ""
        },
        {
          type: "Criptoativos",
          description: "Investimentos em blockchain e moedas digitais",
          risk: "Alto",
          return: "20-100% a.a.",
          icon: ""
        }
      ],
      enabled: true
    },
    {
      id: "success-stories",
      type: "success-stories",
      title: "Histórias de Sucesso",
      subtitle: "Resultados comprovados",
      stories: [
        {
          name: "Roberto Carvalho",
          achievement: "Multiplicou patrimônio em 300%",
          content: "Com estratégia personalizada, alcancei meus objetivos financeiros.",
          avatar: "/api/placeholder/70/70"
        },
        {
          name: "Ana Paula Silva",
          achievement: "Aposentou-se aos 45 anos",
          content: "Planejamento inteligente me deu liberdade financeira.",
          avatar: "/api/placeholder/70/70"
        }
      ],
      enabled: true
    },
    {
      id: "cta-financial",
      type: "cta-financial",
      title: "Invista no Seu Futuro",
      subtitle: "Consultoria gratuita e sem compromisso",
      buttonText: "Falar com Especialista",
      buttonLink: "#consultation",
      enabled: true
    }
  ]
};

async function createTemplates() {
  try {
    console.log(" Criando templates modernos 2025...");

    const templates = [
      saasModernTemplate,
      ecommercePremiumTemplate,
      startupTechTemplate,
      creativeAgencyTemplate,
      healthWellnessTemplate,
      financialServicesTemplate
    ];

    for (const template of templates) {
      await db.collection("templates").doc(template.id).set(template);
      console.log(` Template criado: ${template.name}`);
    }

    console.log(" Todos os templates modernos foram criados com sucesso!");
  } catch (error) {
    console.error(" Erro ao criar templates:", error);
  }
}

createTemplates();
