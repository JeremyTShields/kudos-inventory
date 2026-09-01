import { Fragment, useState, useEffect } from 'react';
import apiClient from '../../api/client';

// Purchasing View
function PurchasingView() {
  const [orders, setOrders] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    supplierName: '',
    orderedAt: new Date().toISOString().split('T')[0],
    notes: '',
    lines: [{ materialId: '', qty: '' }]
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  useEffect(() => {
    loadOrders();
    loadMaterials();
  }, []);

  const loadOrders = async () => {
    try {
      const response = await apiClient.get('/purchase-orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to load purchase orders:', error);
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

  const handleAddLine = () => {
    setFormData({
      ...formData,
      lines: [...formData.lines, { materialId: '', qty: '' }]
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
      await apiClient.post('/purchase-orders', {
        ...formData,
        lines: formData.lines.map(line => ({
          materialId: parseInt(line.materialId),
          qty: parseFloat(line.qty)
        }))
      });
      setSuccess('Purchase order created successfully!');
      setFormData({
        supplierName: '',
        orderedAt: new Date().toISOString().split('T')[0],
        notes: '',
        lines: [{ materialId: '', qty: '' }]
      });
      setShowAddForm(false);
      loadOrders();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create purchase order');
    }
  };

  const handleStatusChange = async (orderId: number, status: string) => {
    setError('');
    setSuccess('');
    try {
      await apiClient.put(`/purchase-orders/${orderId}/status`, { status });
      setSuccess(`Purchase order marked ${status.toLowerCase()}.`);
      loadOrders();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update purchase order');
    }
  };

  const toggleExpand = (orderId: number) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return '#3b82f6';
      case 'RECEIVED': return '#28a745';
      case 'CANCELLED': return '#6c757d';
      default: return '#3b82f6';
    }
  };

  return (
    <div className="view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Purchasing</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary"
          style={{ width: 'auto', padding: '10px 20px' }}
        >
          {showAddForm ? 'Cancel' : 'New Purchase Order'}
        </button>
      </div>

      {showAddForm && (
        <div style={{
          background: '#f8f9fa',
          padding: '20px',
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <h3 style={{ marginBottom: '15px' }}>New Purchase Order</h3>
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
              <label>Order Date:</label>
              <input
                type="date"
                value={formData.orderedAt}
                onChange={(e) => setFormData({ ...formData, orderedAt: e.target.value })}
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

            <h4 style={{ marginTop: '20px', marginBottom: '10px' }}>Line Items:</h4>
            {formData.lines.map((line, index) => (
              <div key={index} style={{
                background: 'white',
                padding: '15px',
                borderRadius: '5px',
                marginBottom: '10px',
                border: '1px solid #ddd'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr auto', gap: '10px', alignItems: 'end' }}>
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
            <button type="submit" className="btn-primary">Create Purchase Order</button>
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
            <th>Order Date</th>
            <th>Status</th>
            <th>Lines</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(order => (
            <Fragment key={order.id}>
              <tr>
                <td>{order.id}</td>
                <td>{order.supplierName}</td>
                <td>{new Date(order.orderedAt).toLocaleDateString()}</td>
                <td>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '3px',
                    background: statusColor(order.status),
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {order.status}
                  </span>
                </td>
                <td>{order.PurchaseOrderLines?.length || 0}</td>
                <td>
                  <button
                    onClick={() => toggleExpand(order.id)}
                    style={{
                      padding: '5px 10px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      marginRight: '5px'
                    }}
                  >
                    {expandedOrderId === order.id ? 'Hide Details' : 'Show Details'}
                  </button>
                  {order.status === 'OPEN' && (
                    <>
                      <button
                        onClick={() => handleStatusChange(order.id, 'RECEIVED')}
                        style={{
                          padding: '5px 10px',
                          background: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          marginRight: '5px'
                        }}
                      >
                        Mark Received
                      </button>
                      <button
                        onClick={() => handleStatusChange(order.id, 'CANCELLED')}
                        style={{
                          padding: '5px 10px',
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </td>
              </tr>
              {expandedOrderId === order.id && order.PurchaseOrderLines && (
                <tr>
                  <td colSpan={6} style={{ background: '#f8f9fa', padding: '15px' }}>
                    <table style={{ width: '100%', background: 'white' }}>
                      <thead>
                        <tr>
                          <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Material</th>
                          <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Quantity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.PurchaseOrderLines.map((line: any, idx: number) => (
                          <tr key={idx}>
                            <td style={{ padding: '8px' }}>{line.Material?.name || `Material #${line.materialId}`}</td>
                            <td style={{ padding: '8px' }}>{parseFloat(line.qty).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {order.notes && (
                      <div style={{ marginTop: '10px', color: '#6c757d' }}>Notes: {order.notes}</div>
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default PurchasingView;
