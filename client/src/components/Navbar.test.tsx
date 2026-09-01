import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Navbar from './Navbar';
import type { User } from '../types';

const admin: User = { id: 1, name: 'admin', email: 'admin@kudos.local', role: 'ADMIN' };
const associate: User = { id: 2, name: 'john', email: 'john@kudos.local', role: 'ASSOCIATE' };

function renderNavbar(user: User, activeView = 'dashboard', setActiveView = vi.fn()) {
  render(
    <Navbar
      user={user}
      activeView={activeView}
      setActiveView={setActiveView}
      darkMode={false}
      toggleDarkMode={() => {}}
      handleLogout={() => {}}
    />
  );
  return setActiveView;
}

describe('Navbar', () => {
  it('shows top-level groups without duplicate page buttons', () => {
    renderNavbar(admin);
    expect(screen.getByRole('button', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^inventory/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^production/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^settings/i })).toBeInTheDocument();

    // Grouped pages are not top-level buttons until their menu opens
    expect(screen.queryByRole('button', { name: 'Materials' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Users' })).not.toBeInTheDocument();
  });

  it('opens the Inventory menu on click and switches views on selection', async () => {
    const setActiveView = renderNavbar(admin);

    await userEvent.click(screen.getByRole('button', { name: /^inventory/i }));
    const menu = screen.getByRole('menu');
    expect(menu).toBeInTheDocument();

    for (const label of ['Inventory', 'Purchasing', 'Receiving', 'Transfers', 'Warehousing', 'Materials', 'Products', 'Shipping']) {
      expect(screen.getByRole('menuitem', { name: label })).toBeInTheDocument();
    }

    await userEvent.click(screen.getByRole('menuitem', { name: 'Transfers' }));
    expect(setActiveView).toHaveBeenCalledWith('transfers');
    // Menu closes after selection
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes an open menu on Escape', async () => {
    renderNavbar(admin);
    await userEvent.click(screen.getByRole('button', { name: /^production/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('lists the Production group contents', async () => {
    const setActiveView = renderNavbar(admin);
    await userEvent.click(screen.getByRole('button', { name: /^production/i }));

    for (const label of ['Work Stations', 'BOMs', 'Operations', 'Production Runs']) {
      expect(screen.getByRole('menuitem', { name: label })).toBeInTheDocument();
    }

    await userEvent.click(screen.getByRole('menuitem', { name: 'Work Stations' }));
    expect(setActiveView).toHaveBeenCalledWith('workstations');
  });

  it('hides Audit Logs from associates but shows it to admins', async () => {
    renderNavbar(associate);
    await userEvent.click(screen.getByRole('button', { name: /^settings/i }));
    expect(screen.getByRole('menuitem', { name: 'Users' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Audit Logs' })).not.toBeInTheDocument();
  });

  it('shows Audit Logs to admins', async () => {
    renderNavbar(admin);
    await userEvent.click(screen.getByRole('button', { name: /^settings/i }));
    expect(screen.getByRole('menuitem', { name: 'Audit Logs' })).toBeInTheDocument();
  });

  it('marks the group trigger active when it contains the active view', () => {
    renderNavbar(admin, 'materials');
    expect(screen.getByRole('button', { name: /^inventory/i })).toHaveClass('active');
    expect(screen.getByRole('button', { name: /^production/i })).not.toHaveClass('active');
  });
});
