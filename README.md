# LEGO WeDo 2.0 – Graficzny Kontroler Web Bluetooth (PWA)

### **[KLIKNIJ TUTAJ, ABY OTWORZYĆ APLIKACJĘ (LIVE DEMO)](https://darksilesia.github.io/wedo_port_kids/)**

Projekt to nowoczesna, w pełni graficzna (obrazkowa) aplikacja webowa stworzona do programowania i sterowania zestawem LEGO WeDo 2.0 SmartHub bezpośrednio z poziomu smartfona lub komputera za pomocą technologii Web Bluetooth.

Aplikacja została zaprojektowana specjalnie z myślą o dzieciach w wieku przedszkolnym i wczesnoszkolnym, które nie potrafią jeszcze czytać – interfejs programowania nie zawiera żadnego tekstu, a cała logika opiera się na intuicyjnych ikonach, kolorach, wskaźnikach i obrazkach. Dla rodziców przygotowano wbudowaną instrukcję obsługi dostępną bezpośrednio pod ikoną pytajnika w nagłówku.

---

## Główne Funkcje

*   **100% Graficzny UX:** Brak słów w całym panelu programowania oraz modali konfiguracyjnych dla dzieci.
*   **Sterowanie i Skręcanie (Niezależne Silniki):** Wsparcie dla niezależnego sterowania silnikami podłączonymi pod Port 1 (Lewy), Port 2 (Prawy) lub oba porty jednocześnie. Umożliwia to pełną mobilność pojazdu (jazda prosto, zakręty, obrót w miejscu).
*   **Wizualny Wskaźnik Portów:** Małe kropki nad klockami ruchu i zatrzymania silnika na osi czasu świecą się, pokazując dziecku, który silnik zostanie uruchomiony lub zatrzymany w danym kroku.
*   **Prędkość jako Zwierzątka:** Dziecko wybiera prędkość silnika za pomocą powszechnie znanych symboli: żółwia (powoli), królika (średnio) oraz geparda (szybko).
*   **Wbudowane Dźwięki:** Odtwarzanie odgłosów zwierząt (kot, pies, ptak), syreny lub dźwięków robota bezpośrednio z głośnika telefonu (z użyciem systemowego Web Audio API – brak konieczności pobierania plików audio).
*   **Instrukcja dla Rodzica:** Dostępna pod ikoną pytajnika w nagłówku – zawiera pełny słowniczek ikon, wyjaśnienie trybu skręcania oraz wskazówki konfiguracji połączenia.
*   **Wykrywanie Kompatybilności:** Aplikacja automatycznie wykrywa na telefonach nieobsługiwane przeglądarki (np. Edge, Firefox, Safari) i natychmiast wyświetla rodzicowi instrukcję wdrożenia odpowiedniej przeglądarki (Chrome na Androidzie, Bluefy na iOS).
*   **Standard PWA (Progressive Web App):** Możliwość zainstalowania aplikacji na ekranie głównym telefonu z dedykowaną ikoną, po czym uruchamia się ona w pełnym ekranie i działa offline.
*   **Wysoka Responsywność:** Specjalne tryby wyświetlania dla ekranów pionowych (portretowych) i poziomych (krajobrazowych) zapobiegają ucinaniu elementów interfejsu i ułatwiają sterowanie.

---

## Uruchamianie Lokalnie (na komputerze)

Aby uruchomić aplikację na komputerze i przetestować ją lokalnie:

1.  Upewnij się, że masz zainstalowanego Pythona.
2.  Otwórz terminal w katalogu projektu i wpisz:
    ```bash
    python server.py
    ```
3.  Przeglądarka automatycznie otworzy stronę pod adresem http://localhost:8080.
4.  Włącz Bluetooth w komputerze, włącz klocek WeDo 2.0 i kliknij ikonę Bluetooth w lewym górnym rogu aplikacji, aby sparować urządzenie.

---

## Uruchamianie na Telefonie (Wdrożenie HTTPS)

Technologia Web Bluetooth API ze względów bezpieczeństwa wymaga szyfrowanego połączenia HTTPS, aby działać na urządzeniach mobilnych. 

Darmowe wdrożenie na GitHub Pages zostało już skonfigurowane w tym repozytorium. Każdy git push na gałąź main automatycznie aktualizuje wersję online dostępną pod adresem:
https://darksilesia.github.io/wedo_port_kids/

### Instrukcja uruchomienia na telefonie:
*   Android: Otwórz link w przeglądarce Google Chrome. Z menu przeglądarki wybierz „Dodaj do ekranu głównego”. Aplikacja pojawi się na pulpicie telefonu i będzie uruchamiać się w trybie pełnoekranowym bez paska przeglądarki.
*   iOS (iPhone/iPad): Domyślne przeglądarki na iOS (Safari, Chrome, Edge) nie obsługują Web Bluetooth. Pobierz darmową aplikację Bluefy - Web Bluetooth Browser z App Store, otwórz w niej powyższy link HTTPS i korzystaj z kontrolera.

Wskazówka dotycząca testowania lokalnego przez Wi-Fi (bez GitHuba):
Jeśli chcesz przetestować lokalny serwer uruchomiony na komputerze na telefonie przez Wi-Fi, musisz zezwolić w Chrome na telefonie na niezabezpieczone pochodzenie.
1. Otwórz w Chrome na telefonie adres: chrome://flags
2. Wyszukaj flagę: unsafely-treat-insecure-origin-as-secure
3. Włącz ją (Enabled) i wklej adres komputera, np.: http://192.168.1.XXX:8080
4. Zrestartuj przeglądarkę przyciskiem Relaunch.

---

## Informacje Techniczne (Protokół BLE WeDo 2.0)

Aplikacja komunikuje się bezpośrednio z usługami GATT klocka SmartHub za pomocą następujących identyfikatorów UUID:

*   Usługa Kontrolna (Service UUID): 00004f0e-1212-efde-1523-785feabcd123
*   Charakterystyka Zapisu (Characteristic UUID): 00001565-1212-efde-1523-785feabcd123
*   Wysyłane pakiety bajtów (Write Payload):
    *   Silnik Port 1 (Lewy): [0x01, 0x01, 0x01, <predkosc>]
    *   Silnik Port 2 (Prawy): [0x02, 0x01, 0x01, <predkosc>]
    *   Uwaga: Prędkość w prawo przyjmuje wartości 0 - 100, natomiast w lewo obliczana jest w systemie uzupełnień do 256 (256 - prędkość).
    *   Zatrzymanie Silnika (Port 1): [0x01, 0x01, 0x01, 0x00]
    *   Zatrzymanie Silnika (Port 2): [0x02, 0x01, 0x01, 0x00]
    *   Kolor diody LED (Port 6): [0x06, 0x04, 0x01, <color_byte>]
