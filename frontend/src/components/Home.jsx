import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://11.46.161.237:8080'
console.log('Using backend URL:', import.meta.env.VITE_BACKEND_URL || "nothing found")

export default function Home({ onEnterRoom }) {
  const [displayName, setDisplayName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [mode, setMode] = useState('home') // 'home' | 'join'
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const peerId = useState(() => uuidv4())[0]

  const handleCreate = async () => {
    if (!displayName.trim()) { setError('Enter your name'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch(`${BACKEND_URL}/api/rooms/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ peerId, displayName: displayName.trim() })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onEnterRoom({ roomId: data.roomId, peerId, displayName: displayName.trim(), isHost: true })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    if (!displayName.trim()) { setError('Enter your name'); return }
    if (!roomCode.trim()) { setError('Enter a room code'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch(`${BACKEND_URL}/api/rooms/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ peerId, displayName: displayName.trim(), roomId: roomCode.trim().toUpperCase() })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onEnterRoom({ roomId: data.roomId, peerId, displayName: displayName.trim(), isHost: false })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="home">
      <div className="home-card">
        <div className="logo">🎬</div>
        <h1>Movie Party</h1>
        <p className="subtitle">Watch movies together, face to face</p>

        <input
          className="input"
          placeholder="Your name"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (mode === 'join' ? handleJoin() : handleCreate())}
        />

        {mode === 'join' && (
          <input
            className="input"
            placeholder="Room code (e.g. ABC123)"
            value={roomCode}
            onChange={e => setRoomCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            maxLength={6}
          />
        )}

        {error && <p className="error">{error}</p>}

        {mode === 'home' ? (
          <div className="btn-row">
            <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
              {loading ? 'Creating…' : 'Create Room'}
            </button>
            <button className="btn btn-secondary" onClick={() => { setMode('join'); setError('') }}>
              Join Room
            </button>
          </div>
        ) : (
          <div className="btn-row">
            <button className="btn btn-primary" onClick={handleJoin} disabled={loading}>
              {loading ? 'Joining…' : 'Join'}
            </button>
            <button className="btn btn-ghost" onClick={() => { setMode('home'); setError('') }}>
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
