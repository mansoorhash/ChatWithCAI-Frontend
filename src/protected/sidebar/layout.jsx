// src/chat/sidebar.jsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom'
import './sidebar.css';
import EditChat from '../../components/popups/type/editSessionName';
import DeleteItem from '../../components/popups/type/deleteConfirmation';
import Popup from '../../components/popups/popup';
import SettingsLayout from './settings/layout';
import {
  FaComments,
  FaCog,
  FaSignOutAlt,
  FaQuestionCircle,
  FaChevronLeft,
  FaChevronRight,
  FaSignInAlt,
  FaEllipsisH,
  FaEdit,
  FaTrash,
  FaChartBar
} from 'react-icons/fa';
import Usage from './usage/usage';
import SpinnerRounded from '../../components/loading';
import { deleteSessionServer, editSessionServer } from '../../api/chat/session';
import mergeSessions from '../utils/session'
import { useUserID } from '../../utils/userIdContext';

export default function Sidebar({
  setErrorMessage,
  sessions = [],
  setSessions,
  onNewChat,
  onSelectChat,
  currentId,
  account,
  setAccount,
  subscription,
  authenticated,
  fetchSessions,
  fetchLastSession,
  catalog,
  catalogError,
  allModels,
  modelLabelsById,
  collapsed,
  setCollapsed,
  trainingState,
  setTrainingState
}) {
  const navigate = useNavigate();
  const { accessToken, updateAccessToken, handleLogout } = useUserID();
  const isSignedIn = !!account;
  const displayName = account?.data?.name ?? "";
  const email = account?.data?.email ?? 'USER@EMAIL.COM';
  const tier = subscription?.tier?.toUpperCase() ?? 'FREE';
  const showUserSkeleton = authenticated && !!account;

  const [showMenu, setShowMenu] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingChat, setEditingChat] = useState(null);
  const [deleteChat, setDeleteChat] = useState(null);
  const [settings, setSettings] = useState(null);
  const [menuPosition, setMenuPosition] = useState({});
  const [usage, setUsage] = useState(null);
  const [newChatTitle, setNewChatTitle] = useState("");

  const [loadingMore, setLoadingMore] = useState(false);
  const loadCooldownRef = useRef(false);
  const hasLoadedOnceRef = useRef(false);

  const chatMenuRef = useRef(null);
  const dropdownRef = useRef(null);
  const scrollRef = useRef(null);

  // Cursor ref: prevents stale prop reads in scroll handler
  const cursorRef = useRef(fetchLastSession);
  useEffect(() => {
    if (fetchLastSession === undefined) {
      cursorRef.current = undefined;
      hasLoadedOnceRef.current = false;
      return;
    }

    cursorRef.current = fetchLastSession;
    hasLoadedOnceRef.current = true;
  }, [fetchLastSession]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (openMenuId && chatMenuRef.current && !chatMenuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId, showMenu]);

  const toggleChatMenu = (id, e) => {
    if (openMenuId === id) {
      setOpenMenuId(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({ top: `${rect.bottom + 4}px`, left: `${rect.left - 8}px` });
    setOpenMenuId(id);
  };

  const onUpdateSessions = async () => {
    if (!fetchSessions) return;
    if (cursorRef.current === undefined) return;

    // If we have already loaded once AND cursor is null => no more pages
    if (hasLoadedOnceRef.current && cursorRef.current == null) return;

    const cursor = cursorRef.current ?? null;

    const result = await fetchSessions(cursor);
    if (result?.unauthorized) return;

    // Update cursor ref immediately to avoid waiting for props/state
    cursorRef.current = result?.lastKey ?? null;
    hasLoadedOnceRef.current = true;

    const incoming = result?.sessions || [];
    if (!incoming.length) return;

    setSessions((previous) => mergeSessions(previous, incoming));
  };

  const loadMoreSessions = async () => {
    if (loadingMore) return;
    if (!fetchSessions) return;

    if (loadCooldownRef.current) return;
    loadCooldownRef.current = true;
    setTimeout(() => (loadCooldownRef.current = false), 600);

    setLoadingMore(true);
    try {
      await onUpdateSessions(); // IMPORTANT: await
    } catch (e) {
      console.error('loadMoreSessions failed:', e);
    } finally {
      setLoadingMore(false);
    }
  };

  const onScrollLatestChats = (e) => {
    const el = e.currentTarget;
    const thresholdPx = 24;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - thresholdPx;
    if (atBottom) loadMoreSessions();
  };

  const onEditChat = async (id, updatedTitle) => {
    if (!id || !updatedTitle) return;
    const newTitle = updatedTitle.trim();
    try {
      await editSessionServer(id, newTitle, accessToken, updateAccessToken);
    } catch (err) {
      console.error('Edit Failed: ', err);
      return;
    } finally {
      setEditingChat(null);
    }
    setSessions((previous) => previous.map(s =>
      s.id === id ? { ...s, title: newTitle } : s
    ));
  };

  const onDeleteChat = async () => {
    const sessionId = deleteChat.id
    try {
      await deleteSessionServer(sessionId, accessToken, updateAccessToken);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (err) {
      console.error('Delete failed:', err);
    }

    navigate('/chat', {replace: true});
    setDeleteChat(null)
  };

  const handleEditChat = (session) => {
    setEditingChat(session);
    setNewChatTitle(session.title);
    setOpenMenuId(null);
  };

  const handleDeleteChat = (session) => {
    setDeleteChat(session);
    setOpenMenuId(null);
  };

  const handleSettings = () => {
    setShowMenu(false);
    setSettings(true);
  };

  const toggleSidebar = () => setCollapsed(prev => !prev);

  const getDateGroup = (isoString) => {
    const baseIso = isoString ?? new Date().toISOString();
    const date = new Date(baseIso);
    if (Number.isNaN(date.getTime())) return 'Older'; // safety

    const now = new Date();

    // Start-of-day boundaries in *local time* (consistent with toDateString behavior)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfThatDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const msPerDay = 24 * 60 * 60 * 1000;
    const diffDays = Math.floor((startOfToday - startOfThatDay) / msPerDay); 
    // diffDays: 0 = today, 1 = yesterday, 2 = two days ago, etc.

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays > 1 && diffDays <= 7) return 'Last 7 Days';
    if (diffDays > 7 && diffDays <= 30) return 'Last 30 Days';

    if (date.getFullYear() === now.getFullYear()) return 'This Year';

    // Previous years: group by Month + Year
    return date.toLocaleString('en-US', { year: 'numeric' });
};

  const grouped = useMemo(() => {
    return sessions.reduce((acc, session) => {
      const group = getDateGroup(session.lastUpdated);
      (acc[group] ||= []).push(session);
      return acc;
    }, {});
  }, [sessions]);

  const handleUsage = () => setUsage(true);
  
  const handleHelp = () => {
    navigate("/faq", { replace: true })
  };

  const initial = (displayName ? displayName : email|| 'G').charAt(0).toUpperCase();
  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        {!collapsed ? (
          <>
            <div className="sidebar-title">
              <img
                src="/logo.svg"
                alt="ChatWithCAI logo"
                className="sidebar-logo"
              />
              <span>ChatWithCAI</span>
            </div>

            <button
              className="collapse-button"
              onClick={toggleSidebar}
              aria-label="Collapse sidebar"
            >
              <FaChevronLeft />
            </button>
          </>
        ) : (
          <button
            className="collapsed-sidebar-control"
            onClick={toggleSidebar}
            aria-label="Expand sidebar"
          >
            <img
              src="/logo.svg"
              alt="ChatWithCAI logo"
              className="collapsed-sidebar-logo"
            />

            <span className="collapsed-sidebar-arrow">
              <FaChevronRight />
            </span>
          </button>
        )}
      </div>
      
      <div className="sidebar-menu">

        <div className="sidebar-menu-top">
          <button className="sidebar-item" onClick={onNewChat} data-tooltip="New Chat">
            <FaComments /> {!collapsed && 'New Chat'}
          </button>

          <button className="sidebar-item" onClick={handleUsage}>
            <FaChartBar /> {!collapsed && 'Usage'}
          </button>
        </div>
        {!collapsed && (
          <div className="sidebar-section">
            <div className="sidebar-label">Latest Chats</div>
            <div className="scrollbar-custom">
              <div
                className="chat-history-scroll"
                ref={scrollRef}
                onScroll={onScrollLatestChats}
              >
                {Object.entries(grouped).map(([group, chats]) => {
                  const visibleChats = (chats || []).filter(s => s.title && s.title !== 'New Chat');
                  if (visibleChats.length === 0) return null;
                  if (!showUserSkeleton) return null;

                  return (
                    <div key={`group-${group}`} className="chat-date-group">
                      <div className="chat-date-label">{group}</div>

                      {visibleChats.map(session => (
                        <div
                          key={`session-${group}-${session.id}`}
                          className={`chat-history-item ${currentId === session.id ? 'active' : ''}`}
                        >
                          <button
                            type="button"
                            className="chat-title"
                            onClick={() => onSelectChat?.(session.id)}
                            title={session.title}
                          >
                            {(() => {
                              const text = session.title || 'Untitled';
                              if (currentId === session.id) return text.trim();
                              return text;
                            })()}
                          </button>

                          <div className={`chat-controls ${openMenuId === session.id ? 'visible' : ''}`}>
                            <button
                              type="button"
                              className="chat-menu-trigger"
                              aria-label={`Open menu for ${session.title}`}
                              onClick={(e) => toggleChatMenu(session.id, e)}
                            >
                              <FaEllipsisH />
                            </button>
                            {openMenuId === session.id && (
                              <div ref={chatMenuRef} className="chat-menu" style={menuPosition}>
                                <button type="button" className="chat-menu-item" onClick={() => handleEditChat(session)}>
                                  <FaEdit /> Edit
                                </button>
                                <button type="button" className="chat-menu-item delete" onClick={() => handleDeleteChat(session)}>
                                  <FaTrash /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}

                <div className="chat-history-sentinel">
                  {loadingMore ? 'Loading more chats…' : ' '}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="sidebar-user-wrapper">
        <div
          className="sidebar-user-toggle"
          onClick={() => setShowMenu(prev => !prev)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setShowMenu((previous) => !previous);
            }
          }}
          role="button"
          tabIndex={0}
          aria-expanded={showMenu}
        >
        {showUserSkeleton ? (
          <>
            <div className="user-avatar">{initial}</div>
            {!collapsed && (
              <div className="user-info">
                {displayName ? (
                  <span className="username">{displayName}</span>
                ) : (
                  <span className="username">{email}</span>
                )}
                <span className="user-tier">{tier}</span>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="user-avatar"><SpinnerRounded/></div>
            {!collapsed && (
              <div className="user-info">
                <span className="username loading-text"></span>
                <span className="user-tier loading-text"></span>
              </div>
            )}
          </>
        )}
        </div>

        {showMenu && (
          <div ref={dropdownRef} className={`user-dropdown-popover ${collapsed ? 'collapsed' : ''}`}>
            {isSignedIn && <div className="user-dropdown-item email">{email}</div>}
            <hr />
            <button className="user-dropdown-item" onClick={handleSettings}><FaCog /> Settings</button>
            <button className="user-dropdown-item" onClick={handleHelp}><FaQuestionCircle /> Help</button>
            <button className="user-dropdown-item logout" onClick={handleLogout}>
              {isSignedIn ? (<><FaSignOutAlt/> Log out</>) : (<><FaSignInAlt /> Log In</>)}
            </button>
          </div>
        )}
      </div>

      <Popup isOpen={!!editingChat} onClose={() => setEditingChat(null)}>
        <div className='editchat-popup'>
        <EditChat
          newChatTitle={newChatTitle}
          setNewChatTitle={setNewChatTitle}
          onEditChat={onEditChat}
          editingChat={editingChat}
          setEditingChat={setEditingChat}
        />
        </div>
      </Popup>

      <Popup isOpen={!!deleteChat} onClose={() => setDeleteChat(null)}>
          <DeleteItem
          type={"Chat"}
          text={`${deleteChat?.title}`}
          onDeleteItem={onDeleteChat}
          setDeleteItem={setDeleteChat}
        />
      </Popup>

      <Popup isOpen={!!settings} onClose={() => setSettings(null)}>
        <SettingsLayout onClose={() => setSettings(null)}
        setErrorMessage={setErrorMessage}
        account={account}
        setAccount={setAccount}
        subscription={subscription} 
        catalog={catalog}
        catalogError={catalogError}
        allModels={allModels}
        trainingState={trainingState}
        setTrainingState={setTrainingState}
        />
      </Popup>

      <Popup isOpen={!!usage} onClose={() => setUsage(null)}>
        <Usage onClose={() => setUsage(null)} modelLabelsById={modelLabelsById}/>
      </Popup>
    </div>
  );
}
