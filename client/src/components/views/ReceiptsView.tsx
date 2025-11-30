import { useState, useEffect } from 'react';
import apiClient from '../../api/client';

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

export default ReceiptsView;