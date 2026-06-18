package com.movieparty.controller;

import com.movieparty.model.Room;
import com.movieparty.model.SignalMessage;
import com.movieparty.service.RoomService;
import org.springframework.messaging.handler.annotation.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Controller
public class SignalingController {

    private final SimpMessagingTemplate messagingTemplate;
    private final RoomService roomService;

    public SignalingController(SimpMessagingTemplate messagingTemplate, RoomService roomService) {
        this.messagingTemplate = messagingTemplate;
        this.roomService = roomService;
    }

    /**
     * A new peer announces they've joined the room.
     * Server broadcasts the full peer list to everyone in the room.
     *
     * Client sends to: /app/signal/{roomId}
     * with message type = "join"
     */
    @MessageMapping("/signal/{roomId}")
    public void handleSignal(@DestinationVariable String roomId, SignalMessage message) {

        String type = message.getType();

        switch (type) {

            case "join" -> {
                // Tell every existing peer that someone new joined
                // and send the new peer the list of existing peers
                roomService.getRoom(roomId).ifPresent(room -> {
                    List<Map<String, String>> peerList = room.getPeers().values().stream()
                            .filter(p -> !p.peerId().equals(message.getFromId()))
                            .map(p -> Map.of("peerId", p.peerId(), "displayName", p.displayName()))
                            .collect(Collectors.toList());

                    // Send peer list only to the joining peer
                    SignalMessage peerListMsg = new SignalMessage();
                    peerListMsg.setType("peer-list");
                    peerListMsg.setRoomId(roomId);
                    peerListMsg.setPayload(peerList);
                    messagingTemplate.convertAndSend(
                            "/topic/peer/" + message.getFromId(), peerListMsg);

                    // Notify everyone else that a new peer joined
                    SignalMessage joinNotif = new SignalMessage();
                    joinNotif.setType("peer-joined");
                    joinNotif.setFromId(message.getFromId());
                    joinNotif.setDisplayName(message.getDisplayName());
                    joinNotif.setRoomId(roomId);
                    messagingTemplate.convertAndSend("/topic/room/" + roomId, joinNotif);
                });
            }

            case "leave" -> {
                roomService.leaveRoom(roomId, message.getFromId());

                SignalMessage leaveMsg = new SignalMessage();
                leaveMsg.setType("peer-left");
                leaveMsg.setFromId(message.getFromId());
                leaveMsg.setRoomId(roomId);
                messagingTemplate.convertAndSend("/topic/room/" + roomId, leaveMsg);
            }

            // WebRTC offer — sent directly to one specific peer
            case "offer", "answer", "ice-candidate", "screen-id", "screen-stopped" -> {
                messagingTemplate.convertAndSend(
                        "/topic/peer/" + message.getToId(), message);
            }

            default -> {
                // Unknown signal type — ignore
            }
        }
    }
}
