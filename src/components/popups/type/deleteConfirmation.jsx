import React from 'react';

export default function DeleteItem({
    type,
    text, 
    onDeleteItem, 
    setDeleteItem 
}) {
    const message = `Are you sure you want to delete "${text}".`;

    return (
        <div>
        <h3>Delete {type}?</h3>
        <div className="content-container">
            <div className="body">
                <p>{message}</p>
            </div>
            <div className="actions">
                <button className="delete-button" onClick={onDeleteItem}>Delete</button>
                <button onClick={() => setDeleteItem(null)}>Cancel</button>
            </div>
        </div>
        </div>
    );
}
