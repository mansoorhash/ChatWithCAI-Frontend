import React from 'react';
import './popup.css';

export default function Popup({ isOpen, onClose, children }) {
  if (!isOpen) return null;

  return (
    <div
      className="background active"
      onClick={(event) => event.target === event.currentTarget && onClose()}
      role="presentation"
    >
      <div className="modal" role="dialog" aria-modal="true">
        {children}
      </div>
    </div>
  );
}
