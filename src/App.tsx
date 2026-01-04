import ProfileSettings from './pages/ProfileSettings';
import LeadPageEditor from './pages/LeadPageEditor';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import Landing from './pages/Landing';
import Catalog from './pages/Catalog';
import Marketplace from './pages/Marketplace';
import Login from './components/Auth/Login';
import ClientLogin from './components/Auth/ClientLogin';
import ProviderLogin from './components/Auth/ProviderLogin';
import ServiceForm from './components/Provider/ServiceForm';
import AdminDashboard from './pages/AdminDashboard';
import ServiceDetail from './pages/ServiceDetail';
import CourseDetail from './pages/CourseDetail';
import RequireAuth from './components/Auth/RequireAuth';
import ProviderDashboard from './pages/ProviderDashboard';
import ClientDashboard from './pages/ClientDashboard';
import DashboardSelector from './pages/DashboardSelector';
import HowItWorks from './pages/HowItWorks';
import Partnerships from './pages/Partnerships';
import Contact from './pages/Contact';
import Wallet from './pages/Wallet';
import Checkout from './pages/Checkout';
import ServiceDiagnostics from './pages/ServiceDiagnostics';
import Success from './pages/Success';
import ResetPassword from './pages/ResetPassword';
import RequireAdmin from './components/Auth/RequireAdmin';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/profile" element={<Navigate to="/profile/settings" replace />} />
        <Route path="/profile/settings" element={<ProfileSettings />} />
        <Route path="/profile/leadpage" element={<RequireAuth><LeadPageEditor /></RequireAuth>} />
        <Route path="/login" element={<Login />} />
        <Route path="/select-dashboard" element={<RequireAuth><DashboardSelector /></RequireAuth>} />
        <Route path="/provider-login" element={<ProviderLogin />} />
        <Route path="/client-login" element={<ClientLogin />} />
        <Route path="/dashboard" element={<RequireAuth><ServiceForm /></RequireAuth>} />
        <Route path="/dashboard/service/new" element={<RequireAuth><ServiceForm /></RequireAuth>} />
        <Route path="/provider" element={<RequireAuth><ProviderDashboard /></RequireAuth>} />
        <Route path="/client" element={<RequireAuth><ClientDashboard /></RequireAuth>} />
        <Route path="/service/:slug" element={<ServiceDetail />} />
        <Route path="/course/:slug" element={<CourseDetail />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/success" element={<Success />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/cancel" element={<div className="min-h-screen flex items-center justify-center"><div className="text-center"><h1 className="text-2xl font-bold text-gray-900 mb-4">Pagamento Cancelado</h1><p className="text-gray-600 mb-6">Você cancelou o pagamento. Pode tentar novamente quando quiser.</p><Link to="/catalog" className="px-6 py-3 bg-gradient-to-r from-[#0097b2] to-[#7ed957] text-white rounded-lg font-semibold hover:opacity-90 transition">Voltar ao Catálogo</Link></div></div>} />
        <Route path="/diagnostics" element={<ServiceDiagnostics />} />
        <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/partnerships" element={<Partnerships />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/wallet" element={<RequireAuth><Wallet /></RequireAuth>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
