import { useState, useEffect } from 'react';
import './App.css';
import apiClient from './api/client';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const accessToken = response.data.accessToken;
      localStorage.setItem('token', accessToken);
      setToken(accessToken);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setEmail('');
    setPassword('');
  };

  if (!token) {
    return (
      <div className="login-container">
        <button
          onClick={toggleDarkMode}
          className="btn-theme-toggle-login"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
        <div className="login-box">
          <img src="/logo-full.png" alt="Kudos Inventory System" style={{ width: '300px', marginBottom: '20px' }} />
          <h2>Login</h2>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@kudos.local"
                required
              />
            </div>
            <div className="form-group">
              <label>Password:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Admin123!"
                required
              />
            </div>
            {error && <div className="error">{error}</div>}
            <button type="submit" className="btn-primary">Login</button>
          </form>
          <div className="login-hint">
            <p>Test Credentials:</p>
            <p>Admin: admin@kudos.local / Admin123!</p>
            <p>Associate: john@kudos.local / Associate123!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
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

// Dashboard View
function DashboardView() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [materials, products, stock, lowStock] = await Promise.all([
        apiClient.get('/materials'),
        apiClient.get('/products'),
        apiClient.get('/inventory/stock'),
        apiClient.get('/inventory/low-stock')
      ]);

      setStats({
        materialCount: materials.data.length,
        productCount: products.data.length,
        stockItems: stock.data.length,
        lowStockCount: lowStock.data.length
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  if (!stats) return <div>Loading...</div>;

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Materials</h3>
          <div className="stat-number">{stats.materialCount}</div>
        </div>
        <div className="stat-card">
          <h3>Products</h3>
          <div className="stat-number">{stats.productCount}</div>
        </div>
        <div className="stat-card">
          <h3>Stock Items</h3>
          <div className="stat-number">{stats.stockItems}</div>
        </div>
        <div className="stat-card alert">
          <h3>Low Stock Alerts</h3>
          <div className="stat-number">{stats.lowStockCount}</div>
        </div>
      </div>
    </div>
  );
}

// Materials View
function MaterialsView() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    uom: '',
    minStock: '0',
    active: true
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = async () => {
    try {
      const response = await apiClient.get('/materials');
      setMaterials(response.data);
    } catch (error) {
      console.error('Failed to load materials:', error);
    }
  };

  const handleEdit = (material: any) => {
    setEditingId(material.id);
    setEditForm({ ...material });
  };

  const handleSave = async (id: number) => {
    try {
      await apiClient.put(`/materials/${id}`, editForm);
      setEditingId(null);
      loadMaterials();
    } catch (error) {
      console.error('Failed to update material:', error);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await apiClient.post('/materials', {
        ...formData,
        minStock: parseFloat(formData.minStock)
      });
      setSuccess('Material created successfully!');
      setFormData({ sku: '', name: '', uom: '', minStock: '0', active: true });
      setShowAddForm(false);
      loadMaterials();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create material');
    }
  };

  return (
    <div className="view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Materials</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary"
          style={{ width: 'auto', padding: '10px 20px' }}
        >
          {showAddForm ? 'Cancel' : 'Add Material'}
        </button>
      </div>

      {showAddForm && (
        <div style={{
          background: '#f8f9fa',
          padding: '20px',
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <h3 style={{ marginBottom: '15px' }}>New Material</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>SKU:</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Name:</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Unit of Measure (UOM):</label>
              <input
                type="text"
                value={formData.uom}
                onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                required
                placeholder="e.g., EA, LB, FT"
              />
            </div>
            <div className="form-group">
              <label>Minimum Stock Level:</label>
              <input
                type="number"
                step="0.01"
                value={formData.minStock}
                onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Status:</label>
              <select
                value={formData.active ? 'true' : 'false'}
                onChange={(e) => setFormData({ ...formData, active: e.target.value === 'true' })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '14px'
                }}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>

            {error && <div className="error">{error}</div>}
            {success && <div style={{
              background: '#d4edda',
              color: '#155724',
              padding: '10px',
              borderRadius: '5px',
              marginBottom: '15px',
              textAlign: 'center'
            }}>{success}</div>}
            <button type="submit" className="btn-primary">Create Material</button>
          </form>
        </div>
      )}

      {error && !showAddForm && <div className="error" style={{ marginBottom: '15px' }}>{error}</div>}
      {success && !showAddForm && <div style={{
        background: '#d4edda',
        color: '#155724',
        padding: '10px',
        borderRadius: '5px',
        marginBottom: '15px',
        textAlign: 'center'
      }}>{success}</div>}

      <table className="data-table">
        <thead>
          <tr>
            <th>SKU</th>
            <th>Name</th>
            <th>UOM</th>
            <th>Min Stock</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {materials.map(material => (
            <tr key={material.id}>
              {editingId === material.id ? (
                <>
                  <td><input value={editForm.sku} onChange={(e) => setEditForm({...editForm, sku: e.target.value})} style={{width: '100%', padding: '5px'}} /></td>
                  <td><input value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} style={{width: '100%', padding: '5px'}} /></td>
                  <td><input value={editForm.uom} onChange={(e) => setEditForm({...editForm, uom: e.target.value})} style={{width: '100%', padding: '5px'}} /></td>
                  <td><input type="number" value={editForm.minStock} onChange={(e) => setEditForm({...editForm, minStock: parseFloat(e.target.value)})} style={{width: '100%', padding: '5px'}} /></td>
                  <td>
                    <select value={editForm.active ? 'true' : 'false'} onChange={(e) => setEditForm({...editForm, active: e.target.value === 'true'})} style={{width: '100%', padding: '5px'}}>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </td>
                  <td>
                    <button onClick={() => handleSave(material.id)} style={{padding: '5px 10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', marginRight: '5px'}}>Save</button>
                    <button onClick={handleCancel} style={{padding: '5px 10px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer'}}>Cancel</button>
                  </td>
                </>
              ) : (
                <>
                  <td>{material.sku}</td>
                  <td>{material.name}</td>
                  <td>{material.uom}</td>
                  <td>{material.minStock}</td>
                  <td>{material.active ? 'Active' : 'Inactive'}</td>
                  <td>
                    <button onClick={() => handleEdit(material)} style={{padding: '5px 10px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer'}}>
                      ✏️ Edit
                    </button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Products View
function ProductsView() {
  const [products, setProducts] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    uom: '',
    active: true
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await apiClient.get('/products');
      setProducts(response.data);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const handleEdit = (product: any) => {
    setEditingId(product.id);
    setEditForm({ ...product });
  };

  const handleSave = async (id: number) => {
    try {
      await apiClient.put(`/products/${id}`, editForm);
      setEditingId(null);
      loadProducts();
    } catch (error) {
      console.error('Failed to update product:', error);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await apiClient.post('/products', formData);
      setSuccess('Product created successfully!');
      setFormData({ sku: '', name: '', uom: '', active: true });
      setShowAddForm(false);
      loadProducts();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create product');
    }
  };

  return (
    <div className="view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Products</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary"
          style={{ width: 'auto', padding: '10px 20px' }}
        >
          {showAddForm ? 'Cancel' : 'Add Product'}
        </button>
      </div>

      {showAddForm && (
        <div style={{
          background: '#f8f9fa',
          padding: '20px',
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <h3 style={{ marginBottom: '15px' }}>New Product</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>SKU:</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Name:</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Unit of Measure (UOM):</label>
              <input
                type="text"
                value={formData.uom}
                onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                required
                placeholder="e.g., EA, LB, FT"
              />
            </div>
            <div className="form-group">
              <label>Status:</label>
              <select
                value={formData.active ? 'true' : 'false'}
                onChange={(e) => setFormData({ ...formData, active: e.target.value === 'true' })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '14px'
                }}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>

            {error && <div className="error">{error}</div>}
            {success && <div style={{
              background: '#d4edda',
              color: '#155724',
              padding: '10px',
              borderRadius: '5px',
              marginBottom: '15px',
              textAlign: 'center'
            }}>{success}</div>}
            <button type="submit" className="btn-primary">Create Product</button>
          </form>
        </div>
      )}

      {error && !showAddForm && <div className="error" style={{ marginBottom: '15px' }}>{error}</div>}
      {success && !showAddForm && <div style={{
        background: '#d4edda',
        color: '#155724',
        padding: '10px',
        borderRadius: '5px',
        marginBottom: '15px',
        textAlign: 'center'
      }}>{success}</div>}

      <table className="data-table">
        <thead>
          <tr>
            <th>SKU</th>
            <th>Name</th>
            <th>UOM</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map(product => (
            <tr key={product.id}>
              {editingId === product.id ? (
                <>
                  <td><input value={editForm.sku} onChange={(e) => setEditForm({...editForm, sku: e.target.value})} style={{width: '100%', padding: '5px'}} /></td>
                  <td><input value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} style={{width: '100%', padding: '5px'}} /></td>
                  <td><input value={editForm.uom} onChange={(e) => setEditForm({...editForm, uom: e.target.value})} style={{width: '100%', padding: '5px'}} /></td>
                  <td>
                    <select value={editForm.active ? 'true' : 'false'} onChange={(e) => setEditForm({...editForm, active: e.target.value === 'true'})} style={{width: '100%', padding: '5px'}}>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </td>
                  <td>
                    <button onClick={() => handleSave(product.id)} style={{padding: '5px 10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', marginRight: '5px'}}>Save</button>
                    <button onClick={handleCancel} style={{padding: '5px 10px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer'}}>Cancel</button>
                  </td>
                </>
              ) : (
                <>
                  <td>{product.sku}</td>
                  <td>{product.name}</td>
                  <td>{product.uom}</td>
                  <td>{product.active ? 'Active' : 'Inactive'}</td>
                  <td>
                    <button onClick={() => handleEdit(product)} style={{padding: '5px 10px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer'}}>
                      ✏️ Edit
                    </button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Receipts View
function ReceiptsView() {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    supplierName: '',
    receivedAt: new Date().toISOString().split('T')[0],
    lines: [{ materialId: '', qty: '', locationId: '' }]
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedReceiptId, setExpandedReceiptId] = useState<number | null>(null);

  useEffect(() => {
    loadReceipts();
    loadMaterials();
    loadLocations();
  }, []);

  const loadReceipts = async () => {
    try {
      const response = await apiClient.get('/receipts');
      setReceipts(response.data);
    } catch (error) {
      console.error('Failed to load receipts:', error);
    }
  };

  const loadMaterials = async () => {
    try {
      const response = await apiClient.get('/materials');
      setMaterials(response.data.filter((m: any) => m.active));
    } catch (error) {
      console.error('Failed to load materials:', error);
    }
  };

  const loadLocations = async () => {
    try {
      const response = await apiClient.get('/locations');
      setLocations(response.data);
    } catch (error) {
      console.error('Failed to load locations:', error);
    }
  };

  const handleAddLine = () => {
    setFormData({
      ...formData,
      lines: [...formData.lines, { materialId: '', qty: '', locationId: '' }]
    });
  };

  const handleRemoveLine = (index: number) => {
    setFormData({
      ...formData,
      lines: formData.lines.filter((_, i) => i !== index)
    });
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    const newLines = [...formData.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setFormData({ ...formData, lines: newLines });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await apiClient.post('/receipts', {
        ...formData,
        lines: formData.lines.map(line => ({
          materialId: parseInt(line.materialId),
          qty: parseFloat(line.qty),
          locationId: parseInt(line.locationId)
        }))
      });
      setSuccess('Receipt created successfully!');
      setFormData({
        supplierName: '',
        receivedAt: new Date().toISOString().split('T')[0],
        lines: [{ materialId: '', qty: '', locationId: '' }]
      });
      setShowAddForm(false);
      loadReceipts();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create receipt');
    }
  };

  const toggleExpand = (receiptId: number) => {
    setExpandedReceiptId(expandedReceiptId === receiptId ? null : receiptId);
  };

  return (
    <div className="view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Material Receipts</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary"
          style={{ width: 'auto', padding: '10px 20px' }}
        >
          {showAddForm ? 'Cancel' : 'Receive Materials'}
        </button>
      </div>

      {showAddForm && (
        <div style={{
          background: '#f8f9fa',
          padding: '20px',
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <h3 style={{ marginBottom: '15px' }}>New Receipt</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Supplier Name:</label>
              <input
                type="text"
                value={formData.supplierName}
                onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Received Date:</label>
              <input
                type="date"
                value={formData.receivedAt}
                onChange={(e) => setFormData({ ...formData, receivedAt: e.target.value })}
                required
              />
            </div>

            <h4 style={{ marginTop: '20px', marginBottom: '10px' }}>Line Items:</h4>
            {formData.lines.map((line, index) => (
              <div key={index} style={{
                background: 'white',
                padding: '15px',
                borderRadius: '5px',
                marginBottom: '10px',
                border: '1px solid #ddd'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr auto', gap: '10px', alignItems: 'end' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Material:</label>
                    <select
                      value={line.materialId}
                      onChange={(e) => handleLineChange(index, 'materialId', e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '5px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="">Select material...</option>
                      {materials.map(m => (
                        <option key={m.id} value={m.id}>{m.sku} - {m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Quantity:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={line.qty}
                      onChange={(e) => handleLineChange(index, 'qty', e.target.value)}
                      required
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Location:</label>
                    <select
                      value={line.locationId}
                      onChange={(e) => handleLineChange(index, 'locationId', e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '5px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="">Select location...</option>
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.code}</option>
                      ))}
                    </select>
                  </div>
                  {formData.lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLine(index)}
                      style={{
                        padding: '12px 15px',
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer'
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddLine}
              style={{
                padding: '10px 20px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                marginBottom: '15px'
              }}
            >
              Add Line
            </button>

            {error && <div className="error">{error}</div>}
            {success && <div style={{
              background: '#d4edda',
              color: '#155724',
              padding: '10px',
              borderRadius: '5px',
              marginBottom: '15px',
              textAlign: 'center'
            }}>{success}</div>}
            <button type="submit" className="btn-primary">Create Receipt</button>
          </form>
        </div>
      )}

      {error && !showAddForm && <div className="error" style={{ marginBottom: '15px' }}>{error}</div>}
      {success && !showAddForm && <div style={{
        background: '#d4edda',
        color: '#155724',
        padding: '10px',
        borderRadius: '5px',
        marginBottom: '15px',
        textAlign: 'center'
      }}>{success}</div>}

      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Supplier</th>
            <th>Received Date</th>
            <th>Lines</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {receipts.map(receipt => (
            <>
              <tr key={receipt.id}>
                <td>{receipt.id}</td>
                <td>{receipt.supplierName}</td>
                <td>{new Date(receipt.receivedAt).toLocaleDateString()}</td>
                <td>{receipt.ReceiptLines?.length || 0}</td>
                <td>
                  <button
                    onClick={() => toggleExpand(receipt.id)}
                    style={{
                      padding: '5px 10px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                  >
                    {expandedReceiptId === receipt.id ? 'Hide Details' : 'Show Details'}
                  </button>
                </td>
              </tr>
              {expandedReceiptId === receipt.id && receipt.ReceiptLines && (
                <tr>
                  <td colSpan={5} style={{ background: '#f8f9fa', padding: '15px' }}>
                    <table style={{ width: '100%', background: 'white' }}>
                      <thead>
                        <tr>
                          <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Material</th>
                          <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Quantity</th>
                          <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Location</th>
                        </tr>
                      </thead>
                      <tbody>
                        {receipt.ReceiptLines.map((line: any, idx: number) => (
                          <tr key={idx}>
                            <td style={{ padding: '8px' }}>{line.Material?.name || `Material #${line.materialId}`}</td>
                            <td style={{ padding: '8px' }}>{parseFloat(line.qty).toFixed(2)}</td>
                            <td style={{ padding: '8px' }}>{line.Location?.code || `Location #${line.locationId}`}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Production View
function ProductionView() {
  const [productionRuns, setProductionRuns] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    productId: '',
    quantityProduced: '',
    locationId: '',
    startedAt: new Date().toISOString().split('T')[0],
    completedAt: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadProductionRuns();
    loadProducts();
    loadLocations();
  }, []);

  const loadProductionRuns = async () => {
    try {
      const response = await apiClient.get('/production');
      setProductionRuns(response.data);
    } catch (error) {
      console.error('Failed to load production runs:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await apiClient.get('/products');
      setProducts(response.data.filter((p: any) => p.active));
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const loadLocations = async () => {
    try {
      const response = await apiClient.get('/locations');
      setLocations(response.data);
    } catch (error) {
      console.error('Failed to load locations:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await apiClient.post('/production', {
        ...formData,
        productId: parseInt(formData.productId),
        quantityProduced: parseFloat(formData.quantityProduced),
        locationId: parseInt(formData.locationId)
      });
      setSuccess('Production run created successfully!');
      setFormData({
        productId: '',
        quantityProduced: '',
        locationId: '',
        startedAt: new Date().toISOString().split('T')[0],
        completedAt: new Date().toISOString().split('T')[0],
        notes: ''
      });
      setShowAddForm(false);
      loadProductionRuns();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create production run');
    }
  };

  return (
    <div className="view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Production Runs</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary"
          style={{ width: 'auto', padding: '10px 20px' }}
        >
          {showAddForm ? 'Cancel' : 'Run Production'}
        </button>
      </div>

      {showAddForm && (
        <div style={{
          background: '#f8f9fa',
          padding: '20px',
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <h3 style={{ marginBottom: '15px' }}>New Production Run</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Product:</label>
              <select
                value={formData.productId}
                onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '14px'
                }}
              >
                <option value="">Select product...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Quantity Produced:</label>
              <input
                type="number"
                step="0.01"
                value={formData.quantityProduced}
                onChange={(e) => setFormData({ ...formData, quantityProduced: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Location:</label>
              <select
                value={formData.locationId}
                onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '14px'
                }}
              >
                <option value="">Select location...</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.code}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Started At:</label>
              <input
                type="date"
                value={formData.startedAt}
                onChange={(e) => setFormData({ ...formData, startedAt: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Completed At:</label>
              <input
                type="date"
                value={formData.completedAt}
                onChange={(e) => setFormData({ ...formData, completedAt: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Notes (optional):</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '14px',
                  minHeight: '80px'
                }}
              />
            </div>

            {error && <div className="error">{error}</div>}
            {success && <div style={{
              background: '#d4edda',
              color: '#155724',
              padding: '10px',
              borderRadius: '5px',
              marginBottom: '15px',
              textAlign: 'center'
            }}>{success}</div>}
            <button type="submit" className="btn-primary">Create Production Run</button>
          </form>
        </div>
      )}

      {error && !showAddForm && <div className="error" style={{ marginBottom: '15px' }}>{error}</div>}
      {success && !showAddForm && <div style={{
        background: '#d4edda',
        color: '#155724',
        padding: '10px',
        borderRadius: '5px',
        marginBottom: '15px',
        textAlign: 'center'
      }}>{success}</div>}

      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Product</th>
            <th>Quantity</th>
            <th>Started</th>
            <th>Completed</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {productionRuns.map(run => (
            <tr key={run.id}>
              <td>{run.id}</td>
              <td>{run.Product?.name || `Product #${run.productId}`}</td>
              <td>{parseFloat(run.quantityProduced).toFixed(2)}</td>
              <td>{new Date(run.startedAt).toLocaleDateString()}</td>
              <td>{new Date(run.completedAt).toLocaleDateString()}</td>
              <td>{run.notes || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Shipments View
function ShipmentsView() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    shippedAt: new Date().toISOString().split('T')[0],
    lines: [{ productId: '', qty: '', locationId: '' }]
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedShipmentId, setExpandedShipmentId] = useState<number | null>(null);

  useEffect(() => {
    loadShipments();
    loadProducts();
    loadLocations();
  }, []);

  const loadShipments = async () => {
    try {
      const response = await apiClient.get('/shipments');
      setShipments(response.data);
    } catch (error) {
      console.error('Failed to load shipments:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await apiClient.get('/products');
      setProducts(response.data.filter((p: any) => p.active));
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const loadLocations = async () => {
    try {
      const response = await apiClient.get('/locations');
      setLocations(response.data);
    } catch (error) {
      console.error('Failed to load locations:', error);
    }
  };

  const handleAddLine = () => {
    setFormData({
      ...formData,
      lines: [...formData.lines, { productId: '', qty: '', locationId: '' }]
    });
  };

  const handleRemoveLine = (index: number) => {
    setFormData({
      ...formData,
      lines: formData.lines.filter((_, i) => i !== index)
    });
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    const newLines = [...formData.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setFormData({ ...formData, lines: newLines });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await apiClient.post('/shipments', {
        ...formData,
        lines: formData.lines.map(line => ({
          productId: parseInt(line.productId),
          qty: parseFloat(line.qty),
          locationId: parseInt(line.locationId)
        }))
      });
      setSuccess('Shipment created successfully!');
      setFormData({
        customerName: '',
        shippedAt: new Date().toISOString().split('T')[0],
        lines: [{ productId: '', qty: '', locationId: '' }]
      });
      setShowAddForm(false);
      loadShipments();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create shipment');
    }
  };

  const toggleExpand = (shipmentId: number) => {
    setExpandedShipmentId(expandedShipmentId === shipmentId ? null : shipmentId);
  };

  return (
    <div className="view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Product Shipments</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary"
          style={{ width: 'auto', padding: '10px 20px' }}
        >
          {showAddForm ? 'Cancel' : 'Ship Products'}
        </button>
      </div>

      {showAddForm && (
        <div style={{
          background: '#f8f9fa',
          padding: '20px',
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <h3 style={{ marginBottom: '15px' }}>New Shipment</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Customer Name:</label>
              <input
                type="text"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Shipped Date:</label>
              <input
                type="date"
                value={formData.shippedAt}
                onChange={(e) => setFormData({ ...formData, shippedAt: e.target.value })}
                required
              />
            </div>

            <h4 style={{ marginTop: '20px', marginBottom: '10px' }}>Line Items:</h4>
            {formData.lines.map((line, index) => (
              <div key={index} style={{
                background: 'white',
                padding: '15px',
                borderRadius: '5px',
                marginBottom: '10px',
                border: '1px solid #ddd'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr auto', gap: '10px', alignItems: 'end' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Product:</label>
                    <select
                      value={line.productId}
                      onChange={(e) => handleLineChange(index, 'productId', e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '5px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="">Select product...</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Quantity:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={line.qty}
                      onChange={(e) => handleLineChange(index, 'qty', e.target.value)}
                      required
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Location:</label>
                    <select
                      value={line.locationId}
                      onChange={(e) => handleLineChange(index, 'locationId', e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '5px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="">Select location...</option>
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.code}</option>
                      ))}
                    </select>
                  </div>
                  {formData.lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLine(index)}
                      style={{
                        padding: '12px 15px',
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer'
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddLine}
              style={{
                padding: '10px 20px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                marginBottom: '15px'
              }}
            >
              Add Line
            </button>

            {error && <div className="error">{error}</div>}
            {success && <div style={{
              background: '#d4edda',
              color: '#155724',
              padding: '10px',
              borderRadius: '5px',
              marginBottom: '15px',
              textAlign: 'center'
            }}>{success}</div>}
            <button type="submit" className="btn-primary">Create Shipment</button>
          </form>
        </div>
      )}

      {error && !showAddForm && <div className="error" style={{ marginBottom: '15px' }}>{error}</div>}
      {success && !showAddForm && <div style={{
        background: '#d4edda',
        color: '#155724',
        padding: '10px',
        borderRadius: '5px',
        marginBottom: '15px',
        textAlign: 'center'
      }}>{success}</div>}

      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Customer</th>
            <th>Shipped Date</th>
            <th>Lines</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {shipments.map(shipment => (
            <>
              <tr key={shipment.id}>
                <td>{shipment.id}</td>
                <td>{shipment.customerName}</td>
                <td>{new Date(shipment.shippedAt).toLocaleDateString()}</td>
                <td>{shipment.ShipmentLines?.length || 0}</td>
                <td>
                  <button
                    onClick={() => toggleExpand(shipment.id)}
                    style={{
                      padding: '5px 10px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                  >
                    {expandedShipmentId === shipment.id ? 'Hide Details' : 'Show Details'}
                  </button>
                </td>
              </tr>
              {expandedShipmentId === shipment.id && shipment.ShipmentLines && (
                <tr>
                  <td colSpan={5} style={{ background: '#f8f9fa', padding: '15px' }}>
                    <table style={{ width: '100%', background: 'white' }}>
                      <thead>
                        <tr>
                          <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Product</th>
                          <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Quantity</th>
                          <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Location</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shipment.ShipmentLines.map((line: any, idx: number) => (
                          <tr key={idx}>
                            <td style={{ padding: '8px' }}>{line.Product?.name || `Product #${line.productId}`}</td>
                            <td style={{ padding: '8px' }}>{parseFloat(line.qty).toFixed(2)}</td>
                            <td style={{ padding: '8px' }}>{line.Location?.code || `Location #${line.locationId}`}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Inventory View
function InventoryView({ currentUserRole }: { currentUserRole?: string }) {
  const [stock, setStock] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [formData, setFormData] = useState({
    itemType: 'MATERIAL',
    itemId: '',
    locationId: '',
    qty: '',
    notes: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const isAdmin = currentUserRole === 'ADMIN';

  useEffect(() => {
    loadStock();
    loadMaterials();
    loadProducts();
    loadLocations();
  }, []);

  const loadStock = async () => {
    try {
      const response = await apiClient.get('/inventory/stock');
      setStock(response.data);
    } catch (error) {
      console.error('Failed to load stock:', error);
    }
  };

  const loadMaterials = async () => {
    try {
      const response = await apiClient.get('/materials');
      setMaterials(response.data.filter((m: any) => m.active));
    } catch (error) {
      console.error('Failed to load materials:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await apiClient.get('/products');
      setProducts(response.data.filter((p: any) => p.active));
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const loadLocations = async () => {
    try {
      const response = await apiClient.get('/locations');
      setLocations(response.data);
    } catch (error) {
      console.error('Failed to load locations:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await apiClient.post('/inventory/adjust', {
        itemType: formData.itemType,
        itemId: parseInt(formData.itemId),
        locationId: parseInt(formData.locationId),
        qty: parseFloat(formData.qty),
        notes: formData.notes
      });
      setSuccess('Inventory adjustment created successfully!');
      setFormData({
        itemType: 'MATERIAL',
        itemId: '',
        locationId: '',
        qty: '',
        notes: ''
      });
      setShowAdjustForm(false);
      loadStock();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create inventory adjustment');
    }
  };

  const getItems = () => {
    return formData.itemType === 'MATERIAL' ? materials : products;
  };

  return (
    <div className="view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Current Inventory</h1>
        {isAdmin && (
          <button
            onClick={() => setShowAdjustForm(!showAdjustForm)}
            className="btn-primary"
            style={{ width: 'auto', padding: '10px 20px' }}
          >
            {showAdjustForm ? 'Cancel' : 'Adjust Inventory'}
          </button>
        )}
      </div>

      {showAdjustForm && (
        <div style={{
          background: '#f8f9fa',
          padding: '20px',
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <h3 style={{ marginBottom: '15px' }}>Manual Inventory Adjustment</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Item Type:</label>
              <select
                value={formData.itemType}
                onChange={(e) => setFormData({ ...formData, itemType: e.target.value, itemId: '' })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '14px'
                }}
              >
                <option value="MATERIAL">Material</option>
                <option value="PRODUCT">Product</option>
              </select>
            </div>
            <div className="form-group">
              <label>{formData.itemType === 'MATERIAL' ? 'Material' : 'Product'}:</label>
              <select
                value={formData.itemId}
                onChange={(e) => setFormData({ ...formData, itemId: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '14px'
                }}
              >
                <option value="">Select {formData.itemType === 'MATERIAL' ? 'material' : 'product'}...</option>
                {getItems().map(item => (
                  <option key={item.id} value={item.id}>{item.sku} - {item.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Location:</label>
              <select
                value={formData.locationId}
                onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '14px'
                }}
              >
                <option value="">Select location...</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.code}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Quantity Adjustment:</label>
              <input
                type="number"
                step="0.01"
                value={formData.qty}
                onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                required
                placeholder="Use negative number to decrease"
              />
              <small style={{ color: '#6c757d', marginTop: '5px', display: 'block' }}>
                Enter a positive number to increase stock or a negative number to decrease stock
              </small>
            </div>
            <div className="form-group">
              <label>Notes/Reason:</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '14px',
                  minHeight: '80px'
                }}
                placeholder="e.g., Damaged items, inventory recount, etc."
              />
            </div>

            {error && <div className="error">{error}</div>}
            {success && <div style={{
              background: '#d4edda',
              color: '#155724',
              padding: '10px',
              borderRadius: '5px',
              marginBottom: '15px',
              textAlign: 'center'
            }}>{success}</div>}
            <button type="submit" className="btn-primary">Create Adjustment</button>
          </form>
        </div>
      )}

      {error && !showAdjustForm && <div className="error" style={{ marginBottom: '15px' }}>{error}</div>}
      {success && !showAdjustForm && <div style={{
        background: '#d4edda',
        color: '#155724',
        padding: '10px',
        borderRadius: '5px',
        marginBottom: '15px',
        textAlign: 'center'
      }}>{success}</div>}

      <table className="data-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Item</th>
            <th>Location</th>
            <th>Stock</th>
          </tr>
        </thead>
        <tbody>
          {stock.map((item, idx) => (
            <tr key={idx}>
              <td>{item.itemType}</td>
              <td>{item.item?.name || item.item?.sku}</td>
              <td>{item.location?.code}</td>
              <td>{parseFloat(item.currentStock).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Locations View
function LocationsView({ currentUserRole }: { currentUserRole?: string }) {
  const [locations, setLocations] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    description: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const isAdmin = currentUserRole === 'ADMIN';

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      const response = await apiClient.get('/locations');
      setLocations(response.data);
    } catch (error) {
      console.error('Failed to load locations:', error);
    }
  };

  const handleEdit = (location: any) => {
    setEditingId(location.id);
    setEditForm({ ...location });
  };

  const handleSave = async (id: number) => {
    try {
      await apiClient.put(`/locations/${id}`, editForm);
      setEditingId(null);
      loadLocations();
    } catch (error) {
      console.error('Failed to update location:', error);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await apiClient.post('/locations', formData);
      setSuccess('Location created successfully!');
      setFormData({ code: '', description: '' });
      setShowAddForm(false);
      loadLocations();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create location');
    }
  };

  return (
    <div className="view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Locations</h1>
        {isAdmin && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-primary"
            style={{ width: 'auto', padding: '10px 20px' }}
          >
            {showAddForm ? 'Cancel' : 'Add Location'}
          </button>
        )}
      </div>

      {showAddForm && (
        <div style={{
          background: '#f8f9fa',
          padding: '20px',
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <h3 style={{ marginBottom: '15px' }}>New Location</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Location Code:</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
                placeholder="e.g., A1, WAREHOUSE-1"
              />
            </div>
            <div className="form-group">
              <label>Description (optional):</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Main Warehouse - Aisle 1"
              />
            </div>

            {error && <div className="error">{error}</div>}
            {success && <div style={{
              background: '#d4edda',
              color: '#155724',
              padding: '10px',
              borderRadius: '5px',
              marginBottom: '15px',
              textAlign: 'center'
            }}>{success}</div>}
            <button type="submit" className="btn-primary">Create Location</button>
          </form>
        </div>
      )}

      {error && !showAddForm && <div className="error" style={{ marginBottom: '15px' }}>{error}</div>}
      {success && !showAddForm && <div style={{
        background: '#d4edda',
        color: '#155724',
        padding: '10px',
        borderRadius: '5px',
        marginBottom: '15px',
        textAlign: 'center'
      }}>{success}</div>}

      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Code</th>
            <th>Description</th>
            {isAdmin && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {locations.map(location => (
            <tr key={location.id}>
              {editingId === location.id ? (
                <>
                  <td>{location.id}</td>
                  <td><input value={editForm.code} onChange={(e) => setEditForm({...editForm, code: e.target.value})} style={{width: '100%', padding: '5px'}} /></td>
                  <td><input value={editForm.description || ''} onChange={(e) => setEditForm({...editForm, description: e.target.value})} style={{width: '100%', padding: '5px'}} /></td>
                  <td>
                    <button onClick={() => handleSave(location.id)} style={{padding: '5px 10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', marginRight: '5px'}}>Save</button>
                    <button onClick={handleCancel} style={{padding: '5px 10px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer'}}>Cancel</button>
                  </td>
                </>
              ) : (
                <>
                  <td>{location.id}</td>
                  <td>{location.code}</td>
                  <td>{location.description || ''}</td>
                  {isAdmin && (
                    <td>
                      <button onClick={() => handleEdit(location)} style={{padding: '5px 10px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer'}}>
                        ✏️ Edit
                      </button>
                    </td>
                  )}
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Users View (Admin Only)
function UsersView({ currentUserRole }: { currentUserRole?: string }) {
  const [users, setUsers] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'ASSOCIATE'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordChangeUserId, setPasswordChangeUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editUserForm, setEditUserForm] = useState<any>({});
  const isAdmin = currentUserRole === 'ADMIN';

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await apiClient.get('/auth/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await apiClient.post('/auth/register', formData);
      setSuccess('User created successfully!');
      setFormData({ name: '', email: '', password: '', role: 'ASSOCIATE' });
      setShowAddForm(false);
      loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create user');
    }
  };

  const handleChangePassword = async (userId: number) => {
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setError('');
    setSuccess('');
    try {
      await apiClient.put(`/auth/users/${userId}/password`, { password: newPassword });
      setSuccess('Password changed successfully!');
      setPasswordChangeUserId(null);
      setNewPassword('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to change password');
    }
  };

  const handleEditUser = (user: any) => {
    setEditingUserId(user.id);
    setEditUserForm({ name: user.name, email: user.email, role: user.role });
  };

  const handleSaveUser = async (userId: number) => {
    setError('');
    setSuccess('');
    try {
      await apiClient.put(`/auth/users/${userId}`, editUserForm);
      setSuccess('User updated successfully!');
      setEditingUserId(null);
      setEditUserForm({});
      loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update user');
    }
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditUserForm({});
  };

  return (
    <div className="view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>User Management</h1>
        {isAdmin && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-primary"
            style={{ width: 'auto', padding: '10px 20px' }}
          >
            {showAddForm ? 'Cancel' : 'Add User'}
          </button>
        )}
      </div>

      {showAddForm && (
        <div style={{
          background: '#f8f9fa',
          padding: '20px',
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <h3 style={{ marginBottom: '15px' }}>Add New User</h3>
          <form onSubmit={handleAddUser}>
            <div className="form-group">
              <label>Name:</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Email:</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Password:</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
              />
            </div>
            <div className="form-group">
              <label>Role:</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '14px'
                }}
              >
                <option value="ASSOCIATE">Associate</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            {error && <div className="error">{error}</div>}
            {success && <div style={{
              background: '#d4edda',
              color: '#155724',
              padding: '10px',
              borderRadius: '5px',
              marginBottom: '15px',
              textAlign: 'center'
            }}>{success}</div>}
            <button type="submit" className="btn-primary">Create User</button>
          </form>
        </div>
      )}

      {error && <div className="error" style={{ marginBottom: '15px' }}>{error}</div>}
      {success && <div style={{
        background: '#d4edda',
        color: '#155724',
        padding: '10px',
        borderRadius: '5px',
        marginBottom: '15px',
        textAlign: 'center'
      }}>{success}</div>}

      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Created</th>
            {isAdmin && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              {editingUserId === user.id ? (
                <>
                  <td>{user.id}</td>
                  <td><input value={editUserForm.name} onChange={(e) => setEditUserForm({...editUserForm, name: e.target.value})} style={{width: '100%', padding: '5px'}} /></td>
                  <td><input type="email" value={editUserForm.email} onChange={(e) => setEditUserForm({...editUserForm, email: e.target.value})} style={{width: '100%', padding: '5px'}} /></td>
                  <td>
                    <select value={editUserForm.role} onChange={(e) => setEditUserForm({...editUserForm, role: e.target.value})} style={{width: '100%', padding: '5px'}}>
                      <option value="ASSOCIATE">ASSOCIATE</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button onClick={() => handleSaveUser(user.id)} style={{padding: '5px 10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', marginRight: '5px'}}>Save</button>
                    <button onClick={handleCancelEdit} style={{padding: '5px 10px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer'}}>Cancel</button>
                  </td>
                </>
              ) : (
                <>
                  <td>{user.id}</td>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  {isAdmin && (
                    <td>
                      <button onClick={() => handleEditUser(user)} style={{padding: '5px 10px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', marginRight: '5px'}}>
                        ✏️ Edit
                      </button>
                      {passwordChangeUserId === user.id ? (
                        <div style={{ display: 'inline-flex', gap: '5px', alignItems: 'center' }}>
                          <input
                            type="password"
                            placeholder="New password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            style={{
                              padding: '5px 8px',
                              border: '1px solid #ddd',
                              borderRadius: '3px',
                              fontSize: '13px',
                              width: '120px'
                            }}
                            minLength={6}
                          />
                          <button
                            onClick={() => handleChangePassword(user.id)}
                            style={{
                              padding: '5px 10px',
                              background: '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              fontSize: '13px'
                            }}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setPasswordChangeUserId(null);
                              setNewPassword('');
                              setError('');
                            }}
                            style={{
                              padding: '5px 10px',
                              background: '#6c757d',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              fontSize: '13px'
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setPasswordChangeUserId(user.id);
                            setNewPassword('');
                            setError('');
                            setSuccess('');
                          }}
                          style={{
                            padding: '5px 10px',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '13px'
                          }}
                        >
                          Change Password
                        </button>
                      )}
                    </td>
                  )}
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Audit Log View (Admin Only)
function AuditLogView() {
  const [logs, setLogs] = useState<any[]>([]);
  const [filter, setFilter] = useState({
    action: '',
    entityType: '',
    limit: '100'
  });

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.action) params.append('action', filter.action);
      if (filter.entityType) params.append('entityType', filter.entityType);
      if (filter.limit) params.append('limit', filter.limit);

      const response = await apiClient.get(`/audit/logs?${params.toString()}`);
      setLogs(response.data);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    }
  };

  const handleFilterChange = () => {
    loadLogs();
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'CREATE': return '#28a745';
      case 'UPDATE': return '#ffc107';
      case 'DELETE': return '#dc3545';
      case 'LOGIN': return '#17a2b8';
      case 'LOGOUT': return '#6c757d';
      default: return '#3b82f6';
    }
  };

  return (
    <div className="view">
      <h1>Audit Log</h1>
      <p style={{ color: '#6c757d', marginBottom: '20px' }}>
        Complete record of all system actions and user activity
      </p>

      <div style={{
        background: '#f8f9fa',
        padding: '15px',
        borderRadius: '5px',
        marginBottom: '20px',
        display: 'flex',
        gap: '15px',
        alignItems: 'end'
      }}>
        <div className="form-group" style={{ margin: 0, flex: 1 }}>
          <label>Action Type:</label>
          <select
            value={filter.action}
            onChange={(e) => setFilter({ ...filter, action: e.target.value })}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '5px'
            }}
          >
            <option value="">All Actions</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="LOGIN">Login</option>
            <option value="LOGOUT">Logout</option>
          </select>
        </div>
        <div className="form-group" style={{ margin: 0, flex: 1 }}>
          <label>Entity Type:</label>
          <select
            value={filter.entityType}
            onChange={(e) => setFilter({ ...filter, entityType: e.target.value })}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '5px'
            }}
          >
            <option value="">All Entities</option>
            <option value="USER">User</option>
            <option value="MATERIAL">Material</option>
            <option value="PRODUCT">Product</option>
            <option value="LOCATION">Location</option>
            <option value="RECEIPT">Receipt</option>
            <option value="PRODUCTION">Production</option>
            <option value="SHIPMENT">Shipment</option>
            <option value="INVENTORY_ADJUSTMENT">Inventory Adjustment</option>
          </select>
        </div>
        <div className="form-group" style={{ margin: 0, flex: '0 0 150px' }}>
          <label>Limit:</label>
          <select
            value={filter.limit}
            onChange={(e) => setFilter({ ...filter, limit: e.target.value })}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '5px'
            }}
          >
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="250">250</option>
            <option value="500">500</option>
          </select>
        </div>
        <button
          onClick={handleFilterChange}
          className="btn-primary"
          style={{ padding: '8px 20px', height: 'fit-content' }}
        >
          Apply Filter
        </button>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>User</th>
            <th>Action</th>
            <th>Entity Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td>{new Date(log.createdAt).toLocaleString()}</td>
              <td>{log.User?.name || log.User?.email || `User #${log.userId}`}</td>
              <td>
                <span style={{
                  padding: '3px 8px',
                  borderRadius: '3px',
                  background: getActionBadgeColor(log.action),
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {log.action}
                </span>
              </td>
              <td>{log.entityType}</td>
              <td>{log.description}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {logs.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#6c757d'
        }}>
          No audit logs found matching the selected filters.
        </div>
      )}
    </div>
  );
}

export default App;