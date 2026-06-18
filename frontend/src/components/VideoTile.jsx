import { useEffect, useRef } from 'react'

export default function VideoTile({ stream, label, isLocal = false, isScreen = false }) {
  const videoRef = useRef(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  return (
    <div className={`video-tile ${isScreen ? 'screen-tile' : ''}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}  // mute own audio to prevent feedback
        className="video-el"
      />
      {!stream && (
        <div className="video-placeholder">
          <span className="avatar">{label?.[0]?.toUpperCase() || '?'}</span>
        </div>
      )}
      <span className="video-label">
        {isLocal ? `${label} (you)` : label}
        {isScreen ? ' · screen' : ''}
      </span>
    </div>
  )
}
