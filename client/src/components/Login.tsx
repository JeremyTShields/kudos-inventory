import { useState } from 'react';
import apiClient from '../api/client';

interface LoginProps {
  onLogin: (token: string) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

function Login({ onLogin, darkMode, toggleDarkMode }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const accessToken = response.data.accessToken;
      onLogin(accessToken);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="login-container">
      <button
        onClick={toggleDarkMode}
        className="btn-theme-toggle-login"
        title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {darkMode ? '☀️' : '🌙'}
      </button>
      <div className="login-box">
        <img src="/logo-full.png" alt="Kudos Inventory System" style={{ width: '300px', marginBottom: '20px' }} />
        <h2>Login</h2>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@kudos.local"
              required
            />
          </div>
          <div className="form-group">
            <label>Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin123!"
              required
            />
          </div>
          {error && <div className="error">{error}</div>}
          <button type="submit" className="btn-primary">Login</button>
        </form>
        <div className="login-hint">
          <p>Test Credentials:</p>
          <p>Admin: admin@kudos.local / Admin123!</p>
          <p>Associate: john@kudos.local / Associate123!</p>
        </div>
      </div>
    </div>
  );
}

export default Login;