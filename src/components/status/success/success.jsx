import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './success.css';

const FADE_OUT_MS = 300;

export default function SuccessPopup({
  open,
  message,
  onClose,
  duration = 3000,
}) {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open && message) {
      setVisible(true);
      setClosing(false);
    }
  }, [open, message]);

  useEffect(() => {
    if (!visible || !message) return;

    const timer = setTimeout(() => {
      setClosing(true);
    }, duration);

    return () => clearTimeout(timer);
  }, [visible, message, duration]);

  useEffect(() => {
    if (!closing) return;

    const timer = setTimeout(() => {
      setVisible(false);
      setClosing(false);
      onClose?.();
    }, FADE_OUT_MS);

    return () => clearTimeout(timer);
  }, [closing, onClose]);

  const handleClose = () => {
    if (closing) return;
    setClosing(true);
  };

  if (!visible || !message) return null;

  return createPortal(
    <div
      className={`success-popup-overlay ${closing ? 'is-closing' : 'is-open'}`}
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="success-popup" role="status">
        <span className="success-popup-message">{message}</span>
        <button
          type="button"
          className="success-popup-close"
          onClick={handleClose}
          aria-label="Close success message"
        >
          ×
        </button>
      </div>
    </div>,
    document.body
  );
}