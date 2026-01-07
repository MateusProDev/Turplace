import { config } from 'dotenv';
config({ path: '.env.local' });
import admin from 'firebase-admin';
import initFirestore from '../api/_lib/firebaseAdmin.cjs';

const db = initFirestore();

// TEMPLATE 1: ONE-PAGE MINIMALISTA
const onePageMinimalTemplate = {
  id: 'one-page-minimal',
  name: 'One-Page Minimalista - Foco Total na Conversão',
  sections: [
    {
      id: 'hero-minimal',
      type: 'hero',
      title: 'Uma Única Página. Resultados Máximos.',
      subtitle: 'Simples. Poderoso. Eficaz.',
      content: 'Tudo que você precisa saber em uma página. Sem distrações, apenas conversão.',
      buttonText: 'COMEÇAR AGORA',
      buttonLink: '#contact',
      backgroundColor: '#ffffff',
      enabled: true
    },
    {
      id: 'single-cta',
      type: 'cta',
      title: 'Pronto para Transformar?',
      content: 'Clique abaixo e dê o primeiro passo para o sucesso.',
      buttonText: 'GARANTIR MINHA VAGA',
      buttonLink: '#contact',
      backgroundColor: '#000000',
      enabled: true
    }
  ]
};

// TEMPLATE 2: STORY-DRIVEN (NARRATIVA)
const storyDrivenTemplate = {
  id: 'story-driven',
  name: 'Story-Driven - Narrativa Sequencial',
  sections: [
    {
      id: 'story-hero',
      type: 'hero',
      title: 'Era Uma Vez...',
      subtitle: 'Uma História de Transformação',
      content: 'Todo mundo tem uma história. Esta é a sua chance de escrever um novo capítulo.',
      buttonText: 'Continuar Lendo',
      buttonLink: '#chapter1',
      backgroundImage: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1920&h=1080&fit=crop&crop=center',
      enabled: true
    },
    {
      id: 'chapter-problem',
      type: 'about',
      title: 'Capítulo 1: O Desafio',
      content: 'Você já se sentiu preso na rotina? Trabalhando duro mas sem ver progresso real? Esta é a história de milhares de pessoas que decidiram mudar.',
      backgroundColor: '#1a1a1a',
      enabled: true
    },
    {
      id: 'chapter-discovery',
      type: 'benefits',
      title: 'Capítulo 2: A Descoberta',
      subtitle: 'A virada que mudou tudo',
      items: [
        {
          title: 'O Momento "Eureka"',
          description: 'Quando você percebe que existe um caminho diferente'
        },
        {
          title: 'A Primeira Ação',
          description: 'O pequeno passo que iniciou a transformação'
        },
        {
          title: 'Os Primeiros Resultados',
          description: 'A validação de que estava no caminho certo'
        }
      ],
      backgroundColor: '#2a2a2a',
      enabled: true
    },
    {
      id: 'chapter-transformation',
      type: 'social-proof',
      title: 'Capítulo 3: A Transformação',
      subtitle: 'Histórias reais de pessoas que mudaram',
      items: [
        {
          name: 'João Silva',
          text: '"Pensei que era impossível, mas aqui estou, vivendo meus sonhos"',
          result: 'De R$ 3.000 para R$ 15.000/mês'
        },
        {
          name: 'Maria Santos',
          text: '"A mudança que eu tanto queria finalmente aconteceu"',
          result: 'Liberdade financeira conquistada'
        }
      ],
      backgroundColor: '#3a3a3a',
      enabled: true
    },
    {
      id: 'story-climax',
      type: 'cta',
      title: 'Capítulo Final: Sua Vez',
      subtitle: 'Escreva seu próprio final feliz',
      content: 'A história não para aqui. Ela continua com você.',
      buttonText: 'COMEÇAR MINHA HISTÓRIA',
      buttonLink: '#contact',
      backgroundImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=600&fit=crop&crop=center',
      enabled: true
    }
  ]
};

// TEMPLATE 3: DARK MODE PREMIUM
const darkModePremiumTemplate = {
  id: 'dark-premium',
  name: 'Dark Mode Premium - Luxo e Sofisticação',
  sections: [
    {
      id: 'hero-dark-luxury',
      type: 'hero',
      title: 'EXCLUSIVIDADE QUE FAZ A DIFERENÇA',
      subtitle: 'Para quem sabe o valor do premium',
      content: 'Não é para todos. É para aqueles que exigem o melhor.',
      buttonText: 'ENTRAR PARA O CLUBE',
      buttonLink: '#pricing',
      backgroundColor: '#000000',
      stats: ['Membros Exclusivos', 'Resultados Comprovados', 'Suporte VIP'],
      enabled: true
    },
    {
      id: 'luxury-benefits',
      type: 'benefits',
      title: 'Por Que o Premium Vale a Pena',
      subtitle: 'Benefícios que só o topo oferece',
      items: [
        {
          title: 'Acesso Exclusivo',
          description: 'Conteúdo e oportunidades disponíveis apenas para membros premium',
          icon: 'crown'
        },
        {
          title: 'Suporte Personalizado',
          description: 'Atendimento individual com especialistas dedicados',
          icon: 'star'
        },
        {
          title: 'Resultados Acelerados',
          description: 'Métodos otimizados que entregam resultados 3x mais rápido',
          icon: 'rocket'
        }
      ],
      backgroundColor: '#111111',
      enabled: true
    },
    {
      id: 'premium-pricing',
      type: 'benefits',
      title: 'Investimento Premium',
      subtitle: 'Para quem entende que qualidade tem preço',
      items: [
        {
          title: 'VIP Exclusive',
          price: 'R$ 9.997',
          features: ['Acesso vitalício', 'Suporte 24/7', 'Consultorias mensais', 'Grupo exclusivo'],
          popular: true,
          cta: 'GARANTIR ACESSO VIP'
        }
      ],
      backgroundColor: '#0a0a0a',
      enabled: true
    },
    {
      id: 'dark-cta-final',
      type: 'cta',
      title: 'Junte-se aos Exclusivos',
      content: 'Vagas limitadas para manter a qualidade do grupo.',
      buttonText: 'SOLICITAR CONVITE',
      buttonLink: '#contact',
      backgroundColor: '#000000',
      enabled: true
    }
  ]
};

// TEMPLATE 4: VISUAL STORYTELLING
const visualStorytellingTemplate = {
  id: 'visual-storytelling',
  name: 'Visual Storytelling - Imagens que Contam Histórias',
  sections: [
    {
      id: 'hero-visual',
      type: 'hero',
      title: 'VEJA PARA ACREDITAR',
      subtitle: 'Resultados que falam por si',
      content: 'Antes e depois. Números que impressionam. Histórias que inspiram.',
      buttonText: 'VER RESULTADOS',
      buttonLink: '#results',
      backgroundImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1920&h=1080&fit=crop&crop=center',
      enabled: true
    },
    {
      id: 'before-after',
      type: 'benefits',
      title: 'A Transformação Visual',
      subtitle: 'Veja a diferença que fazemos',
      items: [
        {
          title: 'Antes: Luta Diária',
          description: 'Trabalhando 12h por dia sem ver progresso',
          image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=600&h=400&fit=crop&crop=center'
        },
        {
          title: 'Durante: Método Aplicado',
          description: 'Implementando estratégias comprovadas',
          image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=400&fit=crop&crop=center'
        },
        {
          title: 'Depois: Sucesso Conquistado',
          description: 'Vida transformada, objetivos alcançados',
          image: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600&h=400&fit=crop&crop=center'
        }
      ],
      enabled: true
    },
    {
      id: 'results-gallery',
      type: 'social-proof',
      title: 'Galeria de Sucessos',
      subtitle: 'Resultados reais de alunos reais',
      items: [
        {
          name: 'Carlos M.',
          result: 'R$ 50K/mês',
          text: 'De zero para empresário de sucesso',
          image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face'
        },
        {
          name: 'Ana P.',
          result: 'Liberdade Total',
          text: 'Agora trabalho quando quero',
          image: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=300&h=300&fit=crop&crop=face'
        }
      ],
      enabled: true
    },
    {
      id: 'visual-cta',
      type: 'cta',
      title: 'Sua Vez de Brilhar',
      content: 'Entre para a galeria de sucessos.',
      buttonText: 'COMEÇAR MINHA TRANSFORMAÇÃO',
      buttonLink: '#contact',
      backgroundImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=600&fit=crop&crop=center',
      enabled: true
    }
  ]
};

// TEMPLATE 5: INTERACTIVE QUIZ
const interactiveQuizTemplate = {
  id: 'interactive-quiz',
  name: 'Interactive Quiz - Engajamento Total',
  sections: [
    {
      id: 'quiz-hero',
      type: 'hero',
      title: 'DESCUBRA SEU POTENCIAL REAL',
      subtitle: 'Um quiz rápido que revela tudo',
      content: 'Responda 5 perguntas e descubra exatamente o que você precisa para alcançar seus objetivos.',
      buttonText: 'INICIAR QUIZ AGORA',
      buttonLink: '#quiz-start',
      backgroundColor: '#6366f1',
      enabled: true
    },
    {
      id: 'quiz-question-1',
      type: 'benefits',
      title: 'Pergunta 1: Qual é seu maior desafio hoje?',
      subtitle: 'Selecione a opção que mais se identifica',
      items: [
        {
          title: 'Falta de tempo',
          description: 'Trabalho demais, não tenho energia para mais nada'
        },
        {
          title: 'Falta de conhecimento',
          description: 'Sei que preciso aprender, mas não sei por onde começar'
        },
        {
          title: 'Falta de foco',
          description: 'Começo várias coisas, mas não termino nenhuma'
        },
        {
          title: 'Falta de resultados',
          description: 'Trabalho duro, mas os resultados não vêm'
        }
      ],
      backgroundColor: '#f8fafc',
      enabled: true
    },
    {
      id: 'quiz-results',
      type: 'about',
      title: 'Seus Resultados Personalizados',
      content: 'Baseado nas suas respostas, criamos um plano específico para você. Está pronto para ver o que preparamos?',
      backgroundColor: '#10b981',
      enabled: true
    },
    {
      id: 'personalized-offer',
      type: 'benefits',
      title: 'Seu Plano Personalizado',
      subtitle: 'Feito especialmente para você',
      items: [
        {
          title: 'Seu Desafio Específico',
          description: 'Identificamos exatamente o que te impede de avançar'
        },
        {
          title: 'Solução Personalizada',
          description: 'O método certo para seu perfil específico'
        },
        {
          title: 'Resultado Esperado',
          description: 'Quanto tempo para ver mudanças significativas'
        }
      ],
      backgroundColor: '#ffffff',
      enabled: true
    },
    {
      id: 'quiz-cta',
      type: 'cta',
      title: 'Pronto para Começar?',
      content: 'Seu plano personalizado está esperando. Vamos transformar teoria em prática.',
      buttonText: 'GARANTIR MEU PLANO',
      buttonLink: '#contact',
      backgroundColor: '#6366f1',
      enabled: true
    }
  ]
};

// TEMPLATE 6: MINIMALIST GRID
const minimalistGridTemplate = {
  id: 'minimalist-grid',
  name: 'Minimalist Grid - Design Arquitetônico',
  sections: [
    {
      id: 'grid-hero',
      type: 'hero',
      title: 'MENOS É MAIS',
      subtitle: 'Simplicidade que funciona',
      content: 'Removemos tudo que não era essencial. Ficou apenas o que converte.',
      buttonText: 'EXPLORAR',
      buttonLink: '#grid',
      backgroundColor: '#ffffff',
      enabled: true
    },
    {
      id: 'feature-grid',
      type: 'benefits',
      title: 'Sistema Modular',
      subtitle: 'Cada peça tem seu lugar',
      items: [
        {
          title: 'Clareza',
          description: 'Mensagem direta, sem ruídos'
        },
        {
          title: 'Foco',
          description: 'Atenção total no objetivo principal'
        },
        {
          title: 'Eficiência',
          description: 'Resultados com menos esforço'
        },
        {
          title: 'Escalabilidade',
          description: 'Cresce sem perder a essência'
        },
        {
          title: 'Sustentabilidade',
          description: 'Método que dura para sempre'
        },
        {
          title: 'Confiabilidade',
          description: 'Sempre funciona, sempre converte'
        }
      ],
      backgroundColor: '#f8fafc',
      enabled: true
    },
    {
      id: 'minimal-cta',
      type: 'cta',
      title: 'Simples Assim',
      content: 'Não complicamos. Apenas resultados.',
      buttonText: 'COMEÇAR SIMPLES',
      buttonLink: '#contact',
      backgroundColor: '#000000',
      enabled: true
    }
  ]
};

export async function initDefaultTemplate() {
  const templates = [
    { id: 'one-page-minimal', data: onePageMinimalTemplate },
    { id: 'story-driven', data: storyDrivenTemplate },
    { id: 'dark-premium', data: darkModePremiumTemplate },
    { id: 'visual-storytelling', data: visualStorytellingTemplate },
    { id: 'interactive-quiz', data: interactiveQuizTemplate },
    { id: 'minimalist-grid', data: minimalistGridTemplate }
  ];

  for (const template of templates) {
    const templateRef = db.collection('templates').doc(template.id);
    await templateRef.set(template.data);
    console.log(`Template ${template.data.name} criado!`);
  }

  console.log('Todos os templates foram criados com sucesso!');
}

initDefaultTemplate().catch(console.error);