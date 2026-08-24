import React from 'react';
import { Bug } from 'lucide-react';
import { Link } from 'react-router-dom';
import './chatHeader.css';

export default function ChatHeader({session, chatLoading}) {
  const chatTitle = session?.title || "New Chat";
  const showeUserSkeleton = chatLoading;
  return (
    <div className="chat-header">
    {!showeUserSkeleton ?
        (
        <h2>{chatTitle}</h2>
      ):(
      <h2 className='loading-text'>Loading…</h2>
    )}
      <Link className="chat-support-link" to="/support?topic=bug">
        <Bug size={16} aria-hidden="true" />
        Found a Bug?
      </Link>
    </div>
  );
}
