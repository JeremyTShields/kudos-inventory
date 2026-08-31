import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

vi.mock('./api/client', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn()
  }
}));

// Build a fake JWT whose payload segment is guaranteed to contain base64url
// characters ('-' or '_') that plain atob() cannot decode. Only bytes like
// '~' (0x7E) map to those alphabet positions, so pad the payload with them
// until one lands on a suitable bit boundary. This is the input shape that
// used to log users straight back out after logging in.
function makeToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  for (let i = 0; i < 8; i++) {
    const candidate = { ...payload, jti: '~'.repeat(i + 1) };
    const segment = Buffer.from(JSON.stringify(candidate)).toString('base64url');
    if (segment.includes('-') || segment.includes('_')) {
      return `${header}.${segment}.signature`;
    }
  }
  throw new Error('could not build a payload with base64url-specific characters');
}

describe('App', () => {
  it('shows the login screen when no token is stored', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('decodes a base64url token payload and shows the signed-in user', async () => {
    const token = makeToken({ sub: 1, email: 'admin@kudos.local', role: 'ADMIN' });
    localStorage.setItem('token', token);

    render(<App />);

    // Navbar renders "<name> (<role>)" with name derived from the email
    expect(await screen.findByText('admin (ADMIN)')).toBeInTheDocument();
    // The token must survive decoding instead of being cleared
    expect(localStorage.getItem('token')).toBe(token);
  });
});
