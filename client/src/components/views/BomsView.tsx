import { useState, useEffect } from 'react';
import apiClient from '../../api/client';

// BOMs View
function BomsView() {
  const [products, setProducts] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [bomItems, setBomItems] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    materialId: '',
    qtyPerUnit: ''
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editQty, setEditQty] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadProducts();
    loadMaterials();
  }, []);

  useEffect(() => {
    if (selectedProductId) {
      loadBom(selectedProductId);
    } else {
      setBomItems([]);
    }
  }, [selectedProductId]);

  const loadProducts = async () => {
    try {
      const response = await apiClient.get('/products');
      setProducts(response.data.filter((p: any) => p.active));
    } catch (error) {
      console.error('Failed to load products:', error);
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

  const loadBom = async (productId: string) => {
    try {
      const response = await apiClient.get(`/bom/product/${productId}`);
      setBomItems(response.data);
    } catch (error) {
      console.error('Failed to load BOM:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await apiClient.post('/bom', {
        productId: parseInt(selectedProductId),
        materialId: parseInt(formData.materialId),
        qtyPerUnit: parseFloat(formData.qtyPerUnit)
      });
      setSuccess('BOM item added successfully!');
      setFormData({ materialId: '', qtyPerUnit: '' });
      setShowAddForm(false);
      loadBom(selectedProductId);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add BOM item');
    }
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setEditQty(String(item.qtyPerUnit));
  };

  const handleSave = async (id: number) => {
    setError('');
    setSuccess('');
    try {
      await apiClient.put(`/bom/${id}`, { qtyPerUnit: parseFloat(editQty) });
      setEditingId(null);
      setEditQty('');
      loadBom(selectedProductId);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update BOM item');
    }
  };

  const handleDelete = async (id: number) => {
    setError('');
    setSuccess('');
    try {
      await apiClient.delete(`/bom/${id}`);
      setSuccess('BOM item removed.');
      loadBom(selectedProductId);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete BOM item');
    }
  };

  return (
    <div className="view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Bills of Materials</h1>
        {selectedProductId && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-primary"
            style={{ width: 'auto', padding: '10px 20px' }}
          >
            {showAddForm ? 'Cancel' : 'Add BOM Item'}
          </button>
        )}
      </div>

      <div className="form-group" style={{ maxWidth: '500px' }}>
        <label>Product:</label>
        <select
          value={selectedProductId}
          onChange={(e) => {
            setSelectedProductId(e.target.value);
            setShowAddForm(false);
            setError('');
            setSuccess('');
          }}
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #ddd',
            borderRadius: '5px',
            fontSize: '14px'
          }}
        >
          <option value="">Select a product to view its BOM...</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
          ))}
        </select>
      </div>

      {showAddForm && selectedProductId && (
        <div style={{
          background: '#f8f9fa',
          padding: '20px',
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <h3 style={{ marginBottom: '15px' }}>New BOM Item</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Material:</label>
              <select
                value={formData.materialId}
                onChange={(e) => setFormData({ ...formData, materialId: e.target.value })}
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
            <div className="form-group">
              <label>Quantity Per Unit:</label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                value={formData.qtyPerUnit}
                onChange={(e) => setFormData({ ...formData, qtyPerUnit: e.target.value })}
                required
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
            <button type="submit" className="btn-primary">Add BOM Item</button>
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

      {selectedProductId && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Material SKU</th>
              <th>Material Name</th>
              <th>UOM</th>
              <th>Qty Per Unit</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bomItems.map(item => (
              <tr key={item.id}>
                <td>{item.Material?.sku || `#${item.materialId}`}</td>
                <td>{item.Material?.name || ''}</td>
                <td>{item.Material?.uom || ''}</td>
                <td>
                  {editingId === item.id ? (
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={editQty}
                      onChange={(e) => setEditQty(e.target.value)}
                      style={{ width: '100px', padding: '5px' }}
                    />
                  ) : (
                    parseFloat(item.qtyPerUnit).toFixed(3)
                  )}
                </td>
                <td>
                  {editingId === item.id ? (
                    <>
                      <button onClick={() => handleSave(item.id)} style={{padding: '5px 10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', marginRight: '5px'}}>Save</button>
                      <button onClick={() => { setEditingId(null); setEditQty(''); }} style={{padding: '5px 10px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer'}}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleEdit(item)} style={{padding: '5px 10px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', marginRight: '5px'}}>Edit</button>
                      <button onClick={() => handleDelete(item.id)} style={{padding: '5px 10px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer'}}>Remove</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selectedProductId && bomItems.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#6c757d'
        }}>
          This product has no BOM items yet. Add one to define what it consumes in production.
        </div>
      )}
    </div>
  );
}

export default BomsView;
