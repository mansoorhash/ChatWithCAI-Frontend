import React from 'react';

export default function EditChat({
  newChatTitle,
  setNewChatTitle,
  onEditChat,
  editingChat, 
  setEditingChat 
}) {

  if (!editingChat) return null;

  return (
    <div>
      <h3>Edit</h3>
      <div className="content-container">
        <div className="body">
          <input
            type="text"
            value={newChatTitle}
            onChange={(e) => setNewChatTitle(e.target.value)}
          />
        </div>
        <div className="actions">
            <button onClick={() => onEditChat(editingChat.id, newChatTitle)}>Save</button>
            <button onClick={() => setEditingChat(null)}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
