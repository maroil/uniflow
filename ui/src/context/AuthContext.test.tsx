import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './AuthContext';

// Mock auth module
const mockGetCurrentToken = vi.fn();
const mockGetCurrentEmail = vi.fn();
const mockSignIn = vi.fn();
const mockCompleteNewPassword = vi.fn();
const mockSignOut = vi.fn();

vi.mock('@/lib/auth', () => ({
  getCurrentToken: () => mockGetCurrentToken(),
  getCurrentEmail: () => mockGetCurrentEmail(),
  signIn: (...args: unknown[]) => mockSignIn(...args),
  completeNewPassword: (...args: unknown[]) => mockCompleteNewPassword(...args),
  signOut: () => mockSignOut(),
}));

function TestConsumer() {
  const { user, loading, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.email : 'null'}</span>
      <button onClick={() => login('test@example.com', 'pass123')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentToken.mockResolvedValue(null);
    mockGetCurrentEmail.mockResolvedValue(null);
  });

  it('starts in loading state and resolves to no user', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    // Wait for loading to resolve
    await vi.waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(screen.getByTestId('user').textContent).toBe('null');
  });

  it('restores session from existing token', async () => {
    mockGetCurrentToken.mockResolvedValue('jwt-token');
    mockGetCurrentEmail.mockResolvedValue('user@test.com');

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await vi.waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(screen.getByTestId('user').textContent).toBe('user@test.com');
  });

  it('login sets user on success', async () => {
    mockSignIn.mockResolvedValue({ token: 'new-jwt', email: 'test@example.com' });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await vi.waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    await act(async () => {
      await userEvent.click(screen.getByText('Login'));
    });

    expect(screen.getByTestId('user').textContent).toBe('test@example.com');
    expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'pass123');
  });

  it('logout clears user', async () => {
    mockGetCurrentToken.mockResolvedValue('jwt-token');
    mockGetCurrentEmail.mockResolvedValue('user@test.com');

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await vi.waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('user@test.com');
    });

    await act(async () => {
      await userEvent.click(screen.getByText('Logout'));
    });

    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('login returns NEW_PASSWORD_REQUIRED on challenge', async () => {
    mockSignIn.mockResolvedValue({ challenge: 'NEW_PASSWORD_REQUIRED' });

    let loginResult: string | undefined;
    function ChallengeConsumer() {
      const { loading, login } = useAuth();
      return (
        <div>
          <span data-testid="loading">{String(loading)}</span>
          <button onClick={async () => { loginResult = await login('a@b.com', 'old'); }}>Login</button>
        </div>
      );
    }

    render(
      <AuthProvider>
        <ChallengeConsumer />
      </AuthProvider>,
    );

    await vi.waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    await act(async () => {
      await userEvent.click(screen.getByText('Login'));
    });

    expect(loginResult).toBe('NEW_PASSWORD_REQUIRED');
  });
});
