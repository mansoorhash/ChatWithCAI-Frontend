import React from "react";
import { Link } from "react-router-dom";
import './footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        {/* Left */}
        <div className="footer-brand">
          <h3>CAI</h3>
        </div>

        {/* Middle */}
        <div className="footer-links">
          <div className="footer-column">
            <span className="footer-title">Product</span>
            <Link to="/plans">Plans</Link>
            <Link to="/models">Supported Models</Link>
            <Link to="/changelog">Changelog</Link>
          </div>

          <div className="footer-column">
            <span className="footer-title">Resources</span>
            <Link to="/faq">FAQ</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/status">Service Status</Link>
          </div>

          <div className="footer-column">
            <span className="footer-title">Legal</span>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
            <Link to="/copyright">Copyright</Link>
          </div>
        </div>

        {/* Right */}
        <div className="footer-cta">
          <span className="footer-title">Get Early Access</span>
          <p>Join the beta and unlock PLUS features. Limited spots are available.</p>
          {/*
          <Link to="/beta" className="footer-button">
            Join Beta
          </Link>
          */}
        </div>
      </div>

      {/* Bottom */}
      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} Mansoor Hashemi, operating as ChatWithCAI. All Rights Reserved.
        </span>
      </div>
    </footer>
  );
}
