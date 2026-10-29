# serve.py — local stand-in for /api/loader/[slug].js
import http.server, socketserver, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

class H(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith("/api/loader/"):
            slug = self.path.rsplit("/", 1)[-1]
            fn = f"{slug}.bin"
            if not os.path.isfile(fn):
                self.send_response(404); self.end_headers()
                self.wfile.write(b"-- script not found"); return
            body = open(fn, "rb").read()
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.end_headers(); self.wfile.write(body)
        else:
            self.send_error(404)

with socketserver.TCPServer(("127.0.0.1", 8080), H) as httpd:
    print("serving on http://127.0.0.1:8080  (GET /api/loader/hello)")
    httpd.serve_forever()