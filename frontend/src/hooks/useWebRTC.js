import { useEffect, useRef, useState, useCallback } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://watchparty-itss.onrender.com'
console.log('Using backend URL:', import.meta.env.VITE_BACKEND_URL || "nothing found")

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
}

export function useWebRTC(roomId, peerId, displayName, isHost) {
  const stompClient   = useRef(null)
  const peerConns     = useRef({})   // remotePeerId -> { pc, polite, makingOffer, ignoreOffer }
  const localStream   = useRef(null) // webcam
  const screenStream  = useRef(null) // host screen share

  // Map of remotePeerId -> { webcam: MediaStream|null, screen: MediaStream|null }
  const [remoteStreams, setRemoteStreams] = useState({})
  const [peerNames, setPeerNames]   = useState({})  // remotePeerId -> name
  const [localWebcam, setLocalWebcam] = useState(null)
  const [screenShare, setScreenShare] = useState(null)
  const [isConnected, setIsConnected] = useState(false)

  // Keep latest signal handlers in refs so the WS effect connects ONCE
  const handlersRef = useRef({})
  const classifyStreamsRef = useRef(() => {})

  // ── Low-level send ─────────────────────────────────────────────────────────
  const sendSignal = useCallback((message) => {
    if (!stompClient.current?.connected) return
    stompClient.current.publish({
      destination: `/app/signal/${roomId}`,
      body: JSON.stringify(message)
    })
  }, [roomId])

  // ── Stream bookkeeping ──────────────────────────────────────────────────────
  const setRemoteKind = useCallback((remotePeerId, kind, stream, name) => {
    setRemoteStreams(prev => ({
      ...prev,
      [remotePeerId]: { ...(prev[remotePeerId] || {}), [kind]: stream }
    }))
    if (name) setPeerNames(prev => ({ ...prev, [remotePeerId]: name }))
  }, [])

  // Classify incoming streams into webcam vs screen.
  // The host announces the screen VIDEO TRACK id (track ids are preserved across
  // the peer connection; stream ids are not). We match each incoming stream by
  // whether it contains the announced screen track id.
  const classifyStreams = useCallback((remotePeerId, entry) => {
    const incoming = entry.incoming || {}
    Object.values(incoming).forEach(({ stream, remoteName }) => {
      const trackIds = stream.getTracks().map(t => t.id)
      const isScreen =
        (entry.screenStreamId && stream.id === entry.screenStreamId) ||
        (entry.screenTrackId && trackIds.includes(entry.screenTrackId))
      setRemoteKind(remotePeerId, isScreen ? 'screen' : 'webcam', stream, remoteName)
    })
  }, [setRemoteKind])

  const dropPeer = useCallback((remotePeerId) => {
    const entry = peerConns.current[remotePeerId]
    if (entry?.pc) entry.pc.close()
    delete peerConns.current[remotePeerId]
    setRemoteStreams(prev => {
      const next = { ...prev }
      delete next[remotePeerId]
      return next
    })
    setPeerNames(prev => {
      const next = { ...prev }
      delete next[remotePeerId]
      return next
    })
  }, [])

  // ── Build a peer connection ──────────────────────────────────────────────────
  const ensurePeer = useCallback((remotePeerId, remoteName, polite) => {
    if (peerConns.current[remotePeerId]) return peerConns.current[remotePeerId]

    const pc = new RTCPeerConnection(ICE_SERVERS)
    const entry = { pc, polite, makingOffer: false, ignoreOffer: false }
    peerConns.current[remotePeerId] = entry
    if (remoteName) setPeerNames(prev => ({ ...prev, [remotePeerId]: remoteName }))

    // Add our outgoing tracks
    let addedAnyTrack = false
    if (localStream.current) {
      localStream.current.getTracks().forEach(t => { pc.addTrack(t, localStream.current); addedAnyTrack = true })
    }
    if (isHost && screenStream.current) {
      screenStream.current.getTracks().forEach(t => { pc.addTrack(t, screenStream.current); addedAnyTrack = true })
      // This peer joined while we were already sharing — tell it which track is the screen
      const screenVideoTrack = screenStream.current.getVideoTracks()[0]
      if (screenVideoTrack) {
        sendSignal({
          type: 'screen-id',
          fromId: peerId,
          toId: remotePeerId,
          roomId,
          payload: { trackId: screenVideoTrack.id, streamId: screenStream.current.id }
        })
      }
    }
    // Viewer with no media: still need to negotiate so we can RECEIVE the share.
    // Receive-only transceivers make onnegotiationneeded fire and let tracks arrive.
    if (!addedAnyTrack) {
      pc.addTransceiver('video', { direction: 'recvonly' })
      pc.addTransceiver('audio', { direction: 'recvonly' })
    }

    // Identify incoming streams. The sender announces its screen stream id via a
    // "screen-id" signal. That message may arrive before OR after the track, so
    // we re-evaluate: stash every incoming stream, then classify.
    pc.ontrack = (event) => {
      const stream = event.streams[0]
      if (!stream) return
      entry.incoming = entry.incoming || {}
      entry.incoming[stream.id] = { stream, remoteName }
      classifyStreams(remotePeerId, entry)
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({ type: 'ice-candidate', fromId: peerId, toId: remotePeerId, roomId, payload: event.candidate })
      }
    }

    // Perfect negotiation: fire offers whenever tracks change
    pc.onnegotiationneeded = async () => {
      try {
        entry.makingOffer = true
        await pc.setLocalDescription(await pc.createOffer())
        sendSignal({ type: 'offer', fromId: peerId, toId: remotePeerId, roomId, displayName, payload: pc.localDescription })
      } catch (err) {
        console.error('negotiation error', err)
      } finally {
        entry.makingOffer = false
      }
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        dropPeer(remotePeerId)
      }
    }

    return entry
  }, [peerId, roomId, isHost, displayName, sendSignal, setRemoteKind, dropPeer])

  // ── Perfect-negotiation offer/answer/ICE handlers ───────────────────────────
  const handleOffer = useCallback(async (message) => {
    const remotePeerId = message.fromId
    // The newer joiner is "polite". A peer receiving an offer for an unknown
    // peer treats itself as polite by default.
    const entry = ensurePeer(remotePeerId, message.displayName, true)
    const { pc } = entry

    const offerCollision = entry.makingOffer || pc.signalingState !== 'stable'
    entry.ignoreOffer = !entry.polite && offerCollision
    if (entry.ignoreOffer) return

    if (offerCollision) {
      await Promise.all([
        pc.setLocalDescription({ type: 'rollback' }),
        pc.setRemoteDescription(new RTCSessionDescription(message.payload))
      ])
    } else {
      await pc.setRemoteDescription(new RTCSessionDescription(message.payload))
    }
    await pc.setLocalDescription(await pc.createAnswer())
    sendSignal({ type: 'answer', fromId: peerId, toId: remotePeerId, roomId, payload: pc.localDescription })
  }, [ensurePeer, peerId, roomId, sendSignal])

  const handleAnswer = useCallback(async (message) => {
    const entry = peerConns.current[message.fromId]
    if (entry?.pc) {
      await entry.pc.setRemoteDescription(new RTCSessionDescription(message.payload))
    }
  }, [])

  const handleIceCandidate = useCallback(async (message) => {
    const entry = peerConns.current[message.fromId]
    if (!entry?.pc) return
    try {
      await entry.pc.addIceCandidate(new RTCIceCandidate(message.payload))
    } catch (err) {
      if (!entry.ignoreOffer) console.error('ICE add error', err)
    }
  }, [])

  // When *we* are an existing peer and a new one joins, we are the IMPOLITE
  // (initiator) side: create the connection, onnegotiationneeded fires the offer.
  const callPeer = useCallback((remotePeerId, remoteName) => {
    ensurePeer(remotePeerId, remoteName, false)
  }, [ensurePeer])

  // Keep handler refs fresh
  useEffect(() => {
    handlersRef.current = { callPeer, handleOffer, handleAnswer, handleIceCandidate, dropPeer }
    classifyStreamsRef.current = classifyStreams
  }, [callPeer, handleOffer, handleAnswer, handleIceCandidate, dropPeer, classifyStreams])

  // ── Media controls ──────────────────────────────────────────────────────────
  // Resilient: try camera+mic, fall back to mic-only, then to no media at all.
  // A missing webcam should never block joining — you can still watch the share.
  const startWebcam = useCallback(async () => {
    let stream = null
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240 },
        audio: true
      })
    } catch (errBoth) {
      // Camera missing/in use — try audio only
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true })
      } catch (errAudio) {
        // No devices at all — join as a viewer with no outgoing media
        console.warn('No camera or mic available; joining as viewer only.', errBoth?.name, errAudio?.name)
        localStream.current = null
        setLocalWebcam(null)
        return null
      }
    }
    localStream.current = stream
    setLocalWebcam(stream)
    // Add to any existing connections (renegotiation auto-fires)
    Object.values(peerConns.current).forEach(({ pc }) => {
      stream.getTracks().forEach(t => pc.addTrack(t, stream))
    })
    return stream
  }, [])

  const startScreenShare = useCallback(async () => {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 30 },
      audio: true
    })
    screenStream.current = stream
    setScreenShare(stream)

    const screenVideoTrack = stream.getVideoTracks()[0]
    const screenPayload = {
      trackId: screenVideoTrack ? screenVideoTrack.id : null,
      streamId: stream.id
    }

    // Tell peers the screen VIDEO TRACK id (preserved across the connection),
    // so the receiver classifies this stream as the screen, then add the tracks.
    Object.entries(peerConns.current).forEach(([remotePeerId, entry]) => {
      sendSignal({ type: 'screen-id', fromId: peerId, toId: remotePeerId, roomId, payload: screenPayload })
      stream.getTracks().forEach(t => entry.pc.addTrack(t, stream))
    })

    if (screenVideoTrack) screenVideoTrack.onended = () => stopScreenShareInternal()
    return stream
  }, [peerId, roomId, sendSignal])

  const stopScreenShareInternal = useCallback(() => {
    if (screenStream.current) {
      const stoppedStream = screenStream.current
      const senders = []
      Object.entries(peerConns.current).forEach(([remotePeerId, { pc }]) => {
        sendSignal({ type: 'screen-stopped', fromId: peerId, toId: remotePeerId, roomId })
        pc.getSenders().forEach(s => {
          if (s.track && stoppedStream.getTracks().includes(s.track)) senders.push({ pc, sender: s })
        })
      })
      senders.forEach(({ pc, sender }) => pc.removeTrack(sender))
      stoppedStream.getTracks().forEach(t => {
        t.onended = null
        t.stop()
      })
      screenStream.current = null
      setScreenShare(null)
    }
  }, [peerId, roomId, sendSignal])

  // ── Single WebSocket lifecycle ───────────────────────────────────────────────
  useEffect(() => {
    if (!roomId || !peerId) return

    const client = new Client({
      webSocketFactory: () => new SockJS(`${BACKEND_URL}/ws`),
      reconnectDelay: 3000,
      onConnect: () => {
        setIsConnected(true)

        client.subscribe(`/topic/peer/${peerId}`, (frame) => {
          const msg = JSON.parse(frame.body)
          const h = handlersRef.current
          switch (msg.type) {
            case 'peer-list':
              (msg.payload || []).forEach(p => h.callPeer(p.peerId, p.displayName))
              break
            case 'offer':         h.handleOffer(msg); break
            case 'answer':        h.handleAnswer(msg); break
            case 'ice-candidate': h.handleIceCandidate(msg); break
            case 'screen-id': {
              const entry = peerConns.current[msg.fromId]
              if (entry) {
                entry.screenTrackId = typeof msg.payload === 'string' ? msg.payload : msg.payload?.trackId
                entry.screenStreamId = typeof msg.payload === 'object' ? msg.payload?.streamId : null
                if (entry.incoming) classifyStreamsRef.current(msg.fromId, entry)
              }
              break
            }
            case 'screen-stopped':
              setRemoteStreams(prev => ({
                ...prev,
                [msg.fromId]: { ...(prev[msg.fromId] || {}), screen: null }
              }))
              break
            default: break
          }
        })

        client.subscribe(`/topic/room/${roomId}`, (frame) => {
          const msg = JSON.parse(frame.body)
          if (msg.type === 'peer-left') handlersRef.current.dropPeer(msg.fromId)
        })

        client.publish({
          destination: `/app/signal/${roomId}`,
          body: JSON.stringify({ type: 'join', fromId: peerId, roomId, displayName })
        })
      },
      onDisconnect: () => setIsConnected(false)
    })

    stompClient.current = client
    client.activate()

    return () => {
      try {
        client.publish({
          destination: `/app/signal/${roomId}`,
          body: JSON.stringify({ type: 'leave', fromId: peerId, roomId })
        })
      } catch (_) {}
      client.deactivate()
      Object.values(peerConns.current).forEach(({ pc }) => pc.close())
      peerConns.current = {}
      localStream.current?.getTracks().forEach(t => t.stop())
      screenStream.current?.getTracks().forEach(t => t.stop())
    }
    // Only roomId/peerId/displayName — handlers are read via ref, so no reconnect storm
  }, [roomId, peerId, displayName])

  // Build the peers array the UI expects: webcam streams for the sidebar
  const peers = Object.keys(remoteStreams).map(id => ({
    peerId: id,
    displayName: peerNames[id] || id,
    webcam: remoteStreams[id]?.webcam || null,
    screen: remoteStreams[id]?.screen || null
  }))

  return {
    peers,
    localWebcam,
    screenShare,
    isConnected,
    startWebcam,
    startScreenShare,
    stopScreenShare: stopScreenShareInternal
  }
}
