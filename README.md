# 🎬 Movie Party

Watch movies together with friends — screen sharing + video call, up to 6 people.

## How it works

- **Host** shares their screen (with audio) — works with Netflix, Disney+, YouTube, anything
- **Everyone** joins on webcam and can see + hear each other
- Real-time signaling via Spring Boot + WebSockets (STOMP)
- Video streams are peer-to-peer via WebRTC (no media goes through the server)

## Tech Stack

| Layer | Tech |
|---|---|
| Backend | Spring Boot 3, Spring WebSocket + STOMP |
| Frontend | React + Vite |
| Real-time video | WebRTC (browser-native) |
| Backend hosting | Render (free tier) |
| Frontend hosting | Vercel (free tier) |

---

## Local Development

### 1. Backend

```bash
cd backend
mvn spring-boot:run
# Runs on http://localhost:8080
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
# Runs on http://localhost:5173
```

Open two browser windows, create a room in one, join with the code in the other.

---

## Deploying to Production

### Backend → Render

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your repo
4. Settings:
   - **Build command:** `cd backend && mvn clean package -DskipTests`
   - **Start command:** `java -jar backend/target/movieparty-backend-0.0.1-SNAPSHOT.jar`
   - **Environment:** Java
5. Deploy — Render gives you a URL like `https://movieparty-backend.onrender.com`

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your repo → select the `frontend` folder as root
3. Add environment variable:
   - `VITE_BACKEND_URL` = your Render URL (e.g. `https://movieparty-backend.onrender.com`)
4. Deploy

### Update CORS

In `backend/src/main/resources/application.properties`, update:
```
movieparty.cors.allowed-origins=http://localhost:5173,https://your-app.vercel.app
```

---

## Project Structure

```
movieparty/
├── backend/
│   └── src/main/java/com/movieparty/
│       ├── MoviePartyApplication.java   # Entry point
│       ├── config/
│       │   ├── WebSocketConfig.java     # STOMP WebSocket setup
│       │   └── CorsConfig.java          # CORS for Vercel frontend
│       ├── model/
│       │   ├── Room.java                # Room + peer data
│       │   └── SignalMessage.java       # WebRTC signal payload
│       ├── service/
│       │   └── RoomService.java         # In-memory room management
│       └── controller/
│           ├── RoomController.java      # REST: create/join rooms
│           └── SignalingController.java # WebSocket: WebRTC signaling
│
└── frontend/
    └── src/
        ├── hooks/
        │   └── useWebRTC.js     # All WebRTC + signaling logic
        ├── components/
        │   ├── Home.jsx         # Create / join room page
        │   ├── Room.jsx         # Main watch party UI
        │   └── VideoTile.jsx    # Single video feed tile
        └── styles/
            └── global.css
```

## Notes

- Screen sharing with audio works best in **Chrome** (system audio capture)
- Firefox supports screen share but may not capture system audio
- The Render free tier spins down after 15 min of inactivity — first join may take ~30s to wake up
- For production with many users, consider replacing the in-memory room store with Redis
