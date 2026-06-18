package com.movieparty.service;

import com.movieparty.model.Room;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RoomServiceTest {

    @Test
    void createRoomAddsHost() {
        RoomService roomService = new RoomService();

        Room room = roomService.createRoom("host-1", "Host");

        assertThat(room.getRoomId()).hasSize(6);
        assertThat(room.getHostId()).isEqualTo("host-1");
        assertThat(room.getPeerCount()).isEqualTo(1);
        assertThat(roomService.roomExists(room.getRoomId())).isTrue();
    }

    @Test
    void joinRoomRejectsMissingAndFullRooms() {
        RoomService roomService = new RoomService();

        assertThat(roomService.joinRoom("ABC123", "peer-1", "Peer")).isFalse();

        Room room = roomService.createRoom("host-1", "Host");
        for (int i = 2; i <= 6; i++) {
            assertThat(roomService.joinRoom(room.getRoomId(), "peer-" + i, "Peer " + i)).isTrue();
        }

        assertThat(room.getPeerCount()).isEqualTo(6);
        assertThat(roomService.joinRoom(room.getRoomId(), "peer-7", "Peer 7")).isFalse();
        assertThat(room.getPeerCount()).isEqualTo(6);
    }

    @Test
    void leaveRoomRemovesEmptyRoom() {
        RoomService roomService = new RoomService();
        Room room = roomService.createRoom("host-1", "Host");

        roomService.leaveRoom(room.getRoomId(), "host-1");

        assertThat(roomService.roomExists(room.getRoomId())).isFalse();
    }
}
