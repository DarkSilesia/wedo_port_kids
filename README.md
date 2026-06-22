# 🏎️🤖 LEGO WeDo 2.0 Motor Lab & Playground

Przyjazny dla dzieci (dostosowany nawet dla 5-latków), interaktywny panel sterowania i programowania dla zestawów **LEGO® WeDo 2.0** bezpośrednio z poziomu przeglądarki internetowej! 

Aplikacja komunikuje się bezpośrednio z LEGO Smart Hub za pomocą bezprzewodowego protokołu **Web Bluetooth API**, umożliwiając sterowanie silnikami, wbudowaną diodą LED oraz buzzerem dźwiękowym bez konieczności instalowania jakiegokolwiek oprogramowania.

---

## 🌟 Główne Funkcje

1. **Błyskawiczne Połączenie (Web Bluetooth)**
   - Wystarczy kliknąć przycisk 🔌, wybrać swój LEGO Hub i gotowe! Nie potrzebujesz kabli ani instalowania ciężkich aplikacji.
2. **Interaktywny Symulator Koła LEGO**
   - Wizualna symulacja obracającego się koła w czasie rzeczywistym. Prędkość i kierunek animacji dopasowują się do rzeczywistych obrotów podłączonego silnika.
3. **Sterowanie Ręczne (Hold-to-Run)**
   - Duże, wygodne przyciski dotykowe do chwilowego uruchamiania silnika (kręcenie w lewo ◀️ / w prawo ▶️) oraz duży przycisk hamowania awaryjnego (Stop 🛑).
4. **Wizualny Programator Sekwencji**
   - Układanka z klocków umożliwiająca dzieciom budowanie prostych algorytmów:
     - Ruch silnika w lewo/prawo na określony czas (1s lub 2s),
     - Zatrzymanie silnika,
     - Odtwarzanie dźwięków o niskim lub wysokim tonie,
     - Zmiana kolorów diody LED na hubie (czerwony, zielony, niebieski lub niesamowity efekt tęczy 🌈).
   - Opcja pętli (powtarzania programu w koło 🔁) oraz łatwe edytowanie i usuwanie pojedynczych klocków.
5. **Monitor Stanu Baterii**
   - Wskaźnik naładowania baterii huba w czasie rzeczywistym z dynamiczną zmianą kolorów ikony (zielona / pomarańczowa / czerwona).
6. **Przyjazna Ścieżka Dźwiękowa i UI**
   - Dynamiczne efekty dźwiękowe (chipy syntezatora Web Audio) reagujące na kliknięcia, sukces połączenia oraz błędy.
   - Design zaprojektowany z myślą o urządzeniach dotykowych (blokada gestów zoomu, duże marginesy klikalne).

---

## 🛠️ Stos Technologiczny

Aplikacja została zbudowana w duchu **Vanilla Web** – jest niesamowicie lekka, nie wymaga kompilacji ani pobierania paczek node:
* **HTML5**: Semantyczna struktura przyjazna dla SEO i ułatwień dostępu.
* **Vanilla CSS**: Nowoczesne style korzystające z CSS Variables, rozmycia teł (`backdrop-filter`), gradientów oraz płynnych animacji klatkowych (`@keyframes`).
* **Vanilla JavaScript (ES6)**: Cała logika oparta na natywnym kodzie przeglądarki, obsłudze interfejsów Web Bluetooth API i Web Audio API.
* **Czcionki**: Zintegrowane nowoczesne fonty z Google Fonts (`Quicksand` i `Outfit`).

---

## 🚀 Jak Uruchomić Lokalnie?

Ponieważ **Web Bluetooth API** ze względów bezpieczeństwa wymaga bezpiecznego kontekstu (**HTTPS** lub **localhost**), uruchomienie pliku bezpośrednio z dysku (jako `file://...`) zablokuje możliwość wyszukiwania urządzeń Bluetooth.

### Opcja A: Najprostsza (Python)
Jeśli masz zainstalowanego Pythona na komputerze, otwórz terminal w folderze projektu i wpisz:
```bash
python -m http.server 8000
```
Następnie otwórz przeglądarkę i wejdź na: **`http://localhost:8000`**

### Opcja B: VS Code Live Server
Jeśli używasz edytora Visual Studio Code, zainstaluj wtyczkę **Live Server**, a następnie kliknij przycisk **"Go Live"** w prawym dolnym rogu okna.

> [!IMPORTANT]
> **Kompatybilność przeglądarek**: Funkcja Web Bluetooth jest w pełni obsługiwana przez przeglądarki oparte na silniku Chromium, np. **Google Chrome**, **Microsoft Edge** oraz **Opera** (zarówno na komputerach, jak i na urządzeniach z systemem Android). Przeglądarki Firefox oraz Safari na ten moment nie wspierają w pełni tego standardu.

---

## 📐 Szczegóły Techniczne Protokołu BLE

Aplikacja nawiązuje połączenie z LEGO Hub (nazwa zaczynająca się od `LPF2`) i korzysta z następujących identyfikatorów UUID:

| Usługa / Charakterystyka | UUID | Opis |
| :--- | :--- | :--- |
| **DEVICE_SERVICE** | `00001523-1212-efde-1523-785feabcd123` | Usługa systemowa urządzeń LPF2 |
| **CHAR_ATTACHED** | `00001527-1212-efde-1523-785feabcd123` | Powiadomienia o podłączeniu/odłączeniu urządzeń do portów (np. silnika) |
| **IO_SERVICE** | `00004f0e-1212-efde-1523-785feabcd123` | Usługa wejścia/wyjścia (sterowanie silnikiem i LED) |
| **CHAR_OUTPUT** | `00001565-1212-efde-1523-785feabcd123` | Zapisywanie komend ruchu i koloru diody |
| **BATTERY_SERVICE** | `0000180f-0000-1000-8000-00805f9b34fb` | Standardowa usługa odczytu baterii |
| **CHAR_BATTERY** | `00002a19-0000-1000-8000-00805f9b34fb` | Odczyt procentowego poziomu baterii |

### Formaty pakietów wysyłanych do `CHAR_OUTPUT`:

* **Sterowanie Silnikiem (Porty 1 oraz 2)**
  ```javascript
  // [Port, TypKomendy, Podtyp, Prędkość]
  new Uint8Array([portId, 0x01, 0x01, speedByte])
  ```
  * `speedByte`: `127` (aktywny hamulec), `0` (luz), od `1` do `100` (ruch w prawo), od `255` do `156` (ruch w lewo).

* **Zmiana Koloru Diody LED (Hub)**
  ```javascript
  // [Port LED, TypKomendy, Podtyp, IndeksKoloru]
  new Uint8Array([0x06, 0x04, 0x01, colorIdx])
  ```

---

## 🎨 Struktura Projektu

* [index.html](file:///e:/ProgramyPython/PROJEKTY/wedo_port/index.html) - Główny szkielet aplikacji zawierający interfejs HUD, kontrolki koła, bibliotekę klocków oraz oś czasu programu.
* [index.css](file:///e:/ProgramyPython/PROJEKTY/wedo_port/index.css) - Plik stylów odpowiadający za radosny, nowoczesny wygląd szklanych kart (glassmorphism) i animacje obracania.
* [index.js](file:///e:/ProgramyPython/PROJEKTY/wedo_port/index.js) - Logika sterowania Bluetooth, obsługa kolejki bloków sekwencyjnych oraz synteza dźwięków audio.

---
*Projekt przygotowany do zabawy i nauki podstaw programowania dla najmłodszych!* 🤖🏎️💨
