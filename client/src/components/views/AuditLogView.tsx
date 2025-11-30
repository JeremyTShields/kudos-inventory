import { useState, useEffect } from 'react';
import apiClient from '../../api/client';

// Audit Log View (Admin Only)
function AuditLogView() {
  const [logs, setLogs] = useState<any[]>([]);
  const [filter, setFilter] = useState({
    action: '',
    entityType: '',
    limit: '100'
  });

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.action) params.append('action', filter.action);
      if (filter.entityType) params.append('entityType', filter.entityType);
      if (filter.limit) params.append('limit', filter.limit);

      const response = await apiClient.get(`/audit/logs?${params.toString()}`);
      setLogs(response.data);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    }
  };

  const handleFilterChange = () => {
    loadLogs();
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'CREATE': return '#28a745';
      case 'UPDATE': return '#ffc107';
      case 'DELETE': return '#dc3545';
      case 'LOGIN': return '#17a2b8';
      case 'LOGOUT': return '#6c757d';
      default: return '#3b82f6';
    }
  };

  return (
    <div className="view">
      <h1>Audit Log</h1>
      <p style={{ color: '#6c757d', marginBottom: '20px' }}>
        Complete record of all system actions and user activity
      </p>

      <div style={{
        background: '#f8f9fa',
        padding: '15px',
        borderRadius: '5px',
        marginBottom: '20px',
        display: 'flex',
        gap: '15px',
        alignItems: 'end'
      }}>
        <div className="form-group" style={{ margin: 0, flex: 1 }}>
          <label>Action Type:</label>
          <select
            value={filter.action}
            onChange={(e) => setFilter({ ...filter, action: e.target.value })}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '5px'
            }}
          >
            <option value="">All Actions</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="LOGIN">Login</option>
            <option value="LOGOUT">Logout</option>
          </select>
        </div>
        <div className="form-group" style={{ margin: 0, flex: 1 }}>
          <label>Entity Type:</label>
          <select
            value={filter.entityType}
            onChange={(e) => setFilter({ ...filter, entityType: e.target.value })}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '5px'
            }}
          >
            <option value="">All Entities</option>
            <option value="USER">User</option>
            <option value="MATERIAL">Material</option>
            <option value="PRODUCT">Product</option>
            <option value="LOCATION">Location</option>
            <option value="RECEIPT">Receipt</option>
            <option value="PRODUCTION">Production</option>
            <option value="SHIPMENT">Shipment</option>
            <option value="INVENTORY_ADJUSTMENT">Inventory Adjustment</option>
          </select>
        </div>
        <div className="form-group" style={{ margin: 0, flex: '0 0 150px' }}>
          <label>Limit:</label>
          <select
            value={filter.limit}
            onChange={(e) => setFilter({ ...filter, limit: e.target.value })}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '5px'
            }}
          >
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="250">250</option>
            <option value="500">500</option>
          </select>
        </div>
        <button
          onClick={handleFilterChange}
          className="btn-primary"
          style={{ padding: '8px 20px', height: 'fit-content' }}
        >
          Apply Filter
        </button>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>User</th>
            <th>Action</th>
            <th>Entity Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td>{new Date(log.createdAt).toLocaleString()}</td>
              <td>{log.User?.name || log.User?.email || `User #${log.userId}`}</td>
              <td>
                <span style={{
                  padding: '3px 8px',
                  borderRadius: '3px',
                  background: getActionBadgeColor(log.action),
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {log.action}
                </span>
              </td>
              <td>{log.entityType}</td>
              <td>{log.description}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {logs.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#6c757d'
        }}>
          No audit logs found matching the selected filters.
        </div>
      )}
    </div>
  );
}

export default AuditLogView;