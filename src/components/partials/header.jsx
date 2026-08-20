import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUserID } from '../../utils/userIdContext';
import './header.css';

export default function Header({
  logoOnly= false
}) {
  const { authenticated } = useUserID();
  const navigate = useNavigate()
  return (
    <header className="app-header">
      <div className="header-inner">
        <Link className="header-left" to="/">
          <img
            src="/logo.svg"
            className="logo-img"
            width={75}
            alt="CAI"
          />

          <h1 className="logo-text">CAI</h1>
        </Link>

        {!logoOnly && (
          <div className="header-right">
            {authenticated ? (
              <button 
                className="header-btn"
                onClick={() => navigate("/chat") }
                >Chat
              </button>
            ) : (
              <button 
                className="header-btn"
                onClick={() => navigate("/login") }
                >Login
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
