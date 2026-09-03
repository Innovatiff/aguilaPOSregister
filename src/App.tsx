import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useSession } from './state/session';
import { initPos } from './state/pos';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CustomerDisplayPage from './pages/CustomerDisplayPage';
import SettingsPage from './pages/SettingsPage';
import ReportsPage from './pages/ReportsPage';
import AboutPage from './pages/AboutPage';
import Modals from './components/modals/Modals';
import Toasts from './components/Toasts';

function Home() {
  const status = useSession((s) => s.status);
  return status === 'active' ? <RegisterPage /> : <LoginPage />;
}

function RequireActive({ children }: { children: React.ReactNode }) {
  const status = useSession((s) => s.status);
  return status === 'active' ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  useEffect(() => {
    initPos();
  }, []);
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/customer" element={<CustomerDisplayPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route
          path="/reports"
          element={
            <RequireActive>
              <ReportsPage />
            </RequireActive>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Modals />
      <Toasts />
    </>
  );
}
