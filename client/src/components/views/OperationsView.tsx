import { useState, useEffect } from 'react';
import apiClient from '../../api/client';

// Operations View
function OperationsView() {
  const [operations, setOperations] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    workStationId: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadOperations();
    loadStations();
  }, []);

  const loadOperations = async () => {
    try {
      const response = await apiClient.get('/operations');
      setOperations(response.data);
    } catch (error) {
      console.error('Failed to load operations:', error);
    }
  };

  const loadStations = async () => {
    try {
      const response = await apiClient.get('/workstations');
      setStations(response.data.filter((s: any) => s.active));
    } catch (error) {
      console.error('Failed to load work stations:', error);
    }
  };

  const handleEdit = (operation: any) => {
    setEditingId(operation.id);
    setEditForm({ ...operation, workStationId: operation.workStationId ?? '' });
  };

  const handleSave = async (id: number) => {
    try {
      await apiClient.put(`/operations/${id}`, {
        ...editForm,
        workStationId: editForm.workStationId ? parseInt(editForm.workStationId) : null
      });
      setEditingId(null);
      loadOperations();
    } catch (error) {
      console.error('Failed to update operation:', error);
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
      await apiClient.post('/operations', {
        ...formData,
        workStationId: formData.workStationId ? parseInt(formData.workStationId) : null
      });
      setSuccess('Operation created successfully!');
      setFormData({ code: '', name: '', description: '', workStationId: '' });
      setShowAddForm(false);
      loadOperations();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create operation');
    }
  };

  return (
    <div className="view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Operations</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary"
          style={{ width: 'auto', padding: '10px 20px' }}
        >
          {showAddForm ? 'Cancel' : 'Add Operation'}
        </button>
      </div>

      {showAddForm && (
        <div style={{
          background: '#f8f9fa',
          padding: '20px',
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <h3 style={{ marginBottom: '15px' }}>New Operation</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Code:</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
                placeholder="e.g., OP-ASSY"
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
              <label>Description (optional):</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Work Station (optional):</label>
              <select
                value={formData.workStationId}
                onChange={(e) => setFormData({ ...formData, workStationId: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '14px'
                }}
              >
                <option value="">No work station</option>
                {stations.map(s => (
                  <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                ))}
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
            <button type="submit" className="btn-primary">Create Operation</button>
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
            <th>Code</th>
            <th>Name</th>
            <th>Description</th>
            <th>Work Station</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {operations.map(operation => (
            <tr key={operation.id}>
              {editingId === operation.id ? (
                <>
                  <td><input value={editForm.code} onChange={(e) => setEditForm({...editForm, code: e.target.value})} style={{width: '100%', padding: '5px'}} /></td>
                  <td><input value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} style={{width: '100%', padding: '5px'}} /></td>
                  <td><input value={editForm.description || ''} onChange={(e) => setEditForm({...editForm, description: e.target.value})} style={{width: '100%', padding: '5px'}} /></td>
                  <td>
                    <select value={editForm.workStationId} onChange={(e) => setEditForm({...editForm, workStationId: e.target.value})} style={{width: '100%', padding: '5px'}}>
                      <option value="">No work station</option>
                      {stations.map(s => (
                        <option key={s.id} value={s.id}>{s.code}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select value={editForm.active ? 'true' : 'false'} onChange={(e) => setEditForm({...editForm, active: e.target.value === 'true'})} style={{width: '100%', padding: '5px'}}>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </td>
                  <td>
                    <button onClick={() => handleSave(operation.id)} style={{padding: '5px 10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', marginRight: '5px'}}>Save</button>
                    <button onClick={handleCancel} style={{padding: '5px 10px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer'}}>Cancel</button>
                  </td>
                </>
              ) : (
                <>
                  <td>{operation.code}</td>
                  <td>{operation.name}</td>
                  <td>{operation.description || ''}</td>
                  <td>{operation.WorkStation ? `${operation.WorkStation.code} - ${operation.WorkStation.name}` : '-'}</td>
                  <td>{operation.active ? 'Active' : 'Inactive'}</td>
                  <td>
                    <button onClick={() => handleEdit(operation)} style={{padding: '5px 10px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer'}}>
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

export default OperationsView;
