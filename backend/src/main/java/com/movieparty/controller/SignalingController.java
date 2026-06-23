package com.movieparty.controller;

import com.movieparty.model.SignalMessage;
import com.movieparty.service.RoomService;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Controller
public class SignalingController {
    private final SimpMessagingTemplate messagingTemplate;
    private final RoomService roomService;
    private final Map<String, SessionParticipant> sessionParticipants = new ConcurrentHashMap<>();

    public SignalingController(SimpMessagingTemplate messagingTemplate, RoomService roomService) {
        this.messagingTemplate = messagingTemplate;
        this.roomService = roomService;
    }

    @MessageMapping("/signal/{roomId}")
    public void handleSignal(@DestinationVariable String roomId, @Payload SignalMessage message, SimpMessageHeaderAccessor headerAccessor) {
        String sessionId = headerAccessor.getSessionId();
        if (sessionId == null || message == null || message.getType() == null) {
            return;
        }

        switch (message.getType()) {
            case "join" -> handleJoin(roomId, message, sessionId);
            case "leave" -> handleLeave(roomId, sessionId);
            case "offer", "answer", "ice-candidate", "screen-id", "screen-stopped" -> handleRelay(roomId, message, sessionId);
            default -> { }
        }
    }

    private void handleJoin(String roomId, SignalMessage message, String sessionId) {
        if (!roomService.roomExists(roomId) || message.getFromId() == null || message.getDisplayName() == null) {
            return;
        }

        roomService.getRoom(roomId).ifPresent(room -> {
            if (!room.getPeers().containsKey(message.getFromId())) {
                return;
            }

            sessionParticipants.put(sessionId, new SessionParticipant(roomId, message.getFromId()));

            List<Map<String, String>> peerList = room.getPeers().values().stream()
                    .filter(peer -> !peer.peerId().equals(message.getFromId()))
                    .map(peer -> Map.of(
                            "peerId", peer.peerId(),
                            "displayName", peer.displayName()
                    ))
                    .collect(Collectors.toList());

            SignalMessage peerListMsg = new SignalMessage();
            peerListMsg.setType("peer-list");
            peerListMsg.setRoomId(roomId);
            peerListMsg.setToId(message.getFromId());
            peerListMsg.setPayload(peerList);
            messagingTemplate.convertAndSend("/topic/peer/" + message.getFromId(), peerListMsg);

            SignalMessage joinNotif = new SignalMessage();
            joinNotif.setType("peer-joined");
            joinNotif.setFromId(message.getFromId());
            joinNotif.setDisplayName(message.getDisplayName());
            joinNotif.setRoomId(roomId);
            messagingTemplate.convertAndSend("/topic/room/" + roomId, joinNotif);
        });
    }

    private void handleLeave(String roomId, String sessionId) {
        SessionParticipant participant = sessionParticipants.remove(sessionId);
        if (participant == null || !participant.roomId().equals(roomId)) {
            return;
        }

        boolean removed = roomService.leaveRoom(participant.roomId(), participant.peerId());
        if (removed) {
            broadcastPeerLeft(participant.roomId(), participant.peerId());
        }
    }

    private void handleRelay(String roomId, SignalMessage message, String sessionId) {
        SessionParticipant participant = sessionParticipants.get(sessionId);
        if (participant == null || !participant.roomId().equals(roomId)) {
            return;
        }

        if (message.getFromId() != null && !participant.peerId().equals(message.getFromId())) {
            return;
        }
        if (message.getToId() == null || message.getToId().isBlank()) {
            return;
        }

        roomService.getRoom(roomId).ifPresent(room -> {
            if (!room.getPeers().containsKey(message.getToId())) {
                return;
            }

            SignalMessage outbound = new SignalMessage();
            outbound.setType(message.getType());
            outbound.setFromId(participant.peerId());
            outbound.setToId(message.getToId());
            outbound.setRoomId(roomId);
            outbound.setDisplayName(message.getDisplayName());
            outbound.setPayload(message.getPayload());
            messagingTemplate.convertAndSend("/topic/peer/" + message.getToId(), outbound);
        });
    }

    @EventListener
    public void handleSessionDisconnect(SessionDisconnectEvent event) {
        SessionParticipant participant = sessionParticipants.remove(event.getSessionId());
        if (participant == null) {
            return;
        }

        boolean removed = roomService.leaveRoom(participant.roomId(), participant.peerId());
        if (removed) {
            broadcastPeerLeft(participant.roomId(), participant.peerId());
        }
    }

    private void broadcastPeerLeft(String roomId, String peerId) {
        SignalMessage leaveMsg = new SignalMessage();
        leaveMsg.setType("peer-left");
        leaveMsg.setFromId(peerId);
        leaveMsg.setRoomId(roomId);
        messagingTemplate.convertAndSend("/topic/room/" + roomId, leaveMsg);
    }

    private record SessionParticipant(String roomId, String peerId) { }
}