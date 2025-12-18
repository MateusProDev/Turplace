import ProfileSettings from './pages/ProfileSettings';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Catalog from './pages/Catalog';
import Login from './components/Auth/Login';
import { useAuth } from './hooks/useAuth';
import ServiceForm from './components/Provider/ServiceForm';
import AdminDashboard from './pages/AdminDashboard';
import ServiceDetail from './pages/ServiceDetail';
import RequireAuth from './components/Auth/RequireAuth';
import ProviderDashboard from './pages/ProviderDashboard';
import HowItWorks from './pages/HowItWorks';
import Partnerships from './pages/Partnerships';
import Contact from './pages/Contact';
import Wallet from './pages/Wallet';

function App() {
  const { user } = useAuth();
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/profile/settings" element={<ProfileSettings />} />
        <Route path="/login" element={user ? <RequireAuth><ProviderDashboard /></RequireAuth> : <Login />} />
        <Route path="/dashboard" element={<RequireAuth><ServiceForm /></RequireAuth>} />
        <Route path="/dashboard/service/new" element={<RequireAuth><ServiceForm /></RequireAuth>} />
        <Route path="/provider" element={<RequireAuth><ProviderDashboard /></RequireAuth>} />
        <Route path="/service/:id" element={<ServiceDetail />} />
        <Route path="/admin" element={<RequireAuth><AdminDashboard /></RequireAuth>} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/partnerships" element={<Partnerships />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/wallet" element={<RequireAuth><Wallet /></RequireAuth>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
