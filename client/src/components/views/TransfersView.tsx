import { Fragment, useState, useEffect } from 'react';
import apiClient from '../../api/client';

// Transfers View
function TransfersView() {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [wipItems, setWipItems] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [lotOptions, setLotOptions] = useState<Record<string, any[]>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    transferredAt: new Date().toISOString().split('T')[0],
    notes: '',
    lines: [{ itemType: 'MATERIAL', itemId: '', qty: '', fromLocationId: '', toLocationId: '', lotId: '' }]
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedTransferId, setExpandedTransferId] = useState<number | null>(null);

  useEffect(() => {
    loadTransfers();
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

  // Fetch available lots for manual-picking items once item + source are chosen
  useEffect(() => {
    for (const line of formData.lines) {
      const item = itemsFor(line.itemType).find((entry: any) => entry.id === parseInt(line.itemId));
      if (!item || item.trackingType === 'NONE' || item.lotPicking !== 'MANUAL' || !line.fromLocationId) continue;
      const key = `${line.itemType}-${line.itemId}-${line.fromLocationId}`;
      if (lotOptions[key]) continue;
      apiClient.get(`/inventory/lots?itemType=${line.itemType}&itemId=${line.itemId}&locationId=${line.fromLocationId}`)
        .then(response => setLotOptions(prev => ({ ...prev, [key]: response.data })))
        .catch(error => console.error('Failed to load lots:', error));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.lines]);

  const loadTransfers = async () => {
    try {
      const response = await apiClient.get('/transfers');
      setTransfers(response.data);
    } catch (error) {
      console.error('Failed to load transfers:', error);
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

  const handleAddLine = () => {
    setFormData({
      ...formData,
      lines: [...formData.lines, { itemType: 'MATERIAL', itemId: '', qty: '', fromLocationId: '', toLocationId: '', lotId: '' }]
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
    if (field === 'itemType') {
      newLines[index].itemId = '';
      newLines[index].lotId = '';
    }
    if (field === 'itemId' || field === 'fromLocationId') {
      newLines[index].lotId = '';
    }
    setFormData({ ...formData, lines: newLines });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await apiClient.post('/transfers', {
        ...formData,
        lines: formData.lines.map(line => ({
          itemType: line.itemType,
          itemId: parseInt(line.itemId),
          qty: parseFloat(line.qty),
          fromLocationId: parseInt(line.fromLocationId),
          toLocationId: parseInt(line.toLocationId),
          ...(line.lotId && { lotId: parseInt(line.lotId) })
        }))
      });
      setSuccess('Transfer created successfully!');
      setFormData({
        transferredAt: new Date().toISOString().split('T')[0],
        notes: '',
        lines: [{ itemType: 'MATERIAL', itemId: '', qty: '', fromLocationId: '', toLocationId: '', lotId: '' }]
      });
      setShowAddForm(false);
      loadTransfers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create transfer');
    }
  };

  const toggleExpand = (transferId: number) => {
    setExpandedTransferId(expandedTransferId === transferId ? null : transferId);
  };

  const itemsFor = (itemType: string) =>
    itemType === 'MATERIAL' ? materials : itemType === 'PRODUCT' ? products : wipItems;

  const itemName = (line: any) => {
    const item = itemsFor(line.itemType).find((i: any) => i.id === line.itemId);
    return item ? item.name : `${line.itemType === 'MATERIAL' ? 'Material' : 'Product'} #${line.itemId}`;
  };

  return (
    <div className="view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Transfers</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary"
          style={{ width: 'auto', padding: '10px 20px' }}
        >
          {showAddForm ? 'Cancel' : 'New Transfer'}
        </button>
      </div>

      {showAddForm && (
        <div style={{
          background: '#f8f9fa',
          padding: '20px',
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <h3 style={{ marginBottom: '15px' }}>New Transfer</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Transfer Date:</label>
              <input
                type="date"
                value={formData.transferredAt}
                onChange={(e) => setFormData({ ...formData, transferredAt: e.target.value })}
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
                placeholder="e.g., Rebalancing stock for production"
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Type:</label>
                    <select
                      value={line.itemType}
                      onChange={(e) => handleLineChange(index, 'itemType', e.target.value)}
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
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>{line.itemType === 'MATERIAL' ? 'Material' : line.itemType === 'PRODUCT' ? 'Product' : 'WIP Item'}:</label>
                    <select
                      value={line.itemId}
                      onChange={(e) => handleLineChange(index, 'itemId', e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '5px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="">Select item...</option>
                      {itemsFor(line.itemType).map(item => (
                        <option key={item.id} value={item.id}>{item.sku} - {item.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Quantity:</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={line.qty}
                      onChange={(e) => handleLineChange(index, 'qty', e.target.value)}
                      required
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>From:</label>
                    <select
                      value={line.fromLocationId}
                      onChange={(e) => handleLineChange(index, 'fromLocationId', e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '5px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="">Select...</option>
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.code}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>To:</label>
                    <select
                      value={line.toLocationId}
                      onChange={(e) => handleLineChange(index, 'toLocationId', e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '5px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="">Select...</option>
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
                {(() => {
                  const item = itemsFor(line.itemType).find((entry: any) => entry.id === parseInt(line.itemId));
                  if (!item || item.trackingType === 'NONE' || item.lotPicking !== 'MANUAL' || !line.fromLocationId) return null;
                  const key = `${line.itemType}-${line.itemId}-${line.fromLocationId}`;
                  return (
                    <div className="form-group" style={{ margin: '10px 0 0 0' }}>
                      <label>Lot (manual picking):</label>
                      <select
                        value={line.lotId}
                        onChange={(e) => handleLineChange(index, 'lotId', e.target.value)}
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
                        {(lotOptions[key] || []).map((lot: any) => (
                          <option key={lot.lotId} value={lot.lotId}>{lot.lotNumber} ({lot.available} available)</option>
                        ))}
                      </select>
                    </div>
                  );
                })()}
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
            <button type="submit" className="btn-primary">Create Transfer</button>
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
            <th>Transfer Date</th>
            <th>Notes</th>
            <th>Lines</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {transfers.map(transfer => (
            <Fragment key={transfer.id}>
              <tr>
                <td>{transfer.id}</td>
                <td>{new Date(transfer.transferredAt).toLocaleDateString()}</td>
                <td>{transfer.notes || '-'}</td>
                <td>{transfer.TransferLines?.length || 0}</td>
                <td>
                  <button
                    onClick={() => toggleExpand(transfer.id)}
                    style={{
                      padding: '5px 10px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                  >
                    {expandedTransferId === transfer.id ? 'Hide Details' : 'Show Details'}
                  </button>
                </td>
              </tr>
              {expandedTransferId === transfer.id && transfer.TransferLines && (
                <tr>
                  <td colSpan={5} style={{ background: '#f8f9fa', padding: '15px' }}>
                    <table style={{ width: '100%', background: 'white' }}>
                      <thead>
                        <tr>
                          <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Type</th>
                          <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Item</th>
                          <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Quantity</th>
                          <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>From</th>
                          <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>To</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transfer.TransferLines.map((line: any, idx: number) => (
                          <tr key={idx}>
                            <td style={{ padding: '8px' }}>{line.itemType}</td>
                            <td style={{ padding: '8px' }}>{itemName(line)}</td>
                            <td style={{ padding: '8px' }}>{parseFloat(line.qty).toFixed(2)}</td>
                            <td style={{ padding: '8px' }}>{line.FromLocation?.code || `Location #${line.fromLocationId}`}</td>
                            <td style={{ padding: '8px' }}>{line.ToLocation?.code || `Location #${line.toLocationId}`}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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

export default TransfersView;
