import { useState, useEffect } from 'react';
import './App.css';
import type { User } from './types';
import Login from './components/Login';
import Navbar from './components/Navbar';
import DashboardView from './components/views/DashboardView';
import MaterialsView from './components/views/MaterialsView';
import ProductsView from './components/views/ProductsView';
import ReceiptsView from './components/views/ReceiptsView';
import ProductionView from './components/views/ProductionView';
import ShipmentsView from './components/views/ShipmentsView';
import InventoryView from './components/views/InventoryView';
import LocationsView from './components/views/LocationsView';
import UsersView from './components/views/UsersView';
import AuditLogView from './components/views/AuditLogView';

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  // Apply dark mode theme
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Check if user is logged in
  useEffect(() => {
    if (token) {
      // Decode JWT to get user info (simple decode, not verification)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({
          id: payload.sub,
          email: payload.email,
          role: payload.role,
          name: payload.email.split('@')[0]
        });
      } catch (e) {
        localStorage.removeItem('token');
        setToken(null);
      }
    }
  }, [token]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleLogin = (accessToken: string) => {
    localStorage.setItem('token', accessToken);
    setToken(accessToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  if (!token) {
    return (
      <Login
        onLogin={handleLogin}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
      />
    );
  }

  return (
    <div className="app">
      <Navbar
        user={user}
        activeView={activeView}
        setActiveView={setActiveView}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        handleLogout={handleLogout}
      />

      <main className="main-content">
        {activeView === 'dashboard' && <DashboardView />}
        {activeView === 'materials' && <MaterialsView />}
        {activeView === 'products' && <ProductsView />}
        {activeView === 'receipts' && <ReceiptsView />}
        {activeView === 'production' && <ProductionView />}
        {activeView === 'shipments' && <ShipmentsView />}
        {activeView === 'inventory' && <InventoryView currentUserRole={user?.role} />}
        {activeView === 'locations' && <LocationsView currentUserRole={user?.role} />}
        {activeView === 'users' && <UsersView currentUserRole={user?.role} />}
        {activeView === 'audit' && user?.role === 'ADMIN' && <AuditLogView />}
      </main>
    </div>
  );
}

export default App;