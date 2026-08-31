import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from './Login';
import apiClient from '../api/client';

vi.mock('../api/client', () => ({
  default: { post: vi.fn(), get: vi.fn() }
}));

const mockedPost = vi.mocked(apiClient.post);

beforeEach(() => {
  mockedPost.mockReset();
});

describe('Login', () => {
  it('submits credentials and passes the access token to onLogin', async () => {
    mockedPost.mockResolvedValueOnce({ data: { accessToken: 'token-123' } });
    const onLogin = vi.fn();

    render(<Login onLogin={onLogin} darkMode={false} toggleDarkMode={() => {}} />);

    await userEvent.type(screen.getByLabelText(/email/i), 'admin@kudos.local');
    await userEvent.type(screen.getByLabelText(/password/i), 'Admin123!');
    await userEvent.click(screen.getByRole('button', { name: /login/i }));

    expect(mockedPost).toHaveBeenCalledWith('/auth/login', {
      email: 'admin@kudos.local',
      password: 'Admin123!'
    });
    expect(onLogin).toHaveBeenCalledWith('token-123');
  });

  it('shows the server error message when login fails', async () => {
    mockedPost.mockRejectedValueOnce({
      response: { data: { message: 'Invalid credentials' } }
    });
    const onLogin = vi.fn();

    render(<Login onLogin={onLogin} darkMode={false} toggleDarkMode={() => {}} />);

    await userEvent.type(screen.getByLabelText(/email/i), 'admin@kudos.local');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /login/i }));

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
    expect(onLogin).not.toHaveBeenCalled();
  });
});
