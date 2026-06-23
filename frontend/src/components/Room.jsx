import { useState, useEffect, useRef } from 'react'
import { useWebRTC } from '../hooks/useWebRTC'
import VideoTile from './VideoTile'

export default function Room({ roomId, peerId, displayName, isHost }) {
  const {
    peers,
    localWebcam,
    screenShare,
    isConnected,
    startWebcam,
    startScreenShare,
    stopScreenShare
  } = useWebRTC(roomId, peerId, displayName, isHost)

  const [sharingScreen, setSharingScreen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [micMuted, setMicMuted] = useState(false)
  const webcamStarted = useRef(false)

  // Auto-start webcam once on enter (guard against StrictMode double-run)
  const [mediaNote, setMediaNote] = useState('')
  useEffect(() => {
    if (webcamStarted.current) return
    webcamStarted.current = true
    startWebcam().then(stream => {
      if (!stream) {
        setMediaNote('No camera/mic found — you joined as a viewer. You can still watch and hear the screen share.')
      } else if (stream.getVideoTracks().length === 0) {
        setMediaNote('No camera found — joined with audio only.')
      }
    }).catch(() => {
      setMediaNote('No camera/mic found — you joined as a viewer.')
    })
  }, [startWebcam])

  useEffect(() => {
    if (isHost) setSharingScreen(Boolean(screenShare))
  }, [isHost, screenShare])

  const handleScreenShare = async () => {
    if (sharingScreen) {
      stopScreenShare()
      setSharingScreen(false)
    } else {
      try {
        await startScreenShare()
        setSharingScreen(true)
      } catch (e) {
        if (e.name !== 'NotAllowedError') alert('Screen share failed: ' + e.message)
      }
    }
  }

  const handleMicToggle = () => {
    if (localWebcam) {
      const next = !micMuted
      localWebcam.getAudioTracks().forEach(t => { t.enabled = !next })
      setMicMuted(next)
    }
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Guests: the screen stream now comes explicitly tagged from any peer
  const hostScreenStream = peers.find(p => p.screen)?.screen || null

  return (
    <div className="room">
      <div className="edge-trigger edge-trigger-top" />
      <header className="topbar">
        <div className="topbar-left">
          <span className="logo-sm">🎬</span>
          <span className="room-id" onClick={handleCopyCode} title="Click to copy">{roomId}</span>
          <button className="btn-copy" onClick={handleCopyCode}>
            {copied ? '✓ Copied' : 'Copy invite code'}
          </button>
        </div>
        <div className="topbar-right">
          <span className={`status-dot ${isConnected ? 'connected' : 'connecting'}`} />
          <span className="status-text">{isConnected ? 'Connected' : 'Connecting…'}</span>
          <span className="peer-count">{peers.length + 1} / 6</span>
        </div>
      </header>

      <main className="main-area" >
        <div className="screen-area">
          {mediaNote && (
            <div className="media-note">
              {mediaNote}
              <button onClick={() => setMediaNote('')} aria-label="Dismiss">✕</button>
            </div>
          )}
          {isHost && sharingScreen && screenShare ? (
            <VideoTile stream={screenShare} label={displayName} isLocal isScreen />
          ) : !isHost && hostScreenStream ? (
            <VideoTile stream={hostScreenStream} label="Host's screen" isScreen />
          ) : (
            <div className="screen-placeholder">
              {isHost ? (
                <>
                  <span className="ph-icon">🖥️</span>
                  <p>Share your screen so everyone can watch together</p>
                  <button className="btn btn-primary" onClick={handleScreenShare}>
                    Start sharing screen
                  </button>
                </>
              ) : (
                <>
                  <span className="ph-icon">⏳</span>
                  <p>Waiting for the host to share their screen…</p>
                </>
              )}
            </div>
          )}
        </div>

        <aside className="webcam-grid">
          <VideoTile stream={localWebcam} label={displayName} isLocal />
          {peers.map(peer => (
            <VideoTile key={peer.peerId} stream={peer.webcam} label={peer.displayName} />
          ))}
        </aside>
      </main>

      <div className="edge-trigger edge-trigger-bottom" />
      <footer className="controls">
        <button
          className={`ctrl-btn ${micMuted ? 'ctrl-off' : ''}`}
          onClick={handleMicToggle}
          title={micMuted ? 'Unmute' : 'Mute'}
        >
          {micMuted ? '🔇' : '🎤'}
          <span>{micMuted ? 'Unmute' : 'Mute'}</span>
        </button>

        {isHost && (
          <button
            className={`ctrl-btn ${sharingScreen ? 'ctrl-active' : ''}`}
            onClick={handleScreenShare}
            title={sharingScreen ? 'Stop sharing' : 'Share screen'}
          >
            🖥️
            <span>{sharingScreen ? 'Stop share' : 'Share screen'}</span>
          </button>
        )}

        <button
          className="ctrl-btn ctrl-leave"
          onClick={() => window.location.href = '/'}
          title="Leave room"
        >
          📴
          <span>Leave</span>
        </button>
      </footer>
    </div>
  )
}
