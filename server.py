import http.server
import socketserver
import webbrowser
import os
import socket

PORT = 8080

# Metoda bezpiecznego wykrywania lokalnego adresu IP komputera w sieci Wi-Fi/LAN
def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Łączymy się z fikcyjnym adresem, aby wyciągnąć interfejs sieciowy używany przez system
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Wyłącz cache tylko dla kodu (HTML, JS, CSS), aby zmiany w kodzie wchodziły od razu
        if self.path.endswith('.html') or self.path.endswith('.js') or self.path.endswith('.css') or self.path == '/':
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
        else:
            # Pozwól przeglądarce zapamiętać pliki MP3 oraz grafiki PNG, aby ładowały się natychmiast
            self.send_header("Cache-Control", "public, max-age=86400")
        super().end_headers()

# Zmień katalog roboczy na ten, w którym znajduje się skrypt
os.chdir(os.path.dirname(os.path.abspath(__file__)))

Handler = MyHTTPRequestHandler
local_ip = get_local_ip()

# Ustawiamy ponowne użycie portu i wielowątkowość
socketserver.ThreadingTCPServer.allow_reuse_address = True

# Powiązanie z "0.0.0.0" sprawia, że serwer jest widoczny dla całej sieci lokalnej (Wi-Fi)
with socketserver.ThreadingTCPServer(("0.0.0.0", PORT), Handler) as httpd:
    print(f"\n=======================================================")
    print(f"  SERWER URUCHOMIONY W SIECI LOKALNEJ!")
    print(f"  [PC] Na komputerze: http://localhost:{PORT}")
    print(f"  [Mobile] Na telefonie (Wi-Fi): http://{local_ip}:{PORT}")
    print(f"=======================================================\n")
    
    print("!!! WAŻNA WSKAZÓWKA DLA TELEFONU (Web Bluetooth przez HTTP) !!!")
    print("Przeglądarki na telefonie wymagają połączenia HTTPS, aby zezwolić na używanie Bluetooth.")
    print("Aby sterować klockiem za pomocą lokalnego serwera HTTP przez Wi-Fi:")
    print("1. Otwórz w przeglądarce Chrome na telefonie adres: chrome://flags")
    print("2. Wyszukaj flagę: unsafely-treat-insecure-origin-as-secure")
    print("3. Włącz ją (Enabled) i w polu tekstowym wpisz adres serwera:")
    print(f"   http://{local_ip}:{PORT}")
    print("4. Kliknij przycisk 'Relaunch' na dole, aby zrestartować Chrome.")
    print("5. Gotowe! Teraz Bluetooth zadziała lokalnie na Twoim telefonie.")
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
