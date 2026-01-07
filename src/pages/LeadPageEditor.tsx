import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getUserLeadPage, getTemplate, getAllTemplates, saveUserLeadPage, updateLeadPageSection, getLeadPageStats, calculateLeadPageMetrics } from '../utils/leadpage';
import { addVercelDomain, checkVercelDomain } from '../utils/vercel';
import type { LeadPageTemplate, UserLeadPage, LeadPageSection } from '../types/leadpage';
import { 
  Eye, 
  ArrowLeft, 
  Palette, 
  CheckCircle, 
  X, 
  Upload, 
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Image as ImageIcon,
  Link as LinkIcon,
  Bold,
  AlignLeft,
  Layout,
  Share,
  Globe
} from 'lucide-react';
import { uploadToCloudinary } from '../utils/cloudinary';

const getFieldPlaceholder = (field: string): string => {
  switch (field) {
    case 'buttonLink':
      return 'link';
    case 'title':
      return 'título';
    case 'content':
      return 'conteúdo';
    case 'buttonText':
      return 'texto do botão';
    case 'subtitle':
      return 'subtítulo';
    default:
      return field.toLowerCase();
  }
};

const renderPreviewSection = (section: LeadPageSection, userLeadPage: UserLeadPage | null) => {
  const custom = userLeadPage?.customData?.[section.id] || {};
  const merged = { ...section, ...custom };
  if (merged.enabled === false) return null; // Only hide if explicitly set to false

  switch (merged.type) {
    case 'hero':
      if (merged.stats) {
        return (
          <section className="relative min-h-[400px] flex items-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 text-white overflow-hidden">
            {merged.image && (
              <div className="absolute inset-0">
                <img src={merged.image} alt="Hero Background" className="w-full h-full object-cover opacity-20" />
                <div className="absolute inset-0 bg-black bg-opacity-40"></div>
              </div>
            )}
            <div className="relative z-10 container mx-auto px-4 py-8">
              <div className="max-w-4xl mx-auto text-center">
                {merged.subtitle && (
                  <p className="text-base md:text-lg mb-2 text-blue-200 font-light">{merged.subtitle}</p>
                )}
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-black mb-3 leading-tight">{merged.title}</h1>
                <p className="text-base md:text-lg mb-4 max-w-3xl mx-auto text-blue-100">{merged.content}</p>

                {merged.stats && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {merged.stats.map((stat: string, idx: number) => (
                      <div key={idx} className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-3 border border-white border-opacity-20">
                        <div className="text-xl md:text-2xl font-bold text-white">{stat.split(' ')[0]}</div>
                        <div className="text-blue-200 text-xs mt-1">{stat.split(' ').slice(1).join(' ')}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2 justify-center items-center">
                  <a href={merged.buttonLink} className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-full font-bold text-sm transition-all transform hover:scale-105 shadow-2xl">
                    {merged.buttonText}
                  </a>
                  {merged.urgencyText && (
                    <div className="text-red-300 font-semibold animate-pulse text-xs">
                      {merged.urgencyText}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        );
      }
      return (
        <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12">
          <div className="container mx-auto text-center px-4">
            <h1 className="text-2xl md:text-3xl font-bold mb-3">{merged.title}</h1>
            <p className="text-base mb-4 max-w-2xl mx-auto">{merged.content}</p>
            {merged.image && <img src={merged.image} alt="Hero" className="mx-auto mb-4 rounded-lg shadow-lg max-w-xs" />}
            <a href={merged.buttonLink} className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition inline-block text-sm">
              {merged.buttonText}
            </a>
          </div>
        </section>
      );

    case 'about':
      return (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">{merged.title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {merged.items?.map((item: unknown, idx: number) => (
                <div key={idx} className="text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-700">{typeof item === 'string' ? item : (item as any).title || item}</p>
                </div>
              ))}
            </div>
            {merged.image && (
              <img
                src={merged.image}
                alt="Benefits"
                className="mx-auto mt-12 rounded-lg shadow-lg max-w-md"
              />
            )}
          </div>
        </section>
      );

    case 'social-proof':
      if ((merged.items?.[0] as any)?.video) {
        return (
          <section className="py-12 bg-gray-50">
            <div className="container mx-auto px-4">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{merged.title}</h2>
                {merged.subtitle && <p className="text-lg text-gray-600">{merged.subtitle}</p>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {merged.items?.map((item: unknown, idx: number) => (
                  <div key={idx} className="bg-white rounded-lg shadow-md p-4">
                    <div className="flex items-center mb-3">
                      <img src={(item as any).image} alt={(item as any).name} className="w-10 h-10 rounded-full mr-3" />
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">{(item as any).name}</h4>
                        <p className="text-gray-600 text-xs">{(item as any).location}</p>
                      </div>
                    </div>
                    <p className="text-gray-700 text-sm mb-3">{(item as any).text}</p>
                    <div className="flex items-center text-yellow-500">
                      {Array.from({ length: 5 }, (_, i) => (
                        <span key={i} className="text-lg">★</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      }
      return (
        <section className="py-12 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{merged.title}</h2>
              {merged.subtitle && <p className="text-lg text-gray-600">{merged.subtitle}</p>}
            </div>
            <div className="flex justify-center">
              <div className="bg-white rounded-lg shadow-md p-6 max-w-md">
                <div className="flex items-center mb-4">
                  <img src={(merged.items?.[0] as any)?.image} alt={(merged.items?.[0] as any)?.name} className="w-12 h-12 rounded-full mr-4" />
                  <div>
                    <h4 className="font-bold text-gray-900">{(merged.items?.[0] as any)?.name}</h4>
                    <p className="text-gray-600 text-sm">{(merged.items?.[0] as any)?.location}</p>
                  </div>
                </div>
                <p className="text-gray-700 mb-4">{(merged.items?.[0] as any)?.text}</p>
                <div className="flex items-center text-yellow-500 mb-4">
                  {Array.from({ length: 5 }, (_, i) => (
                    <span key={i} className="text-lg">★</span>
                  ))}
                </div>
                <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition">
                  {merged.buttonText}
                </button>
              </div>
            </div>
          </div>
        </section>
      );

    case 'benefits':
      return (
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">{merged.title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {merged.items?.map((item: unknown, idx: number) => (
                <div key={idx} className="text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{(item as any).title}</h3>
                  <p className="text-gray-700">{(item as any).description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      );

    case 'cta':
      return (
        <section className="py-16 bg-blue-600 text-white">
          <div className="container mx-auto text-center px-4">
            <h2 className="text-3xl font-bold mb-4">{merged.title}</h2>
            <p className="text-lg mb-8 max-w-2xl mx-auto">{merged.content}</p>
            <a href={merged.buttonLink} className="bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-3 rounded-lg font-bold text-lg transition-all transform hover:scale-105 shadow-2xl inline-block">
              {merged.buttonText}
            </a>
          </div>
        </section>
      );

    case 'cinematic':
      return (
        <section className="relative min-h-[400px] flex items-center bg-black text-white overflow-hidden" style={{ backgroundColor: merged.backgroundColor || '#1a1a1a' }}>
          {merged.filmGrain && (
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
              backgroundSize: '100px 100px'
            }}></div>
          )}
          <div className="relative z-10 container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto text-center">
              {merged.subtitle && (
                <p className="text-sm mb-2 text-gray-400 font-mono uppercase tracking-wider">{merged.subtitle}</p>
              )}
              <h1 className="text-2xl md:text-4xl font-black mb-4 leading-tight" style={{ fontFamily: 'Courier New, monospace' }}>{merged.title}</h1>
              <p className="text-base md:text-lg mb-6 max-w-3xl mx-auto text-gray-300">{merged.content}</p>
              {merged.director && (
                <p className="text-xs text-gray-500 mb-4 font-mono">{merged.director}</p>
              )}
              {merged.year && (
                <p className="text-xs text-gray-500 mb-6 font-mono">{merged.year}</p>
              )}
              <a href={merged.buttonLink} className="bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded font-bold text-lg transition-all transform hover:scale-105 shadow-2xl inline-block border-2 border-red-500">
                {merged.buttonText}
              </a>
            </div>
          </div>
        </section>
      );

    case 'documentary':
      return (
        <section className="py-16 bg-gray-900 text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold mb-8 text-center text-white">{merged.title}</h2>
              {merged.subject && (
                <div className="bg-gray-800 rounded-lg p-6 mb-8">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center mr-4">
                      <span className="text-white font-bold">{(merged.subject as any).name?.charAt(0)}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{(merged.subject as any).name}</h3>
                      <p className="text-gray-400 text-sm">{(merged.subject as any).emotion} • {(merged.subject as any).setting}</p>
                    </div>
                  </div>
                  <p className="text-gray-300 mb-4">{(merged.subject as any).problem}</p>
                  {merged.questions && (
                    <div className="space-y-2">
                      {merged.questions.map((question: string, idx: number) => (
                        <p key={idx} className="text-yellow-400 font-semibold">• {question}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      );

    case 'montage':
      return (
        <section className="py-16 bg-gradient-to-r from-purple-900 to-blue-900 text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-12">{merged.title}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {merged.clips?.map((clip: any, idx: number) => (
                  <div key={idx} className="bg-black bg-opacity-50 rounded-lg p-4 border border-white border-opacity-20">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-2xl">🎬</span>
                      </div>
                      <h3 className="font-semibold mb-2">{clip.title}</h3>
                      <p className="text-sm text-gray-300">{clip.description}</p>
                      <p className="text-xs text-gray-500 mt-2">{clip.duration}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      );

    case 'manuscript':
      return (
        <section className="py-16 bg-yellow-50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg shadow-2xl p-8 border-4 border-yellow-800" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23f59e0b' fill-opacity='0.1'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`,
                fontFamily: 'serif'
              }}>
                <h2 className="text-2xl font-bold text-center mb-6 text-yellow-900" style={{ fontFamily: 'serif' }}>{merged.title}</h2>
                <div className="text-lg leading-relaxed text-gray-800 whitespace-pre-line" style={{ fontFamily: 'serif' }}>
                  {merged.content}
                </div>
                {merged.signature && (
                  <div className="mt-8 text-right">
                    <p className="text-lg italic text-yellow-800" style={{ fontFamily: 'serif' }}>{merged.signature}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      );

    case 'alchemical':
      return (
        <section className="py-16 bg-gradient-to-b from-purple-900 via-indigo-900 to-black text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto text-center">
              <h2 className="text-4xl font-bold mb-8 text-yellow-400" style={{ fontFamily: 'serif' }}>{merged.title}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                {merged.elements?.map((element: any, idx: number) => (
                  <div key={idx} className="bg-gray-800 bg-opacity-50 rounded-lg p-6 border border-yellow-500 border-opacity-50">
                    <div className="text-4xl mb-4">{element.symbol}</div>
                    <h3 className="text-xl font-semibold mb-2 text-yellow-400">{element.name}</h3>
                    <p className="text-gray-300">{element.description}</p>
                  </div>
                ))}
              </div>
              <div className="bg-yellow-600 bg-opacity-20 rounded-lg p-8 border-2 border-yellow-500">
                <h3 className="text-2xl font-bold mb-4 text-yellow-400">A Transmutação</h3>
                <p className="text-lg text-gray-200">{merged.transmutation}</p>
              </div>
            </div>
          </div>
        </section>
      );

    case 'bestiary':
      return (
        <section className="py-16 bg-gradient-to-r from-green-900 to-teal-900 text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-12">{merged.title}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {merged.creatures?.map((creature: any, idx: number) => (
                  <div key={idx} className="bg-black bg-opacity-50 rounded-lg p-6 border border-green-500 border-opacity-50">
                    <div className="flex items-center mb-4">
                      <div className="text-4xl mr-4">{creature.icon}</div>
                      <div>
                        <h3 className="text-xl font-semibold text-green-400">{creature.name}</h3>
                        <p className="text-sm text-gray-400">{creature.type}</p>
                      </div>
                    </div>
                    <p className="text-gray-300 mb-4">{creature.description}</p>
                    <div className="text-sm">
                      <strong className="text-green-400">Habilidades:</strong> {creature.abilities?.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      );

    case 'dreamscape':
      return (
        <section className="py-16 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full opacity-10 animate-pulse"></div>
            <div className="absolute top-32 right-20 w-24 h-24 bg-yellow-400 rounded-full opacity-10 animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute bottom-20 left-1/4 w-20 h-20 bg-pink-400 rounded-full opacity-10 animate-pulse" style={{ animationDelay: '2s' }}></div>
          </div>
          <div className={`relative z-10 container mx-auto px-4`}>
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-pink-400">{merged.title}</h2>
              <p className="text-xl mb-8 text-gray-200">{merged.content}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {merged.dreamElements?.map((element: any, idx: number) => (
                  <div key={idx} className="bg-white bg-opacity-10 rounded-lg p-4 backdrop-blur-sm">
                    <div className="text-3xl mb-2">{element.icon}</div>
                    <h3 className="font-semibold text-yellow-400">{element.title}</h3>
                    <p className="text-sm text-gray-300">{element.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      );

    case 'lucid':
      return (
        <section className="py-16 bg-black text-white">
          <div className={`container mx-auto px-4`}>
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">{merged.title}</h2>
                <p className="text-lg text-gray-300">{merged.content}</p>
              </div>
              <div className="bg-gray-900 rounded-lg p-8 border border-cyan-500 border-opacity-50">
                <h3 className="text-2xl font-semibold mb-6 text-cyan-400 text-center">Controle dos Sonhos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {merged.lucidControls?.map((control: any, idx: number) => (
                    <div key={idx} className="text-center">
                      <div className="text-3xl mb-2">{control.icon}</div>
                      <h4 className="font-semibold text-cyan-400 mb-2">{control.title}</h4>
                      <p className="text-sm text-gray-300">{control.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      );

    case 'quest':
      return (
        <section className="py-16 bg-gradient-to-r from-orange-900 to-red-900 text-white">
          <div className={`container mx-auto px-4`}>
            <div className="max-w-6xl mx-auto">
              <h2 className="text-4xl font-bold text-center mb-12">{merged.title}</h2>
              <div className="bg-black bg-opacity-50 rounded-lg p-8 border-2 border-yellow-500 mb-8">
                <h3 className="text-2xl font-semibold mb-4 text-yellow-400 text-center">A Jornada do Herói</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {merged.questStages?.map((stage: any, idx: number) => (
                    <div key={idx} className="text-center">
                      <div className="text-4xl mb-3">{stage.icon}</div>
                      <h4 className="font-bold text-yellow-400 mb-2">{stage.title}</h4>
                      <p className="text-sm text-gray-300">{stage.description}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-center">
                <p className="text-xl text-gray-200 mb-6">{merged.callToAdventure}</p>
                <a href={merged.buttonLink} className="bg-yellow-600 hover:bg-yellow-500 text-black px-8 py-4 rounded-lg font-bold text-lg transition-all transform hover:scale-105 shadow-2xl inline-block">
                  {merged.buttonText}
                </a>
              </div>
            </div>
          </div>
        </section>
      );

    case 'horological':
      return (
        <section className="py-16 bg-gradient-to-b from-gray-900 to-black text-white">
          <div className={`container mx-auto px-4`}>
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl font-bold mb-8 text-gray-300" style={{ fontFamily: 'serif' }}>{merged.title}</h2>
              <div className="bg-gray-800 rounded-full w-64 h-64 mx-auto mb-8 flex items-center justify-center border-4 border-gray-600">
                <div className="text-center">
                  <div className="text-6xl font-bold text-yellow-400 mb-2">{merged.time || '12:00'}</div>
                  <p className="text-sm text-gray-400">{merged.date || '2024'}</p>
                </div>
              </div>
              <p className="text-lg text-gray-300 mb-6">{merged.content}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {merged.timepieces?.map((timepiece: any, idx: number) => (
                  <div key={idx} className="bg-gray-800 rounded-lg p-4">
                    <div className="text-3xl mb-2">{timepiece.icon}</div>
                    <h4 className="font-semibold text-yellow-400">{timepiece.name}</h4>
                    <p className="text-sm text-gray-300">{timepiece.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      );

    case 'mechanical':
      return (
        <section className="py-16 bg-gradient-to-r from-gray-800 to-gray-900 text-white">
          <div className={`container mx-auto px-4`}>
            <div className="max-w-6xl mx-auto">
              <h2 className="text-4xl font-bold text-center mb-12 text-gray-300">{merged.title}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                {merged.mechanisms?.map((mechanism: any, idx: number) => (
                  <div key={idx} className="bg-gray-700 rounded-lg p-6 border border-gray-600">
                    <div className="flex items-center mb-4">
                      <div className="text-4xl mr-4">{mechanism.icon}</div>
                      <div>
                        <h3 className="text-xl font-semibold text-blue-400">{mechanism.name}</h3>
                        <p className="text-sm text-gray-400">{mechanism.type}</p>
                      </div>
                    </div>
                    <p className="text-gray-300 mb-4">{mechanism.description}</p>
                    <div className="text-sm">
                      <strong className="text-blue-400">Função:</strong> {mechanism.function}
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-blue-900 bg-opacity-50 rounded-lg p-8 border-2 border-blue-500 text-center">
                <h3 className="text-2xl font-bold mb-4 text-blue-400">O Grande Mecanismo</h3>
                <p className="text-lg text-gray-200">{merged.grandMechanism}</p>
              </div>
            </div>
          </div>
        </section>
      );

    case 'complication':
      return (
        <section className="py-16 bg-gradient-to-r from-red-900 to-orange-900 text-white">
          <div className={`container mx-auto px-4`}>
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-8 text-yellow-400">{merged.title}</h2>
              <div className="bg-black bg-opacity-50 rounded-lg p-8 border-2 border-red-500 mb-8">
                <h3 className="text-xl font-semibold mb-6 text-red-400 text-center">As Complicações</h3>
                <div className="space-y-4">
                  {merged.complications?.map((complication: any, idx: number) => (
                    <div key={idx} className="flex items-start">
                      <div className="text-red-500 mr-3 mt-1">⚠️</div>
                      <div>
                        <h4 className="font-semibold text-red-400">{complication.title}</h4>
                        <p className="text-gray-300">{complication.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-center">
                <p className="text-lg text-gray-200 mb-6">{merged.resolution}</p>
                <a href={merged.buttonLink} className="bg-yellow-600 hover:bg-yellow-500 text-black px-8 py-4 rounded-lg font-bold text-lg transition-all transform hover:scale-105 shadow-2xl inline-block">
                  {merged.buttonText}
                </a>
              </div>
            </div>
          </div>
        </section>
      );

    case 'revolutionary':
      return (
        <section className="py-16 bg-red-900 text-white">
          <div className={`container mx-auto px-4`}>
            <div className="max-w-6xl mx-auto">
              <h2 className="text-4xl font-bold text-center mb-8 text-yellow-400" style={{ fontFamily: 'serif' }}>{merged.title}</h2>
              <div className="bg-black bg-opacity-70 rounded-lg p-8 border-4 border-red-600 mb-8">
                <div className="text-center mb-6">
                  <p className="text-xl text-red-300 italic" style={{ fontFamily: 'serif' }}>{merged.manifesto}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {merged.revolutionaryElements?.map((element: any, idx: number) => (
                    <div key={idx} className="text-center">
                      <div className="text-4xl mb-3">{element.icon}</div>
                      <h4 className="font-bold text-yellow-400 mb-2">{element.title}</h4>
                      <p className="text-gray-300">{element.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      );

    case 'demands':
      return (
        <section className="py-16 bg-gradient-to-r from-red-800 to-red-900 text-white">
          <div className={`container mx-auto px-4`}>
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-8 text-yellow-400">{merged.title}</h2>
              <div className="bg-black bg-opacity-50 rounded-lg p-8 border-2 border-yellow-500">
                <h3 className="text-xl font-semibold mb-6 text-yellow-400 text-center">Nossas Exigências</h3>
                <div className="space-y-4">
                  {merged.demands?.map((demand: any, idx: number) => (
                    <div key={idx} className="flex items-start bg-red-900 bg-opacity-50 rounded p-4">
                      <div className="text-yellow-400 mr-3 font-bold text-lg">{idx + 1}.</div>
                      <div>
                        <h4 className="font-semibold text-yellow-400 mb-1">{demand.title}</h4>
                        <p className="text-gray-300">{demand.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      );

    case 'propaganda':
      return (
        <section className="py-16 bg-gradient-to-r from-red-700 to-red-800 text-white">
          <div className={`container mx-auto px-4`}>
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold mb-4 text-yellow-400">{merged.title}</h2>
                <p className="text-xl text-gray-200">{merged.slogan}</p>
              </div>
              <div className={`grid grid-cols-1 md:grid-cols-3 gap-8`}>
                {merged.propagandaElements?.map((element: any, idx: number) => (
                  <div key={idx} className="bg-black bg-opacity-70 rounded-lg p-6 border-2 border-yellow-500 text-center">
                    <div className="text-5xl mb-4">{element.icon}</div>
                    <h3 className="text-xl font-bold text-yellow-400 mb-2">{element.title}</h3>
                    <p className="text-gray-300">{element.description}</p>
                  </div>
                ))}
              </div>
              <div className="text-center mt-12">
                <a href={merged.buttonLink} className="bg-yellow-600 hover:bg-yellow-500 text-black px-8 py-4 rounded-lg font-bold text-lg transition-all transform hover:scale-105 shadow-2xl inline-block">
                  {merged.buttonText}
                </a>
              </div>
            </div>
          </div>
        </section>
      );

    // MODERN 2025 SECTIONS
    case 'hero-modern':
      return (
        <section className="min-h-screen flex items-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-20"></div>
          <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
          <div className="absolute top-40 right-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{ animationDelay: '4s' }}></div>
          <div className={`relative z-10 container mx-auto px-4 py-20`}>
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                {merged.title}
              </h1>
              <p className="text-lg md:text-xl mb-4 text-blue-200 font-light max-w-2xl mx-auto">
                {merged.subtitle}
              </p>
              <p className="text-base md:text-lg mb-8 text-slate-300 max-w-3xl mx-auto leading-relaxed">
                {merged.content}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <a href={merged.buttonLink} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-full font-bold text-lg transition-all transform hover:scale-105 shadow-2xl hover:shadow-blue-500/25">
                  {merged.buttonText}
                </a>
              </div>
            </div>
          </div>
        </section>
      );

    case 'features-modern':
      return (
        <section className="py-12 md:py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 md:mb-4 px-2">{merged.title}</h2>
              <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto px-2">{merged.subtitle}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              {merged.features?.map((feature: any, idx: number) => (
                <div key={idx} className="group bg-gradient-to-br from-slate-50 to-white p-6 md:p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-200 hover:border-blue-200">
                  <div className="text-3xl md:text-4xl mb-3 md:mb-4 text-blue-600 group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2 md:mb-3">{feature.title}</h3>
                  <p className="text-sm md:text-base text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      );

    case 'pricing-modern':
      return (
        <section className="py-20 bg-gradient-to-br from-slate-50 to-blue-50">
          <div className={`container mx-auto px-4`}>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{merged.title}</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">{merged.subtitle}</p>
            </div>
            <div className={`grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto`}>
              {merged.plans?.map((plan: any, idx: number) => (
                <div key={idx} className={`relative bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border-2 ${plan.popular ? 'border-blue-500 scale-105' : 'border-slate-200'}`}>
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-bold">
                      MAIS POPULAR
                    </div>
                  )}
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <div className="text-4xl font-black text-blue-600 mb-1">{plan.price}</div>
                    <div className="text-gray-500">{plan.period}</div>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features?.map((feature: string, featureIdx: number) => (
                      <li key={featureIdx} className="flex items-center text-gray-700">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <a href="#signup" className={`w-full py-3 px-6 rounded-xl font-bold text-center block transition-all duration-300 ${plan.popular ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-blue-500/25' : 'bg-slate-100 text-gray-900 hover:bg-slate-200'}`}>
                    {plan.buttonText}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>
      );

    case 'cta-modern':
      return (
        <section className="py-20 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-10"></div>
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full opacity-5 animate-pulse"></div>
            <div className="absolute bottom-10 right-10 w-24 h-24 bg-white rounded-full opacity-5 animate-pulse" style={{ animationDelay: '1s' }}></div>
          </div>
          <div className={`relative z-10 container mx-auto text-center px-4`}>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{merged.title}</h2>
            <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto text-blue-100">{merged.subtitle}</p>
            <a href={merged.buttonLink} className="bg-white text-blue-600 px-8 py-4 rounded-full font-bold text-lg hover:bg-blue-50 transition-all transform hover:scale-105 shadow-2xl inline-block">
              {merged.buttonText}
            </a>
          </div>
        </section>
      );

    case 'hero-luxury':
      return (
        <section className="min-h-screen flex items-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-100/20 via-orange-100/20 to-yellow-100/20"></div>
          <div className={`relative z-10 container mx-auto px-4 py-20`}>
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight text-gray-900">
                {merged.title}
              </h1>
              <p className="text-lg md:text-xl mb-4 text-amber-700 font-medium max-w-2xl mx-auto">
                {merged.subtitle}
              </p>
              <p className="text-base md:text-lg mb-8 text-gray-700 max-w-3xl mx-auto leading-relaxed">
                {merged.content}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <a href={merged.buttonLink} className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-8 py-4 rounded-full font-bold text-lg transition-all transform hover:scale-105 shadow-2xl hover:shadow-amber-500/25">
                  {merged.buttonText}
                </a>
              </div>
            </div>
          </div>
        </section>
      );

    case 'products-showcase':
      return (
        <section className="py-20 bg-white">
          <div className={`container mx-auto px-4`}>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{merged.title}</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">{merged.subtitle}</p>
            </div>
            <div className={`grid grid-cols-1 md:grid-cols-3 gap-8`}>
              {merged.products?.map((product: any, idx: number) => (
                <div key={idx} className="group bg-white p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-200 hover:border-amber-200">
                  <div className="aspect-square mb-4 rounded-xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h3>
                  <p className="text-gray-600 text-sm mb-3">{product.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-lg font-bold text-amber-600">{product.price}</span>
                      {product.originalPrice && (
                        <span className="text-sm text-gray-500 line-through">{product.originalPrice}</span>
                      )}
                    </div>
                    <button className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                      Comprar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      );

    case 'testimonials-luxury':
      return (
        <section className="py-20 bg-gradient-to-br from-amber-50 to-orange-50">
          <div className={`container mx-auto px-4`}>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{merged.title}</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">{merged.subtitle}</p>
            </div>
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto`}>
              {merged.testimonials?.map((testimonial: any, idx: number) => (
                <div key={idx} className="bg-white p-8 rounded-2xl shadow-lg border border-amber-100">
                  <div className="flex items-center mb-4">
                    <img src={testimonial.avatar} alt={testimonial.name} className="w-12 h-12 rounded-full mr-4 border-2 border-amber-200" />
                    <div>
                      <h4 className="font-bold text-gray-900">{testimonial.name}</h4>
                      <p className="text-sm text-amber-600">{testimonial.role}</p>
                    </div>
                  </div>
                  <p className="text-gray-700 italic leading-relaxed">"{testimonial.content}"</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      );

    case 'cta-luxury':
      return (
        <section className="py-20 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-800 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-10"></div>
          <div className={`relative z-10 container mx-auto text-center px-4`}>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{merged.title}</h2>
            <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto text-amber-100">{merged.subtitle}</p>
            <a href={merged.buttonLink} className="bg-white text-amber-600 px-8 py-4 rounded-full font-bold text-lg hover:bg-amber-50 transition-all transform hover:scale-105 shadow-2xl inline-block">
              {merged.buttonText}
            </a>
          </div>
        </section>
      );

    case 'hero-disruptive':
      return (
        <section className="min-h-screen flex items-center bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-30"></div>
          <div className="absolute top-20 right-20 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '3s' }}></div>
          <div className={`relative z-10 container mx-auto px-4 py-20`}>
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight bg-gradient-to-r from-white via-emerald-100 to-cyan-100 bg-clip-text text-transparent">
                {merged.title}
              </h1>
              <p className="text-lg md:text-xl mb-4 text-emerald-200 font-light max-w-2xl mx-auto">
                {merged.subtitle}
              </p>
              <p className="text-base md:text-lg mb-8 text-slate-300 max-w-3xl mx-auto leading-relaxed">
                {merged.content}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <a href={merged.buttonLink} className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white px-8 py-4 rounded-full font-bold text-lg transition-all transform hover:scale-105 shadow-2xl hover:shadow-emerald-500/25">
                  {merged.buttonText}
                </a>
              </div>
            </div>
          </div>
        </section>
      );

    case 'mission-vision':
      return (
        <section className="py-20 bg-white">
          <div className={`container mx-auto px-4`}>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{merged.title}</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">{merged.subtitle}</p>
            </div>
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-12 max-w-6xl mx-auto`}>
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-8 rounded-2xl border border-emerald-200">
                <h3 className="text-2xl font-bold text-emerald-800 mb-4">Missão</h3>
                <p className="text-gray-700 leading-relaxed">{merged.mission}</p>
              </div>
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 p-8 rounded-2xl border border-cyan-200">
                <h3 className="text-2xl font-bold text-cyan-800 mb-4">Visão</h3>
                <p className="text-gray-700 leading-relaxed">{merged.vision}</p>
              </div>
            </div>
            <div className="mt-12 text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Nossos Valores</h3>
              <div className="flex flex-wrap justify-center gap-4">
                {merged.values?.map((value: string, idx: number) => (
                  <span key={idx} className="bg-gradient-to-r from-emerald-600 to-cyan-600 text-white px-4 py-2 rounded-full font-medium">
                    {value}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      );

    case 'team-showcase':
      return (
        <section className="py-20 bg-gradient-to-br from-slate-50 to-gray-50">
          <div className={`container mx-auto px-4`}>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{merged.title}</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">{merged.subtitle}</p>
            </div>
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto`}>
              {merged.team?.map((member: any, idx: number) => (
                <div key={idx} className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-200">
                  <div className="flex items-center mb-6">
                    <img src={member.avatar} alt={member.name} className="w-16 h-16 rounded-full mr-4 border-2 border-emerald-200" />
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{member.name}</h3>
                      <p className="text-emerald-600 font-medium">{member.role}</p>
                    </div>
                  </div>
                  <p className="text-gray-700 leading-relaxed">{member.bio}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      );

    case 'cta-disruptive':
      return (
        <section className="py-20 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-800 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-10"></div>
          <div className={`relative z-10 container mx-auto text-center px-4`}>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{merged.title}</h2>
            <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto text-emerald-100">{merged.subtitle}</p>
            <a href={merged.buttonLink} className="bg-white text-emerald-600 px-8 py-4 rounded-full font-bold text-lg hover:bg-emerald-50 transition-all transform hover:scale-105 shadow-2xl inline-block">
              {merged.buttonText}
            </a>
          </div>
        </section>
      );

    case 'hero-creative':
      return (
        <section className="min-h-screen flex items-center bg-gradient-to-br from-violet-900 via-purple-900 to-fuchsia-900 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-20"></div>
          <div className="absolute top-20 left-20 w-72 h-72 bg-violet-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
          <div className="absolute top-40 right-20 w-72 h-72 bg-fuchsia-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{ animationDelay: '4s' }}></div>
          <div className={`relative z-10 container mx-auto px-4 py-20`}>
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight bg-gradient-to-r from-white via-violet-100 to-fuchsia-100 bg-clip-text text-transparent">
                {merged.title}
              </h1>
              <p className="text-lg md:text-xl mb-4 text-violet-200 font-light max-w-2xl mx-auto">
                {merged.subtitle}
              </p>
              <p className="text-base md:text-lg mb-8 text-slate-300 max-w-3xl mx-auto leading-relaxed">
                {merged.content}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <a href={merged.buttonLink} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white px-8 py-4 rounded-full font-bold text-lg transition-all transform hover:scale-105 shadow-2xl hover:shadow-violet-500/25">
                  {merged.buttonText}
                </a>
              </div>
            </div>
          </div>
        </section>
      );

    case 'portfolio-showcase':
      return (
        <section className="py-20 bg-white">
          <div className={`container mx-auto px-4`}>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{merged.title}</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">{merged.subtitle}</p>
            </div>
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-8`}>
              {merged.projects?.map((project: any, idx: number) => (
                <div key={idx} className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-200 overflow-hidden">
                  <div className="aspect-video bg-gradient-to-br from-violet-100 to-fuchsia-100 flex items-center justify-center">
                    <img src={project.image} alt={project.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="bg-violet-100 text-violet-800 px-3 py-1 rounded-full text-sm font-medium">
                        {project.category}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{project.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{project.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      );

    case 'services-creative':
      return (
        <section className="py-20 bg-gradient-to-br from-slate-50 to-violet-50">
          <div className={`container mx-auto px-4`}>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{merged.title}</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">{merged.subtitle}</p>
            </div>
            <div className={`grid grid-cols-1 md:grid-cols-3 gap-8`}>
              {merged.services?.map((service: any, idx: number) => (
                <div key={idx} className="group bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-200 hover:border-violet-200">
                  <div className="text-4xl mb-4 text-violet-600 group-hover:scale-110 transition-transform duration-300">
                    {service.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{service.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{service.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      );

    case 'cta-creative':
      return (
        <section className="py-20 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-800 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-10"></div>
          <div className={`relative z-10 container mx-auto text-center px-4`}>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{merged.title}</h2>
            <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto text-violet-100">{merged.subtitle}</p>
            <a href={merged.buttonLink} className="bg-white text-violet-600 px-8 py-4 rounded-full font-bold text-lg hover:bg-violet-50 transition-all transform hover:scale-105 shadow-2xl inline-block">
              {merged.buttonText}
            </a>
          </div>
        </section>
      );

    case 'hero-wellness':
      return (
        <section className="min-h-screen flex items-center bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-100/20 via-pink-100/20 to-purple-100/20"></div>
          <div className={`relative z-10 container mx-auto px-4 py-20`}>
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight text-gray-900">
                {merged.title}
              </h1>
              <p className="text-lg md:text-xl mb-4 text-rose-700 font-medium max-w-2xl mx-auto">
                {merged.subtitle}
              </p>
              <p className="text-base md:text-lg mb-8 text-gray-700 max-w-3xl mx-auto leading-relaxed">
                {merged.content}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <a href={merged.buttonLink} className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white px-8 py-4 rounded-full font-bold text-lg transition-all transform hover:scale-105 shadow-2xl hover:shadow-rose-500/25">
                  {merged.buttonText}
                </a>
              </div>
            </div>
          </div>
        </section>
      );

    case 'services-wellness':
      return (
        <section className="py-20 bg-white">
          <div className={`container mx-auto px-4`}>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{merged.title}</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">{merged.subtitle}</p>
            </div>
            <div className={`grid grid-cols-1 md:grid-cols-3 gap-8`}>
              {merged.services?.map((service: any, idx: number) => (
                <div key={idx} className="group bg-gradient-to-br from-rose-50 to-pink-50 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-rose-200 hover:border-rose-300">
                  <div className="text-4xl mb-4 text-rose-600 group-hover:scale-110 transition-transform duration-300">
                    {service.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{service.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{service.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      );

    case 'testimonials-wellness':
      return (
        <section className="py-20 bg-gradient-to-br from-rose-50 to-pink-50">
          <div className={`container mx-auto px-4`}>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{merged.title}</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">{merged.subtitle}</p>
            </div>
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto`}>
              {merged.testimonials?.map((testimonial: any, idx: number) => (
                <div key={idx} className="bg-white p-8 rounded-2xl shadow-lg border border-rose-100">
                  <div className="flex items-center mb-4">
                    <img src={testimonial.avatar} alt={testimonial.name} className="w-12 h-12 rounded-full mr-4 border-2 border-rose-200" />
                    <div>
                      <h4 className="font-bold text-gray-900">{testimonial.name}</h4>
                      <p className="text-sm text-rose-600 font-medium">{testimonial.transformation}</p>
                    </div>
                  </div>
                  <p className="text-gray-700 italic leading-relaxed">"{testimonial.content}"</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      );

    case 'cta-wellness':
      return (
        <section className="py-20 bg-gradient-to-r from-rose-600 via-pink-600 to-rose-800 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-10"></div>
          <div className={`relative z-10 container mx-auto text-center px-4`}>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{merged.title}</h2>
            <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto text-rose-100">{merged.subtitle}</p>
            <a href={merged.buttonLink} className="bg-white text-rose-600 px-8 py-4 rounded-full font-bold text-lg hover:bg-rose-50 transition-all transform hover:scale-105 shadow-2xl inline-block">
              {merged.buttonText}
            </a>
          </div>
        </section>
      );

    case 'hero-financial':
      return (
        <section className="min-h-screen flex items-center bg-gradient-to-br from-slate-900 via-gray-900 to-zinc-900 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-40"></div>
          <div className="absolute top-20 right-20 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse"></div>
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '3s' }}></div>
          <div className={`relative z-10 container mx-auto px-4 py-20`}>
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight bg-gradient-to-r from-white via-emerald-100 to-blue-100 bg-clip-text text-transparent">
                {merged.title}
              </h1>
              <p className="text-lg md:text-xl mb-4 text-emerald-200 font-light max-w-2xl mx-auto">
                {merged.subtitle}
              </p>
              <p className="text-base md:text-lg mb-8 text-slate-300 max-w-3xl mx-auto leading-relaxed">
                {merged.content}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <a href={merged.buttonLink} className="bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white px-8 py-4 rounded-full font-bold text-lg transition-all transform hover:scale-105 shadow-2xl hover:shadow-emerald-500/25">
                  {merged.buttonText}
                </a>
              </div>
            </div>
          </div>
        </section>
      );

    case 'investment-options':
      return (
        <section className="py-20 bg-white">
          <div className={`container mx-auto px-4`}>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{merged.title}</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">{merged.subtitle}</p>
            </div>
            <div className={`grid grid-cols-1 md:grid-cols-3 gap-8`}>
              {merged.options?.map((option: any, idx: number) => (
                <div key={idx} className="group bg-gradient-to-br from-slate-50 to-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-200 hover:border-emerald-200">
                  <div className="text-center mb-6">
                    <div className="text-4xl mb-4 text-emerald-600 group-hover:scale-110 transition-transform duration-300">
                      {option.icon}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{option.type}</h3>
                    <p className="text-gray-600 text-sm mb-4">{option.description}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Risco:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${option.risk === 'Baixo' ? 'bg-green-100 text-green-800' : option.risk === 'Médio-Alto' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                          {option.risk}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Retorno:</span>
                        <span className="text-emerald-600 font-semibold">{option.return}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      );

    case 'success-stories':
      return (
        <section className="py-20 bg-gradient-to-br from-slate-50 to-emerald-50">
          <div className={`container mx-auto px-4`}>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{merged.title}</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">{merged.subtitle}</p>
            </div>
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto`}>
              {merged.stories?.map((story: any, idx: number) => (
                <div key={idx} className="bg-white p-8 rounded-2xl shadow-lg border border-emerald-100">
                  <div className="flex items-center mb-4">
                    <img src={story.avatar} alt={story.name} className="w-12 h-12 rounded-full mr-4 border-2 border-emerald-200" />
                    <div>
                      <h4 className="font-bold text-gray-900">{story.name}</h4>
                      <p className="text-sm text-emerald-600 font-medium">{story.achievement}</p>
                    </div>
                  </div>
                  <p className="text-gray-700 italic leading-relaxed">"{story.content}"</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      );

    case 'cta-financial':
      return (
        <section className="py-20 bg-gradient-to-r from-emerald-600 via-blue-600 to-emerald-800 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-10"></div>
          <div className={`relative z-10 container mx-auto text-center px-4`}>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{merged.title}</h2>
            <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto text-emerald-100">{merged.subtitle}</p>
            <a href={merged.buttonLink} className="bg-white text-emerald-600 px-8 py-4 rounded-full font-bold text-lg hover:bg-emerald-50 transition-all transform hover:scale-105 shadow-2xl inline-block">
              {merged.buttonText}
            </a>
          </div>
        </section>
      );

    default:
      return null;
  }
};

const LeadPageEditor = () => {
  const { user, userData } = useAuth();
  const [template, setTemplate] = useState<LeadPageTemplate | null>(null);
  const [allTemplates, setAllTemplates] = useState<LeadPageTemplate[]>([]);
  const [userLeadPage, setUserLeadPage] = useState<UserLeadPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [leadPageStats, setLeadPageStats] = useState<any>(null);
  const [loadingLeadStats, setLoadingLeadStats] = useState(false);
  const [domainInstructionsExpanded, setDomainInstructionsExpanded] = useState(false);

  // Draft/Publish system
  const [viewMode, setViewMode] = useState<'draft' | 'published'>('draft'); // What we're currently viewing
  const [publishing, setPublishing] = useState(false);

  const toggleSectionExpand = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  // Helper function to get the correct template and data based on view mode
  const getCurrentTemplateAndData = () => {
    if (viewMode === 'published' && userLeadPage?.publishedTemplateId) {
      // Find the published template
      const publishedTemplate = allTemplates.find(t => t.id === userLeadPage.publishedTemplateId);
      return {
        template: publishedTemplate || template || allTemplates[0],
        userLeadPage: {
          ...userLeadPage,
          templateId: userLeadPage.publishedTemplateId,
          customData: userLeadPage.publishedCustomData || {}
        }
      };
    }
    // Draft mode - use current template and data
    return { template: template || allTemplates[0], userLeadPage };
  };

  const handleShare = async () => {
    const link = `${window.location.origin}/${userData?.slug || user?.uid}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar link:', err);
    }
  };

  const handleSaveDomain = async () => {
    if (!user || !userLeadPage) return;

    const domain = userLeadPage.domain?.trim();
    if (!domain) {
      alert('Por favor, insira um domínio válido.');
      return;
    }

    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!domainRegex.test(domain)) {
      alert('Formato de domínio inválido. Use apenas letras, números e hífens.');
      return;
    }

    try {
      // Verificar se o domínio já está configurado no Vercel
      const domainExists = await checkVercelDomain(domain);
      
      if (!domainExists) {
        // Tentar adicionar o domínio no Vercel automaticamente
        const added = await addVercelDomain(domain);
        if (!added) {
          alert('Domínio salvo, mas houve um problema ao configurá-lo automaticamente no Vercel. Você pode adicioná-lo manualmente no painel do Vercel.');
        }
      }

      const updated: UserLeadPage = {
        ...userLeadPage,
        domain: domain
      };

      await saveUserLeadPage(user.uid, updated);
      setUserLeadPage(updated);
      
      if (domainExists) {
        alert('Domínio salvo com sucesso! Ele já estava configurado no Vercel.');
      } else {
        alert('Domínio salvo e configurado automaticamente no Vercel! Agora configure o CNAME no seu provedor DNS.');
      }
    } catch (err) {
      console.error('Erro ao salvar domínio:', err);
      alert('Erro ao salvar domínio. Tente novamente.');
    }
  };

  const handleTemplateChange = async (newTemplateId: string) => {
    if (!user) return;

    try {
      const newTemplate = await getTemplate(newTemplateId);
      if (newTemplate) {
        setTemplate(newTemplate);
        const updated: UserLeadPage = {
          ...userLeadPage!,
          templateId: newTemplateId,
          customData: {},
          isPublished: false // Mark as having unpublished changes
        };
        setUserLeadPage(updated);
        await saveUserLeadPage(user.uid, updated);
        setExpandedSections(new Set());
      }
    } catch (error) {
      console.error('Erro ao mudar template:', error);
      alert('Erro ao mudar template. Tente novamente.');
    }
  };

  const handlePublish = async () => {
    if (!user || !userLeadPage) return;

    try {
      setPublishing(true);
      const published: UserLeadPage = {
        ...userLeadPage,
        publishedTemplateId: userLeadPage.templateId,
        publishedCustomData: { ...userLeadPage.customData },
        isPublished: true,
        lastPublishedAt: new Date()
      };
      await saveUserLeadPage(user.uid, published);
      setUserLeadPage(published);
    } catch (error) {
      console.error('Erro ao publicar:', error);
      alert('Erro ao publicar mudanças. Tente novamente.');
    } finally {
      setPublishing(false);
    }
  };

  const handleImageUpload = async (sectionId: string, file: File) => {
    try {
      setUploadingImage(sectionId);
      const imageUrl = await uploadToCloudinary(file);
      await handleSectionChange(sectionId, 'image', imageUrl);
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      alert('Erro ao fazer upload da imagem. Tente novamente.');
    } finally {
      setUploadingImage(null);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const [templates, data] = await Promise.all([
          getAllTemplates(),
          getUserLeadPage(user.uid)
        ]);

        setAllTemplates(templates);

        // Todos os templates estão disponíveis no modelo freemium
        setAllTemplates(templates);

        if (data) {
          const userTemplate = await getTemplate(data.templateId);
          // Todos os templates estão disponíveis no modelo freemium
          if (userTemplate) {
            setTemplate(userTemplate);
            setUserLeadPage(data);
          } else {
            // Template não encontrado, usar template padrão
            const defaultTemplate = templates.find(t => t.id === 'default-modern') || templates[0];
            if (defaultTemplate) {
              setTemplate(defaultTemplate);
              const updated: UserLeadPage = {
                ...data,
                templateId: defaultTemplate.id
              };
              await saveUserLeadPage(user.uid, updated);
              setUserLeadPage(updated);
            }
          }
        } else {
          const defaultTemplate = templates.find(t => t.id === 'default-modern') || templates[0];
          if (defaultTemplate) {
            setTemplate(defaultTemplate);
            const initial: UserLeadPage = {
              templateId: defaultTemplate.id,
              customData: {}
            };
            await saveUserLeadPage(user.uid, initial);
            setUserLeadPage(initial);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar dados da lead page:', err);
        setError('Erro ao carregar dados. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  useEffect(() => {
    if (user) {
      handleLoadLeadStats();
    }
  }, [user]);

  const handleLoadLeadStats = async () => {
    if (!user) return;
    try {
      setLoadingLeadStats(true);
      const stats = await getLeadPageStats(user.uid);
      const metrics = stats ? calculateLeadPageMetrics(stats) : null;
      setLeadPageStats(metrics);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoadingLeadStats(false);
    }
  };

  const handleSectionChange = async (sectionId: string, field: string, value: unknown) => {
    if (!user) return;
    const updated = { ...userLeadPage!.customData[sectionId], [field]: value };
    const updatedUserLeadPage = {
      ...userLeadPage!,
      customData: { ...userLeadPage!.customData, [sectionId]: updated },
      isPublished: false // Mark as having unpublished changes
    };
    setUserLeadPage(updatedUserLeadPage);

    try {
      setSaving(true);
      await updateLeadPageSection(user.uid, sectionId, updated);
      setTimeout(() => setSaving(false), 500);
    } catch (err) {
      console.error('Erro ao salvar:', err);
      setSaving(false);
    }
  };

  const toggleSection = async (sectionId: string, enabled: boolean) => {
    if (!user) return;
    await handleSectionChange(sectionId, 'enabled', enabled);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h1>
          <p className="text-gray-600 mb-6">Você precisa estar logado para acessar o editor de lead page.</p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all hover:scale-105"
          >
            Fazer Login
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando editor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Erro ao Carregar</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  if (!template || !userLeadPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md">
          <p className="text-gray-600">Erro ao carregar dados da lead page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link 
                to="/provider" 
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg"
              >
                <ArrowLeft size={18} />
                <span className="hidden sm:inline">Voltar ao Dashboard</span>
              </Link>
              <div className="h-6 w-px bg-gray-300 hidden lg:block"></div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Layout className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Editor de Lead Page</h1>
                  <p className="text-sm text-gray-600">Personalize sua página de conversão</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {saving && (
                <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-700"></div>
                  <span className="text-sm font-medium">Salvando...</span>
                </div>
              )}
              
              {allTemplates.length > 1 && viewMode === 'draft' && (
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
                  <Palette className="w-4 h-4 text-gray-500" />
                  <select
                    value={template?.id || ''}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    className="text-sm font-medium text-gray-900 bg-transparent border-none focus:ring-0 focus:outline-none"
                  >
                    {allTemplates.map((tmpl) => (
                      <option key={tmpl.id} value={tmpl.id}>
                        {tmpl.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Current Template Display for Published Mode */}
              {viewMode === 'published' && userLeadPage?.publishedTemplateId && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-green-800">
                    Modelo Publicados: {allTemplates.find(t => t.id === userLeadPage.publishedTemplateId)?.name || 'Desconhecido'}
                  </span>
                </div>
              )}

              {/* View Mode Toggle */}
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
                <Eye className="w-4 h-4 text-gray-500" />
                <select
                  value={viewMode}
                  onChange={(e) => setViewMode(e.target.value as 'draft' | 'published')}
                  className="text-sm font-medium text-gray-900 bg-transparent border-none focus:ring-0 focus:outline-none"
                >
                  <option value="draft">Rascunho</option>
                  <option value="published">Publicado</option>
                </select>
              </div>

              {/* Publish Button */}
              {userLeadPage && !userLeadPage.isPublished && (
                <button
                  onClick={handlePublish}
                  disabled={publishing}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {publishing ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      <span>Publicando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Publicar</span>
                    </>
                  )}
                </button>
              )}

              <button
                onClick={() => window.open(`${window.location.origin}/${userData?.slug || user?.uid}`, '_blank')}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-all"
              >
                <Eye className="w-4 h-4" />
                <span>Visualizar Página</span>
              </button>

              <button
                onClick={handleShare}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-all"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Link Copiado!</span>
                  </>
                ) : (
                  <>
                    <Share className="w-4 h-4" />
                    <span>Compartilhar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Editor and Preview Layout */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Editor */}
          <div className="lg:col-span-2 space-y-6">
            {/* Sections Editor Card */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Palette className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Editor de Seções</h2>
                      <p className="text-sm text-gray-600">Personalize cada seção da sua página</p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {template.sections.length} seções disponíveis
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {template.sections.map((section) => {
                  const custom = userLeadPage?.customData?.[section.id] || {};
                  const merged = { ...section, ...custom };
                  const isExpanded = expandedSections.has(section.id);

                  return (
                    <div
                      key={section.id}
                      className={`border rounded-xl overflow-hidden transition-all duration-200 ${
                        isExpanded ? 'border-blue-300 shadow-md' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div 
                        className="p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                        onClick={() => toggleSectionExpand(section.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${merged.enabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                            <div>
                              <h3 className="font-semibold text-gray-900 capitalize">
                                {section.type.replace('-', ' ')}
                              </h3>
                              <p className="text-xs text-gray-500">{section.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSection(section.id, !merged.enabled);
                              }}
                              className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                                merged.enabled
                                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {merged.enabled ? 'Ativo' : 'Inativo'}
                            </button>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-gray-500" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-500" />
                            )}
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="p-4 bg-white border-t border-gray-100">
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                id={`toggle-${section.id}`}
                                checked={merged.enabled}
                                onChange={(e) => toggleSection(section.id, e.target.checked)}
                                className="rounded text-blue-600 focus:ring-blue-500"
                              />
                              <label htmlFor={`toggle-${section.id}`} className="text-sm font-medium text-gray-700 cursor-pointer">
                                Exibir esta seção na página
                              </label>
                            </div>

                            {merged.enabled && (
                              <>
                                {['title', 'content', 'buttonText', 'buttonLink'].map(field => (
                                  merged[field as keyof typeof merged] !== undefined && (
                                    <div key={field} className="space-y-2" onClick={(e) => e.stopPropagation()}>
                                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                        {field === 'buttonLink' ? (
                                          <>
                                            <LinkIcon className="w-4 h-4" />
                                            Link do Botão
                                          </>
                                        ) : field === 'title' ? (
                                          <>
                                            <Bold className="w-4 h-4" />
                                            Título
                                          </>
                                        ) : field === 'content' ? (
                                          <>
                                            <AlignLeft className="w-4 h-4" />
                                            Conteúdo
                                          </>
                                        ) : (
                                          field
                                        )}
                                      </label>
                                      {field === 'content' ? (
                                        <textarea
                                          value={String(merged[field as keyof typeof merged] || '')}
                                          onChange={(e) => handleSectionChange(section.id, field, e.target.value)}
                                          rows={3}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                          placeholder={`Digite o ${getFieldPlaceholder(field)}`}
                                        />
                                      ) : (
                                        <input
                                          type={field === 'buttonLink' ? 'url' : 'text'}
                                          value={String(merged[field as keyof typeof merged] || '')}
                                          onChange={(e) => handleSectionChange(section.id, field, e.target.value)}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                          placeholder={`Digite o ${field === 'buttonLink' ? 'link' : (field as string).toLowerCase()}`}
                                        />
                                      )}
                                    </div>
                                  )
                                ))}

                                {/* Image Upload */}
                                {section.type !== 'benefits' && section.type !== 'social-proof' && (
                                  <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                      <ImageIcon className="w-4 h-4" />
                                      Imagem
                                    </label>
                                    {merged.image ? (
                                      <div className="relative group">
                                        <img
                                          src={merged.image}
                                          alt="Preview"
                                          className="w-full h-48 object-cover rounded-lg border shadow-sm"
                                        />
                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all rounded-lg flex items-center justify-center">
                                          <button
                                            onClick={() => handleSectionChange(section.id, 'image', '')}
                                            className="opacity-0 group-hover:opacity-100 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-all transform hover:scale-110"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="relative">
                                        <input
                                          type="file"
                                          accept="image/*"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleImageUpload(section.id, file);
                                          }}
                                          className="hidden"
                                          id={`image-upload-${section.id}`}
                                          disabled={uploadingImage === section.id}
                                        />
                                        <label
                                          htmlFor={`image-upload-${section.id}`}
                                          className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                                            uploadingImage === section.id
                                              ? 'border-blue-400 bg-blue-50'
                                              : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                                          }`}
                                        >
                                          {uploadingImage === section.id ? (
                                            <>
                                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mb-2"></div>
                                              <span className="text-sm text-blue-600 font-medium">Fazendo upload...</span>
                                            </>
                                          ) : (
                                            <>
                                              <Upload className="w-6 h-6 text-gray-400 mb-2" />
                                              <span className="text-sm text-gray-600">Clique para fazer upload</span>
                                              <span className="text-xs text-gray-500">PNG, JPG ou GIF</span>
                                            </>
                                          )}
                                        </label>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Items Editor */}
                                {(section.type === 'benefits' || section.type === 'social-proof') && (
                                  <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                                    <label className="flex items-center justify-between text-sm font-medium text-gray-700">
                                      <span>Itens</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newItems = [...(merged.items || []), ''];
                                          handleSectionChange(section.id, 'items', newItems);
                                        }}
                                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                                      >
                                        <Plus className="w-4 h-4" />
                                        Adicionar Item
                                      </button>
                                    </label>
                                    <div className="space-y-2">
                                      {(merged.items || []).map((item, idx) => (
                                        <div key={idx} className="flex gap-2">
                                          <input
                                            type="text"
                                            value={typeof item === 'string' ? item : (item as any).title || (item as any).text || JSON.stringify(item)}
                                            onChange={(e) => {
                                              const newItems = [...(merged.items || [])];
                                              if (typeof item === 'string') {
                                                newItems[idx] = e.target.value;
                                              } else {
                                                newItems[idx] = { ...(item as any), title: e.target.value };
                                              }
                                              handleSectionChange(section.id, 'items', newItems);
                                            }}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder={`Item ${idx + 1}`}
                                          />
                                          <button
                                            onClick={() => {
                                              const newItems = (merged.items || []).filter((_, i) => i !== idx);
                                              handleSectionChange(section.id, 'items', newItems);
                                            }}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Remover item"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Domain Settings Card */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Globe className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Domínio Personalizado</h2>
                    <p className="text-sm text-gray-600">Use seu próprio domínio para a lead page</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 rounded-xl p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Seu Domínio
                        </label>
                        <div className="flex">
                          <span className="inline-flex items-center px-3 py-2 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                            https://
                          </span>
                          <input
                            type="text"
                            placeholder="meuservico.com.br"
                            value={userLeadPage?.domain || ''}
                            onChange={(e) => setUserLeadPage(prev => prev ? { ...prev, domain: e.target.value } : null)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                      <button
                        onClick={handleSaveDomain}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition whitespace-nowrap"
                      >
                        Salvar Domínio
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 mt-3">
                      ⓘ Configure o CNAME do seu domínio para apontar para <code className="bg-gray-100 px-1 rounded">lucrazi.com.br</code>
                    </p>
                  </div>

                  {/* Accordion com orientações */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setDomainInstructionsExpanded(!domainInstructionsExpanded)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1 bg-blue-100 rounded">
                          <Globe className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="font-medium text-gray-900">Como configurar seu domínio personalizado</span>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${domainInstructionsExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    {domainInstructionsExpanded && (
                      <div className="p-4 bg-white border-t border-gray-200">
                        <div className="space-y-4">
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <h4 className="font-medium text-green-800 mb-1">Resultado esperado</h4>
                                <p className="text-sm text-green-700">
                                  Após salvar, o domínio será configurado automaticamente no Vercel. Você só precisa configurar o CNAME no seu provedor DNS.
                                  Por exemplo: se você configurar <code>lead.seudominio.com.br</code>, sua lead page ficará disponível em
                                  <code>https://lead.seudominio.com.br</code>.
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <h4 className="font-medium text-gray-900">Passos para configuração:</h4>

                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                              <h5 className="font-medium text-green-800 mb-2">1. Salve seu domínio</h5>
                              <p className="text-sm text-green-700 mb-2">
                                Digite seu domínio personalizado acima e clique em "Salvar Domínio". O sistema irá configurá-lo automaticamente no Vercel.
                              </p>
                              <p className="text-xs text-green-600">
                                O domínio será adicionado automaticamente à sua conta Vercel.
                              </p>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <h5 className="font-medium text-blue-800 mb-2">2. Configure o DNS</h5>
                              <p className="text-sm text-blue-700 mb-2">
                                Após salvar, configure o CNAME no seu provedor de domínio (GoDaddy, Registro.br, etc.).
                              </p>
                              <p className="text-xs text-blue-600">
                                Use as configurações que aparecem no seu painel Vercel para o domínio.
                              </p>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <h5 className="font-medium text-blue-800 mb-2">4. Aguarde a propagação</h5>
                              <p className="text-sm text-blue-700 mb-2">
                                As mudanças de DNS podem levar até 48 horas para se propagarem globalmente.
                              </p>
                              <p className="text-xs text-blue-600">
                                Você pode verificar o status usando ferramentas online como "DNS Checker" ou "What's My DNS".
                              </p>
                            </div>

                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                              <h5 className="font-medium text-yellow-800 mb-2">⚠️ Dicas importantes</h5>
                              <ul className="text-xs text-yellow-700 space-y-1">
                                <li>• Se já existir um registro A ou CNAME para "@" ou "www", edite-o em vez de criar um novo</li>
                                <li>• Não remova outros registros DNS que já existam</li>
                                <li>• Se usar "www", certifique-se de que também funciona sem "www"</li>
                                <li>• Teste a configuração antes de considerar completa</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Preview */}
          <div className="space-y-6">
            {/* Preview Card */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden sticky top-24">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-gray-700" />
                  <h3 className="font-semibold text-gray-900">
                    Pré-visualização Mobile {viewMode === 'draft' ? '(Rascunho)' : '(Publicado)'}
                  </h3>
                  {viewMode === 'published' && (
                    <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                      Ao Vivo
                    </span>
                  )}
                </div>
              </div>

              <div className="p-6">
                <div className="bg-gray-100 rounded-2xl p-4 mx-auto max-w-lg">
                  <div className="bg-white rounded-xl overflow-hidden shadow-lg min-h-[600px] max-h-[700px] overflow-y-auto">
                    <div className="[&>*]:!rounded-none [&_section]:!py-6 [&_section]:!px-6 [&_.container]:!px-0">
                      {(() => {
                        const { template: currentTemplate, userLeadPage: currentData } = getCurrentTemplateAndData();
                        return currentTemplate ? currentTemplate.sections
                          .filter(section => {
                            const custom = currentData?.customData?.[section.id] || {};
                            const merged = { ...section, ...custom };
                            return merged.enabled !== false;
                          })
                          .map(section => (
                            <div key={section.id}>
                              {renderPreviewSection(section, currentData)}
                            </div>
                          )) : null;
                      })()}
                    </div>
                  </div>
                </div>

                {(() => {
                  const { template: currentTemplate, userLeadPage: currentData } = getCurrentTemplateAndData();
                  return currentTemplate && currentTemplate.sections.filter(section => {
                    const custom = currentData?.customData?.[section.id] || {};
                    const merged = { ...section, ...custom };
                    return merged.enabled !== false;
                  }).length === 0 && (
                    <div className="bg-gray-50 rounded-xl p-8 text-center">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Eye className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-gray-600 font-medium">Nenhuma seção ativa</p>
                      <p className="text-gray-500 text-sm mt-1">
                        Ative algumas seções no editor para visualizá-las aqui
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Stats Card */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Estatísticas da Lead Page</h3>

                {/* Métricas principais */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {loadingLeadStats ? '...' : (leadPageStats?.totalViews || 0)}
                    </div>
                    <div className="text-sm text-gray-600">Visualizações Totais</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {loadingLeadStats ? '...' : (leadPageStats?.leads || 0)}
                    </div>
                    <div className="text-sm text-gray-600">Leads Gerados</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {loadingLeadStats ? '...' : `${(leadPageStats?.conversionRate || 0).toFixed(1)}%`}
                    </div>
                    <div className="text-sm text-gray-600">Taxa de Conversão</div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {loadingLeadStats ? '...' : (leadPageStats?.clicks || 0)}
                    </div>
                    <div className="text-sm text-gray-600">Cliques em Botões</div>
                  </div>
                </div>

                {/* Accordion com estatísticas detalhadas */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setDomainInstructionsExpanded(!domainInstructionsExpanded)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1 bg-blue-100 rounded">
                        <Eye className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="font-medium text-gray-900">Analytics Detalhados</span>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${domainInstructionsExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {domainInstructionsExpanded && (
                    <div className="p-4 bg-white border-t border-gray-200">
                      <div className="space-y-6">
                        {/* Sessões e Engajamento */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-indigo-50 rounded-lg p-3">
                            <div className="text-lg font-bold text-indigo-600">
                              {loadingLeadStats ? '...' : (leadPageStats?.totalSessions || 0)}
                            </div>
                            <div className="text-xs text-gray-600">Sessões Totais</div>
                          </div>
                          <div className="bg-orange-50 rounded-lg p-3">
                            <div className="text-lg font-bold text-orange-600">
                              {loadingLeadStats ? '...' : `${(leadPageStats?.bounceRate || 0).toFixed(1)}%`}
                            </div>
                            <div className="text-xs text-gray-600">Taxa de Rejeição</div>
                          </div>
                          <div className="bg-teal-50 rounded-lg p-3">
                            <div className="text-lg font-bold text-teal-600">
                              {loadingLeadStats ? '...' : `${leadPageStats?.avgSessionDuration || 0}s`}
                            </div>
                            <div className="text-xs text-gray-600">Tempo Médio</div>
                          </div>
                          <div className="bg-pink-50 rounded-lg p-3">
                            <div className="text-lg font-bold text-pink-600">
                              {loadingLeadStats ? '...' : (leadPageStats?.mostActiveHour || 'N/A')}
                            </div>
                            <div className="text-xs text-gray-600">Horário Mais Ativo</div>
                          </div>
                        </div>

                        {/* Top Fontes */}
                        {leadPageStats?.topSources && leadPageStats.topSources.length > 0 && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Top Fontes de Tráfego</h4>
                            <div className="space-y-1">
                              {leadPageStats.topSources.map((source: {name: string, value: number}, idx: number) => (
                                <div key={idx} className="flex justify-between items-center text-sm">
                                  <span className="text-gray-600">{source.name}</span>
                                  <span className="font-medium text-gray-900">{source.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Top Dispositivos */}
                        {leadPageStats?.topDevices && leadPageStats.topDevices.length > 0 && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Dispositivos Mais Usados</h4>
                            <div className="space-y-1">
                              {leadPageStats.topDevices.map((device: {name: string, value: number}, idx: number) => (
                                <div key={idx} className="flex justify-between items-center text-sm">
                                  <span className="text-gray-600">{device.name}</span>
                                  <span className="font-medium text-gray-900">{device.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Top Navegadores */}
                        {leadPageStats?.topBrowsers && leadPageStats.topBrowsers.length > 0 && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Navegadores Mais Usados</h4>
                            <div className="space-y-1">
                              {leadPageStats.topBrowsers.map((browser: {name: string, value: number}, idx: number) => (
                                <div key={idx} className="flex justify-between items-center text-sm">
                                  <span className="text-gray-600">{browser.name}</span>
                                  <span className="font-medium text-gray-900">{browser.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Top Países */}
                        {leadPageStats?.topCountries && leadPageStats.topCountries.length > 0 && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Países dos Visitantes</h4>
                            <div className="space-y-1">
                              {leadPageStats.topCountries.map((country: {name: string, value: number}, idx: number) => (
                                <div key={idx} className="flex justify-between items-center text-sm">
                                  <span className="text-gray-600">{country.name}</span>
                                  <span className="font-medium text-gray-900">{country.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadPageEditor;
