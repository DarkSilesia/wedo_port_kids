# 🤖 LEGO WeDo 2.0 – Graficzny Kontroler Web Bluetooth (PWA)

Projekt to nowoczesna, w pełni graficzna (obrazkowa) aplikacja webowa stworzona do programowania i sterowania zestawem **LEGO WeDo 2.0 SmartHub** bezpośrednio ze smartfona (lub komputera) za pomocą przeglądarki internetowej.

Aplikacja została zaprojektowana specjalnie z myślą o dzieciach w wieku przedszkolnym i wczesnoszkolnym, które nie potrafią jeszcze czytać – **interfejs nie zawiera żadnego tekstu**, a cała logika programowania opiera się na intuicyjnych ikonach, kolorach oraz emotkach.

---

## ✨ Główne Funkcje

*   **100% Graficzny UX:** Brak słów w całym panelu programowania oraz modali konfiguracyjnych.
*   **Intuicyjne Ikony Silnika:** Zamiast kół zębatych, kierunek obrotów silnika sygnalizowany jest grubymi strzałkami (`→` w prawo na zielonym tle, `←` w lewo na pomarańczowym tle).
*   **Dopasowane pod Smartfony (Landscape):** Układ zoptymalizowany dla małych ekranów w orientacji poziomej (spłaszczone okienka modalne, niski profil nagłówka i panelu sterowania).
*   **Prędkość jako Zwierzątka:** Dziecko wybiera prędkość silnika za pomocą powszechnie znanych symboli: żółwia (powoli 🐢), królika (średnio 🐇) oraz geparda (szybko 🐆).
*   **Wbudowane Dźwięki:** Odtwarzanie odgłosów zwierząt (kot 🐱, pies 🐶, ptak 🐦), syreny 🚨 lub dźwięków robota 🤖 bezpośrednio z głośnika telefonu (z użyciem systemowego *Web Audio API* – brak konieczności pobierania plików mp3).
*   **Standard PWA (Progressive Web App):** Możliwość zainstalowania aplikacji na ekranie głównym telefonu z dedykowaną ikoną robota, po czym uruchamia się ona w pełnym ekranie i działa offline.
*   **Uproszczona Kontrola:** Aplikacja automatycznie wysyła sygnały sterujące na oba porty SmartHuba (Port 1 i Port 2), eliminując potrzebę ręcznego przypisywania kabli.

---

## 📂 Struktura Plików

*   `index.html` – Struktura widoku aplikacji, w tym modale konfiguracyjne oraz ikony wektorowe (SVG).
*   `style.css` – Stylizacja w estetyce *dark glassmorphism*, efekty sprężynujących przycisków i responsywność pod ekrany mobilne.
*   `app.js` – Logika połączenia Web Bluetooth, silnik wykonujący sekwencje klocków, generator dźwięków i zarządca osi czasu.
*   `manifest.json` – Plik konfiguracyjny PWA (ikony, kolory tła, orientacja).
*   `icon.png` / `icon-512.png` – Ikona aplikacji na ekran główny telefonu.
*   `server.py` – Lekki serwer deweloperski w Pythonie.

---

## 💻 Uruchamianie Lokalnie (na komputerze)

Aby uruchomić aplikację na komputerze i przetestować ją lokalnie:

1.  Upewnij się, że masz zainstalowanego Pythona.
2.  Otwórz terminal w katalogu projektu i wpisz:
    ```bash
    python server.py
    ```
3.  Przeglądarka automatycznie otworzy stronę pod adresem **`http://localhost:8000`**.
4.  Włącz Bluetooth w komputerze, włącz klocek WeDo 2.0 i kliknij ikonę Bluetooth w lewym górnym rogu aplikacji, aby sparować urządzenie.

---

## 📱 Uruchamianie na Telefonie (Wdrożenie HTTPS)

Technologia **Web Bluetooth API** wymaga bezpiecznego połączenia **HTTPS**, aby działać na urządzeniach mobilnych. Najprostszym sposobem na uruchomienie aplikacji na smartfonie jest umieszczenie jej na darmowym hostingu:

### Wdrożenie na GitHub Pages (Zalecane)

1.  Zaloguj się na **[github.com](https://github.com)** i utwórz **publiczne** repozytorium (np. `wedo_port`).
2.  Połącz swój lokalny folder z nowo utworzonym repozytorium i wyślij pliki:
    ```bash
    git remote add origin https://github.com/<TWÓJ_LOGIN>/<NAZWA_REPOZYTORIUM>.git
    git push -u origin main
    ```
3.  W ustawieniach repozytorium na GitHubie wejdź w zakładkę **`Settings -> Pages`**.
4.  W sekcji *Build and deployment -> Branch* wybierz gałąź **`main`** (lub `master`) oraz katalog `/ (root)` i kliknij **`Save`**.
5.  Po minucie strona będzie gotowa pod adresem:
    `https://<TWÓJ_LOGIN>.github.io/<NAZWA_REPOZYTORIUM>/`

### Instalacja jako Aplikacja:
*   **Android:** Otwórz link w przeglądarce **Google Chrome**. Z menu przeglądarki wybierz **„Dodaj do ekranu głównego”** (lub kliknij baner instalacyjny). Aplikacja pojawi się na pulpicie telefonu i będzie uruchamiać się w trybie pełnoekranowym bez paska przeglądarki.
*   **iOS (iPhone):** Domyślna przeglądarka Safari nie wspiera technologii Web Bluetooth. Pobierz darmową aplikację **Bluefy** z App Store, otwórz w niej swój adres HTTPS i korzystaj z kontrolera.

---

## ⚙️ Informacje Techniczne (Protokół BLE WeDo 2.0)

Aplikacja komunikuje się bezpośrednio z usługami GATT klocka SmartHub za pomocą następujących identyfikatorów UUID:

*   **Usługa Kontrolna (Service UUID):** `00004f0e-1212-efde-1523-785feabcd123`
*   **Charakterystyka Zapisu (Characteristic UUID):** `00001565-1212-efde-1523-785feabcd123`
*   **Wysyłane pakiety bajtów (Write):**
    *   **Uruchomienie silnika (Port 1):** `[0x01, 0x01, 0x01, <predkosc>]`
    *   **Uruchomienie silnika (Port 2):** `[0x02, 0x01, 0x01, <predkosc>]`
    *   **Zatrzymanie silnika (Port 1):** `[0x01, 0x01, 0x01, 0x00]`
    *   **Kolor diody LED (Port 6):** `[0x06, 0x04, 0x01, <color_index>]`
