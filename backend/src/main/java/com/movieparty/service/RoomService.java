package com.movieparty.service;

import com.movieparty.model.Room;
import java.util.Collection;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

@Service
public class RoomService {
    private final ConcurrentHashMap<String, Room> rooms = new ConcurrentHashMap<>();

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
        if (room == null || room.isFull()) {
            return false;
        }
        return room.addPeer(peerId, displayName);
    }

    public boolean leaveRoom(String roomId, String peerId) {
        Room room = rooms.get(roomId);
        if (room == null) {
            return false;
        }
        room.removePeer(peerId);
        if (room.getPeerCount() == 0) {
            rooms.remove(roomId);
        }
        return true;
    }

    public boolean deleteRoomIfEmpty(String roomId) {
        Room room = rooms.get(roomId);
        if (room == null || room.getPeerCount() > 0) {
            return false;
        }
        return rooms.remove(roomId, room);
    }

    public boolean roomExists(String roomId) {
        return rooms.containsKey(roomId);
    }

    private String generateRoomCode() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        StringBuilder sb = new StringBuilder(6);
        for (int i = 0; i < 6; i++) {
            int idx = (int) (Math.random() * chars.length());
            sb.append(chars.charAt(idx));
        }
        String code = sb.toString();
        if (rooms.containsKey(code)) {
            return generateRoomCode();
        }
        return code;
    }
}