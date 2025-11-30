import { useState, useEffect } from 'react';
import apiClient from '../../api/client';

interface UsersViewProps {
  currentUserRole?: string;
}

// Users View (Admin Only)
function UsersView({ currentUserRole }: UsersViewProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'ASSOCIATE'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordChangeUserId, setPasswordChangeUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editUserForm, setEditUserForm] = useState<any>({});
  const isAdmin = currentUserRole === 'ADMIN';

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await apiClient.get('/auth/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await apiClient.post('/auth/register', formData);
      setSuccess('User created successfully!');
      setFormData({ name: '', email: '', password: '', role: 'ASSOCIATE' });
      setShowAddForm(false);
      loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create user');
    }
  };

  const handleChangePassword = async (userId: number) => {
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setError('');
    setSuccess('');
    try {
      await apiClient.put(`/auth/users/${userId}/password`, { password: newPassword });
      setSuccess('Password changed successfully!');
      setPasswordChangeUserId(null);
      setNewPassword('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to change password');
    }
  };

  const handleEditUser = (user: any) => {
    setEditingUserId(user.id);
    setEditUserForm({ name: user.name, email: user.email, role: user.role });
  };

  const handleSaveUser = async (userId: number) => {
    setError('');
    setSuccess('');
    try {
      await apiClient.put(`/auth/users/${userId}`, editUserForm);
      setSuccess('User updated successfully!');
      setEditingUserId(null);
      setEditUserForm({});
      loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update user');
    }
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditUserForm({});
  };

  return (
    <div className="view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>User Management</h1>
        {isAdmin && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-primary"
            style={{ width: 'auto', padding: '10px 20px' }}
          >
            {showAddForm ? 'Cancel' : 'Add User'}
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
          <h3 style={{ marginBottom: '15px' }}>Add New User</h3>
          <form onSubmit={handleAddUser}>
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
              <label>Email:</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Password:</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
              />
            </div>
            <div className="form-group">
              <label>Role:</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '14px'
                }}
              >
                <option value="ASSOCIATE">Associate</option>
                <option value="ADMIN">Admin</option>
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
            <button type="submit" className="btn-primary">Create User</button>
          </form>
        </div>
      )}

      {error && <div className="error" style={{ marginBottom: '15px' }}>{error}</div>}
      {success && <div style={{
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
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Created</th>
            {isAdmin && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              {editingUserId === user.id ? (
                <>
                  <td>{user.id}</td>
                  <td><input value={editUserForm.name} onChange={(e) => setEditUserForm({...editUserForm, name: e.target.value})} style={{width: '100%', padding: '5px'}} /></td>
                  <td><input type="email" value={editUserForm.email} onChange={(e) => setEditUserForm({...editUserForm, email: e.target.value})} style={{width: '100%', padding: '5px'}} /></td>
                  <td>
                    <select value={editUserForm.role} onChange={(e) => setEditUserForm({...editUserForm, role: e.target.value})} style={{width: '100%', padding: '5px'}}>
                      <option value="ASSOCIATE">ASSOCIATE</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button onClick={() => handleSaveUser(user.id)} style={{padding: '5px 10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', marginRight: '5px'}}>Save</button>
                    <button onClick={handleCancelEdit} style={{padding: '5px 10px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer'}}>Cancel</button>
                  </td>
                </>
              ) : (
                <>
                  <td>{user.id}</td>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  {isAdmin && (
                    <td>
                      <button onClick={() => handleEditUser(user)} style={{padding: '5px 10px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', marginRight: '5px'}}>
                        Edit
                      </button>
                      {passwordChangeUserId === user.id ? (
                        <div style={{ display: 'inline-flex', gap: '5px', alignItems: 'center' }}>
                          <input
                            type="password"
                            placeholder="New password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            style={{
                              padding: '5px 8px',
                              border: '1px solid #ddd',
                              borderRadius: '3px',
                              fontSize: '13px',
                              width: '120px'
                            }}
                            minLength={6}
                          />
                          <button
                            onClick={() => handleChangePassword(user.id)}
                            style={{
                              padding: '5px 10px',
                              background: '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              fontSize: '13px'
                            }}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setPasswordChangeUserId(null);
                              setNewPassword('');
                              setError('');
                            }}
                            style={{
                              padding: '5px 10px',
                              background: '#6c757d',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              fontSize: '13px'
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setPasswordChangeUserId(user.id);
                            setNewPassword('');
                            setError('');
                            setSuccess('');
                          }}
                          style={{
                            padding: '5px 10px',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '13px'
                          }}
                        >
                          Change Password
                        </button>
                      )}
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

export default UsersView;