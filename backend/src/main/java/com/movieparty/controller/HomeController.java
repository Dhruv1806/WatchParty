package com.movieparty.controller;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HomeController {

    @GetMapping(value = "/", produces = MediaType.TEXT_HTML_VALUE)
    public String home() {
        return """
                <!DOCTYPE html>
                <html lang="en">
                <head>
                  <meta charset="UTF-8" />
                  <title>Movie Watchparty</title>
                  <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                      min-height: 100vh;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      background: #0f0f0f;
                      font-family: 'Segoe UI', sans-serif;
                      color: #fff;
                    }
                    .card {
                      text-align: center;
                      padding: 48px 64px;
                      border: 1px solid #2a2a2a;
                      border-radius: 16px;
                      background: #1a1a1a;
                    }
                    .dot {
                      display: inline-block;
                      width: 10px;
                      height: 10px;
                      background: #22c55e;
                      border-radius: 50%;
                      margin-right: 8px;
                      animation: pulse 1.5s infinite;
                    }
                    @keyframes pulse {
                      0%, 100% { opacity: 1; }
                      50%       { opacity: 0.3; }
                    }
                    h1 { font-size: 2rem; margin-bottom: 12px; }
                    p  { color: #888; font-size: 0.95rem; margin-top: 8px; }
                    .badge {
                      display: inline-block;
                      margin-top: 24px;
                      padding: 4px 14px;
                      background: #22c55e22;
                      color: #22c55e;
                      border: 1px solid #22c55e55;
                      border-radius: 999px;
                      font-size: 0.8rem;
                      font-weight: 600;
                      letter-spacing: 0.05em;
                    }
                  </style>
                </head>
                <body>
                  <div class="card">
                    <h1>🎬 Movie Watchparty</h1>
                    <p><span class="dot"></span>Server is up and running</p>
                    <p>WebSocket endpoint: <code>/ws</code> &nbsp;|&nbsp; API: <code>/api/rooms</code></p>
                    <div class="badge">LIVE</div>
                  </div>
                </body>
                </html>
                """;
    }
}