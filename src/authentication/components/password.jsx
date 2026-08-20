import React, { useState } from "react";
import { Info, Check, Eye, EyeClosed } from "lucide-react";
import "./password.css";

export default function Password({
  type,
  handleFinalSubmit,
  password,
  setPassword,
  showPolicies=false,
  acceptedPolicies=false,
  policyError,
  setPolicyError,
  setAcceptedPolicies,
  requireConfirmation=false,
  confirmPassword,
  setConfirmPassword,
  requireVerificationCode=false,
  verificationCode,
  setVerificationCode,
  submitting,
  formError,
}) {
  const [showRequirements, setShowRequirements] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  return (
    <form onSubmit={handleFinalSubmit} className="auth-form">
      {requireVerificationCode && (
        <div className="auth-group">
          <label className="auth-label" htmlFor="verification-code">Verification Code*</label>
          <div className="password-input-wrapper">
            <input
              className={`auth-input ${formError ? "error" : ""}`}
              id="verification-code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="....."
              required
            />
          </div>
        </div>
      )}


      <div className="auth-group">
        <label className="auth-label" htmlFor="password">Enter Password*</label>
        <div className="password-input-wrapper">
          <input
            className={`auth-input ${formError ? "error" : ""}`}
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="new-password"
            required
          />

          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeClosed size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {requireConfirmation && (
        <div className="auth-group">
          <label className="auth-label" htmlFor="confirm-password">Re-enter Password*</label>
          <div className="password-input-wrapper">
            <input
              className={`auth-input ${formError ? "error" : ""}`}
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="....."
              required
            />
          </div>
        </div>
      )}

      <div className="info-popup-wrapper">
        <div className="auth-label info-popup-label">
          Password Requirements
          <button
            type="button"
            className="info-trigger"
            onClick={() => setShowRequirements((prev) => !prev)}
            onMouseLeave={() => setShowRequirements(false)}
            aria-expanded={showRequirements}
            aria-label="Show password requirements"
          >
            <Info size={15} />
          </button>
        </div>

        {showRequirements && (
          <div className="info-popup-container">
            <p className="title">Password minimum length</p>
            <p>8 character(s)</p>

            <p className="title">Password requirements</p>
            <p>Contains at least 1 number</p>
            <p>Contains at least 1 special character</p>
            <p>Contains at least 1 uppercase letter</p>
            <p>Contains at least 1 lowercase letter</p>
          </div>
        )}
      </div>
      {showPolicies && (
        <label className={`policy-checkbox ${policyError ? "error" : ""}`}>
          <input
            type="checkbox"
            checked={acceptedPolicies}
            onChange={(e) => setAcceptedPolicies(e.target.checked)}
            onFocus={() => setPolicyError(null)}
            required
          />

          <span className="checkbox-icon" aria-hidden="true">
            {acceptedPolicies && <Check size={14} strokeWidth={3} />}
          </span>

          <span className="policy-text">
            I confirm that I am at least 18 and agree to the{" "}
            <a href="/terms" target="_blank" rel="noopener noreferrer">
              Terms of Service
            </a>
            , and acknowledge the{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer">
              Privacy Policy
            </a>
            .
          </span>
        </label>
      )}

      <button type="submit" disabled={submitting} className="auth-button">
        {submitting ? `${type}...` : `${type}`}
      </button>
    </form>
  );
}
