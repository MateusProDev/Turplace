import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { uploadToCloudinary } from '../utils/cloudinary';
import { useNavigate } from 'react-router-dom';
import { Save, Palette, Type, User, Settings, ArrowLeft } from 'lucide-react';
import logoSemFundo from '../assets/logosemfundo.png';

interface DashboardSettings {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  fontFamily: string;
  fontSize: 'small' | 'medium' | 'large';
}

const FONT_OPTIONS = [
  { value: 'Inter, sans-serif', label: 'Inter (Padrão)' },
  { value: 'Roboto, sans-serif', label: 'Roboto' },
  { value: 'Open Sans, sans-serif', label: 'Open Sans' },
  { value: 'Lato, sans-serif', label: 'Lato' },
  { value: 'Poppins, sans-serif', label: 'Poppins' },
  { value: 'Montserrat, sans-serif', label: 'Montserrat' },
];

const COLOR_PRESETS = [
  { name: 'Azul Turplace', primary: '#3B82F6', secondary: '#1E40AF', background: '#EFF6FF' },
  { name: 'Verde Natureza', primary: '#10B981', secondary: '#059669', background: '#ECFDF5' },
  { name: 'Roxo Elegante', primary: '#8B5CF6', secondary: '#7C3AED', background: '#F3E8FF' },
  { name: 'Rosa Moderno', primary: '#EC4899', secondary: '#DB2777', background: '#FDF2F8' },
  { name: 'Laranja Energia', primary: '#F97316', secondary: '#EA580C', background: '#FFF7ED' },
  { name: 'Cinza Profissional', primary: '#6B7280', secondary: '#4B5563', background: '#F9FAFB' },
];

export default function ProfileSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'profile' | 'dashboard'>('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Profile state
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [chavePix, setChavePix] = useState('');

  // Dashboard settings state
  const [dashboardSettings, setDashboardSettings] = useState<DashboardSettings>({
    primaryColor: '#3B82F6',
    secondaryColor: '#1E40AF',
    backgroundColor: '#EFF6FF',
    fontFamily: 'Inter, sans-serif',
    fontSize: 'medium',
  });

  // Load user data and settings
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setName(data.name || '');
          setBio(data.bio || '');
          setPhoto(data.photoURL || null);
          setStripeAccountId(data.stripeAccountId || null);
          setChavePix(data.chavePix || '');

          // Load dashboard settings
          if (data.dashboardSettings) {
            setDashboardSettings(data.dashboardSettings);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
    };

    loadData();
  }, [user]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = () => setPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleConnectStripe = async () => {
    if (!user) return;
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/create-stripe-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      });

      if (!response.ok) throw new Error('Erro ao conectar conta Stripe');

      const { url } = await response.json();
      window.location.href = url; // Redirect to Stripe onboarding
    } catch (error) {
      console.error('Erro ao conectar Stripe:', error);
      setMessage('Erro ao conectar conta Stripe. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setLoading(true);
    setMessage('');

    try {
      let photoURL = photo;
      if (photoFile) {
        photoURL = await uploadToCloudinary(photoFile);
      }

      await updateDoc(doc(db, 'users', user.uid), {
        name: name.trim(),
        bio: bio.trim(),
        photoURL,
        chavePix: chavePix.trim(),
        updatedAt: new Date(),
      });

      setMessage('Perfil salvo com sucesso!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      setMessage('Erro ao salvar perfil. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDashboardSettings = async () => {
    if (!user) return;
    setLoading(true);
    setMessage('');

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        dashboardSettings,
        updatedAt: new Date(),
      });

      // Apply settings immediately
      applyDashboardSettings(dashboardSettings);

      setMessage('Configurações do dashboard salvas!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      setMessage('Erro ao salvar configurações. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const applyDashboardSettings = (settings: DashboardSettings) => {
    const root = document.documentElement;
    root.style.setProperty('--dashboard-primary', settings.primaryColor);
    root.style.setProperty('--dashboard-secondary', settings.secondaryColor);
    root.style.setProperty('--dashboard-background', settings.backgroundColor);
    root.style.setProperty('--dashboard-font-family', settings.fontFamily);

    // Apply font size
    const fontSizeMap = { small: '14px', medium: '16px', large: '18px' };
    root.style.setProperty('--dashboard-font-size', fontSizeMap[settings.fontSize]);

    // Save to localStorage for persistence
    localStorage.setItem('dashboardSettings', JSON.stringify(settings));
  };

  const applyColorPreset = (preset: typeof COLOR_PRESETS[0]) => {
    setDashboardSettings(prev => ({
      ...prev,
      primaryColor: preset.primary,
      secondaryColor: preset.secondary,
      backgroundColor: preset.background,
    }));
  };

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('dashboardSettings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        setDashboardSettings(settings);
        applyDashboardSettings(settings);
      } catch (error) {
        console.error('Erro ao carregar configurações salvas:', error);
      }
    }
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Acesso Restrito</h2>
          <p className="text-gray-600 mb-6">Por favor, faça login para acessar as configurações.</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Fazer Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
                <p className="text-gray-600">Personalize seu perfil e dashboard</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 -mb-px">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-3 py-3 px-6 border-b-2 font-semibold text-sm transition-all duration-200 rounded-t-lg ${
                activeTab === 'profile'
                  ? 'border-blue-600 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <User size={20} />
              Perfil
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-3 py-3 px-6 border-b-2 font-semibold text-sm transition-all duration-200 rounded-t-lg ${
                activeTab === 'dashboard'
                  ? 'border-blue-600 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Settings size={20} />
              Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-lg border border-green-200">
            {message}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center gap-3 mb-8">
              <User className="text-blue-600" size={24} />
              <h2 className="text-2xl font-bold text-gray-900">Informações do Perfil</h2>
            </div>

            {/* Photo Upload */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Foto do Perfil
              </label>
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg">
                    <img
                      src={photo || logoSemFundo}
                      alt="Foto do perfil"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <label className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 cursor-pointer hover:bg-blue-700 transition">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </label>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    Clique no ícone + para alterar sua foto
                  </p>
                  <p className="text-xs text-gray-500">
                    Formatos aceitos: JPG, PNG. Tamanho máximo: 5MB
                  </p>
                </div>
              </div>
            </div>

            {/* Name */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome Completo
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="Seu nome completo"
              />
            </div>

            {/* Bio */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Biografia
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition min-h-[120px] resize-none"
                placeholder="Conte um pouco sobre sua experiência..."
                maxLength={500}
              />
              <div className="text-xs text-gray-500 text-right mt-1">
                {bio.length}/500 caracteres
              </div>
            </div>

            {/* Chave PIX */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chave PIX
              </label>
              <input
                type="text"
                value={chavePix}
                onChange={(e) => setChavePix(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="Sua chave PIX (CPF, email, telefone, etc.)"
              />
              <p className="text-xs text-gray-500 mt-1">
                Necessária para receber pagamentos via PIX.
              </p>
            </div>

            {/* Stripe Account */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Conta Stripe para Recebimentos
              </label>
              {stripeAccountId ? (
                <div className="p-4 bg-green-100 text-green-700 rounded-lg border border-green-200">
                  Conta Stripe conectada com sucesso!
                </div>
              ) : (
                <button
                  onClick={handleConnectStripe}
                  disabled={loading}
                  className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-purple-700 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                      </svg>
                      Conectando...
                    </>
                  ) : (
                    <>
                      Conectar Conta Stripe
                    </>
                  )}
                </button>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Conecte sua conta Stripe para receber pagamentos dos seus serviços.
              </p>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                  </svg>
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Salvar Perfil
                </>
              )}
            </button>
          </div>
        )}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Color Customization */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="flex items-center gap-3 mb-8">
                <Palette className="text-blue-600" size={24} />
                <h2 className="text-2xl font-bold text-gray-900">Personalização de Cores</h2>
              </div>

              {/* Color Presets */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Tema Pré-definido</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {COLOR_PRESETS.map((preset, index) => (
                    <button
                      key={index}
                      onClick={() => applyColorPreset(preset)}
                      className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 transition-all duration-200 text-left"
                    >
                      <div className="flex gap-2 mb-2">
                        <div
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: preset.primary }}
                        ></div>
                        <div
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: preset.secondary }}
                        ></div>
                        <div
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: preset.background }}
                        ></div>
                      </div>
                      <div className="text-sm font-medium text-gray-900">{preset.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Colors */}
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cor Primária
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="color"
                      value={dashboardSettings.primaryColor}
                      onChange={(e) => setDashboardSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={dashboardSettings.primaryColor}
                      onChange={(e) => setDashboardSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cor Secundária
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="color"
                      value={dashboardSettings.secondaryColor}
                      onChange={(e) => setDashboardSettings(prev => ({ ...prev, secondaryColor: e.target.value }))}
                      className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={dashboardSettings.secondaryColor}
                      onChange={(e) => setDashboardSettings(prev => ({ ...prev, secondaryColor: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="#1E40AF"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fundo do Dashboard
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="color"
                      value={dashboardSettings.backgroundColor}
                      onChange={(e) => setDashboardSettings(prev => ({ ...prev, backgroundColor: e.target.value }))}
                      className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={dashboardSettings.backgroundColor}
                      onChange={(e) => setDashboardSettings(prev => ({ ...prev, backgroundColor: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="#EFF6FF"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Typography Customization */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="flex items-center gap-3 mb-8">
                <Type className="text-blue-600" size={24} />
                <h2 className="text-2xl font-bold text-gray-900">Personalização de Tipografia</h2>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Família da Fonte
                  </label>
                  <select
                    value={dashboardSettings.fontFamily}
                    onChange={(e) => setDashboardSettings(prev => ({ ...prev, fontFamily: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    style={{ fontFamily: dashboardSettings.fontFamily }}
                  >
                    {FONT_OPTIONS.map((font) => (
                      <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                        {font.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Tamanho da Fonte
                  </label>
                  <select
                    value={dashboardSettings.fontSize}
                    onChange={(e) => setDashboardSettings(prev => ({ ...prev, fontSize: e.target.value as 'small' | 'medium' | 'large' }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="small">Pequeno (14px)</option>
                    <option value="medium">Médio (16px)</option>
                    <option value="large">Grande (18px)</option>
                  </select>
                </div>
              </div>

              {/* Preview */}
              <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Prévia das Configurações</h3>
                <div
                  className="p-4 rounded-lg border"
                  style={{
                    backgroundColor: dashboardSettings.backgroundColor,
                    fontFamily: dashboardSettings.fontFamily,
                    fontSize: dashboardSettings.fontSize === 'small' ? '14px' : dashboardSettings.fontSize === 'large' ? '18px' : '16px'
                  }}
                >
                  <div className="flex gap-3 mb-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: dashboardSettings.primaryColor }}
                    ></div>
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: dashboardSettings.secondaryColor }}
                    ></div>
                  </div>
                  <p className="text-gray-800">
                    Este é um exemplo de como seu dashboard ficará com as configurações selecionadas.
                    Você pode ajustar cores, fonte e tamanho para personalizar sua experiência.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveDashboardSettings}
                disabled={loading}
                className="bg-blue-600 text-white py-3 px-8 rounded-lg font-semibold hover:bg-blue-700 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                    </svg>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    Salvar Configurações
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
