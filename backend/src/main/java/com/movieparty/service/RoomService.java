package com.movieparty.service;

import com.movieparty.model.Room;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RoomService {

    private final Map<String, Room> rooms = new ConcurrentHashMap<>();

    public int getRoomCount() {
    return rooms.size();
}
public Collection<Room> getAllRooms() {
    return rooms.values();
}

    public Room createRoom(String hostId, String displayName) {
        String roomId = generateRoomCode();
        Room room = new Room(roomId, hostId);
        room.addPeer(hostId, displayName);
        rooms.put(roomId, room);
        return room;
    }

    public Optional<Room> getRoom(String roomId) {
        return Optional.ofNullable(rooms.get(roomId));
    }

    public boolean joinRoom(String roomId, String peerId, String displayName) {
        Room room = rooms.get(roomId);
        if (room == null || room.isFull()) return false;
        return room.addPeer(peerId, displayName);
    }

    public void leaveRoom(String roomId, String peerId) {
        Room room = rooms.get(roomId);
        if (room == null) return;
        room.removePeer(peerId);
        // Clean up empty rooms
        if (room.getPeerCount() == 0) {
            rooms.remove(roomId);
        }
    }

    public boolean roomExists(String roomId) {
        return rooms.containsKey(roomId);
    }

    private String generateRoomCode() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        Random rng = new Random();
        StringBuilder sb = new StringBuilder(6);
        for (int i = 0; i < 6; i++) {
            sb.append(chars.charAt(rng.nextInt(chars.length())));
        }
        String code = sb.toString();
        // Ensure uniqueness
        return rooms.containsKey(code) ? generateRoomCode() : code;
    }
}
