import { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { trackingSuggestion } from './WipItemsView';

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
    trackingType: 'NONE',
    lotPicking: 'FIFO',
    serialPrefix: 'SN-',
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
      setFormData({ sku: '', name: '', uom: '', minStock: '0', trackingType: 'NONE', lotPicking: 'FIFO', serialPrefix: 'SN-', active: true });
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
            <th>Tracking</th>
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
                  <td>{material.trackingType === 'NONE' || !material.trackingType ? 'None' : `${material.trackingType}${material.lotPicking === 'MANUAL' ? ' / Manual pick' : ' / FIFO'}`}</td>
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

export default MaterialsView;