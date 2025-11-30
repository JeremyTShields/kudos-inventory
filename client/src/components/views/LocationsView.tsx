import { useState, useEffect } from 'react';
import apiClient from '../../api/client';

interface LocationsViewProps {
  currentUserRole?: string;
}

// Locations View
function LocationsView({ currentUserRole }: LocationsViewProps) {
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
                        Edit
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

export default LocationsView;