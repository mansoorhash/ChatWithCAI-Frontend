// src/components/LLMselection.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FaChevronDown, FaLock } from 'react-icons/fa';
import './LLMselection.css';
import { fetchModelSelections, saveModelSelections } from '../../../api/user/models';
import SpinnerRounded from '../../../components/loading';
import { useUserID } from '../../../utils/userIdContext';
import { ENABLED_KEY, LOCKED_KEY } from '../../../utils/constants'


const TIERS_UI = ['Free', 'Plus', 'Pro'];
const toTierKey = (uiLabel) => (uiLabel || '').trim().toLowerCase();

function safeJsonParse(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

function normalizeEnabledMap(payload) {
  const enabled = {};
  const locked = {};

  if (!payload || typeof payload !== 'object') {
    return { enabled, locked };
  }
  
  const values = Object.values(payload);
  const looksLikeTierArrays = values.some(Array.isArray);

  if (looksLikeTierArrays) {
    for (const arr of values) {
      if (!Array.isArray(arr)) continue;

      for (const item of arr) {
        if (!item || typeof item !== 'object' || !item.name) continue;

        enabled[item.name] = !!item.enabled;
        locked[item.name] = !!item.locked;
      }
    }

    return { enabled, locked };
  }

  return { enabled, locked };
}

function diffEnabled(initialMap, currentMap) {
  const all = new Set([...Object.keys(initialMap || {}), ...Object.keys(currentMap || {})]);
  const changed = [];
  for (const name of all) {
    const before = initialMap?.[name];
    const after = currentMap?.[name];
    if (before === after) continue;
    changed.push({ name, enabled: !!after });
  }
  return changed;
}

export default function LLMselection({ catalog }) {
  const { accessToken, updateAccessToken } = useUserID();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState('Free');
  const [lockedMap, setLockedMap] = useState({});
  const [enabledMap, setEnabledMap] = useState({});
  const [initialEnabledMap, setInitialEnabledMap] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  const tierKey = useMemo(() => toTierKey(selected), [selected]);
  
  const dirty = useMemo(() => {
    const a = JSON.stringify(initialEnabledMap || {});
    const b = JSON.stringify(enabledMap || {});
    return a !== b;
  }, [initialEnabledMap, enabledMap]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    const loadUser = async () => {
      setLoading(true);
      setError(null);
      try {
        const cache_enabled = sessionStorage.getItem(ENABLED_KEY);
        const cache_locked = sessionStorage.getItem(LOCKED_KEY);
        if (cache_enabled && cache_locked) {
          let enable_success, locked_success;
          const cachedMap = safeJsonParse(cache_enabled, {});
          if (cachedMap && typeof cachedMap === 'object') {
            setEnabledMap(cachedMap);
            setInitialEnabledMap(cachedMap);
            enable_success = true;
          }

          const cacheLocked = safeJsonParse(cache_locked, {});
          if (cacheLocked && typeof cacheLocked === 'object') {
            setLockedMap(cacheLocked);
            locked_success = true;
          }
          if (enable_success && locked_success) return
        }

        const apiData = await fetchModelSelections(ctrl.signal, accessToken, updateAccessToken);
        const {enabled, locked} = normalizeEnabledMap(apiData);
        

        sessionStorage.setItem(ENABLED_KEY, JSON.stringify(enabled));
        sessionStorage.setItem(LOCKED_KEY, JSON.stringify(locked));
        setLockedMap(locked)
        setEnabledMap(enabled);
        setInitialEnabledMap(enabled);
      } catch (e) {
        console.error('Failed to load user selections:', e);
        setLockedMap({})
        setEnabledMap({});
        setInitialEnabledMap({});
        setError('Failed to load your selections');
      } finally {
        setLoading(false);
      }
    };
    
    loadUser();
    return () => ctrl.abort();
  }, [accessToken, updateAccessToken]);

  const modelsForTier = useMemo(() => {
    const arr = catalog?.[tierKey];
    return Array.isArray(arr) ? arr : [];
  }, [catalog, tierKey]);

  const handleToggleEnabled = (modelName, locked = false) => {
    if (locked) return;
    setEnabledMap(prev => ({
      ...(prev || {}),
      [modelName]: !prev?.[modelName],
    }));
  };

  const handleSave = async () => {
    const ctrl = new AbortController();
    try {
      setSaving(true);
      setError(null);

      const changed = diffEnabled(initialEnabledMap, enabledMap);
      if (changed.length === 0) return;
      const resp = await saveModelSelections(changed, ctrl.signal, accessToken, updateAccessToken);
      if (resp?.ok) {
        sessionStorage.setItem(ENABLED_KEY, JSON.stringify(enabledMap));
        setInitialEnabledMap(enabledMap);
      }
    } catch (e) {
      const error = e.body;
      if (error.detail?.code === "INVALID_SELECTIONS") {
        setError(error.detail.message)
      } else {
          setError(e.message || 'Save failed');
      }
      setEnabledMap(initialEnabledMap)

    } finally {
      setSaving(false);
    }
  };

  const handleSelectTier = (value) => {
    setSelected(value);
    setOpen(false);
    if (buttonRef.current) buttonRef.current.focus();
  };

  return (
    <div className="sub-wrap">
      <div className="llm-header">
        <div className='sub-header'>Model Selection</div>

        <div className="llm-header-actions">
          <span className="sub-header noBold">Select Tier: </span>

          <div className="dropbox" ref={dropdownRef}>
            <div className="dropdown">
              <button
                ref={buttonRef}
                className="dropdown-toggle"
                onClick={() => setOpen(v => !v)}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls="llm-options-menu"
              >
                {selected}{' '}
                <FaChevronDown style={{ marginLeft: 6, fontSize: '0.85em' }} />
              </button>

              {open && (
                <div id="llm-options-menu" className="dropdown-menu" role="listbox" tabIndex={-1}>
                  {TIERS_UI.map(opt => (
                    <div
                      key={opt}
                      className="dropdown-item"
                      role="option"
                      aria-selected={selected === opt}
                      onClick={() => handleSelectTier(opt)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectTier(opt);
                        }
                      }}
                      tabIndex={0}
                    >
                      {opt}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className='sep'></div>
      <div className="sub-content scrollbar-custom">
          {loading ? (
            <div className="loading-container">
              <SpinnerRounded
              size={32}
              />
            </div>
          ):(
            <div className="llm-model-list">
              {modelsForTier.map(({id, label}) => {
                const locked = !!lockedMap?.[id];
                const enabled = !!enabledMap?.[id];

                return (
                  <div
                    key={id}
                    className={`llm-model-item${locked ? ' is-locked' : ''}`}
                    title={locked ? 'Locked for your plan' : ''}
                  >
                    <div className="llm-model-meta" >
                      <span className="llm-model-name">{label}</span>
                      {locked && (
                        <span className="lock" aria-hidden="true">
                          <FaLock />
                        </span>
                      )}
                    </div>

                    <label className="switch" aria-label={`Toggle ${id}`}>
                      <input
                        type="checkbox"
                        checked={enabled}
                        disabled={locked}
                        onChange={() => handleToggleEnabled(id, locked)}
                      />
                      <span className="slider" />
                    </label>
                  </div>
                );
              })}

              {modelsForTier.length === 0 && <p className="muted">None available.</p>}
            </div>
          )}
      </div>
      <div className="sub-footer">
        {error && <p className="error">{error}</p>}
        <div className="sub-actions">
          <button
            className="btn-save"
            onClick={handleSave}
            disabled={!dirty || saving}
            title={!dirty ? 'No changes to save' : 'Save changes'}
            style={{ marginLeft: 12 }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
