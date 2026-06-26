import { useEffect, useRef, useState } from 'react'

export default function VideoTile({
  stream,
  label,
  isLocal = false,
  isScreen = false,
  movable = false,
  floating = false,
  onFloat,
  onDock,
  defaultPosition = { x: 16, y: 16 },
}) {
  const videoRef = useRef(null)
  const dragRef = useRef(null)
  const pressStartRef = useRef(null)
  const resizeRef = useRef(null)
  const [position, setPosition] = useState(defaultPosition)
  const [size, setSize] = useState({ width: 240, height: 180 })

  const startResize = (event) => {
    event.preventDefault()
    event.stopPropagation()
    resizeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: size.width,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleResizeMove = (event) => {
    const resize = resizeRef.current
    if (!resize || resize.pointerId !== event.pointerId) return
    const dx = event.clientX - resize.startX
    const newWidth = Math.max(160, Math.min(600, resize.startWidth + dx))
    const newHeight = Math.round(newWidth * 0.75)
    setSize({ width: newWidth, height: newHeight })
  }

  const handleResizeUp = (event) => {
    if (resizeRef.current?.pointerId === event.pointerId) {
      resizeRef.current = null
    }
  }

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream || null
    }
  }, [stream])

  useEffect(() => {
    if (defaultPosition) {
      setPosition(defaultPosition)
    }
  }, [defaultPosition])

  const startDrag = (event) => {
    event.preventDefault()
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: position.x,
      startTop: position.y,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerDown = (event) => {
    // Prevent starting drag or float if the user clicked a button
    if (event.target.closest('button')) return

    if (movable) {
      startDrag(event)
    } else if (onFloat) {
      event.preventDefault()
      pressStartRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
      }
      event.currentTarget.setPointerCapture(event.pointerId)
    }
  }

  const handlePointerMove = (event) => {
    if (movable) {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) return
      setPosition({
        x: Math.max(0, drag.startLeft + (event.clientX - drag.startX)),
        y: Math.max(0, drag.startTop + (event.clientY - drag.startY)),
      })
    } else if (onFloat && pressStartRef.current) {
      const start = pressStartRef.current
      if (start.pointerId !== event.pointerId) return
      const dx = event.clientX - start.startX
      const dy = event.clientY - start.startY
      const dist = Math.hypot(dx, dy)
      
      // If user drags the tile in grid by more than 15px, trigger the float state
      if (dist > 15) {
        pressStartRef.current = null
        try {
          event.currentTarget.releasePointerCapture(event.pointerId)
        } catch (err) {}
        
        // Center the floated tile under the mouse pointer
        const floatX = Math.max(10, event.clientX - 120)
        const floatY = Math.max(10, event.clientY - 90)
        onFloat({ x: floatX, y: floatY })
      }
    }
  }

  const handlePointerUp = (event) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null
    }
    if (pressStartRef.current?.pointerId === event.pointerId) {
      pressStartRef.current = null
    }
  }

  const handlePointerCancel = (event) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null
    }
    if (pressStartRef.current?.pointerId === event.pointerId) {
      pressStartRef.current = null
    }
  }

  const initials = label?.[0]?.toUpperCase() || '?'

  return (
    <div
      className={`video-tile ${isScreen ? 'screen-tile' : ''} ${movable ? 'movable-tile' : ''} ${floating ? 'floating-tile' : ''}`}
      style={movable ? { left: position.x, top: position.y, width: size.width, height: size.height } : undefined}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      {floating && onDock && (
        <button
          className="tile-dock-btn"
          onClick={(e) => {
            e.stopPropagation()
            onDock()
          }}
          title="Dock back to grid"
          aria-label="Dock back to grid"
        >
          ↙️
        </button>
      )}

      {!floating && !isScreen && onFloat && (
        <button
          className="tile-float-btn"
          onClick={(e) => {
            e.stopPropagation()
            // Float to center of viewport
            onFloat({
              x: Math.max(10, window.innerWidth / 2 - 120),
              y: Math.max(10, window.innerHeight / 2 - 90),
            })
          }}
          title="Float video window"
          aria-label="Float video window"
        >
          ↗️
        </button>
      )}

      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal || isScreen}
          className="video-el"
        />
      ) : (
        <span className="avatar">{initials}</span>
      )}
      <div className="tile-label">{label}</div>
      {floating && (
        <div
          className="tile-resize-handle"
          onPointerDown={startResize}
          onPointerMove={handleResizeMove}
          onPointerUp={handleResizeUp}
          onPointerCancel={handleResizeUp}
          title="Drag to resize"
        />
      )}
    </div>
  )
}

