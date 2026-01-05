import { config } from 'dotenv';
config({ path: '.env.local' });
import admin from 'firebase-admin';
import initFirestore from '../api/_lib/firebaseAdmin.cjs';

const db = initFirestore();

const defaultTemplate = {
  id: 'default-modern',
  name: 'Leadpage Moderna - Design Contemporâneo',
  sections: [
    {
      id: 'hero-destination',
      type: 'hero',
      title: 'Transforme sua Visão em Realidade',
      subtitle: 'Soluções inovadoras para o seu negócio',
      content: 'Mais de 10.000 clientes já confiaram em nós para alcançar seus objetivos. Sua transformação começa aqui.',
      image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1920&h=1080&fit=crop&crop=center',
      buttonText: 'Começar Agora',
      buttonLink: '#services',
      stats: ['10K+ Clientes', '500+ Projetos', '4.9★ Avaliação'],
      enabled: true
    },
    {
      id: 'featured-experiences',
      type: 'benefits',
      title: 'Nossas Soluções',
      subtitle: 'Serviços completos e personalizados para seu negócio',
      items: [
        {
          title: 'Consultoria Estratégica',
          description: 'Análise completa e planejamento personalizado para seu crescimento',
          image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=400&fit=crop&crop=center',
          price: 'A partir de R$ 500'
        },
        {
          title: 'Desenvolvimento Digital',
          description: 'Soluções tecnológicas modernas e escaláveis',
          image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop&crop=center',
          price: 'A partir de R$ 2.000'
        },
        {
          title: 'Marketing Digital',
          description: 'Estratégias comprovadas para aumentar sua presença online',
          image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop&crop=center',
          price: 'A partir de R$ 800'
        }
      ],
      enabled: true
    },
    {
      id: 'experience-timeline',
      type: 'benefits',
      title: 'Como Funciona Sua Viagem',
      subtitle: 'Planejamento completo do início ao fim',
      items: [
        {
          title: '01. Consulta Personalizada',
          description: 'Entendemos seus sonhos e orçamento'
        },
        {
          title: '02. Roteiro Exclusivo',
          description: 'Criamos itinerários únicos para você'
        },
        {
          title: '03. Reserva Garantida',
          description: 'Hospedagem e passeios confirmados'
        },
        {
          title: '04. Acompanhamento Total',
          description: 'Suporte 24/7 durante toda viagem'
        }
      ],
      enabled: true
    },
    {
      id: 'testimonials-carousel',
      type: 'social-proof',
      title: 'O Que Nossos Viajantes Dizem',
      subtitle: 'Histórias reais de experiências incríveis',
      items: [
        {
          name: 'Ana Carolina',
          location: 'São Paulo, SP',
          rating: 5,
          text: '"A viagem dos meus sonhos! Cada detalhe foi perfeito, desde o hotel até as experiências locais."',
          image: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face'
        },
        {
          name: 'Roberto Santos',
          location: 'Rio de Janeiro, RJ',
          rating: 5,
          text: '"Profissionalismo e atenção aos detalhes. Recomendo para todos que querem viver momentos únicos."',
          image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
        },
        {
          name: 'Marina Costa',
          location: 'Belo Horizonte, MG',
          rating: 5,
          text: '"Superou todas as expectativas! Cada destino foi mais incrível que o outro."',
          image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face'
        }
      ],
      enabled: true
    },
    {
      id: 'pricing-cards',
      type: 'benefits',
      title: 'Pacotes Especiais',
      subtitle: 'Escolha o pacote ideal para sua viagem',
      items: [
        {
          title: 'Essentials',
          price: 'R$ 2.500',
          features: ['Hospedagem 5 estrelas', 'Café da manhã', 'Transfer aeroporto', 'Guia turístico'],
          popular: false
        },
        {
          title: 'Premium',
          price: 'R$ 4.200',
          features: ['Tudo do Essentials', 'Experiências exclusivas', 'Restaurantes gourmets', 'Fotografia profissional'],
          popular: true
        },
        {
          title: 'Luxury',
          price: 'R$ 7.500',
          features: ['Tudo do Premium', 'Jato particular', 'Chef pessoal', 'Concierge 24/7'],
          popular: false
        }
      ],
      enabled: true
    },
    {
      id: 'newsletter-cta',
      type: 'cta',
      title: 'Pronto para Sua Aventura?',
      subtitle: 'Receba dicas exclusivas e ofertas especiais',
      content: 'Seja o primeiro a saber sobre novos destinos e promoções imperdíveis.',
      buttonText: 'Receber Ofertas',
      buttonLink: '#contact',
      backgroundImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=600&fit=crop&crop=center',
      enabled: true
    },
    {
      id: 'contact-form',
      type: 'contact',
      title: 'Vamos Planejar Sua Viagem',
      subtitle: 'Entre em contato e transforme seus sonhos em realidade',
      content: 'contato@viagens.com\n(11) 99999-9999\nRua das Viagens, 123 - São Paulo/SP',
      formFields: ['name', 'email', 'phone', 'destination', 'message'],
      enabled: true
    }
  ]
};

const infoproductTemplate = {
  id: 'clean-leadpage',
  name: 'Leadpage Clean - Design Minimalista',
  sections: [
    {
      id: 'hero-course',
      type: 'hero',
      title: 'Simples. Eficaz. Resultados.',
      subtitle: 'Soluções claras para problemas complexos',
      content: 'Foco no essencial. Resultados comprovados. Sua satisfação é nossa prioridade.',
      image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1920&h=1080&fit=crop&crop=center',
      buttonText: 'COMEÇAR',
      buttonLink: '#benefits',
      enabled: true
    },
    {
      id: 'course-overview',
      type: 'about',
      title: 'Por Que Escolher Nossa Solução',
      content: 'Simplicidade não significa superficialidade. Nossa abordagem clean combina elegância e eficiência para entregar exatamente o que você precisa.',
      enabled: true
    },
    {
      id: 'benefits-infoproduct',
      type: 'benefits',
      title: 'Por Que Escolher Este Curso',
      subtitle: 'Benefícios exclusivos que só você terá',
      items: [
        {
          title: 'Liberdade de Tempo',
          description: 'Trabalhe apenas 2h por dia e viva a vida que sempre sonhou',
          icon: 'time'
        },
        {
          title: 'Escalabilidade',
          description: 'Venda para milhares sem precisar produzir mais',
          icon: 'scale'
        },
        {
          title: 'Autoridade',
          description: 'Se torne referência no seu nicho de mercado',
          icon: 'authority'
        }
      ],
      enabled: true
    },
    {
      id: 'course-modules',
      type: 'benefits',
      title: 'Conteúdo Completo do Curso',
      subtitle: '12 módulos com tudo que você precisa para ter sucesso',
      items: [
        {
          title: 'Módulo 1: Mindset do Empreendedor Digital',
          description: 'Como pensar como um milionário'
        },
        {
          title: 'Módulo 2: Descobrindo Seu Nicho',
          description: 'Encontre mercados com alta demanda e baixa concorrência'
        },
        {
          title: 'Módulo 3: Criando Seu Primeiro Produto',
          description: 'Do zero ao lançamento em 7 dias'
        },
        {
          title: 'Módulo 4: Estratégias de Precificação',
          description: 'Quanto cobrar para maximizar lucros'
        },
        {
          title: 'Módulo 5: Funil de Vendas Completo',
          description: 'Capture, converta e fidelize clientes'
        },
        {
          title: 'Módulo 6: Tráfego Pago Profissional',
          description: 'Facebook Ads que convertem'
        }
      ],
      enabled: true
    },
    {
      id: 'social-proof-video',
      type: 'social-proof',
      title: 'Histórias Reais de Sucesso',
      subtitle: 'Veja o que meus alunos conquistaram',
      items: [
        {
          name: 'Carlos Mendes',
          location: 'São Paulo, SP',
          result: 'R$ 47.000 no primeiro mês',
          text: '"De funcionário para empresário digital. Minha vida mudou completamente!"',
          image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
        },
        {
          name: 'Ana Paula',
          location: 'Rio de Janeiro, RJ',
          result: 'R$ 23.000 em 15 dias',
          text: '"Nunca imaginei que seria possível viver só de infoprodutos"',
          image: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face'
        },
        {
          name: 'Roberto Silva',
          location: 'Belo Horizonte, MG',
          result: 'Liberdade financeira conquistada',
          text: '"Agora trabalho quando quero e ganho mais que antes"',
          image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
        }
      ],
      enabled: true
    },
    {
      id: 'pricing-comparison',
      type: 'benefits',
      title: 'Escolha Seu Caminho para o Sucesso',
      subtitle: 'Investimento que retorna em menos de 30 dias',
      items: [
        {
          title: 'Apenas Teoria',
          price: 'R$ 497',
          period: 'único',
          features: ['12 módulos em vídeo', 'Acesso vitalício', 'Certificado'],
          popular: false,
          cta: 'Comprar Agora'
        },
        {
          title: 'Teoria + Prática',
          price: 'R$ 997',
          period: 'único',
          features: ['Tudo do plano anterior', 'Mentoria individual', 'Revisão de produtos', 'Suporte prioritário'],
          popular: true,
          cta: 'GARANTIR VAGA',
          bonus: 'BÔNUS: Template profissional'
        },
        {
          title: 'VIP - Tudo Incluído',
          price: 'R$ 1.997',
          period: 'único',
          features: ['Tudo dos planos anteriores', 'Criação do seu produto', 'Configuração de vendas', 'Tráfego inicial'],
          popular: false,
          cta: 'TORNAR-SE VIP'
        }
      ],
      enabled: true
    },
    {
      id: 'guarantee-banner',
      type: 'cta',
      title: 'Garantia Incondicional',
      subtitle: 'Sua satisfação é nossa prioridade',
      content: 'Se em 30 dias você não estiver satisfeito, devolvemos 100% do seu investimento. Sem perguntas, sem burocracias.',
      buttonText: 'COMEÇAR AGORA',
      buttonLink: '#pricing',
      backgroundColor: '#10b981',
      enabled: true
    },
    {
      id: 'faq-section',
      type: 'benefits',
      title: 'Perguntas Frequentes',
      subtitle: 'Tire suas dúvidas antes de começar',
      items: [
        {
          title: 'Preciso de experiência prévia?',
          description: 'Não! O curso é para iniciantes completos.'
        },
        {
          title: 'Quanto tempo leva para ter resultados?',
          description: 'Primeiros resultados em 30 dias, sucesso completo em 90 dias.'
        },
        {
          title: 'E se eu não conseguir criar meu produto?',
          description: 'Temos mentoria individual e templates prontos.'
        },
        {
          title: 'Posso vender os produtos que criar?',
          description: 'Sim! Você terá todos os direitos sobre seus produtos.'
        }
      ],
      enabled: true
    },
    {
      id: 'final-cta',
      type: 'cta',
      title: 'Não Deixe Essa Oportunidade Escapar',
      subtitle: 'Vagas limitadas - Próxima turma só em 2026',
      content: 'Clique no botão abaixo e garanta sua vaga antes que acabe.',
      buttonText: 'GARANTIR MINHA VAGA AGORA',
      buttonLink: '#pricing',
      backgroundImage: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1920&h=600&fit=crop&crop=center',
      urgencyText: '⏰ Últimas 23 vagas disponíveis',
      enabled: true
    }
  ]
};

const digitalServicesTemplate = {
  id: 'commercial-leadpage',
  name: 'Leadpage Comercial - Foco em Conversão',
  sections: [
    {
      id: 'hero-performance',
      type: 'hero',
      title: 'INVESTIMENTO QUE RETORNA EM 30 DIAS',
      subtitle: 'GARANTIDO',
      content: 'Não perca mais tempo. Nossa solução comprovada gera resultados imediatos. Mais de R$ 50 milhões em vendas geradas para nossos clientes.',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1920&h=1080&fit=crop&crop=center',
      buttonText: 'GARANTIR MINHA VAGA AGORA',
      buttonLink: '#pricing',
      urgencyText: 'Apenas 5 vagas restantes!',
      stats: ['R$ 50M+ Vendas', '500+ Clientes', '98% Satisfação'],
      enabled: true
    },
    {
      id: 'service-showcase',
      type: 'about',
      title: 'Por Que Escolher Nossos Serviços',
      content: 'Somos especialistas em marketing digital há mais de 8 anos. Nossa abordagem data-driven garante que cada real investido gere retorno máximo.',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop&crop=center',
      enabled: true
    },
    {
      id: 'marketing-services',
      type: 'benefits',
      title: 'Serviços Especializados',
      subtitle: 'Soluções completas para seu negócio digital',
      items: [
        {
          title: 'Google Ads & SEO',
          description: 'Posicione sua marca no topo das buscas e gere leads qualificados',
          features: ['Otimização técnica', 'Conteúdo estratégico', 'Relatórios mensais']
        },
        {
          title: 'Social Media Marketing',
          description: 'Construa comunidades engajadas nas redes sociais',
          features: ['Gestão de conteúdo', 'Anúncios direcionados', 'Analytics avançado']
        },
        {
          title: 'Funil de Vendas',
          description: 'Transforme visitantes em clientes fiéis',
          features: ['Landing pages', 'Email marketing', 'CRM integrado']
        }
      ],
      enabled: true
    },
    {
      id: 'advanced-services',
      type: 'benefits',
      title: 'Serviços Avançados',
      subtitle: 'Soluções premium para resultados extraordinários',
      items: [
        {
          title: 'Facebook & Instagram Ads',
          description: 'Campanhas visuais que geram engajamento e conversões',
          features: ['Configuração profissional', 'Públicos customizados', 'Remarketing avançado', 'A/B testing contínuo']
        },
        {
          title: 'Google Ads Performance',
          description: 'Anúncios de busca que convertem visitantes em clientes',
          features: ['Otimização de CPC', 'Landing pages otimizadas', 'Remarketing inteligente', 'Relatórios detalhados']
        },
        {
          title: 'TikTok & YouTube Ads',
          description: 'Alcance gerações mais jovens com conteúdo viral',
          features: ['Estratégias de engajamento', 'Conteúdo otimizado', 'Targeting preciso', 'Analytics completo']
        },
        {
          title: 'Consultoria Estratégica',
          description: 'Acompanhamento mensal para maximizar resultados',
          features: ['Análise de concorrência', 'Otimização contínua', 'Suporte prioritário', 'Relatórios semanais']
        }
      ],
      enabled: true
    },
    {
      id: 'roi-calculator',
      type: 'benefits',
      title: 'Calcule Seu Potencial de Lucro',
      subtitle: 'Veja quanto você pode faturar com tráfego pago profissional',
      calculator: {
        investment: 5000,
        cpc: 2.50,
        conversion: 3.5,
        ticket: 497,
        results: {
          clicks: 2000,
          leads: 70,
          sales: 24,
          revenue: 11928,
          profit: 6928,
          roi: 2.4
        }
      },
      enabled: true
    },
    {
      id: 'case-studies',
      type: 'social-proof',
      title: 'Cases de Sucesso Reais',
      subtitle: 'Resultados comprovados em diferentes nichos',
      items: [
        {
          company: 'E-commerce de Suplementos',
          niche: 'Saúde & Fitness',
          before: 'R$ 15.000/mês em vendas',
          after: 'R$ 87.000/mês (+480%)',
          investment: 'R$ 8.000/mês',
          results: ['ROI: 4.2x', 'Custo por venda: R$ 47', '70% margem de lucro'],
          image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=400&fit=crop&crop=center'
        },
        {
          company: 'Escola de Inglês Online',
          niche: 'Educação',
          before: '50 alunos/mês',
          after: '280 alunos/mês (+460%)',
          investment: 'R$ 6.000/mês',
          results: ['ROI: 5.8x', 'Custo por aluno: R$ 32', 'LTV: R$ 1.200'],
          image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&h=400&fit=crop&crop=center'
        },
        {
          company: 'Consultoria Jurídica',
          niche: 'Jurídico',
          before: '8 clientes/mês',
          after: '42 clientes/mês (+425%)',
          investment: 'R$ 4.500/mês',
          results: ['ROI: 3.9x', 'Ticket médio: R$ 850', 'Margem: 65%'],
          image: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&h=400&fit=crop&crop=center'
        }
      ],
      enabled: true
    },
    {
      id: 'pricing-packages',
      type: 'benefits',
      title: 'Escolha o Pacote Ideal Para Seu Negócio',
      subtitle: 'Investimento que se paga sozinho em 30 dias',
      items: [
        {
          title: 'Starter',
          subtitle: 'Para pequenos negócios',
          price: 'R$ 2.997',
          period: 'mês',
          features: [
            '1 rede social (Facebook/Instagram)',
            'Até R$ 5.000 em investimento mensal',
            'Relatórios semanais',
            'Suporte por email'
          ],
          popular: false,
          cta: 'COMEÇAR AGORA'
        },
        {
          title: 'Professional',
          subtitle: 'Resultado comprovado',
          price: 'R$ 4.997',
          period: 'mês',
          features: [
            '2 redes sociais completas',
            'Até R$ 15.000 em investimento mensal',
            'Relatórios diários + reunião semanal',
            'Suporte prioritário + WhatsApp',
            'A/B testing avançado'
          ],
          popular: true,
          cta: 'GARANTIR RESULTADOS',
          bonus: 'Primeiro mês com desconto'
        },
        {
          title: 'Enterprise',
          subtitle: 'Soluções completas',
          price: 'R$ 9.997',
          period: 'mês',
          features: [
            'Todas as plataformas digitais',
            'Até R$ 50.000 em investimento mensal',
            'Relatórios em tempo real',
            'Consultoria estratégica mensal',
            'Time dedicado + gerente de conta',
            'Criação de landing pages'
          ],
          popular: false,
          cta: 'FALAR COM ESPECIALISTA'
        }
      ],
      enabled: true
    },
    {
      id: 'guarantee-trust',
      type: 'cta',
      title: 'Garantia de Resultados',
      subtitle: 'Se não gerar ROI mínimo de 3x, trabalhamos de graça até conseguir',
      content: 'Não trabalhamos com "talvez" ou "pode ser". Garantimos resultados ou seu dinheiro de volta.',
      buttonText: 'GARANTIR RESULTADOS',
      buttonLink: '#pricing',
      backgroundColor: '#059669',
      enabled: true
    },
    {
      id: 'faq-professional',
      type: 'benefits',
      title: 'Perguntas Técnicas Frequentes',
      subtitle: 'Respostas diretas para dúvidas comuns',
      items: [
        {
          title: 'Quanto tempo leva para ver resultados?',
          description: 'Primeiros resultados em 7-14 dias. ROI consistente em 30 dias.'
        },
        {
          title: 'E se meu nicho for muito competitivo?',
          description: 'Temos estratégias específicas para mercados saturados.'
        },
        {
          title: 'Posso pausar as campanhas quando quiser?',
          description: 'Total controle. Pause/resume a qualquer momento sem custos extras.'
        },
        {
          title: 'Como sei se estou tendo retorno?',
          description: 'Relatórios diários com métricas claras e ROI em tempo real.'
        },
        {
          title: 'Trabalham com produtos físicos?',
          description: 'Sim! Temos expertise em e-commerce e produtos físicos.'
        }
      ],
      enabled: true
    },
    {
      id: 'final-cta-urgency',
      type: 'cta',
      title: 'Últimas Vagas para Dezembro',
      subtitle: 'Apenas 3 projetos disponíveis este mês',
      content: 'Não perca a oportunidade de ter uma máquina de vendas funcionando 24/7.',
      buttonText: 'GARANTIR MINHA VAGA AGORA',
      buttonLink: '#pricing',
      backgroundImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1920&h=600&fit=crop&crop=center',
      urgencyText: '⏰ Apenas 3 projetos disponíveis',
      countdown: '2025-12-31T23:59:59',
      enabled: true
    }
  ]
};

export async function initDefaultTemplate() {
  const templates = [
    { id: 'default-modern', data: defaultTemplate },
    { id: 'clean-leadpage', data: infoproductTemplate },
    { id: 'commercial-leadpage', data: digitalServicesTemplate }
  ];

  for (const template of templates) {
    const templateRef = db.collection('templates').doc(template.id);
    await templateRef.set(template.data);
    console.log(`Template ${template.data.name} criado!`);
  }

  console.log('Todos os templates foram criados com sucesso!');
}

initDefaultTemplate().catch(console.error);