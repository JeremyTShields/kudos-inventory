import { useState, useEffect } from 'react';
import apiClient from '../../api/client';

interface InventoryViewProps {
  currentUserRole?: string;
}

// Inventory View
function InventoryView({ currentUserRole }: InventoryViewProps) {
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

export default InventoryView;