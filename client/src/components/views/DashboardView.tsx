import { useState, useEffect } from 'react';
import apiClient from '../../api/client';

function DashboardView() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [materials, products, stock, lowStock] = await Promise.all([
        apiClient.get('/materials'),
        apiClient.get('/products'),
        apiClient.get('/inventory/stock'),
        apiClient.get('/inventory/low-stock')
      ]);

      setStats({
        materialCount: materials.data.length,
        productCount: products.data.length,
        stockItems: stock.data.length,
        lowStockCount: lowStock.data.length
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  if (!stats) return <div>Loading...</div>;

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Materials</h3>
          <div className="stat-number">{stats.materialCount}</div>
        </div>
        <div className="stat-card">
          <h3>Products</h3>
          <div className="stat-number">{stats.productCount}</div>
        </div>
        <div className="stat-card">
          <h3>Stock Items</h3>
          <div className="stat-number">{stats.stockItems}</div>
        </div>
        <div className="stat-card alert">
          <h3>Low Stock Alerts</h3>
          <div className="stat-number">{stats.lowStockCount}</div>
        </div>
      </div>
    </div>
  );
}

export default DashboardView;