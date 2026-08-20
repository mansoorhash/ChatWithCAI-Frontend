import React from 'react';
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
    </div>
  );
}
