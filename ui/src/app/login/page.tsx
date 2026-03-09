'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, forceNewPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [needsNewPassword, setNeedsNewPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await login(email, password);
      if (result === 'NEW_PASSWORD_REQUIRED') {
        setNeedsNewPassword(true);
      } else {
        router.push('/');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNewPassword(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await forceNewPassword(newPassword);
      router.push('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to set new password');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      {/* Grain overlay */}
      <div className="login-grain" />

      {/* Geometric accents */}
      <div className="login-accent login-accent-1" />
      <div className="login-accent login-accent-2" />
      <div className="login-accent login-accent-3" />

      <div className="login-container">
        {/* Logo mark */}
        <div className="login-logo-wrapper">
          <div className="login-logo">
            <svg viewBox="0 0 32 32" fill="none" className="w-8 h-8">
              <path
                d="M4 8 L16 4 L28 8 L28 20 L16 28 L4 20Z"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
              />
              <path
                d="M16 4 L16 28 M4 8 L28 20 M28 8 L4 20"
                stroke="currentColor"
                strokeWidth="1"
                opacity="0.3"
              />
            </svg>
          </div>
          <h1 className="login-title">Uniflow</h1>
          <p className="login-subtitle">Customer Data Platform</p>
        </div>

        {/* Card */}
        <div className="login-card">
          {!needsNewPassword ? (
            <form onSubmit={handleLogin}>
              <div className="login-field">
                <label htmlFor="email" className="login-label">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="login-input"
                  placeholder="admin@company.com"
                  required
                  autoFocus
                  autoComplete="email"
                />
              </div>

              <div className="login-field">
                <label htmlFor="password" className="login-label">Password</label>
                <div className="login-input-group">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="login-input login-input-with-icon"
                    placeholder="Enter password"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="login-toggle-pw"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {error && <p className="login-error">{error}</p>}

              <button type="submit" disabled={submitting} className="login-button">
                {submitting ? (
                  <span className="login-spinner" />
                ) : (
                  <>
                    Sign in
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleNewPassword}>
              <div className="login-challenge-header">
                <Lock size={18} className="text-amber-500" />
                <div>
                  <p className="font-medium text-gray-900 text-sm">Password change required</p>
                  <p className="text-xs text-gray-500 mt-0.5">Set a new password to continue</p>
                </div>
              </div>

              <div className="login-field">
                <label htmlFor="newPassword" className="login-label">New Password</label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="login-input"
                  placeholder="Choose a strong password"
                  required
                  autoFocus
                  autoComplete="new-password"
                  minLength={8}
                />
              </div>

              {error && <p className="login-error">{error}</p>}

              <button type="submit" disabled={submitting} className="login-button">
                {submitting ? (
                  <span className="login-spinner" />
                ) : (
                  <>
                    Set password & continue
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <p className="login-footer">
          Protected by AWS Cognito
        </p>
      </div>
    </div>
  );
}
