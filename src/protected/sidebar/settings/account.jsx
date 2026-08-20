import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'
import SpinnerRounded from '../../../components/loading';
import { useUserID } from '../../../utils/userIdContext'
import { deletePersonal, updatePersonal, verifyPersonalEmail } from '../../../api/user/personal';
import DeleteItem from '../../../components/popups/type/deleteConfirmation';
import Popup from '../../../components/popups/popup';
import SuccessPopup from '../../../components/status/success/success';
import ErrorPopup from '../../../components/status/errors/error';
import './account.css';
import { Pencil } from "lucide-react";


const FIELDS = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'email', label: 'Email', type: 'email' }
];

export default function Account({
  account, 
  setAccount,
}) {
  const {accessToken, handleLogout, updateAccessToken} = useUserID()
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [deletingAccount, setDeletingAccount] = useState(null);
  const navigate = useNavigate();

  // editor state
  const [isOpen, setIsOpen] = useState(false);
  const [editingField, setEditingField] = useState(null); // 'name' | 'email' | 'birthdate'
  const [editValue, setEditValue] = useState('');

  const [emailVerification, setEmailVerification] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');

  const openEditor = (field) => {
    setEditingField(field);
    setEditValue(account?.data?.[field.key] || '');
    setIsOpen(true);
  };

  const closeEditor = () => {
    setIsOpen(false);
    setEditingField(null);
    setEditValue('');
  };

  const closeEmailVerification = () => {
    if (loading) return;
    setErrorMessage(null);
    setEmailVerification(null);
    setVerificationCode('');
  };

  const saveEdit = async (event) => {
    event.preventDefault()
    if (!editingField) return;

    const field = editingField.key;
    const value = editValue.trim()
    
    if (value == account.data[field]) {
      setErrorMessage(`Can't be the previous ${field}.`);
      return;
    }

    const ctrl = new AbortController();
    try {
      setLoading(true);
      setErrorMessage(null);

      // Minimal secure update: PATCH only the changed field
      const res = await updatePersonal(ctrl.signal, {[field]: value}, accessToken, updateAccessToken)
      console.log(res);
      if (field === 'email' && res.verification_required) {
        console.log("here")
        setEmailVerification({
          email: value,
          destination: res.destination,
        });

        closeEditor();
        return;
      }

      setAccount((prev) => ({
        ...prev,
        data: {
          ...(prev?.data || {}),
          [field]: value,
        },
      }));
      closeEditor();
      setSuccessMessage(`Successfully changed ${field} to ${value}.`);
    } catch (err) {
      console.error('Error saving account field:', err);
      console.log(err?.status);
      if (err?.status === 422) {
        setErrorMessage(`${field.charAt(0).toUpperCase()}${field.slice(1)} not valid.`);
        return;
      }
      setErrorMessage('Failed to save changes.');
    } finally {
      setLoading(false);
    }
  };

  const verifyEmail = async (event) => {
    event.preventDefault();

    const code = verificationCode.trim();
    if (!code || !emailVerification) return;

    const ctrl = new AbortController();

    try {
      setLoading(true);
      setErrorMessage(null);

      await verifyPersonalEmail(
        ctrl.signal,
        { code },
        accessToken,
        updateAccessToken
      );

      setAccount((prev) => ({
        ...prev,
        data: {
          ...(prev?.data || {}),
          email: emailVerification.email,
        },
      }));

      setEmailVerification(null);
      setVerificationCode('');
      setSuccessMessage?.('Email updated successfully.');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to verify email.');
    } finally {
      setLoading(false);
    }
  };

  const fieldVal = (k) => account?.data?.[k] || 'N/A';

  const onDeleteAccount = async () => {
    if (!deletingAccount) return
    try {
      const ctrl = new AbortController();
      const res = await deletePersonal(ctrl.signal, accessToken, updateAccessToken);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      navigate("/", {replace: true});
      handleLogout({ delete: true });
    } catch (err) {
      setErrorMessage("Failed to delete account")
    }
    setDeletingAccount(null);
  }

  const handleDeleteAccount = async () => {
    setDeletingAccount(account);
  }

  if (!account) {
    return (
      <div>
        <h3>Account</h3>
        {loading && <SpinnerRounded trailColor="2c2c2c" />}
        {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
      </div>
    );
  }

  return (
    <>
    <SuccessPopup
      open={!!successMessage}
      message={successMessage}
      onClose={() => setSuccessMessage(null)}
    />
    <ErrorPopup
      open={!!errorMessage}
      message={errorMessage}
      onClose={() => setErrorMessage(null)}
    />
    

    <div className="sub-wrap account-settings">
      <div className="sub-header">Account</div>
      <div className="sep"></div>
      <div className='sub-content'>
        {FIELDS.map((f) => (
          <div className="row" key={f.key}>
            <div className="left">
              <div className="title"><p>{f.label}</p></div>
            </div>

              <div className="value-wrap right">
                <span className="user-value">{fieldVal(f.key)}</span>

                <Pencil
                  className="edit-icon"
                  onClick={() => openEditor(f)}
                  size={28}
                />
              </div>
            </div>
          ))}
        </div>
      <div className="sub-footer">
        <div className="sub-actions">
          <button
            className="delete-button"
            onClick={handleDeleteAccount}
            disabled={deletingAccount}
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* Editor Popup */}
      <Popup isOpen={isOpen} onClose={closeEditor}>
        <h3>Edit {editingField?.label || ''}</h3>
        <div className="content-container">
          <div className="body">
            {editingField?.type === 'date' ? (
              <input
                type="date"
                value={editValue || ''}
                onChange={(e) => setEditValue(e.target.value)}
              />
            ) : (
              <input
                type={editingField?.type || 'text'}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder={`Enter ${editingField?.label || ''}`}
              />
            )}


          </div>
          <div className="actions">
            <button onClick={saveEdit}>Save</button>
            <button onClick={closeEditor}>Cancel</button>
          </div>
        </div>
      </Popup>

      <Popup
        isOpen={!!emailVerification}
        onClose={closeEmailVerification}
      >
        <h3>Verify Email</h3>

        <div className="content-container">
          <div className="body">
            <p>
              Enter the verification code sent to{' '}
              {emailVerification?.destination || emailVerification?.email}.
            </p>

            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="Verification code"
            />
          </div>

          <div className="actions">
            <button
              onClick={verifyEmail}
              disabled={loading || !verificationCode.trim()}
            >
              Verify
            </button>

            <button
              onClick={closeEmailVerification}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      </Popup>

      <Popup isOpen={!!deletingAccount} onClose={() => setDeletingAccount(null)}>
        <DeleteItem
          setSuccessMessage={setSuccessMessage}
          setErrorMessage={setErrorMessage}
          type={"Account"}
          text={account?.data.email}
          onDeleteItem={onDeleteAccount}
          setDeleteItem={setDeletingAccount}
        />
      </Popup>

      </div>
    </>
    );
}
