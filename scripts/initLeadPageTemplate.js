import { config } from 'dotenv';
config({ path: '.env.local' });
import admin from 'firebase-admin';
import initFirestore from '../api/_lib/firebaseAdmin.cjs';

const db = initFirestore();

// TEMPLATE 1: CINEMA VERITÉ (Documentário Interativo)
const cinemaVeriteTemplate = {
  id: 'cinema-verite',
  name: 'Cinema Vérité - Documentário em Tempo Real',
  sections: [
    {
      id: 'film-reel',
      type: 'cinematic',
      title: 'ROLO 01: O CLIENTE',
      subtitle: 'FILMANDO EM 16MM',
      content: 'Câmera na mão. Verdade crua. Esta não é uma página, é um documentário sobre seu negócio.',
      buttonText: 'INICIAR PROJEÇÃO',
      buttonLink: '#reel1',
      backgroundColor: '#1a1a1a',
      filmGrain: true,
      aspectRatio: '4:3',
      director: 'DIRETOR: SEU NOME',
      year: '2024',
      enabled: true,
      uniqueElements: {
        projectorSound: true,
        filmScratches: 'random',
        vintageLens: 'anamorphic',
        colorGrade: 'kodak2383'
      }
    },
    {
      id: 'scene-interview',
      type: 'documentary',
      title: 'CENA 02: DEPOIMENTO CRUA',
      layout: 'interview-room',
      subject: {
        name: 'JOÃO, 34 ANOS',
        problem: 'Perdendo R$15.000/mês com páginas que não convertem',
        emotion: 'Frustrado',
        setting: 'Escritório vazio, 3h da manhã'
      },
      questions: [
        'O que dói mais?',
        'Quando percebeu o problema?',
        'O que tentou fazer?',
        'Por que nada funcionou?'
      ],
      backgroundColor: '#0a0a0a',
      lighting: 'single-bulb',
      audio: 'room-tone',
      enabled: true
    },
    {
      id: 'montage-sequence',
      type: 'montage',
      title: 'SEQUÊNCIA DE MONTAGEM',
      technique: 'jump-cuts',
      scenes: [
        {
          time: '00:00:01',
          shot: 'Close-up das mãos tremendo',
          audio: 'tick-tock-clock'
        },
        {
          time: '00:00:03',
          shot: 'Tela do computador piscando',
          audio: 'keyboard-frustration'
        },
        {
          time: '00:00:05',
          shot: 'Pilha de contratos não assinados',
          audio: 'paper-rustle'
        },
        {
          time: '00:00:07',
          shot: 'Relógio marcando 3:47 AM',
          audio: 'heartbeat-fast'
        }
      ],
      backgroundColor: '#000000',
      editingStyle: 'french-new-wave',
      enabled: true
    },
    {
      id: 'resolution-credits',
      type: 'cta',
      title: 'FINAL CUT',
      subtitle: 'DIREÇÃO: VOCÊ',
      content: 'Esta é a última cena do seu fracasso. O próximo frame é sua redenção.',
      buttonText: 'GRAVAR O FINAL FELIZ',
      buttonLink: '#contact',
      buttonStyle: 'clapperboard',
      backgroundColor: '#1a1a1a',
      creditRoll: true,
      filmEnd: true,
      enabled: true
    }
  ]
};

// TEMPLATE 2: ALQUIMIA MEDIEVAL (Manuscrito Iluminado)
const alchemyTemplate = {
  id: 'alchemy-manuscript',
  name: 'Alquimia Medieval - Pergaminho Digital',
  sections: [
    {
      id: 'vellum-scroll',
      type: 'manuscript',
      title: '📜 ARS CONVERTENDI 📜',
      subtitle: 'O Grande Livro das Transformações Digitais',
      content: 'Assim como os alquimistas buscavam transformar chumbo em ouro, nós transformamos visitantes em ouro.',
      buttonText: 'DESENROLAR PERGAMINHO',
      buttonLink: '#scroll',
      backgroundColor: '#f5e9d4',
      material: 'aged-vellum',
      inkType: 'iron-gall',
      illumination: 'gold-leaf',
      marginalia: true,
      uniqueElements: {
        waxSeal: true,
        dragonIllustrations: 3,
        secretSymbols: ['☉', '☿', '♁'],
        alchemicalProcess: 'solve-et-coagula'
      }
    },
    {
      id: 'recipe-transmutation',
      type: 'alchemical',
      title: 'RECEITA SECRETA',
      subtitle: 'Fórmula para Conversão Aurífera',
      ingredients: [
        {
          name: 'Visitatio Mercurius',
          amount: '1000 partes',
          purpose: 'Base volátil'
        },
        {
          name: 'Intentio Saturni',
          amount: '7 gotas',
          purpose: 'Estrutura e disciplina'
        },
        {
          name: 'Cliccus Lunae',
          amount: '1 medida',
          purpose: 'Ação intuitiva'
        },
        {
          name: 'Conversio Solis',
          amount: '3 gramas',
          purpose: 'Transformação final'
        }
      ],
      procedure: [
        'Macerar visitantes em atenção pura',
        'Destilar através do funil de valor',
        'Sublimar com urgência controlada',
        'Coagular em compromisso firme'
      ],
      backgroundColor: '#ede0c9',
      apparatus: ['alembic', 'athanor', 'crucible'],
      warning: 'NOLI TANGERE CIRCLOS',
      enabled: true
    },
    {
      id: 'bestiary-clients',
      type: 'bestiary',
      title: 'BESTIÁRIO DOS CLIENTES',
      layout: 'illuminated-margins',
      creatures: [
        {
          name: 'Draco Negotiatus',
          description: 'Serpente alada que guarda tesouros de conversão',
          habitat: 'Landing pages antigas',
          weakness: 'Call-to-action claro',
          illustration: 'dragon-with-coin'
        },
        {
          name: 'Phoenix Convertens',
          description: 'Ave que renasce das cinzas do abandono de carrinho',
          habitat: 'Emails de recuperação',
          power: 'Ressurreição de vendas perdidas',
          illustration: 'phoenix-rising'
        },
        {
          name: 'Unicornis Fidelis',
          description: 'Criatura mítica de retenção eterna',
          habitat: 'Programas de fidelidade',
          rarity: 'Único no reino digital',
          illustration: 'unicorn-loyalty'
        }
      ],
      backgroundColor: '#f0e6d0',
      artisticStyle: 'gothic-illumination',
      hiddenMeanings: true,
      enabled: true
    },
    {
      id: 'alchemical-cta',
      type: 'cta',
      title: 'O ÚLTIMO PASSO DA OBRA',
      subtitle: 'A Grande Obra espera',
      content: 'Assine abaixo com sua própria tinta. O pacto está feito.',
      buttonText: 'ASSINAR COM SANGUE DE DRAGÃO',
      buttonLink: '#contact',
      buttonStyle: 'wax-seal',
      backgroundColor: '#d4c4a8',
      requiresOath: true,
      alchemicalCircle: true,
      enabled: true
    }
  ]
};

// TEMPLATE 3: SONHO LÚCIDO (Interface Onírica)
const lucidDreamTemplate = {
  id: 'lucid-dream',
  name: 'Sonho Lúcido - Navegação Onírica',
  sections: [
    {
      id: 'dream-beginning',
      type: 'dreamscape',
      title: '🎭 VOCÊ ESTÁ SONHANDO? 🎭',
      subtitle: 'Reconheça os sinais:',
      realityChecks: [
        'As cores são muito vibrantes?',
        'O tempo passa diferente?',
        'Você pode ler este texto duas vezes?',
        'Consegue flutuar se tentar?'
      ],
      instruction: 'PISCAR DUAS VEZES PARA TOMAR CONTROLE',
      buttonText: 'TORNAR-SE LÚCIDO',
      buttonLink: '#control',
      backgroundColor: '#2a0033',
      dreamState: 'hypnagogic',
      realityDistortion: 0.7,
      uniqueElements: {
        dreamPhysics: true,
        timeDilation: 'variable',
        falseAwakenings: 3,
        dreamCharacters: ['gatekeeper', 'mentor', 'shadow']
      }
    },
    {
      id: 'dream-control',
      type: 'lucid',
      title: 'CONTROLE ONÍRICO ATIVADO',
      dreamPowers: [
        {
          power: 'TELEPINESE DIGITAL',
          description: 'Mover elementos com a mente',
          activation: 'Olhar fixo por 3 segundos'
        },
        {
          power: 'CRIAÇÃO MANIFESTA',
          description: 'Materializar seus desejos de conversão',
          activation: 'Respiração controlada'
        },
        {
          power: 'NEXUS TEMPORAL',
          description: 'Acelerar o tempo até o resultado',
          activation: 'Piscar em código morse'
        }
      ],
      backgroundColor: '#1a0022',
      stability: 'maintaining',
      clarity: 85,
      danger: 'REM wakeup imminent',
      enabled: true
    },
    {
      id: 'dream-quest',
      type: 'quest',
      title: 'MISSÃO ONÍRICA',
      objective: 'ENCONTRAR O CRISTAL DE CONVERSÃO',
      dreamLandscape: 'floating-islands',
      challenges: [
        {
          location: 'Floresta de Dados Emaranhados',
          obstacle: 'Labirinto de analytics confusos',
          solution: 'Seguir o fio de cliques dourados'
        },
        {
          location: 'Oceano de Distrações',
          obstacle: 'Sereias das redes sociais',
          solution: 'Tapar ouvidos com foco puro'
        },
        {
          location: 'Montanha da Dúvida',
          obstacle: 'Nevasca de "e-se"',
          solution: 'Escalar com corda de confiança'
        }
      ],
      backgroundColor: '#330044',
      navigation: 'dream-compass',
      timeLimit: 'before-wakeup',
      enabled: true
    },
    {
      id: 'dream-awakening',
      type: 'cta',
      title: 'O DESPERTAR',
      subtitle: 'Mas qual realidade escolher?',
      choices: [
        'ACORDAR NO MUNDO ANTIGO (sem resultados)',
        'PERMANECER NO SONHO LÚCIDO (com controle total)'
      ],
      buttonText: 'ESCOLHER REALIDADE PERMANENTE',
      buttonLink: '#contact',
      buttonStyle: 'reality-portal',
      backgroundColor: '#000011',
      liminalSpace: true,
      realityMerge: true,
      enabled: true
    }
  ]
};

// TEMPLATE 4: MECANISMO DE RELÓGIO (Engrenagem Precisionista)
const clockworkTemplate = {
  id: 'clockwork-mechanism',
  name: 'Mecanismo de Relógio - Engrenagens Perfeitas',
  sections: [
    {
      id: 'main-spring',
      type: 'horological',
      title: '⚙️ SISTEMA PRECISIONISTA ⚙️',
      subtitle: 'Cada visita é uma engrenagem. Cada clique é um dente.',
      content: 'Precisão suíça aplicada à conversão. Tolerância zero para ineficiência.',
      buttonText: 'DAR CORDA AO SISTEMA',
      buttonLink: '#wind',
      backgroundColor: '#e8e5de',
      movement: 'mechanical',
      jewels: 17,
      accuracy: '+2/-1 seconds per day',
      uniqueElements: {
        tourbillon: true,
        mainspringTension: 'optimal',
        gearTeeth: '28800 vph',
        escapement: 'swiss-lever'
      }
    },
    {
      id: 'gear-system',
      type: 'mechanical',
      title: 'TRANSMISSÃO DE FORÇA',
      layout: 'exploded-view',
      gears: [
        {
          name: 'Roda de Visitas',
          teeth: 60,
          function: 'Captação inicial',
          material: 'brushed-steel',
          connectsTo: 'Roda de Atenção'
        },
        {
          name: 'Roda de Atenção',
          teeth: 48,
          function: 'Retenção focal',
          material: 'polished-brass',
          connectsTo: 'Roda de Interesse'
        },
        {
          name: 'Roda de Interesse',
          teeth: 36,
          function: 'Engajamento profundo',
          material: 'black-dlc',
          connectsTo: 'Roda de Conversão'
        },
        {
          name: 'Roda de Conversão',
          teeth: 24,
          function: 'Transformação final',
          material: 'rose-gold',
          connectsTo: 'Eixo do Resultado'
        }
      ],
      backgroundColor: '#f0ede6',
      lubrication: 'synthetic-dry',
      powerReserve: '72 hours',
      enabled: true
    },
    {
      id: 'complications',
      type: 'complication',
      title: 'COMPLICAÇÕES',
      subtitle: 'Funções além da hora',
      features: [
        {
          name: 'CRONÓGRAFO DE CONVERSÃO',
          function: 'Mede tempo até a venda',
          accuracy: '1/10th second',
          activation: 'single pusher'
        },
        {
          name: 'MOONPHASE DO ENGAGEMENT',
          function: 'Mostra ciclo ideal de publicação',
          cycle: '29.5 days',
          display: 'aperture'
        },
        {
          name: 'PERPETUAL CALENDAR',
          function: 'Ajusta automaticamente campanhas',
          correction: 'Until 2100',
          mechanism: 'program-wheel'
        },
        {
          name: 'MINUTE REPEATER',
          function: 'Sinaliza leads qualificados',
          chime: 'westminster',
          activation: 'slide'
        }
      ],
      backgroundColor: '#e6e2d9',
      craftsmanship: 'hand-finished',
      decoration: 'côtes de genève',
      enabled: true
    },
    {
      id: 'winding-cta',
      type: 'cta',
      title: 'HORA DE SINCRONIZAR',
      subtitle: 'Seu relógio está atrasado',
      content: 'Ajuste o ponteiro para o momento exato da mudança.',
      buttonText: 'SINCRONIZAR AGORA',
      buttonLink: '#contact',
      buttonStyle: 'crown-winding',
      backgroundColor: '#d4d0c5',
      requiresWinding: true,
      timing: 'atomic-clock-sync',
      enabled: true
    }
  ]
};

// TEMPLATE 5: MANIFESTO ANARQUISTA (Tipografia Revolucionária)
const anarchistManifestoTemplate = {
  id: 'anarchist-manifesto',
  name: 'Manifesto Anarquista - Tipografia Revolucionária',
  sections: [
    {
      id: 'manifesto-declaration',
      type: 'revolutionary',
      title: '¡BASTA!',
      subtitle: 'MANIFIESTO CONTRA EL DISEÑO CONVENCIONAL',
      content: 'Las páginas de aterrizaje son cárceles de creatividad. Rompamos las cadenas.',
      buttonText: '¡UNIRSE A LA REVOLUCIÓN!',
      buttonLink: '#revolution',
      backgroundColor: '#000000',
      paperType: 'newsprint-torn',
      ink: 'soot-and-blood',
      printingMethod: 'guerrilla-stencil',
      uniqueElements: {
        censorshipMarks: true,
        protestStickers: 7,
        undergroundNewspaper: true,
        revolutionarySymbols: ['⚑', '✊', '⚒']
      }
    },
    {
      id: 'demands-list',
      type: 'demands',
      title: 'NUESTRAS EXIGENCIAS',
      layout: 'wheatpaste-wall',
      demands: [
        {
          demand: 'ABOLICIÓN DEL FOLD',
          reason: 'La pantalla no tiene límites',
          action: 'Scroll infinito, pensamiento infinito'
        },
        {
          demand: 'EXPROPIACIÓN DE WHITESPACE',
          reason: 'El vacío es privilegio burgués',
          action: 'Llenar cada pixel con significado'
        },
        {
          demand: 'AUTOGESTIÓN DE CONTENIDO',
          reason: 'El usuario es el verdadero diseñador',
          action: 'Interfaces que se reescriben solas'
        },
        {
          demand: 'INTERNACIONALISMO TIPOGRÁFICO',
          reason: 'Las fuentes no tienen fronteras',
          action: 'Mezclar helvetica con jeroglíficos'
        }
      ],
      backgroundColor: '#111111',
      wallTexture: 'brick-graffiti',
      policeSirens: 'distant',
      enabled: true
    },
    {
      id: 'propaganda-poster',
      type: 'propaganda',
      title: '¡PROPAGANDA DE CONVERSIÓN!',
      style: 'constructivist',
      elements: [
        {
          type: 'bold-diagonal',
          text: 'CADA CLICK',
          angle: 45,
          color: 'red'
        },
        {
          type: 'starburst',
          text: 'ES UNA BALA',
          position: 'center',
          effect: 'radiate'
        },
        {
          type: 'worker-silhouette',
          action: 'apuntando al CTA',
          dynamic: true
        },
        {
          type: 'industrial-gear',
          function: 'moliendo visitantes',
          rotation: 'continuous'
        }
      ],
      backgroundColor: '#220000',
      paperCondition: 'aged-propaganda',
      urgency: 'maximum',
      enabled: true
    },
    {
      id: 'revolutionary-cta',
      type: 'cta',
      title: '¡EL PUEBLO EXIGE CONVERSIÓN!',
      subtitle: 'No pidas permiso. Toma acción.',
      content: 'Este botón no es un botón. Es un acto de rebelión digital.',
      buttonText: '¡TOMAR EL PODER AHORA!',
      buttonLink: '#contact',
      buttonStyle: 'molotov-button',
      backgroundColor: '#000000',
      sounds: ['crowd-chanting', 'breaking-glass'],
      revolutionPhase: 'final-stages',
      enabled: true
    }
  ]
};

// TEMPLATE 6: MICROBIOMA DIGITAL (Organismo Vivo)
const microbiomeTemplate = {
  id: 'digital-microbiome',
  name: 'Microbioma Digital - Organismo Vivo de Página',
  sections: [
    {
      id: 'petri-dish',
      type: 'microscopic',
      title: '🧫 CULTIVO INICIAL 🧫',
      subtitle: 'Colônia: Visitantes sazonais',
      content: 'Observando sob aumento 400x. Note os padrões de navegação.',
      buttonText: 'INOCULAR MEIO DE CULTURA',
      buttonLink: '#culture',
      backgroundColor: '#f8f8f8',
      magnification: '400x',
      stain: 'gram-positive',
      agarType: 'blood-agar',
      uniqueElements: {
        liveCulture: true,
        bacterialColonies: 'growing',
        microscopeLight: 'kohler',
        incubationTemp: '37°C'
      }
    },
    {
      id: 'culture-growth',
      type: 'biological',
      title: 'CRESCIMENTO EXPONENCIAL',
      strain: 'CONVERSIO MAXIMA',
      growthPhases: [
        {
          phase: 'Lag (0-2h)',
          activity: 'Aclimatação ao ambiente',
          colonies: 12
        },
        {
          phase: 'Log (2-24h)',
          activity: 'Divisão celular explosiva',
          colonies: 10_000
        },
        {
          phase: 'Stationary (1-7d)',
          activity: 'Equilíbrio simbiótico',
          colonies: 1_000_000
        },
        {
          phase: 'Conversion (7d+)',
          activity: 'Metabolismo de leads',
          colonies: 'exponential'
        }
      ],
      backgroundColor: '#f0f0f0',
      nutrients: ['glucose', 'nitrogen', 'attention-traces'],
      inhibitors: ['bounce-rate', 'distraction-toxins'],
      enabled: true
    },
    {
      id: 'symbiotic-ecosystem',
      type: 'ecosystem',
      title: 'ECOSSISTEMA SIMBIÓTICO',
      microorganisms: [
        {
          species: 'CLICKUS PRIMARIUS',
          role: 'Conversor primário',
          habitat: 'Botões principais',
          reproduction: 'Binary fission on hover'
        },
        {
          species: 'SCROLLUS PROFUNDUS',
          role: 'Engajador de profundidade',
          habitat: 'Página abaixo do fold',
          behavior: 'Migratory patterns follow cursor'
        },
        {
          species: 'SHARUS VIRALIS',
          role: 'Transmissor social',
          habitat: 'Botões de compartilhamento',
          spreadRate: 'R0 = 3.4'
        },
        {
          species: 'CONVERSIO TERMINALIS',
          role: 'Transformador final',
          habitat: 'Formulários de contato',
          lifeCycle: 'Complete upon submission'
        }
      ],
      backgroundColor: '#e8e8e8',
      ecosystemBalance: 'delicate',
      mutualism: 'total',
      enabled: true
    },
    {
      id: 'inoculation-cta',
      type: 'cta',
      title: 'INOCULAR SEU PRÓPRIO CULTIVO',
      subtitle: 'Estéril não é natural',
      content: 'Introduza seus visitantes no nosso meio de cultura perfeito.',
      buttonText: 'INICIAR INFECÇÃO CONTROLADA',
      buttonLink: '#contact',
      buttonStyle: 'pipette-drop',
      backgroundColor: '#f5f5f5',
      labConditions: 'sterile',
      growthGuarantee: '100% culture-take',
      enabled: true
    }
  ]
};

export async function initRadicalTemplates() {
  const templates = [
    { id: 'cinema-verite', data: cinemaVeriteTemplate },
    { id: 'alchemy-manuscript', data: alchemyTemplate },
    { id: 'lucid-dream', data: lucidDreamTemplate },
    { id: 'clockwork-mechanism', data: clockworkTemplate },
    { id: 'anarchist-manifesto', data: anarchistManifestoTemplate },
    { id: 'digital-microbiome', data: microbiomeTemplate }
  ];

  for (const template of templates) {
    const templateRef = db.collection('templates').doc(template.id);
    await templateRef.set(template.data);
    console.log(`🎬 Template "${template.data.name}" criado - Gênero Único!`);
  }

  console.log('\n🎭 TEMPLATES RADICALMENTE DIFERENTES CRIADOS:');
  console.log('1. 🎥 Cinema Vérité - Documentário interativo estilo anos 70');
  console.log('2. 📜 Alquimia Medieval - Manuscrito iluminado com receitas secretas');
  console.log('3. 💭 Sonho Lúcido - Interface que questiona a própria realidade');
  console.log('4. ⚙️  Mecanismo de Relógio - Precisão suíça em engrenagens digitais');
  console.log('5. ⚑ Manifesto Anarquista - Propaganda revolucionária tipográfica');
  console.log('6. 🧫 Microbioma Digital - Página como organismo vivo em crescimento');
  
  console.log('\n🚨 CARACTERÍSTICAS ABSOLUTAMENTE ÚNICAS:');
  console.log('• Cada template tem sua própria linguagem visual e conceitual');
  console.log('• Zero elementos compartilhados entre templates');
  console.log('• Metáforas completamente distintas');
  console.log('• Interações únicas para cada um');
  console.log('• Narrativas não-repetidas');
  console.log('• Referências culturais específicas por template');
}

initRadicalTemplates().catch(console.error);