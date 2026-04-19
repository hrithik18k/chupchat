import React from 'react';
import PropTypes from 'prop-types';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const MessageItem = ({
    m,
    user,
    formatTimestamp,
    handleContextMenu,
    openReceiptId,
    setOpenReceiptId,
    editingMessageId,
    editText,
    setEditText,
    handleSaveEdit,
    setEditingMessageId,
    openContextMenuId,
    handleDeleteMessage,
    handleEditMessageStart,
    transferProgress
}) => {
    const isSent = m.sender === user.name;
    const isSystem = m.sender === 'System';
    const isCipher = m.sender === 'Cipher';

    if (isSystem) {
        return <div className="system-message">{m.message}</div>;
    }

    const renderMessage = (text) => {
        return { __html: DOMPurify.sanitize(marked.parse(text)) };
    };

    return (
        <div
            role="article"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
                    handleContextMenu(e, m);
                }
            }}
            className={`message-wrapper ${isSent ? 'sent' : 'received'}`}
            data-message-id={m._id}
            onContextMenu={(e) => handleContextMenu(e, m)}
        >
            <div className="message-sender">{m.sender}</div>
            <div className="message-bubble">
                {editingMessageId === m._id ? (
                    <div className="edit-box">
                        <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            autoFocus
                        />
                        <div className="edit-actions">
                            <button onClick={() => handleSaveEdit(m)}>Save</button>
                            <button onClick={() => setEditingMessageId(null)}>Cancel</button>
                        </div>
                    </div>
                ) : (
                    <div className="message-content" dangerouslySetInnerHTML={renderMessage(m.message)} />
                )}

                {m.file && (
                    <div className="file-attachment">
                        {/* File rendering logic */}
                    </div>
                )}
            </div>
            <div className="message-footer">
                <span>{formatTimestamp(m.timestamp)}</span>
                {isSent && !isCipher && (
                    <div className="message-status">
                        {m.seenBy?.length > 0 ? '✓✓' : '✓'}
                    </div>
                )}
            </div>

            {openContextMenuId === m._id && (
                <div className="context-menu">
                    <button onClick={() => handleEditMessageStart(m)}>Edit</button>
                    <button onClick={() => handleDeleteMessage(m._id)} style={{ color: 'var(--danger)' }}>Delete</button>
                </div>
            )}
        </div>
    );
};

MessageItem.propTypes = {
    m: PropTypes.object.isRequired,
    user: PropTypes.shape({ name: PropTypes.string.isRequired, photoURL: PropTypes.string }).isRequired,
    formatTimestamp: PropTypes.func.isRequired,
    handleContextMenu: PropTypes.func.isRequired,
    openReceiptId: PropTypes.string,
    setOpenReceiptId: PropTypes.func.isRequired,
    editingMessageId: PropTypes.string,
    editText: PropTypes.string,
    setEditText: PropTypes.func.isRequired,
    handleSaveEdit: PropTypes.func.isRequired,
    setEditingMessageId: PropTypes.func.isRequired,
    openContextMenuId: PropTypes.string,
    handleDeleteMessage: PropTypes.func.isRequired,
    handleEditMessageStart: PropTypes.func.isRequired,
    transferProgress: PropTypes.object
};

export default MessageItem;
