import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";

import Email from "../components/email";
import Password from "../components/password";

import { ConfirmNewPassword, EmailForgotPassword } from "../../api/authentication/forgotpassword";

import { useUserID } from "../../utils/userIdContext";
import ErrorPopup from "../../components/status/errors/error";
import SuccessPopup from "../../components/status/success/success";

import "../authForm.css";

export default function ForgotPassword({ preEmail = "", preStep = "email" }) {
  const { authenticated, loading, error: authError } = useUserID();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [prevEmail, setPrevEmail] = useState(preEmail);
  const [prevPassword, setPrevPassword] = useState("")
  const [verificationCode, setVerificationCode] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [step, setStep] = useState(preStep);
  const [submitting, setSubmitting] = useState(false);

  const [formSuccess, setFormSuccess] = useState(null)
  const [formError, setFormError] = useState(null);

  const navigate = useNavigate();

  if (!loading && authenticated) {
    return <Navigate to="/chat" replace/>;
  }
  
  const handleEmailSubmit = async (e) => {
    const prevError = formError;
    e.preventDefault();
    setFormSuccess(null);
    setFormError(null);

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
        const res = await EmailForgotPassword(email, new AbortController().signal);
        if (res.ok) {
          setFormSuccess(res.message);
          setEmail(res.destination);
          setStep("password");
        }
    } catch (err) {
        console.log(err);
        setFormError(err.body?.detail?.message);
    };
  };

  const handleFinalSubmit = async (e) => {
    const prevError = formError ?? null;
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    if (!verificationCode) {
      setFormError("Enter verification code.");
      return
    } 
    if (!password) {
      setFormError('Please enter a password.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Passwords do not match.")
      return
    }

    if (prevError && password === prevPassword) {
      setFormError(prevError);
      return
    }
    setPrevPassword(password);

    try {
      setSubmitting(true);
      await ConfirmNewPassword(prevEmail, verificationCode, password, new AbortController().signal);
      navigate('/login', 
        { 
          replace: true,
          state: {
            receivedSuccess: "Password Successfully Changed"
          }
        }
      )
    } catch (err) {
      console.log(err);
      setFormError(err.body?.detail?.message);
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
        <h2 className="auth-title">
          {step === "email" && "Reset your password"}
          {step === "password" && "Set a Password"}
        </h2>
        {step === 'email' && (
          <p className="auth-subtitle">Enter your email to get started.</p>
        )}
        {step === 'password' && (
          <>
          <p className="auth-subtitle">Enter your verification code and new password.</p>
          <p className="auth-subtitle">{`Sent to: ${email}`}</p>
          </>
        )}
      </div>

      {step === 'email' ? (
        <Email
          email={email}
          setEmail={setEmail}
          setFormError={setFormError}
          handleEmailSubmit={handleEmailSubmit}
        />
      ) : step ==="password" && (
        <Password
          type={'Change Password'}
          handleFinalSubmit={handleFinalSubmit}
          setPassword={setPassword}
          requireConfirmation
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          requireVerificationCode
          verificationCode={verificationCode}
          setVerificationCode={setVerificationCode}
          password={password}
          submitting={submitting}
        />
      )} 
    </>
  );
}
