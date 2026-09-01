import { useState, useEffect } from 'react';
import apiClient from '../../api/client';

// Unit-like UOMs suggest serialized tracking; bulk UOMs suggest lots
const UNIT_UOMS = ['EA', 'UNIT', 'PCS', 'PC', 'EACH'];

export function trackingSuggestion(uom: string): string {
  if (!uom) return '';
  return UNIT_UOMS.includes(uom.trim().toUpperCase())
    ? 'Suggestion: Serial (one number per unit) fits unit-based UOMs.'
    : 'Suggestion: Lot (one number per batch) fits bulk UOMs.';
}

// WIP Items View
function WipItemsView() {
  const [items, setItems] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    uom: '',
    trackingType: 'NONE',
    lotPicking: 'FIFO',
    serialPrefix: 'SN-'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const response = await apiClient.get('/wip-items');
      setItems(response.data);
    } catch (error) {
      console.error('Failed to load WIP items:', error);
    }
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const handleSave = async (id: number) => {
    try {
      await apiClient.put(`/wip-items/${id}`, editForm);
      setEditingId(null);
      loadItems();
    } catch (error) {
      console.error('Failed to update WIP item:', error);
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
      await apiClient.post('/wip-items', formData);
      setSuccess('WIP item created successfully!');
      setFormData({ sku: '', name: '', uom: '', trackingType: 'NONE', lotPicking: 'FIFO', serialPrefix: 'SN-' });
      setShowAddForm(false);
      loadItems();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create WIP item');
    }
  };

  return (
    <div className="view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>WIP Items</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary"
          style={{ width: 'auto', padding: '10px 20px' }}
        >
          {showAddForm ? 'Cancel' : 'Add WIP Item'}
        </button>
      </div>

      <p style={{ color: '#6c757d', marginBottom: '20px' }}>
        Interim product created at intermediate stages of production. WIP items are built with
        BOMs, operations, and work stations like products, and consumed by later production runs.
      </p>

      {showAddForm && (
        <div style={{
          background: '#f8f9fa',
          padding: '20px',
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <h3 style={{ marginBottom: '15px' }}>New WIP Item</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>SKU:</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                required
                placeholder="e.g., WIP-SUB-001"
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
              <label>Tracking:</label>
              <select
                value={formData.trackingType}
                onChange={(e) => setFormData({ ...formData, trackingType: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '14px'
                }}
              >
                <option value="NONE">None</option>
                <option value="LOT">Lot (one number per batch)</option>
                <option value="SERIAL">Serial (one number per unit)</option>
              </select>
              {formData.uom && (
                <small style={{ color: '#6c757d', marginTop: '5px', display: 'block' }}>
                  {trackingSuggestion(formData.uom)}
                </small>
              )}
            </div>
            {formData.trackingType !== 'NONE' && (
              <div className="form-group">
                <label>Lot Picking:</label>
                <select
                  value={formData.lotPicking}
                  onChange={(e) => setFormData({ ...formData, lotPicking: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    fontSize: '14px'
                  }}
                >
                  <option value="FIFO">FIFO (oldest lots consumed automatically)</option>
                  <option value="MANUAL">Manual (user picks lots when consuming)</option>
                </select>
              </div>
            )}
            {formData.trackingType === 'SERIAL' && (
              <div className="form-group">
                <label>Serial Prefix:</label>
                <input
                  type="text"
                  value={formData.serialPrefix}
                  onChange={(e) => setFormData({ ...formData, serialPrefix: e.target.value })}
                  placeholder="e.g., SN-"
                />
              </div>
            )}

            {error && <div className="error">{error}</div>}
            {success && <div style={{
              background: '#d4edda',
              color: '#155724',
              padding: '10px',
              borderRadius: '5px',
              marginBottom: '15px',
              textAlign: 'center'
            }}>{success}</div>}
            <button type="submit" className="btn-primary">Create WIP Item</button>
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
            <th>Tracking</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id}>
              {editingId === item.id ? (
                <>
                  <td><input value={editForm.sku} onChange={(e) => setEditForm({...editForm, sku: e.target.value})} style={{width: '100%', padding: '5px'}} /></td>
                  <td><input value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} style={{width: '100%', padding: '5px'}} /></td>
                  <td><input value={editForm.uom} onChange={(e) => setEditForm({...editForm, uom: e.target.value})} style={{width: '100%', padding: '5px'}} /></td>
                  <td>
                    <select value={editForm.trackingType} onChange={(e) => setEditForm({...editForm, trackingType: e.target.value})} style={{width: '100%', padding: '5px', marginBottom: '4px'}}>
                      <option value="NONE">None</option>
                      <option value="LOT">Lot</option>
                      <option value="SERIAL">Serial</option>
                    </select>
                    <select value={editForm.lotPicking} onChange={(e) => setEditForm({...editForm, lotPicking: e.target.value})} style={{width: '100%', padding: '5px'}}>
                      <option value="FIFO">FIFO</option>
                      <option value="MANUAL">Manual</option>
                    </select>
                  </td>
                  <td>
                    <select value={editForm.active ? 'true' : 'false'} onChange={(e) => setEditForm({...editForm, active: e.target.value === 'true'})} style={{width: '100%', padding: '5px'}}>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </td>
                  <td>
                    <button onClick={() => handleSave(item.id)} style={{padding: '5px 10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', marginRight: '5px'}}>Save</button>
                    <button onClick={handleCancel} style={{padding: '5px 10px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer'}}>Cancel</button>
                  </td>
                </>
              ) : (
                <>
                  <td>{item.sku}</td>
                  <td>{item.name}</td>
                  <td>{item.uom}</td>
                  <td>{item.trackingType === 'NONE' ? 'None' : `${item.trackingType}${item.lotPicking === 'MANUAL' ? ' / Manual pick' : ' / FIFO'}`}</td>
                  <td>{item.active ? 'Active' : 'Inactive'}</td>
                  <td>
                    <button onClick={() => handleEdit(item)} style={{padding: '5px 10px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer'}}>
                      Edit
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

export default WipItemsView;
