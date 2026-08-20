import React, { useState } from "react";
import { useNavigate, Navigate, useParams } from "react-router-dom";

import Email from "../components/email";
import Password from "../components/password";

import { RegisterAccount, EmailCheck } from "../../api/authentication/register";

import { useUserID } from "../../utils/userIdContext";
import ErrorPopup from "../../components/status/errors/error";

import "../authForm.css";

export default function RegisterPage({ preEmail = "", preStep = "email" }) {
  const { code = null } = useParams();

  const { authenticated, loading, error: authError } = useUserID();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [prevEmail, setPrevEmail] = useState(preEmail);
  const [prevPassword, setPrevPassword] = useState("")

  const [step, setStep] = useState(preStep);
  const [submitting, setSubmitting] = useState(false);

  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [policyError, setPolicyError] = useState(null);
  const [formError, setFormError] = useState(null);

  const navigate = useNavigate();

  if (!loading && authenticated) {
    return <Navigate to="/chat" replace/>;
  }
  
  const handleEmailSubmit = async (e) => {
    const prevError = formError;
    e.preventDefault();
    setFormError(null)

    if (!email) {
      setFormError('Please enter an email.');
      return;
    }

    if (prevError && email.trim() === prevEmail) {
      setFormError(prevError);
      return
    }
    setPrevEmail(email.trim())
    
    try {
      const res = await EmailCheck(email, code, new AbortController().signal);
      if (res.ok && !res.exists) {
        setStep("password");
      } else {
        setFormError(res?.message);
      }
    } catch (err) {
      if (err.body?.detail?.code === "INVALID_CODE")  {
        setFormError(err.body?.detail?.message);
        navigate("/register", {replace: true})
      } else {
        setFormError(err.body?.detail?.message);
      }
    };
  };

  const handleFinalSubmit = async (e) => {
    const prevError = formError ?? null;
    e.preventDefault();
    setFormError(null);

    if (!password) {
      setFormError('Please enter a password.');
      return;
    }

    if (prevError && password === prevPassword) {
      setFormError(prevError);
      return
    }
    setPrevPassword(password);

    try {
      setSubmitting(true);
      const res = await RegisterAccount(email, acceptedPolicies, password, code, new AbortController().signal);
      if (res.ok && !res.user_confirmed) {
        const sentFrom = "register";
        navigate(`/verify-account`, { replace: true, state: { email, password, sentFrom } });
      }
    } catch (err) {
      const error_code = err.body?.detail?.code;
      const error_message = err.body?.detail?.message;

      if (error_code === "EXISTING_USERNAME") {
        setFormError(error_message)
        setStep('email');
        setEmail("")
        setPassword("");
      } else if (error_code === "INVALID_CODE")  {
        setFormError(error_message);
        navigate("/register", {replace: true})
      } else if (error_code === "INVALID PASSWORD") {
        setFormError(error_message);
      } else if (error_code === "INVALID_POLICY_AGREEMENT") {
        setPolicyError(true);
        setFormError(error_message);
      } else {
        setFormError(error_message);
      }
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
    
      <div className="auth-heading">
        <h2 className="auth-title">
          {step === "email" && "Register"}
          {step === "password" && "Set a Password"}
        </h2>
        {step === 'email' && (
          <p className="auth-subtitle">Enter your email to get started.</p>
        )}
      </div>

      {step === 'email' ? (
        <Email
          email={email}
          setEmail={setEmail}
          setFormError={setFormError}
          handleEmailSubmit={handleEmailSubmit}
        />
      ) : (
        <Password
          type={'Register'}
          handleFinalSubmit={handleFinalSubmit}
          showPolicies
          policyError={policyError}
          setPolicyError={setPolicyError}
          setPassword={setPassword}
          acceptedPolicies={acceptedPolicies}
          setAcceptedPolicies={setAcceptedPolicies}
          password={password}
          submitting={submitting}
        />
      )} 
    </>
  );
}
