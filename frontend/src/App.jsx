import { useState } from 'react'
import Home from './components/Home'
import Room from './components/Room'
import './styles/global.css'

export default function App() {
  const [session, setSession] = useState(null)
  // session = { roomId, peerId, displayName, isHost }

  if (session) {
    return (
      <Room
        roomId={session.roomId}
        peerId={session.peerId}
        displayName={session.displayName}
        isHost={session.isHost}
      />
    )
  }

  return <Home onEnterRoom={setSession} />
}
