import { Fragment, useState, useEffect } from 'react';
import apiClient from '../../api/client';

interface InventoryViewProps {
  currentUserRole?: string;
}

// Inventory View
function InventoryView({ currentUserRole }: InventoryViewProps) {
  const [stock, setStock] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [wipItems, setWipItems] = useState<any[]>([]);
  const [adjustLots, setAdjustLots] = useState<any[]>([]);
  const [expandedLotKey, setExpandedLotKey] = useState<string | null>(null);
  const [expandedLots, setExpandedLots] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [formData, setFormData] = useState({
    itemType: 'MATERIAL',
    itemId: '',
    locationId: '',
    qty: '',
    lotId: '',
    lotNumber: '',
    serialNumbers: '',
    notes: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const isAdmin = currentUserRole === 'ADMIN';

  useEffect(() => {
    loadStock();
    loadMaterials();
    loadProducts();
    loadWipItems();
    loadLocations();
  }, []);

  const loadWipItems = async () => {
    try {
      const response = await apiClient.get('/wip-items');
      setWipItems(response.data.filter((item: any) => item.active));
    } catch (error) {
      console.error('Failed to load WIP items:', error);
    }
  };

  const selectedItem = () => {
    const list = formData.itemType === 'MATERIAL' ? materials : formData.itemType === 'PRODUCT' ? products : wipItems;
    return list.find((item: any) => item.id === parseInt(formData.itemId));
  };

  // Fetch available lots for negative adjustments of manual-picking items
  useEffect(() => {
    const item = selectedItem();
    if (item && item.trackingType !== 'NONE' && item.lotPicking === 'MANUAL' && formData.locationId && parseFloat(formData.qty) < 0) {
      apiClient.get(`/inventory/lots?itemType=${formData.itemType}&itemId=${formData.itemId}&locationId=${formData.locationId}`)
        .then(response => setAdjustLots(response.data))
        .catch(error => console.error('Failed to load lots:', error));
    } else {
      setAdjustLots([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.itemType, formData.itemId, formData.locationId, formData.qty]);

  const toggleLots = async (item: any) => {
    const key = `${item.itemType}-${item.itemId}-${item.locationId}`;
    if (expandedLotKey === key) {
      setExpandedLotKey(null);
      setExpandedLots([]);
      return;
    }
    try {
      const response = await apiClient.get(`/inventory/lots?itemType=${item.itemType}&itemId=${item.itemId}&locationId=${item.locationId}`);
      setExpandedLots(response.data);
      setExpandedLotKey(key);
    } catch (error) {
      console.error('Failed to load lots:', error);
    }
  };

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
      const serials = formData.serialNumbers
        .split(',')
        .map(serial => serial.trim())
        .filter(Boolean);

      await apiClient.post('/inventory/adjust', {
        itemType: formData.itemType,
        itemId: parseInt(formData.itemId),
        locationId: parseInt(formData.locationId),
        qty: parseFloat(formData.qty),
        notes: formData.notes,
        ...(formData.lotId && { lotId: parseInt(formData.lotId) }),
        ...(formData.lotNumber && { lotNumber: formData.lotNumber }),
        ...(serials.length > 0 && { serialNumbers: serials })
      });
      setSuccess('Inventory adjustment created successfully!');
      setFormData({
        itemType: 'MATERIAL',
        itemId: '',
        locationId: '',
        qty: '',
        lotId: '',
        lotNumber: '',
        serialNumbers: '',
        notes: ''
      });
      setShowAdjustForm(false);
      loadStock();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create inventory adjustment');
    }
  };

  const getItems = () => {
    return formData.itemType === 'MATERIAL' ? materials : formData.itemType === 'PRODUCT' ? products : wipItems;
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
                <option value="WIP">WIP</option>
              </select>
            </div>
            <div className="form-group">
              <label>{formData.itemType === 'MATERIAL' ? 'Material' : formData.itemType === 'PRODUCT' ? 'Product' : 'WIP Item'}:</label>
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
                <option value="">Select {formData.itemType === 'MATERIAL' ? 'material' : formData.itemType === 'PRODUCT' ? 'product' : 'WIP item'}...</option>
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
            {selectedItem()?.trackingType === 'LOT' && parseFloat(formData.qty) > 0 && (
              <div className="form-group">
                <label>Lot Number:</label>
                <input
                  type="text"
                  value={formData.lotNumber}
                  onChange={(e) => setFormData({ ...formData, lotNumber: e.target.value })}
                  required
                  placeholder="e.g., LOT-2026-001"
                />
              </div>
            )}
            {selectedItem()?.trackingType === 'SERIAL' && parseFloat(formData.qty) > 0 && (
              <div className="form-group">
                <label>Serial Numbers (comma-separated; leave blank to auto-generate):</label>
                <input
                  type="text"
                  value={formData.serialNumbers}
                  onChange={(e) => setFormData({ ...formData, serialNumbers: e.target.value })}
                  placeholder="Count must match quantity"
                />
              </div>
            )}
            {adjustLots.length > 0 && (
              <div className="form-group">
                <label>Lot (manual picking):</label>
                <select
                  value={formData.lotId}
                  onChange={(e) => setFormData({ ...formData, lotId: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Select lot...</option>
                  {adjustLots.map((lot: any) => (
                    <option key={lot.lotId} value={lot.lotId}>{lot.lotNumber} ({lot.available} available)</option>
                  ))}
                </select>
              </div>
            )}
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
            <th>Lots</th>
          </tr>
        </thead>
        <tbody>
          {stock.map((item, idx) => {
            const rowKey = `${item.itemType}-${item.itemId}-${item.locationId}`;
            const tracked = item.item?.trackingType && item.item.trackingType !== 'NONE';
            return (
              <Fragment key={idx}>
                <tr>
                  <td>{item.itemType}</td>
                  <td>{item.item?.name || item.item?.sku}</td>
                  <td>{item.location?.code}</td>
                  <td>{parseFloat(item.currentStock).toFixed(2)}</td>
                  <td>
                    {tracked ? (
                      <button
                        onClick={() => toggleLots(item)}
                        style={{
                          padding: '5px 10px',
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer'
                        }}
                      >
                        {expandedLotKey === rowKey ? 'Hide Lots' : 'Show Lots'}
                      </button>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
                {expandedLotKey === rowKey && (
                  <tr>
                    <td colSpan={5} style={{ background: '#f8f9fa', padding: '15px' }}>
                      <table style={{ width: '100%', background: 'white' }}>
                        <thead>
                          <tr>
                            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                              {item.item?.trackingType === 'SERIAL' ? 'Serial Number' : 'Lot Number'}
                            </th>
                            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Quantity</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expandedLots.map((lot: any) => (
                            <tr key={lot.lotId}>
                              <td style={{ padding: '8px' }}>{lot.lotNumber}</td>
                              <td style={{ padding: '8px' }}>{lot.available}</td>
                            </tr>
                          ))}
                          {expandedLots.length === 0 && (
                            <tr>
                              <td colSpan={2} style={{ padding: '8px', color: '#6c757d' }}>
                                No lot-tracked stock at this location.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default InventoryView;