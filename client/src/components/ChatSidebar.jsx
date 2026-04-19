import React from 'react';
import PropTypes from 'prop-types';
import QRCode from 'react-qr-code';

const ChatSidebar = ({
    mobileSidebarOpen,
    setMobileSidebarOpen,
    roomCode,
    password,
    currentRoomType,
    users,
    user,
    handleDeleteRoom,
    handleRequestDeleteRoom,
    deleteRequestPending,
    roomCreatorName,
    handleReturnHome
}) => {
    return (
        <>
            <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setMobileSidebarOpen(false) }} className={`sidebar-overlay ${mobileSidebarOpen ? 'mobile-open' : ''}`} onClick={() => setMobileSidebarOpen(false)} />
            <div className={`sidebar ${mobileSidebarOpen ? 'mobile-open' : ''}`}>
                <div className="sidebar-header">
                    <h2>Room Info</h2>
                    <button className="close-sidebar-btn" onClick={() => setMobileSidebarOpen(false)}>
                        ✕
                    </button>
                </div>

                <div className="sidebar-content">
                    <div className="info-section">
                        <h3>Share Access</h3>
                        <div className="room-code-display">
                            <span>{roomCode}</span>
                        </div>
                        <div className="qr-code-wrapper">
                            <QRCode value={`https://chupchat-1.onrender.com/?room=${roomCode}&pwd=${password}`} size={160} />
                        </div>
                        <div className="room-type-badge">
                            <div className={`room-badge room-badge-${currentRoomType}`}>
                                {currentRoomType === 'normal' && '🔓 Normal'}
                                {currentRoomType === 'ghost' && '👻 Ghost'}
                                {currentRoomType === 'couples' && '💑 Couples'}
                            </div>
                        </div>
                    </div>

                    <div className="info-section">
                        <h3>Participants ({users.length})</h3>
                        <div className="user-list">
                            {users.map((u, i) => (
                                <div key={u.name || i} className="user-item">
                                    <div className="user-avatar">
                                        {u.photoURL ? <img src={u.photoURL} alt={u.name} /> : u.name?.charAt(0)}
                                    </div>
                                    <span style={{ fontWeight: u.name === user.name ? '600' : '400' }}>
                                        {u.name} {u.name === user.name && '(You)'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="sidebar-footer">
                    {user.name === roomCreatorName ? (
                        <button className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={handleDeleteRoom}>
                            Delete Room
                        </button>
                    ) : (
                        <button
                            className="btn btn-outline"
                            onClick={handleRequestDeleteRoom}
                            disabled={deleteRequestPending}
                        >
                            {deleteRequestPending ? 'Request Pending...' : 'Request Deletion'}
                        </button>
                    )}
                    <button className="btn btn-outline" style={{ marginTop: '0.5rem' }} onClick={handleReturnHome}>
                        Leave Room
                    </button>
                </div>
            </div>
        </>
    );
};

ChatSidebar.propTypes = {
    mobileSidebarOpen: PropTypes.bool.isRequired,
    setMobileSidebarOpen: PropTypes.func.isRequired,
    roomCode: PropTypes.string.isRequired,
    password: PropTypes.string.isRequired,
    currentRoomType: PropTypes.string.isRequired,
    users: PropTypes.arrayOf(PropTypes.shape({ name: PropTypes.string.isRequired, photoURL: PropTypes.string, socketId: PropTypes.string, _id: PropTypes.string })).isRequired,
    user: PropTypes.shape({ name: PropTypes.string.isRequired, photoURL: PropTypes.string }).isRequired,
    handleDeleteRoom: PropTypes.func.isRequired,
    handleRequestDeleteRoom: PropTypes.func.isRequired,
    deleteRequestPending: PropTypes.bool.isRequired,
    roomCreatorName: PropTypes.string,
    handleReturnHome: PropTypes.func.isRequired
};

export default ChatSidebar;
