import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";

import { RotateCw } from "lucide-react";
import "./verifyaccount.css";

import {
  ConfirmRegister,
  ResendCode,
} from "../../api/authentication/register";
import { LoginAccount } from "../../api/authentication/login";

import { useUserID } from "../../utils/userIdContext";
import ErrorPopup from "../../components/status/errors/error";
import SuccessPopup from "../../components/status/success/success"

export default function VerifyAccount() {
  const { refresh, error: authError } = useUserID();
  const location = useLocation();
  const navigate = useNavigate();

  const email = location.state?.email || "";
  const password = location.state?.password || "";
  const sentFrom = location.state?.sentFrom || "";
  const fromRegister = sentFrom === "register";
  const fromLogin = sentFrom === "login";

  const canAccessVerifyPage =
    !!email && ["login", "register"].includes(sentFrom);

  const [resentMessage, setResentMessage] = useState("");
  const [code, setCode] = useState("");

  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const RESEND_COOLDOWN_SECONDS = 60;
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleResendCode = useCallback(
    async ({ showSuccessMessage = true } = {}) => {
      setFormError(null);

      if (!email) {
        navigate("/login", { replace: true });
        return false;
      }

      try {
        setResending(true);
        await ResendCode(email);
        
        if (showSuccessMessage) {
          setResentMessage("Code Sent");
        }
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
        return true;
      } catch (err) {
        setResendCooldown(RESEND_COOLDOWN_SECONDS);

        if (err?.status === 429) {
          setFormError(
            "You've requested too many codes. Please wait and try again."
          );
        } else {
          setFormError(err.message || "Failed to send verification code.");
        }

        return false;
      } finally {
        setResending(false);
      }
    },
    [email, navigate]
  );

  useEffect(() => {
    if (!email) return;

    if (fromRegister) {
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      return;
    }

    if (fromLogin) {
      handleResendCode({ showSuccessMessage: true });
    }
  }, [email, fromRegister, fromLogin, handleResendCode]);

  if (!canAccessVerifyPage) {
    return <Navigate to="/login" replace />;
  }

  const handleVerificationSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!email) {
      navigate("/login", { replace: true });
      return;
    }

    if (!code.trim()) {
      setFormError("Please enter the verification code.");
      return;
    }

    try {
      setSubmitting(true);

      const res = await ConfirmRegister(email, code.trim());

      if (res.ok) {
        if (!password) {
          navigate("/login", { replace: true });
          return;
        }

        const loginRes = await LoginAccount(email, password);

        if (loginRes.ok) {
          await refresh();
          navigate("/chat", { replace: true });
          return;
        }

        const loginData = await loginRes.json().catch(() => ({}));
        setFormError(loginData.error || `Login failed (${loginRes.status})`);
        return;
      }

      const data = await res.json().catch(() => ({}));
      setFormError(data.message || "Verification failed.");
    } catch (err) {
      if (err.body?.detail?.code === "ExpiredCodeException") {
        setFormError("Expired code, resend the code.")
      } else { 
        setFormError(
          err.message || "Something went wrong during verification."
        );
      }
      
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    if (resendCooldown > 0 || resending) return;

    setResentMessage("");

    await handleResendCode({ showSuccessMessage: true });
  };

  return (
    <>

      <SuccessPopup
        open={!!resentMessage || !!authError}
        message={resentMessage || authError}
        onClose={() => setResentMessage(null)}
      />
      <ErrorPopup
        open={!!formError || !!authError}
        message={formError || authError}
        onClose={() => setFormError(null)}
      />

      <div className="auth-heading">
        <h2 className="auth-title">Verify Your Account</h2>
      </div>

      <form onSubmit={handleVerificationSubmit} className="auth-form">
        <div className="auth-group">
          <label className="auth-label" htmlFor="verification-code">Verification Code</label>

          <input
            className={`auth-input ${formError ? "error" : ""}`}
            id="verification-code"
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setFormError(null);
            }}
            placeholder="Enter your verification code"
            autoComplete="one-time-code"
            required
          />

          <div className="auth-row auth-row-left">
            <span className="auth-muted">
              Code sent to <strong>{email}</strong>
            </span>
          </div>
        </div>

        <button type="submit" disabled={submitting} className="auth-button">
          {submitting ? "Verifying..." : "Verify Email"}
        </button>

        <button
          type="button"
          onClick={onResend}
          disabled={resending || resendCooldown > 0}
          className="auth-button auth-button-secondary"
        >
          <RotateCw size={16} />
          {resending
            ? "Sending..."
            : resendCooldown > 0
              ? `Resend in ${resendCooldown}s`
              : "Resend Code"}
        </button>
      </form>
    </>
  );
}
