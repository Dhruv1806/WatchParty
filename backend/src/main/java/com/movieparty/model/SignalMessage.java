package com.movieparty.model;

public class SignalMessage {

    // Type: "offer" | "answer" | "ice-candidate" | "join" | "leave" | "peer-list"
    private String type;
    private String fromId;
    private String toId;
    private String roomId;
    private Object payload;   // SDP or ICE candidate object
    private String displayName;

    public SignalMessage() {}

    public String getType()        { return type; }
    public void setType(String t)  { this.type = t; }

    public String getFromId()           { return fromId; }
    public void setFromId(String f)     { this.fromId = f; }

    public String getToId()             { return toId; }
    public void setToId(String t)       { this.toId = t; }

    public String getRoomId()           { return roomId; }
    public void setRoomId(String r)     { this.roomId = r; }

    public Object getPayload()          { return payload; }
    public void setPayload(Object p)    { this.payload = p; }

    public String getDisplayName()           { return displayName; }
    public void setDisplayName(String name)  { this.displayName = name; }
}
