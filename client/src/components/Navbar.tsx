import type { User } from '../types';
import NavDropdown from './NavDropdown';
import type { NavDropdownItem } from './NavDropdown';

interface NavbarProps {
  user: User | null;
  activeView: string;
  setActiveView: (view: string) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  handleLogout: () => void;
}

const INVENTORY_ITEMS: NavDropdownItem[] = [
  { key: 'inventory', label: 'Inventory' },
  { key: 'purchasing', label: 'Purchasing' },
  { key: 'receipts', label: 'Receiving' },
  { key: 'transfers', label: 'Transfers' },
  { key: 'locations', label: 'Warehousing' },
  { key: 'materials', label: 'Materials' },
  { key: 'products', label: 'Products' },
  { key: 'shipments', label: 'Shipping' }
];

const PRODUCTION_ITEMS: NavDropdownItem[] = [
  { key: 'workstations', label: 'Work Stations' },
  { key: 'boms', label: 'BOMs' },
  { key: 'operations', label: 'Operations' },
  { key: 'production', label: 'Production Runs' }
];

function Navbar({ user, activeView, setActiveView, darkMode, toggleDarkMode, handleLogout }: NavbarProps) {
  const settingsItems: NavDropdownItem[] = [
    { key: 'users', label: 'Users' },
    ...(user?.role === 'ADMIN' ? [{ key: 'audit', label: 'Audit Logs' }] : [])
  ];

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
        <NavDropdown label="Inventory" items={INVENTORY_ITEMS} activeView={activeView} onSelect={setActiveView} />
        <NavDropdown label="Production" items={PRODUCTION_ITEMS} activeView={activeView} onSelect={setActiveView} />
        <NavDropdown label="Settings" items={settingsItems} activeView={activeView} onSelect={setActiveView} />
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
