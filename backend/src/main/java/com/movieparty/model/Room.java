package com.movieparty.model;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class Room {

    private final String roomId;
    private final String hostId;
    private final Map<String, Peer> peers = new ConcurrentHashMap<>();
    private final int maxPeers = 6;

    public Room(String roomId, String hostId) {
        this.roomId = roomId;
        this.hostId = hostId;
    }

    public boolean addPeer(String peerId, String displayName) {
        if (peers.size() >= maxPeers) return false;
        peers.put(peerId, new Peer(peerId, displayName));
        return true;
    }

    public void removePeer(String peerId) {
        peers.remove(peerId);
    }

    public boolean isFull() {
        return peers.size() >= maxPeers;
    }

    public String getRoomId()       { return roomId; }
    public String getHostId()       { return hostId; }
    public Map<String, Peer> getPeers() { return peers; }
    public int getPeerCount()       { return peers.size(); }

    public record Peer(String peerId, String displayName) {}
}
