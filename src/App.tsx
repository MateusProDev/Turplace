import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Catalog from './pages/Catalog';
import Login from './components/Auth/Login';
import ServiceForm from './components/Provider/ServiceForm';
import AdminDashboard from './pages/AdminDashboard';
import ServiceDetail from './pages/ServiceDetail';
import RequireAuth from './components/Auth/RequireAuth';
import ProviderDashboard from './pages/ProviderDashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<RequireAuth><ServiceForm /></RequireAuth>} />
        <Route path="/provider" element={<RequireAuth><ProviderDashboard /></RequireAuth>} />
        <Route path="/service/:id" element={<ServiceDetail />} />
        <Route path="/admin" element={<RequireAuth><AdminDashboard /></RequireAuth>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
