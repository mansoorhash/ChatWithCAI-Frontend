import React, { useState } from 'react';
import { useLocation, useNavigate, Navigate, Link } from 'react-router-dom';
import { useUserID } from '../../utils/userIdContext';
import ErrorPopup from '../../components/status/errors/error';
import SuccessPopup from '../../components/status/success/success';
import { LoginAccount } from '../../api/authentication/login';
import '../authForm.css';

export default function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const receivedError = location.state?.receivedError || null;
  const receivedSuccess = location.state?.receivedSuccess || null;
  const { authenticated, loading, error: authError, refresh } = useUserID();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(receivedError);
  const [formSuccess, setFormSuccess] = useState(receivedSuccess);

  if (!loading && authenticated) {
    return <Navigate to="/chat" replace />;
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setFormError('Please enter your email and password.');
      return;
    }

    try {
      setSubmitting(true);

      const data = await LoginAccount(trimmedEmail, password);
      if (data?.ok) {
        await refresh();
        navigate('/chat', { replace: true });
        return;
      }

      throw new Error(data?.unauthorized || 'Login failed');
    } catch (e) {
      const err = e.body;
      if (err?.status === 409) {
        const data = err?.data || {};

        if (
          data?.challenge === 'NEW_PASSWORD_REQUIRED' &&
          data?.username
        ) {
          navigate('/force-change-password', { 
            replace: true,
            state: {
              challenge: data.challenge,
              username: data.username,
            }
          });
          return;
        }

        setFormError('Password change required.');
        return;
      }

      if (err?.detail?.code === "UserNotConfirmedException") {
        navigate("/verify-account", {
          replace: true,
          state: {
            email: trimmedEmail,
            password,
            sentFrom: "login",
          },
        });

        return;
      }

      setFormError(err?.detail?.error || err?.detail?.message || err?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <>
      <ErrorPopup
        open={!!formError || !!authError}
        message={formError || authError}
        onClose={() => setFormError(null)}
      />
      <SuccessPopup
        open={!!formSuccess}
        message={formSuccess}
        onClose={() => setFormSuccess(null)}
      />

      <div className="auth-heading">
        <h2 className="auth-title">Login</h2>
      </div>

      <form onSubmit={onSubmit} className="auth-form">
        <div className="auth-group">
          <label className="auth-label" htmlFor="login-email">Email</label>
          <input
            className="auth-input"
            id="login-email"
            type='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="your@email.com"
          />
        </div>

        <div className="auth-group">
          <label className="auth-label" htmlFor="login-password">Password</label>
          <input
            className="auth-input"
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </div>

        <div className="auth-row auth-row-right">
          <Link to="/forgot-password" className="auth-link">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="auth-button"
        >
          {submitting ? 'Signing in…' : 'Login'}
        </button>
      </form>

      <p className="auth-footer">
        <span className="auth-footer-text">Don't have an account?</span>{' '}
        <Link to="/register" className="auth-link">
          Sign up
        </Link>
      </p>
    </>
  );
}
