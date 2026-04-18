import React from 'react';
import PropTypes from 'prop-types';

const RoomSelection = ({
    mode, setMode,
    roomCode, setRoomCode,
    password, setPassword,
    roomType, setRoomType,
    error,
    createRoom, joinRoom,
    recentRooms
}) => {
    return (
        <div className="room-card">
            <h2>Onyx</h2>
            <p>Enterprise-grade encrypted chat</p>

            <div className="tab-buttons">
                <button
                    className={`tab-btn ${mode === 'create' ? 'active' : ''}`}
                    onClick={() => setMode('create')}
                >
                    Create
                </button>
                <button
                    className={`tab-btn ${mode === 'join' ? 'active' : ''}`}
                    onClick={() => setMode('join')}
                >
                    Join
                </button>
            </div>

            {error && <p className="error-msg">{error}</p>}

            <div className="form-group">
                <input
                    className="input"
                    type="text"
                    placeholder="Room Code (4-8 chars)"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                />
            </div>

            <div className="form-group">
                <input
                    className="input"
                    type="password"
                    placeholder="4-Digit Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value.replace(/\D/g, '').slice(0, 4))}
                />
            </div>

            {mode === 'create' && (
                <div className="form-group">
                    <select
                        className="input"
                        value={roomType}
                        onChange={(e) => setRoomType(e.target.value)}
                    >
                        <option value="normal">Normal Room (Persistent)</option>
                        <option value="ghost">Ghost Room (Ephemeral)</option>
                        <option value="couples">Couples (2 Users Max)</option>
                    </select>
                </div>
            )}

            <button
                className="btn btn-primary"
                onClick={mode === 'create' ? createRoom : joinRoom}
            >
                {mode === 'create' ? 'Create Secure Room' : 'Join Room'}
            </button>

            {recentRooms && recentRooms.length > 0 && (
                <div className="recent-rooms" style={{ marginTop: '1.5rem' }}>
                    <h3 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Recent Rooms</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {recentRooms.map((room) => (
                            <button
                                key={room.roomCode}
                                className="btn btn-outline"
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', width: 'auto' }}
                                onClick={() => {
                                    setRoomCode(room.roomCode);
                                    setPassword(room.password);
                                    setMode('join');
                                }}
                            >
                                {room.roomCode}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

RoomSelection.propTypes = {
    mode: PropTypes.string.isRequired,
    setMode: PropTypes.func.isRequired,
    roomCode: PropTypes.string.isRequired,
    setRoomCode: PropTypes.func.isRequired,
    password: PropTypes.string.isRequired,
    setPassword: PropTypes.func.isRequired,
    roomType: PropTypes.string.isRequired,
    setRoomType: PropTypes.func.isRequired,
    error: PropTypes.string,
    createRoom: PropTypes.func.isRequired,
    joinRoom: PropTypes.func.isRequired,
    recentRooms: PropTypes.arrayOf(PropTypes.shape({
        roomCode: PropTypes.string,
        password: PropTypes.string
    }))
};

export default RoomSelection;
