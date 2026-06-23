package com.movieparty.controller;

import com.movieparty.model.Room;
import com.movieparty.service.RoomService;
import java.util.Comparator;
import java.util.stream.Collectors;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

@Controller
public class AdminController {
    private final RoomService roomService;

    public AdminController(RoomService roomService) {
        this.roomService = roomService;
    }

    @GetMapping(value = "/login", produces = "text/html")
    @ResponseBody
    public String loginPage(Authentication authentication, CsrfToken csrfToken,
                            @RequestParam(value = "error", required = false) String error,
                            @RequestParam(value = "message", required = false) String message) {
        if (isAuthenticated(authentication)) {
            return dashboard(csrfToken, message);
        }
        return loginForm(csrfToken, error, message);
    }

    @PostMapping("/admin/rooms/{roomId}/delete")
    public String deleteEmptyRoom(@PathVariable String roomId) {
        if (!roomService.deleteRoomIfEmpty(roomId)) {
            return "redirect:/login?error=room-not-empty";
        }
        return "redirect:/login?message=Deleted%20room%20" + roomId;
    }

    private String loginForm(CsrfToken csrfToken, String error, String message) {
        StringBuilder html = new StringBuilder();
        html.append("<!doctype html><html lang='en'><head><meta charset='utf-8' />")
            .append("<meta name='viewport' content='width=device-width, initial-scale=1' />")
            .append("<title>MovieParty Admin Login</title>")
            .append("<style>")
            .append("body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0f172a;color:#e5e7eb;font-family:Arial,sans-serif;}")
            .append(".card{width:min(560px,92vw);background:#111827;border:1px solid #334155;border-radius:18px;padding:28px;}")
            .append("h1{margin:0 0 10px;}p{line-height:1.5;}.hint{color:#94a3b8;}.banner{margin:0 0 16px;padding:12px 14px;border-radius:12px;}")
            .append(".error{background:rgba(248,113,113,.12);color:#fecaca;border:1px solid rgba(248,113,113,.25);}")
            .append(".success{background:rgba(34,197,94,.12);color:#bbf7d0;border:1px solid rgba(34,197,94,.25);}")
            .append("label{display:block;margin-bottom:12px;}input{width:100%;box-sizing:border-box;margin-top:6px;padding:12px;border-radius:10px;border:1px solid #475569;background:#0b1220;color:#fff;}")
            .append("button{margin-top:10px;padding:12px 16px;border:0;border-radius:10px;background:#22c55e;color:#052e16;font-weight:700;cursor:pointer;}.small{margin-top:16px;color:#94a3b8;font-size:13px;}")
            .append("</style></head><body><div class='card'><h1>Admin Login</h1><p class='hint'>Sign in with the backend credentials.</p>");
        if (error != null && !error.isBlank()) {
            html.append(banner("error", escapeHtml(errorMessage(error))));
        }
        if (message != null && !message.isBlank()) {
            html.append(banner("success", escapeHtml(message)));
        }
        html.append("<form method='post' action='/login'>")
            .append(csrfInput(csrfToken))
            .append("<label>Username<input name='username' autocomplete='username' /></label>")
            .append("<label>Password<input name='password' type='password' autocomplete='current-password' /></label>")
            .append("<button type='submit'>Login</button></form>")
            .append("<div class='small'>Portal route: /login</div></div></body></html>");
        return html.toString();
    }

    private String dashboard(CsrfToken csrfToken, String message) {
        var rooms = roomService.getAllRooms().stream()
                .sorted(Comparator.comparing(Room::getRoomId))
                .toList();

        String rows = rooms.isEmpty()
                ? "<tr><td colspan='5' style='text-align:center;padding:24px;color:#94a3b8;'>No active rooms</td></tr>"
                : rooms.stream().map(room -> {
                    String peers = room.getPeers().values().stream()
                            .sorted(Comparator.comparing(Room.Peer::displayName, String.CASE_INSENSITIVE_ORDER)
                                    .thenComparing(Room.Peer::peerId))
                            .map(peer -> "<li>" + escapeHtml(peer.displayName()) + " <small>(" + escapeHtml(peer.peerId()) + ")</small></li>")
                            .collect(Collectors.joining());
                    String action = room.getPeerCount() == 0
                            ? "<form method='post' action='/admin/rooms/" + escapeHtml(room.getRoomId()) + "/delete'>" + csrfInput(csrfToken) + "<button type='submit'>Delete empty room</button></form>"
                            : "<span style='color:#94a3b8;'>Active</span>";
                    return "<tr><td><code>" + escapeHtml(room.getRoomId()) + "</code></td><td>" + escapeHtml(room.getHostId()) + "</td><td>" + room.getPeerCount() + "</td><td><ul>" + peers + "</ul></td><td>" + action + "</td></tr>";
                }).collect(Collectors.joining());

        StringBuilder html = new StringBuilder();
        html.append("<!doctype html><html lang='en'><head><meta charset='utf-8' />")
            .append("<meta name='viewport' content='width=device-width, initial-scale=1' />")
            .append("<title>MovieParty Admin Dashboard</title>")
            .append("<style>")
            .append("body{margin:0;padding:24px;background:#0f172a;color:#e5e7eb;font-family:Arial,sans-serif;}.wrap{max-width:1280px;margin:0 auto;}")
            .append(".top{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:20px;}.muted{color:#94a3b8;}.banner{margin:0 0 16px;padding:12px 14px;border-radius:12px;}")
            .append(".success{background:rgba(34,197,94,.12);color:#bbf7d0;border:1px solid rgba(34,197,94,.25);}.error{background:rgba(248,113,113,.12);color:#fecaca;border:1px solid rgba(248,113,113,.25);}")
            .append(".cards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px;}.card{background:#111827;border:1px solid #334155;border-radius:16px;padding:16px;}.value{font-size:32px;font-weight:700;}")
            .append("table{width:100%;border-collapse:collapse;background:#111827;border:1px solid #334155;border-radius:16px;overflow:hidden;}th,td{padding:12px;border-bottom:1px solid #334155;vertical-align:top;text-align:left;}th{color:#94a3b8;}ul{margin:0;padding-left:18px;}button{padding:10px 12px;border:0;border-radius:10px;cursor:pointer;background:#22c55e;color:#052e16;font-weight:700;} .danger{background:#f59e0b;color:#1f2937;} code{color:#a7f3d0;}@media (max-width:900px){.cards{grid-template-columns:1fr;}.top{flex-direction:column;align-items:flex-start;}}")
            .append("</style></head><body><div class='wrap'><div class='top'><div><h1>MovieParty Admin Dashboard</h1><div class='muted'>Authenticated admin portal. Route: /login</div></div><form method='post' action='/logout'>")
            .append(csrfInput(csrfToken))
            .append("<button type='submit' class='danger'>Logout</button></form></div>");
        if (message != null && !message.isBlank()) {
            html.append(banner("success", escapeHtml(message)));
        }
        html.append("<div class='cards'><div class='card'><div class='muted'>Rooms</div><div class='value'>")
            .append(rooms.size())
            .append("</div></div><div class='card'><div class='muted'>Connected peers</div><div class='value'>")
            .append(rooms.stream().mapToInt(Room::getPeerCount).sum())
            .append("</div></div><div class='card'><div class='muted'>Empty rooms</div><div class='value'>")
            .append(rooms.stream().filter(room -> room.getPeerCount() == 0).count())
            .append("</div></div></div><table><thead><tr><th>Room</th><th>Host</th><th>Peers</th><th>Connected users</th><th>Action</th></tr></thead><tbody>")
            .append(rows)
            .append("</tbody></table></div></body></html>");
        return html.toString();
    }

    private boolean isAuthenticated(Authentication authentication) {
        return authentication != null && authentication.isAuthenticated() && !(authentication instanceof AnonymousAuthenticationToken);
    }

    private String csrfInput(CsrfToken csrfToken) {
        return "<input type='hidden' name='" + escapeHtml(csrfToken.getParameterName()) + "' value='" + escapeHtml(csrfToken.getToken()) + "' />";
    }

    private String banner(String kind, String text) {
        return "<div class='banner " + kind + "'>" + text + "</div>";
    }

    private String errorMessage(String error) {
        return switch (error) {
            case "error" -> "Login failed.";
            case "room-not-empty" -> "Only empty rooms can be deleted.";
            default -> "Authentication required.";
        };
    }

    private String escapeHtml(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}