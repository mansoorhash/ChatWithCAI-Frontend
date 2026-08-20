import React from "react";
import { Link } from "react-router-dom";
import "../authForm.css"

export default function Email({
  email,
  setEmail,
  formError,
  setFormError,
  handleEmailSubmit,
}) {
  return (
    <form onSubmit={handleEmailSubmit} className="auth-form">
      <div className="auth-group">
        <label className="auth-label" htmlFor="email">Email</label>

        <input
          className={`auth-input ${formError ? "error" : ""}`}
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onFocus={() => setFormError(null)}
          placeholder="email@example.com"
          autoComplete="email"
          required
        />
        <div className="auth-row auth-row-left">
          <Link to="/login" className="auth-link">
            Login
          </Link>
        </div>
      </div>

      

      <button type="submit" className="auth-button">
        Next
      </button>
    </form>
  );
}
