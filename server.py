import http.server
import socketserver
import webbrowser
import os

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Dodajemy nagłówek zapobiegający keszowaniu podczas rozwoju aplikacji
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

# Zmień katalog roboczy na ten, w którym znajduje się skrypt
os.chdir(os.path.dirname(os.path.abspath(__file__)))

Handler = MyHTTPRequestHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"\n=======================================================")
    print(f"  SERWER URUCHOMIONY!")
    print(f"  Otwórz w przeglądarce: http://localhost:{PORT}")
    print(f"=======================================================\n")
    print("Wskazówka dla telefonu:")
    print("Web Bluetooth wymaga bezpiecznego połączenia (HTTPS) na telefonach.")
    print("Aby przetestować na telefonie:")
    print("1. Wgraj ten folder na darmowy hosting HTTPS (np. GitHub Pages lub Vercel).")
    print("2. Lub użyj funkcji debugowania USB w Chrome (Port Forwarding poru 8000).")
    print("\nNaciśnij Ctrl+C, aby wyłączyć serwer.\n")
    
    # Otwórz przeglądarkę automatycznie na komputerze
    try:
        webbrowser.open(f"http://localhost:{PORT}")
    except Exception:
        pass
        
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nSerwer wyłączony. Miłego kodowania!")
