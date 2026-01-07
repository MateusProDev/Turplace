import { config } from 'dotenv';
config({ path: '.env.local' });
import admin from 'firebase-admin';
import initFirestore from '../api/_lib/firebaseAdmin.cjs';

const db = initFirestore();

// TEMPLATE 1: NEU-MORPHIC MODERN
const neumorphicModernTemplate = {
  id: 'neumorphic-modern',
  name: 'Neumorphic Modern - Design 3D Suave',
  sections: [
    {
      id: 'hero-3d',
      type: 'hero',
      title: 'ELEVAÇÃO DIGITAL',
      subtitle: 'Onde design e performance se encontram',
      content: 'Experiências táteis que convertem. Interface suave que engaja. Resultados que impressionam.',
      buttonText: 'EXPLORAR ELEVAÇÃO',
      buttonLink: '#cta',
      secondaryButtonText: 'VER DEMO',
      secondaryButtonLink: '#demo',
      backgroundColor: '#f0f0f3',
      stats: [
        { value: '+247%', label: 'Taxa de Engajamento' },
        { value: '1.8s', label: 'Tempo de Carregamento' },
        { value: '94%', label: 'Satisfação UX' }
      ],
      backgroundElements: ['soft-shadows', 'blur-effects'],
      enabled: true
    },
    {
      id: 'floating-features',
      type: 'benefits',
      title: 'Recursos que Flutuam',
      subtitle: 'Cada elemento foi projetado para conversão',
      layout: 'floating-cards',
      items: [
        {
          title: 'Micro-interações',
          description: 'Animações sutis que guiam o usuário',
          icon: 'sparkles',
          color: '#6366f1',
          delay: '0.1s'
        },
        {
          title: 'Scroll Parallax',
          description: 'Profundidade que cativa',
          icon: 'layers',
          color: '#10b981',
          delay: '0.2s'
        },
        {
          title: 'Glass Morphism',
          description: 'Transparência moderna',
          icon: 'glasses',
          color: '#f59e0b',
          delay: '0.3s'
        },
        {
          title: 'Gradient Dynamic',
          description: 'Cores que se transformam',
          icon: 'palette',
          color: '#ef4444',
          delay: '0.4s'
        }
      ],
      backgroundColor: '#f0f0f3',
      enabled: true
    },
    {
      id: 'interactive-demo',
      type: 'demo',
      title: 'Toque e Sinta',
      subtitle: 'Interaja com a experiência',
      content: 'Arraste, clique e explore nossa interface revolucionária.',
      interactiveElements: [
        {
          type: 'slider',
          label: 'Intensidade do Efeito',
          min: 0,
          max: 100,
          defaultValue: 50
        },
        {
          type: 'toggle',
          label: 'Modo Noturno',
          default: false
        },
        {
          type: 'color-picker',
          label: 'Escolha sua Cor',
          colors: ['#6366f1', '#10b981', '#f59e0b', '#ef4444']
        }
      ],
      backgroundColor: '#ffffff',
      enabled: true
    },
    {
      id: 'neumorphic-cta',
      type: 'cta',
      title: 'Pronto para Elevar?',
      content: 'Toque abaixo para iniciar sua experiência premium.',
      buttonText: 'TOCAR PARA COMEÇAR',
      buttonLink: '#contact',
      buttonStyle: 'neumorphic',
      backgroundColor: '#f0f0f3',
      microInteraction: 'pulse',
      enabled: true
    }
  ]
};

// TEMPLATE 2: CYBERPUNK 2077
const cyberpunkTemplate = {
  id: 'cyberpunk-2077',
  name: 'Cyberpunk 2077 - Futurismo Radical',
  sections: [
    {
      id: 'hero-cyber',
      type: 'hero',
      title: 'SYNTHWAVE_REVOLUTION.EXE',
      subtitle: 'O futuro chegou. Está pronto?',
      content: 'Neon, glitch e velocidade. Uma experiência que desafia os limites do digital.',
      buttonText: '[ACESSAR SISTEMA]',
      buttonLink: '#mainframe',
      backgroundColor: '#0a0a0a',
      backgroundEffect: 'scan-lines',
      glitchEffect: true,
      terminalText: '> INITIATING CONVERSION_SEQUENCE...',
      enabled: true
    },
    {
      id: 'neon-grid',
      type: 'benefits',
      title: 'MATRIX DE BENEFÍCIOS',
      subtitle: 'Sistema otimizado para resultados extremos',
      layout: 'hologram-grid',
      items: [
        {
          title: '0-Day Exploits',
          description: 'Vulnerabilidades de mercado descobertas antes de todos',
          icon: 'shield',
          neonColor: '#00ff00'
        },
        {
          title: 'Neural Networks',
          description: 'IA que aprende e otimiza suas conversões em tempo real',
          icon: 'brain',
          neonColor: '#00ffff'
        },
        {
          title: 'Quantum Speed',
          description: 'Processamento tão rápido que parece viagem no tempo',
          icon: 'bolt',
          neonColor: '#ff00ff'
        },
        {
          title: 'Encryption Lvl 10',
          description: 'Segurança impenetrável para seus dados',
          icon: 'lock',
          neonColor: '#ffff00'
        }
      ],
      backgroundColor: '#000000',
      gridEffect: true,
      enabled: true
    },
    {
      id: 'data-stream',
      type: 'social-proof',
      title: 'LIVE DATA STREAM',
      subtitle: 'Resultados em tempo real',
      layout: 'terminal-view',
      items: [
        {
          user: 'USER_007',
          action: 'CONVERSION_COMPLETE',
          amount: '$15,427',
          time: '00:23:45',
          status: 'SUCCESS'
        },
        {
          user: 'CORP_ALPHA',
          action: 'FUNNEL_OPTIMIZED',
          amount: '+312% ROI',
          time: '01:15:22',
          status: 'OPTIMIZED'
        },
        {
          user: 'NEO_TECH',
          action: 'BREAKTHROUGH_ACHIEVED',
          amount: '10K LEADS',
          time: '02:47:11',
          status: 'QUANTUM_LEAP'
        }
      ],
      backgroundColor: '#0a0a0a',
      streaming: true,
      enabled: true
    },
    {
      id: 'cyber-cta',
      type: 'cta',
      title: '[INICIAR PROTOCOLO]',
      content: '> PRESSIONE [ENTER] PARA HACKERAR O SISTEMA',
      buttonText: '[EXECUTE_ORDER_66]',
      buttonLink: '#contact',
      buttonStyle: 'cyberpunk',
      backgroundColor: '#000000',
      glitchText: true,
      matrixRain: true,
      enabled: true
    }
  ]
};

// TEMPLATE 3: BIOPHILIC DESIGN
const biophilicTemplate = {
  id: 'biophilic-design',
  name: 'Biophilic Design - Natureza Digital',
  sections: [
    {
      id: 'hero-nature',
      type: 'hero',
      title: 'CRESCIMENTO ORGÂNICO',
      subtitle: 'Tecnologia que respira',
      content: 'Conectamos sua marca à natureza digital. Crescimento sustentável, resultados naturais.',
      buttonText: 'PLANTAR SEMENTE',
      buttonLink: '#grow',
      backgroundImage: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1920&h=1080&fit=crop',
      overlay: 'green-tint',
      animatedElements: ['floating-leaves', 'gentle-wind'],
      enabled: true
    },
    {
      id: 'ecosystem',
      type: 'benefits',
      title: 'Seu Ecossistema Digital',
      subtitle: 'Cada elemento trabalha em harmonia',
      layout: 'organic-grid',
      items: [
        {
          title: 'Raízes Profundas',
          description: 'Fundações sólidas para crescimento sustentável',
          icon: '🌱',
          growth: 'seedling'
        },
        {
          title: 'Fotossíntese Digital',
          description: 'Converte visitantes em nutrientes para seu negócio',
          icon: '🌿',
          growth: 'growing'
        },
        {
          title: 'Polinização Viral',
          description: 'Seu conteúdo se espalha naturalmente',
          icon: '🌸',
          growth: 'blooming'
        },
        {
          title: 'Frutos Perenes',
          description: 'Resultados que continuam surgindo',
          icon: '🍃',
          growth: 'fruitful'
        }
      ],
      backgroundColor: '#f9faf5',
      organicShapes: true,
      enabled: true
    },
    {
      id: 'living-testimonials',
      type: 'social-proof',
      title: 'Florestas Cultivadas',
      subtitle: 'Clientes que floresceram conosco',
      layout: 'garden-view',
      items: [
        {
          name: 'Evergreen Tech',
          result: 'Crescimento de 450%',
          text: 'De sementeira a floresta em 6 meses',
          element: 'mighty-oak'
        },
        {
          name: 'Bloom & Grow',
          result: '100K Seguidores',
          text: 'Nossa comunidade floresceu organicamente',
          element: 'flower-field'
        },
        {
          name: 'Root Systems',
          result: 'Churn 0%',
          text: 'Cliente raiz desde o primeiro dia',
          element: 'ancient-tree'
        }
      ],
      backgroundColor: '#f0f7ee',
      animatedBackground: true,
      enabled: true
    },
    {
      id: 'nature-cta',
      type: 'cta',
      title: 'Prepare o Solo',
      content: 'Estamos prontos para plantar as sementes do seu sucesso.',
      buttonText: 'INICIAR JARDIM DIGITAL',
      buttonLink: '#contact',
      buttonStyle: 'organic',
      backgroundColor: '#2d5a27',
      interactiveNature: true,
      growthAnimation: true,
      enabled: true
    }
  ]
};

// TEMPLATE 4: BRUTALIST MINIMAL
const brutalistMinimalTemplate = {
  id: 'brutalist-minimal',
  name: 'Brutalist Minimal - Honestidade Digital',
  sections: [
    {
      id: 'hero-brutal',
      type: 'hero',
      title: 'RAW.',
      subtitle: 'Sem efeitos. Sem firulas. Apenas conversão.',
      content: 'Rejeitamos o excesso. Abraçamos a função. Esta página converte. Ponto.',
      buttonText: 'VER FUNÇÃO',
      buttonLink: '#function',
      backgroundColor: '#ffffff',
      typography: 'monospace',
      borderStyle: 'heavy',
      gridVisible: true,
      enabled: true
    },
    {
      id: 'raw-data',
      type: 'benefits',
      title: 'DADOS CRUS',
      subtitle: 'Números que não mentem',
      layout: 'spreadsheet',
      items: [
        {
          metric: 'CTR',
          value: '7.8%',
          change: '+2.1%',
          rawData: '7432/95211 clicks'
        },
        {
          metric: 'CONVERSION',
          value: '4.3%',
          change: '+1.7%',
          rawData: '4095/95211 visitors'
        },
        {
          metric: 'BOUNCE',
          value: '32%',
          change: '-11%',
          rawData: '30467/95211 sessions'
        },
        {
          metric: 'VALUE',
          value: '$147',
          change: '+$43',
          rawData: 'average per conversion'
        }
      ],
      backgroundColor: '#f8f9fa',
      showGridLines: true,
      dataRefresh: 'realtime',
      enabled: true
    },
    {
      id: 'code-cta',
      type: 'cta',
      title: 'FUNCTION convertVisitor() {',
      content: `if (visitor.wantsResults === true) {
  return initiateConversion();
} else {
  return showMoreData();
}`,
      buttonText: 'EXECUTE FUNCTION',
      buttonLink: '#contact',
      buttonStyle: 'code-button',
      backgroundColor: '#000000',
      syntaxHighlight: true,
      copyCode: true,
      enabled: true
    },
    {
      id: 'raw-footer',
      type: 'footer',
      title: 'DEBUG INFO',
      content: 'Server: online | Load: 23% | Conversions: running',
      links: [
        { text: 'VIEW SOURCE', url: '#source' },
        { text: 'ANALYTICS RAW', url: '#analytics' },
        { text: 'PERFORMANCE LOGS', url: '#logs' }
      ],
      backgroundColor: '#1a1a1a',
      terminalStyle: true,
      enabled: true
    }
  ]
};

// TEMPLATE 5: KINETIC TYPOGRAPHY
const kineticTypographyTemplate = {
  id: 'kinetic-typography',
  name: 'Kinetic Typography - Dança das Letras',
  sections: [
    {
      id: 'hero-kinetic',
      type: 'hero',
      title: 'MOVE',
      subtitle: 'Type in Motion',
      content: 'Cada palavra dança. Cada letra converte. Tipografia que não apenas informa, mas performa.',
      buttonText: 'INICIAR PERFORMANCE',
      buttonLink: '#show',
      backgroundColor: '#000000',
      typography: 'animated',
      textEffects: ['float', 'scale', 'rotate'],
      colorShift: true,
      enabled: true
    },
    {
      id: 'typo-showcase',
      type: 'demo',
      title: 'INTERAÇÃO TIPOGRÁFICA',
      subtitle: 'Toque nas palavras para ver a magia',
      interactiveText: [
        {
          word: 'CRESCIMENTO',
          animation: 'pulse-grow',
          color: '#ff6b6b'
        },
        {
          word: 'CONVERSÃO',
          animation: 'slide-in',
          color: '#4ecdc4'
        },
        {
          word: 'IMPACTO',
          animation: 'bounce',
          color: '#45b7d1'
        },
        {
          word: 'RESULTADO',
          animation: 'spin',
          color: '#96ceb4'
        }
      ],
      backgroundColor: '#111111',
      enableSound: false,
      tactileFeedback: true,
      enabled: true
    },
    {
      id: 'font-emotions',
      type: 'benefits',
      title: 'FONTES QUE SENTEM',
      subtitle: 'Cada estilo transmite uma emoção',
      layout: 'emotional-grid',
      items: [
        {
          font: 'BOLD MODERN',
          emotion: 'CONFIANÇA',
          useCase: 'Headlines impactantes',
          weight: 900
        },
        {
          font: 'LIGHT SANS',
          emotion: 'CLAREZA',
          useCase: 'Textos longos e legíveis',
          weight: 300
        },
        {
          font: 'ITALIC SERIF',
          emotion: 'ELEGÂNCIA',
          useCase: 'Citações e depoimentos',
          weight: 400
        },
        {
          font: 'MONOSPACE',
          emotion: 'TECNOLOGIA',
          useCase: 'Dados e códigos',
          weight: 500
        }
      ],
      backgroundColor: '#222222',
      liveFontPreview: true,
      enabled: true
    },
    {
      id: 'kinetic-cta',
      type: 'cta',
      title: 'SUA',
      animatedTitle: 'MENSAGEM',
      subtitle: 'em movimento',
      content: 'Pronto para dar vida às suas palavras?',
      buttonText: 'ANIMAR MENSAGEM',
      buttonLink: '#contact',
      buttonStyle: 'animated-text',
      backgroundColor: '#000000',
      textReveal: 'letter-by-letter',
      enabled: true
    }
  ]
};

// TEMPLATE 6: HOLOGRAPHIC INTERFACE
const holographicTemplate = {
  id: 'holographic-interface',
  name: 'Holographic Interface - Futuro Tátil',
  sections: [
    {
      id: 'hero-holo',
      type: 'hero',
      title: 'PROJETE O FUTURO',
      subtitle: 'Interfaces que flutuam no ar',
      content: 'Tecnologia holográfica que torna o digital tangível. Toque no impossível.',
      buttonText: 'ATIVAR HOLO',
      buttonLink: '#holo',
      backgroundColor: 'transparent',
      backgroundEffect: 'hologram-grid',
      particleEffect: true,
      depthEffect: true,
      enabled: true
    },
    {
      id: 'holo-features',
      type: 'benefits',
      title: 'TECNOLOGIA 3D FLUTUANTE',
      subtitle: 'Recursos que parecem magia',
      layout: 'hologram-cube',
      items: [
        {
          title: '360° INTERATION',
          description: 'Gire, amplie e explore em todas as direções',
          icon: '🌀',
          rotation: 'xyz'
        },
        {
          title: 'AUGMENTED REALITY',
          description: 'Sobreposição digital no mundo real',
          icon: '👁️',
          ar: true
        },
        {
          title: 'HAPTIC FEEDBACK',
          description: 'Sinta a interface mesmo sem tocar',
          icon: '✋',
          vibration: true
        },
        {
          title: 'VOICE COMMAND',
          description: 'Controle por comando de voz',
          icon: '🎤',
          voice: true
        }
      ],
      backgroundColor: 'rgba(0,0,0,0.8)',
      hologramEffect: true,
      enabled: true
    },
    {
      id: 'holo-demo',
      type: 'demo',
      title: 'DEMONSTRAÇÃO HOLOGRÁFICA',
      subtitle: 'Use seu mouse para interagir',
      holographicObject: {
        type: 'product-3d',
        rotationSpeed: 'interactive',
        zoom: true,
        materials: ['glass', 'metal', 'neon'],
        lighting: ['ambient', 'spot', 'point']
      },
      controls: ['rotate', 'zoom', 'material', 'lighting'],
      backgroundColor: 'rgba(10,10,30,0.9)',
      enableVR: false,
      enabled: true
    },
    {
      id: 'holo-cta',
      type: 'cta',
      title: 'PROJETAR MEU HOLOGRAMA',
      content: 'Clique para materializar sua visão.',
      buttonText: 'INICIAR PROJEÇÃO',
      buttonLink: '#contact',
      buttonStyle: 'holographic',
      backgroundColor: 'transparent',
      glowEffect: 'pulse',
      floatEffect: true,
      enabled: true
    }
  ]
};

export async function initPremiumTemplates() {
  const templates = [
    { id: 'neumorphic-modern', data: neumorphicModernTemplate },
    { id: 'cyberpunk-2077', data: cyberpunkTemplate },
    { id: 'biophilic-design', data: biophilicTemplate },
    { id: 'brutalist-minimal', data: brutalistMinimalTemplate },
    { id: 'kinetic-typography', data: kineticTypographyTemplate },
    { id: 'holographic-interface', data: holographicTemplate }
  ];

  for (const template of templates) {
    const templateRef = db.collection('templates').doc(template.id);
    await templateRef.set(template.data);
    console.log(`✨ Template "${template.data.name}" criado com efeitos especiais!`);
  }

  console.log('🚀 Todos os 6 templates premium foram implantados!');
  console.log('🎮 Características únicas incluídas:');
  console.log('   • Efeitos Neumórficos 3D');
  console.log('   • Glitch Cyberpunk');
  console('   • Animação Orgânica de Natureza');
  console.log('   • Interface Brutalista Raw');
  console.log('   • Tipografia Cinética');
  console.log('   • Hologramas Interativos');
}

initPremiumTemplates().catch(console.error);