import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import Password from "../components/password";
import { SubmitNewPassword } from "../../api/authentication/forcechangepassword";

import { useUserID } from "../../utils/userIdContext";
import ErrorPopup from "../../components/status/errors/error";

import "../authForm.css";

export default function ForceChangePassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const { challenge, username } = location.state || {};

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const { refresh } = useUserID();
  
  if (!challenge || !username) {
    setTimeout(() => navigate('/login', { replace: true }), 0);
    return null; 
  }

  const validatePassword = (password) => {
    if (password.length < 8) {
      return "Password must be at least 8 characters.";
    }

    if (!/[0-9]/.test(password)) {
      return "Password must contain at least one number.";
    }

    if (!/[!@#$%^&*(),.?":{}|<>_\-\\[\]/+=;']/g.test(password)) {
      return "Password must contain at least one special character.";
    }

    if (!/[A-Z]/.test(password)) {
      return "Password must contain at least one uppercase letter.";
    }

    if (!/[a-z]/.test(password)) {
      return "Password must contain at least one lowercase letter.";
    }

    return "";
  };


  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setFormError("")

    const passwordError = validatePassword(password);

    if (passwordError) {
      setFormError(passwordError);
      return
    }

    if (password !== confirmPassword) {
      setFormError("Passwords do not match");
      return
    }
    try {
      setSubmitting(true);

      const resp = await SubmitNewPassword(username, password);

      if (!resp.ok) {
        throw new Error(resp.message || "Failed to update password.");
      }

      await refresh();
      navigate('/chat', { replace: true });
      return;

    } catch (error) {
      navigate('/login', {
        replace: true,
        state: {
          receivedError: error.body?.detail?.message || error.message || null
        }
      })
    } finally {
      setSubmitting(false);
    }
  }


  return (
    <>
      <ErrorPopup
        open={!!formError}
        message={formError}
        onClose={() => setFormError(null)}
      />
    
      <div className="auth-heading">
        <h2 className="auth-title">
          New Password
        </h2>
      </div>

      <Password
        type={"Change Password"}
        handleFinalSubmit={handleFinalSubmit}
        password={password}
        setPassword={setPassword}
        requireConfirmation
        confirmPassword={confirmPassword}
        setConfirmPassword={setConfirmPassword}
        submitting={submitting}
      />
    </>
  );
}
