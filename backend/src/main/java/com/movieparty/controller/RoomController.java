package com.movieparty.controller;

import com.movieparty.model.Room;
import com.movieparty.service.RoomService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController

@RequestMapping("/api/rooms")
public class RoomController {
    
    private final RoomService roomService;

    public RoomController(RoomService roomService) {
        this.roomService = roomService;
    }

    // POST /api/rooms/create  { "peerId": "...", "displayName": "Sneh" }
    @PostMapping("/create")
    public ResponseEntity<?> createRoom(@RequestBody Map<String, String> body) {
        String peerId       = body.get("peerId");
        String displayName  = body.get("displayName");

        if (peerId == null || displayName == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "peerId and displayName required"));
        }

        Room room = roomService.createRoom(peerId, displayName);
        return ResponseEntity.ok(Map.of(
                "roomId",    room.getRoomId(),
                "hostId",    room.getHostId(),
                "peerCount", room.getPeerCount()
        ));
    }

    // POST /api/rooms/join  { "roomId": "ABC123", "peerId": "...", "displayName": "..." }
    @PostMapping("/join")
    public ResponseEntity<?> joinRoom(@RequestBody Map<String, String> body) {
        String roomId      = body.get("roomId");
        String peerId      = body.get("peerId");
        String displayName = body.get("displayName");

        if (roomId == null || peerId == null || displayName == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "roomId, peerId and displayName required"));
        }

        if (!roomService.roomExists(roomId)) {
            return ResponseEntity.status(404).body(Map.of("error", "Room not found"));
        }

        boolean joined = roomService.joinRoom(roomId, peerId, displayName);
        if (!joined) {
            return ResponseEntity.status(403).body(Map.of("error", "Room is full (max 6 people)"));
        }

        Room room = roomService.getRoom(roomId).get();
        return ResponseEntity.ok(Map.of(
                "roomId",    room.getRoomId(),
                "hostId",    room.getHostId(),
                "peerCount", room.getPeerCount()
        ));
    }

    // GET /api/rooms/{roomId}/exists
    @GetMapping("/{roomId}/exists")
    public ResponseEntity<?> roomExists(@PathVariable String roomId) {
        boolean exists = roomService.roomExists(roomId);
        return ResponseEntity.ok(Map.of("exists", exists));
    }
    // GET /api/rooms/stats
    @GetMapping("/stats")
public ResponseEntity<?> getStats() {
    List<Map<String, Object>> roomDetails = roomService.getAllRooms()
        .stream()
        .map(room -> Map.<String, Object>of(
            "roomId",    room.getRoomId(),
            "hostId",    room.getHostId(),
            "peerCount", room.getPeerCount()
        ))
        .toList();

    return ResponseEntity.ok(Map.of(
        "roomCount", roomDetails.size(),
        "rooms",     roomDetails
    ));
}

}
