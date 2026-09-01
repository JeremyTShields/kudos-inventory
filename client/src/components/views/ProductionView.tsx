import { useState, useEffect } from 'react';
import apiClient from '../../api/client';

// Production View
function ProductionView() {
  const [productionRuns, setProductionRuns] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [wipItems, setWipItems] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [workStations, setWorkStations] = useState<any[]>([]);
  const [routing, setRouting] = useState<any[]>([]);
  const [bomComponents, setBomComponents] = useState<any[]>([]);
  const [lotOptions, setLotOptions] = useState<Record<string, any[]>>({});
  const [manualPicks, setManualPicks] = useState<Record<string, string>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    outputType: 'PRODUCT',
    productId: '',
    quantityProduced: '',
    locationId: '',
    workStationId: '',
    outputLotNumber: '',
    serialNumbers: '',
    startedAt: new Date().toISOString().split('T')[0],
    completedAt: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadProductionRuns();
    loadProducts();
    loadWipItems();
    loadLocations();
    loadWorkStations();
  }, []);

  const outputItems = formData.outputType === 'PRODUCT' ? products : wipItems;
  const outputItem = outputItems.find((item: any) => item.id === parseInt(formData.productId));

  // Show the selected output's routing and BOM so the operator can see how
  // it is built and pick lots for manual-picking components
  useEffect(() => {
    setManualPicks({});
    if (formData.productId) {
      const parentPath = formData.outputType === 'PRODUCT' ? 'product' : 'wip';
      apiClient.get(`/routing/${parentPath}/${formData.productId}`)
        .then(response => setRouting(response.data))
        .catch(error => console.error('Failed to load routing:', error));
      apiClient.get(`/bom/${parentPath}/${formData.productId}`)
        .then(response => setBomComponents(response.data))
        .catch(error => console.error('Failed to load BOM:', error));
    } else {
      setRouting([]);
      setBomComponents([]);
    }
  }, [formData.productId, formData.outputType]);

  const manualComponents = bomComponents.filter(component =>
    component.Component?.trackingType !== 'NONE' && component.Component?.lotPicking === 'MANUAL');

  // Fetch available lots at the chosen location for manual-picking components
  useEffect(() => {
    if (!formData.locationId) return;
    for (const component of manualComponents) {
      const key = `${component.componentType}-${component.componentId}`;
      apiClient.get(`/inventory/lots?itemType=${component.componentType}&itemId=${component.componentId}&locationId=${formData.locationId}`)
        .then(response => setLotOptions(prev => ({ ...prev, [key]: response.data })))
        .catch(error => console.error('Failed to load lots:', error));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.locationId, bomComponents]);

  const loadProductionRuns = async () => {
    try {
      const response = await apiClient.get('/production');
      setProductionRuns(response.data);
    } catch (error) {
      console.error('Failed to load production runs:', error);
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

  const loadWipItems = async () => {
    try {
      const response = await apiClient.get('/wip-items');
      setWipItems(response.data.filter((item: any) => item.active));
    } catch (error) {
      console.error('Failed to load WIP items:', error);
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

  const loadWorkStations = async () => {
    try {
      const response = await apiClient.get('/workstations');
      setWorkStations(response.data.filter((s: any) => s.active));
    } catch (error) {
      console.error('Failed to load work stations:', error);
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

      const componentLots = manualComponents
        .filter(component => manualPicks[`${component.componentType}-${component.componentId}`])
        .map(component => ({
          componentType: component.componentType,
          componentId: component.componentId,
          lotId: parseInt(manualPicks[`${component.componentType}-${component.componentId}`]),
          qty: parseFloat(component.qtyPerUnit) * parseFloat(formData.quantityProduced)
        }));

      await apiClient.post('/production', {
        ...formData,
        productId: parseInt(formData.productId),
        quantityProduced: parseFloat(formData.quantityProduced),
        locationId: parseInt(formData.locationId),
        workStationId: formData.workStationId ? parseInt(formData.workStationId) : null,
        ...(formData.outputLotNumber && { outputLotNumber: formData.outputLotNumber }),
        ...(serials.length > 0 && { serialNumbers: serials }),
        ...(componentLots.length > 0 && { componentLots })
      });
      setSuccess('Production run created successfully!');
      setFormData({
        outputType: 'PRODUCT',
        productId: '',
        quantityProduced: '',
        locationId: '',
        workStationId: '',
        outputLotNumber: '',
        serialNumbers: '',
        startedAt: new Date().toISOString().split('T')[0],
        completedAt: new Date().toISOString().split('T')[0],
        notes: ''
      });
      setManualPicks({});
      setShowAddForm(false);
      loadProductionRuns();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create production run');
    }
  };

  return (
    <div className="view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Production Runs</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary"
          style={{ width: 'auto', padding: '10px 20px' }}
        >
          {showAddForm ? 'Cancel' : 'Run Production'}
        </button>
      </div>

      {showAddForm && (
        <div style={{
          background: '#f8f9fa',
          padding: '20px',
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <h3 style={{ marginBottom: '15px' }}>New Production Run</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Output Type:</label>
              <select
                value={formData.outputType}
                onChange={(e) => setFormData({ ...formData, outputType: e.target.value, productId: '', outputLotNumber: '', serialNumbers: '' })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '14px'
                }}
              >
                <option value="PRODUCT">Product (finished goods)</option>
                <option value="WIP">WIP (interim product)</option>
              </select>
            </div>
            <div className="form-group">
              <label>{formData.outputType === 'PRODUCT' ? 'Product' : 'WIP Item'}:</label>
              <select
                value={formData.productId}
                onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '14px'
                }}
              >
                <option value="">Select {formData.outputType === 'PRODUCT' ? 'product' : 'WIP item'}...</option>
                {outputItems.map((item: any) => (
                  <option key={item.id} value={item.id}>{item.sku} - {item.name}</option>
                ))}
              </select>
            </div>
            {routing.length > 0 && (
              <div style={{
                background: 'white',
                border: '1px solid #ddd',
                borderRadius: '5px',
                padding: '12px 15px',
                marginBottom: '15px'
              }}>
                <strong>Routing for this product:</strong>
                <ol style={{ margin: '8px 0 0 20px', padding: 0 }}>
                  {routing.map(step => (
                    <li key={step.id} style={{ marginBottom: '4px' }}>
                      {step.Operation ? `${step.Operation.code} - ${step.Operation.name}` : `Operation #${step.operationId}`}
                      {step.Operation?.WorkStation ? ` @ ${step.Operation.WorkStation.code}` : ''}
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <div className="form-group">
              <label>Quantity Produced:</label>
              <input
                type="number"
                step="0.01"
                value={formData.quantityProduced}
                onChange={(e) => setFormData({ ...formData, quantityProduced: e.target.value })}
                required
              />
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
                <option value="">No work station recorded</option>
                {workStations.map(s => (
                  <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                ))}
              </select>
            </div>
            {outputItem?.trackingType === 'LOT' && (
              <div className="form-group">
                <label>Output Lot Number:</label>
                <input
                  type="text"
                  value={formData.outputLotNumber}
                  onChange={(e) => setFormData({ ...formData, outputLotNumber: e.target.value })}
                  required
                  placeholder="e.g., LOT-2026-001"
                />
              </div>
            )}
            {outputItem?.trackingType === 'SERIAL' && (
              <div className="form-group">
                <label>Output Serial Numbers (comma-separated; leave blank to auto-generate):</label>
                <input
                  type="text"
                  value={formData.serialNumbers}
                  onChange={(e) => setFormData({ ...formData, serialNumbers: e.target.value })}
                  placeholder={`e.g., ${outputItem.serialPrefix || 'SN-'}000001 — count must match quantity`}
                />
              </div>
            )}
            {manualComponents.length > 0 && formData.locationId && (
              <div style={{
                background: 'white',
                border: '1px solid #ddd',
                borderRadius: '5px',
                padding: '12px 15px',
                marginBottom: '15px'
              }}>
                <strong>Manual lot picks (required):</strong>
                {manualComponents.map(component => {
                  const key = `${component.componentType}-${component.componentId}`;
                  const required = formData.quantityProduced
                    ? (parseFloat(component.qtyPerUnit) * parseFloat(formData.quantityProduced)).toFixed(3)
                    : '?';
                  return (
                    <div key={key} className="form-group" style={{ margin: '10px 0 0 0' }}>
                      <label>{component.Component?.sku} — need {required}:</label>
                      <select
                        value={manualPicks[key] || ''}
                        onChange={(e) => setManualPicks({ ...manualPicks, [key]: e.target.value })}
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
                })}
              </div>
            )}
            <div className="form-group">
              <label>Started At:</label>
              <input
                type="date"
                value={formData.startedAt}
                onChange={(e) => setFormData({ ...formData, startedAt: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Completed At:</label>
              <input
                type="date"
                value={formData.completedAt}
                onChange={(e) => setFormData({ ...formData, completedAt: e.target.value })}
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

            {error && <div className="error">{error}</div>}
            {success && <div style={{
              background: '#d4edda',
              color: '#155724',
              padding: '10px',
              borderRadius: '5px',
              marginBottom: '15px',
              textAlign: 'center'
            }}>{success}</div>}
            <button type="submit" className="btn-primary">Create Production Run</button>
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
            <th>Type</th>
            <th>Output</th>
            <th>Quantity</th>
            <th>Work Station</th>
            <th>Started</th>
            <th>Completed</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {productionRuns.map(run => (
            <tr key={run.id}>
              <td>{run.id}</td>
              <td>{run.outputType === 'WIP' ? 'WIP' : 'Product'}</td>
              <td>{run.Product?.name || run.WipItem?.name || `#${run.productId}`}</td>
              <td>{parseFloat(run.quantityProduced).toFixed(2)}</td>
              <td>{run.WorkStation?.code || '-'}</td>
              <td>{new Date(run.startedAt).toLocaleDateString()}</td>
              <td>{new Date(run.completedAt).toLocaleDateString()}</td>
              <td>{run.notes || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ProductionView;