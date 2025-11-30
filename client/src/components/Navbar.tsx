import type { User } from '../types';

interface NavbarProps {
  user: User | null;
  activeView: string;
  setActiveView: (view: string) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  handleLogout: () => void;
}

function Navbar({ user, activeView, setActiveView, darkMode, toggleDarkMode, handleLogout }: NavbarProps) {
  return (
    <nav className="navbar">
      <div className="nav-brand">
        <img src="/logo.png" alt="Kudos Logo" style={{ height: '80px', marginRight: '10px' }} />
        <span>Kudos Inventory</span>
      </div>
      <div className="nav-links">
        <button onClick={() => setActiveView('dashboard')} className={activeView === 'dashboard' ? 'active' : ''}>
          Dashboard
        </button>
        <button onClick={() => setActiveView('materials')} className={activeView === 'materials' ? 'active' : ''}>
          Materials
        </button>
        <button onClick={() => setActiveView('products')} className={activeView === 'products' ? 'active' : ''}>
          Products
        </button>
        <button onClick={() => setActiveView('receipts')} className={activeView === 'receipts' ? 'active' : ''}>
          Receive
        </button>
        <button onClick={() => setActiveView('production')} className={activeView === 'production' ? 'active' : ''}>
          Production
        </button>
        <button onClick={() => setActiveView('shipments')} className={activeView === 'shipments' ? 'active' : ''}>
          Ship
        </button>
        <button onClick={() => setActiveView('inventory')} className={activeView === 'inventory' ? 'active' : ''}>
          Inventory
        </button>
        <button onClick={() => setActiveView('locations')} className={activeView === 'locations' ? 'active' : ''}>
          Locations
        </button>
        <button onClick={() => setActiveView('users')} className={activeView === 'users' ? 'active' : ''}>
          Users
        </button>
        {user?.role === 'ADMIN' && (
          <button onClick={() => setActiveView('audit')} className={activeView === 'audit' ? 'active' : ''}>
            Audit Log
          </button>
        )}
      </div>
      <div className="nav-user">
        <button onClick={toggleDarkMode} className="btn-theme-toggle" title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
          {darkMode ? '☀️' : '🌙'}
        </button>
        <span>{user?.name} ({user?.role})</span>
        <button onClick={handleLogout} className="btn-logout">Logout</button>
      </div>
    </nav>
  );
}

export default Navbar;