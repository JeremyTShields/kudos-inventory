import { useState, useEffect } from 'react';
import apiClient from '../../api/client';

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

export default ShipmentsView;