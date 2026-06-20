// --- Konfiguracja UUID dla WeDo 2.0 ---
const WEDO_SERVICE_UUID = '00004f0e-1212-efde-1523-785feabcd123';
const WEDO_CHAR_UUID = '00001565-1212-efde-1523-785feabcd123';
const BATTERY_SERVICE_UUID = '0000180f-0000-1000-8000-00805f9b34fb';
const BATTERY_CHAR_UUID = '00002a19-0000-1000-8000-00805f9b34fb';

// --- Stan Aplikacji ---
let state = {
    device: null,
    controlCharacteristic: null,
    isConnected: false,
    program: [], // lista klocków w programie
    isRunning: false,
    currentStepIndex: -1,
    activeBlockIdToEdit: null,
    loopCount: 0
};

// --- Kolory LED (Mapowanie bajtów WeDo 2.0) ---
const LED_COLORS = {
    pink: { byte: 0x01, hex: '#ff007f' },
    purple: { byte: 0x02, hex: '#8b5cf6' },
    blue: { byte: 0x03, hex: '#3b82f6' },
    cyan: { byte: 0x04, hex: '#06b6d4' },
    green: { byte: 0x06, hex: '#10b981' },
    yellow: { byte: 0x07, hex: '#fbbf24' },
    orange: { byte: 0x08, hex: '#f97316' },
    red: { byte: 0x09, hex: '#ef4444' }
};

// --- Dźwięki (Web Audio API) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let noiseBuffer = null;

// Mapowanie nazw klocków na pliki MP3 dodane przez użytkownika
const SOUND_FILES = {
    cat: 'stu9-cute-cat-352656.mp3',
    dog: 'dragon-studio-free-dog-bark-419014.mp3',
    bird: 'dragon-studio-crow-calls-raspy-echoing-472377.mp3',
    robot: 'freesound_community-little-robot-sound-84657.mp3',
    alarm: 'dragon-studio-police-siren-397963.mp3'
};

// Pamięć podręczna na zdekodowane pliki audio
const soundBuffers = {
    cat: null,
    dog: null,
    bird: null,
    robot: null,
    alarm: null
};

// Pomocniczy bufor szumu dla syntetycznego generatora (fallback)
function getNoiseBuffer() {
    if (!noiseBuffer) {
        const bufferSize = audioCtx.sampleRate * 0.4; // 0.4 sekundy szumu
        noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
    }
    return noiseBuffer;
}

// Funkcja wczytywania i dekodowania pliku MP3
async function loadSoundFile(type) {
    if (soundBuffers[type]) return soundBuffers[type];
    try {
        const response = await fetch(SOUND_FILES[type]);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        
        // Dekodowanie z uwzględnieniem starszych silników iOS Safari
        const audioBuffer = await new Promise((resolve, reject) => {
            audioCtx.decodeAudioData(arrayBuffer, resolve, reject);
        });
        soundBuffers[type] = audioBuffer;
        return audioBuffer;
    } catch (e) {
        console.warn(`Błąd ładowania MP3 dla ${type} (używam syntezatora):`, e);
        return null;
    }
}

// Wstępne pobranie wszystkich plików audio w tle, aby zapobiec opóźnieniom u dzieci
function preloadAllSounds() {
    Object.keys(SOUND_FILES).forEach(type => {
        loadSoundFile(type);
    });
}

async function playSynthesizedSound(type) {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    const now = audioCtx.currentTime;
    
    // Spróbuj pobrać wczytany bufor MP3
    let buffer = soundBuffers[type];
    if (!buffer) {
        buffer = await loadSoundFile(type);
    }
    
    if (buffer) {
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        
        const gainNode = audioCtx.createGain();
        // Zmniejszamy głośność (0.4), aby chronić słuch dziecka i głośnik telefonu
        gainNode.gain.setValueAtTime(0.4, now);
        
        source.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        // Zabezpieczenie przed zbyt długimi dźwiękami: puszczamy maksymalnie kilka sekund
        let duration = buffer.duration;
        if (type === 'alarm') {
            duration = Math.min(duration, 3.5); // Ograniczamy głośną syrenę policyjną do 3.5s
        } else if (type === 'robot') {
            duration = Math.min(duration, 2.2); // Limit dźwięku robota do 2.2s
        } else if (type === 'bird') {
            duration = Math.min(duration, 2.0); // Limit krakania do 2.0s
        } else if (type === 'dog') {
            duration = Math.min(duration, 1.5); // Limit szczekania do 1.5s
        }
        
        source.start(now);
        source.stop(now + duration);
    } else {
        // Fallback: jeśli MP3 nie jest dostępne (np. offline bez keszu), odpalamy syntezator matematyczny
        playFallbackSound(type, now);
    }
}

// Syntezator matematyczny jako niezawodne koło ratunkowe
function playFallbackSound(type, now) {
    switch (type) {
        case 'cat': {
            const osc1 = audioCtx.createOscillator();
            const osc2 = audioCtx.createOscillator();
            const filter = audioCtx.createBiquadFilter();
            const gain = audioCtx.createGain();
            
            osc1.type = 'triangle';
            osc2.type = 'sawtooth';
            
            const osc2Gain = audioCtx.createGain();
            osc2Gain.gain.value = 0.15;
            
            osc2.connect(osc2Gain);
            osc1.connect(filter);
            osc2Gain.connect(filter);
            filter.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc1.frequency.setValueAtTime(320, now);
            osc1.frequency.exponentialRampToValueAtTime(480, now + 0.15);
            osc1.frequency.exponentialRampToValueAtTime(300, now + 0.55);
            
            osc2.frequency.setValueAtTime(322, now);
            osc2.frequency.exponentialRampToValueAtTime(482, now + 0.15);
            osc2.frequency.exponentialRampToValueAtTime(302, now + 0.55);

            filter.type = 'bandpass';
            filter.Q.value = 3.0;
            filter.frequency.setValueAtTime(500, now);
            filter.frequency.exponentialRampToValueAtTime(1200, now + 0.18);
            filter.frequency.exponentialRampToValueAtTime(450, now + 0.55);
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.25, now + 0.08);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.55);
            
            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + 0.6);
            osc2.stop(now + 0.6);
            break;
        }
        case 'dog': {
            const osc = audioCtx.createOscillator();
            const oscGain = audioCtx.createGain();
            const noise = audioCtx.createBufferSource();
            const noiseGain = audioCtx.createGain();
            const filter = audioCtx.createBiquadFilter();
            const masterGain = audioCtx.createGain();
            
            noise.buffer = getNoiseBuffer();
            osc.type = 'sawtooth';
            
            noise.connect(noiseGain);
            noiseGain.connect(filter);
            osc.connect(oscGain);
            oscGain.connect(filter);
            filter.connect(masterGain);
            masterGain.connect(audioCtx.destination);
            
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(380, now);
            filter.frequency.exponentialRampToValueAtTime(180, now + 0.14);
            filter.Q.value = 2.5;
            
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(70, now + 0.14);
            
            oscGain.gain.setValueAtTime(0.25, now);
            noiseGain.gain.setValueAtTime(0.55, now);
            
            masterGain.gain.setValueAtTime(0, now);
            masterGain.gain.linearRampToValueAtTime(0.35, now + 0.01);
            masterGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            
            noise.start(now);
            osc.start(now);
            noise.stop(now + 0.16);
            osc.stop(now + 0.16);
            break;
        }
        case 'bird': {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            osc.type = 'sine';
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.frequency.setValueAtTime(1800, now);
            osc.frequency.exponentialRampToValueAtTime(3200, now + 0.04);
            osc.frequency.exponentialRampToValueAtTime(1400, now + 0.08);
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
            
            osc.frequency.setValueAtTime(2000, now + 0.11);
            osc.frequency.exponentialRampToValueAtTime(3600, now + 0.15);
            osc.frequency.exponentialRampToValueAtTime(1600, now + 0.19);
            
            gain.gain.setValueAtTime(0, now + 0.11);
            gain.gain.linearRampToValueAtTime(0.18, now + 0.13);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.19);
            
            osc.start(now);
            osc.stop(now + 0.21);
            break;
        }
        case 'robot': {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.type = 'square';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.setValueAtTime(600, now + 0.1);
            osc.frequency.setValueAtTime(1000, now + 0.2);
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
            gain.gain.setValueAtTime(0.15, now + 0.1);
            gain.gain.setValueAtTime(0.15, now + 0.2);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            
            osc.start(now);
            osc.stop(now + 0.3);
            break;
        }
        case 'alarm': {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.type = 'sine';
            
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.linearRampToValueAtTime(900, now + 0.25);
            osc.frequency.linearRampToValueAtTime(600, now + 0.5);
            osc.frequency.linearRampToValueAtTime(900, now + 0.75);
            osc.frequency.linearRampToValueAtTime(600, now + 1.0);
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.25, now + 0.05);
            gain.gain.setValueAtTime(0.25, now + 0.9);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
            
            osc.start(now);
            osc.stop(now + 1.0);
            break;
        }
    }
}

// --- Kontrola Połączenia Bluetooth ---
async function connectToWeDo() {
    const btnBt = document.getElementById('btn-bluetooth');
    const statusText = document.getElementById('bt-status-text');
    
    // Sprawdź kompatybilność przeglądarki z Web Bluetooth
    if (!navigator.bluetooth) {
        closeAllModals();
        document.getElementById('modal-no-bluetooth').classList.remove('hidden');
        return;
    }
    
    try {
        if (statusText) statusText.innerText = "Skanowanie...";
        btnBt.className = "btn-header bt-connecting";
        
        state.device = await navigator.bluetooth.requestDevice({
            filters: [
                { namePrefix: 'LPF2 Smart Hub' },
                { namePrefix: 'WeDo' }
            ],
            optionalServices: [WEDO_SERVICE_UUID, BATTERY_SERVICE_UUID]
        });
        
        state.device.addEventListener('gattserverdisconnected', onDisconnected);
        
        if (statusText) statusText.innerText = "Łączenie...";
        const server = await state.device.gatt.connect();
        
        // Pobierz główny serwis kontroli
        const service = await server.getPrimaryService(WEDO_SERVICE_UUID);
        state.controlCharacteristic = await service.getCharacteristic(WEDO_CHAR_UUID);
        
        state.isConnected = true;
        btnBt.className = "btn-header bt-connected";
        if (statusText) statusText.innerText = "Połączono!";
        
        // Pobierz status baterii (opcjonalnie)
        try {
            const batteryService = await server.getPrimaryService(BATTERY_SERVICE_UUID);
            const batteryChar = await batteryService.getCharacteristic(BATTERY_CHAR_UUID);
            const batteryVal = await batteryChar.readValue();
            const batteryPercentage = batteryVal.getUint8(0);
            
            const batteryInd = document.getElementById('battery-indicator');
            const batteryLevel = document.getElementById('battery-level');
            batteryLevel.innerText = `${batteryPercentage}%`;
            batteryInd.classList.remove('hidden');
        } catch (e) {
            console.log("Serwis baterii nie jest obsługiwany:", e);
        }
        
        // Powitanie świetlne klocka - na zielono
        sendLedColorCommand(LED_COLORS.green.byte);
        playSynthesizedSound('robot');
        
    } catch (error) {
        console.error("Błąd połączenia Bluetooth:", error);
        onDisconnected();
    }
}

function onDisconnected() {
    state.device = null;
    state.controlCharacteristic = null;
    state.isConnected = false;
    
    const btnBt = document.getElementById('btn-bluetooth');
    const statusText = document.getElementById('bt-status-text');
    const batteryInd = document.getElementById('battery-indicator');
    
    btnBt.className = "btn-header bt-disconnected";
    if (statusText) statusText.innerText = "Połącz klocki";
    batteryInd.classList.add('hidden');
    
    if (state.isRunning) {
        stopProgram();
    }
}

// --- Wysyłanie bajtów do SmartHuba ---
async function writeCommandBytes(bytes) {
    if (!state.isConnected || !state.controlCharacteristic) return;
    try {
        const data = new Uint8Array(bytes);
        await state.controlCharacteristic.writeValue(data);
    } catch (e) {
        console.error("Błąd zapisu komendy BLE:", e);
    }
}

// Komenda LED: [Port=0x06, Opcode=0x04, Mode=0x01, ColorIndex]
function sendLedColorCommand(colorByte) {
    writeCommandBytes([0x06, 0x04, 0x01, colorByte]);
}

// Komenda Silnika: [Port, Opcode=0x01, Mode=0x01, Speed]
// Obsługuje wybór pojedynczego portu (1 lub 2) lub obu (both) w celu skręcania
function sendMotorCommand(speed, port = 'both') {
    if (port === '1' || port === 'both') {
        writeCommandBytes([0x01, 0x01, 0x01, speed]);
    }
    if (port === '2' || port === 'both') {
        const delay = (port === 'both') ? 20 : 0;
        if (delay > 0) {
            setTimeout(() => {
                writeCommandBytes([0x02, 0x01, 0x01, speed]);
            }, delay);
        } else {
            writeCommandBytes([0x02, 0x01, 0x01, speed]);
        }
    }
}

function sendMotorStopCommand(port = 'both') {
    if (port === '1' || port === 'both') {
        writeCommandBytes([0x01, 0x01, 0x01, 0x00]);
    }
    if (port === '2' || port === 'both') {
        const delay = (port === 'both') ? 20 : 0;
        if (delay > 0) {
            setTimeout(() => {
                writeCommandBytes([0x02, 0x01, 0x01, 0x00]);
            }, delay);
        } else {
            writeCommandBytes([0x02, 0x01, 0x01, 0x00]);
        }
    }
}

// --- Zarządzanie Osią Czasu (Oś programu) ---
function renderTimeline() {
    const timeline = document.getElementById('program-timeline');
    
    // Usuń stare klocki oprócz początkowego anchor
    const blocks = timeline.querySelectorAll('.timeline-block:not(.start-block)');
    blocks.forEach(b => b.remove());
    
    state.program.forEach((block, index) => {
        const blockEl = document.createElement('div');
        blockEl.className = `timeline-block ${block.type}-block`;
        blockEl.dataset.id = block.id;
        
        let innerHTML = '';
        let bgColor = '';
        
        // Dodaj przycisk usuwania klocka
        innerHTML += `<div class="block-delete" onclick="event.stopPropagation(); deleteBlock('${block.id}')">✕</div>`;
        
        // W zależności od typu wygeneruj ikonę i opis parametru
        if (block.type === 'motor') {
            const speedEmoji = block.speed === 'turtle' ? '🐢' : (block.speed === 'rabbit' ? '🐇' : '🐆');
            bgColor = block.dir === 'right' ? 'var(--color-motor-right)' : 'var(--color-motor-left)';
            
            const arrowSvg = block.dir === 'right'
                ? `<svg viewBox="0 0 24 24" width="36" height="36"><path d="M5,12 L19,12 M13,6 L19,12 L13,18" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`
                : `<svg viewBox="0 0 24 24" width="36" height="36"><path d="M19,12 L5,12 M11,6 L5,12 L11,18" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;
            
            const portDots = block.port === '1'
                ? '<div class="port-dot active-left"></div><div class="port-dot"></div>'
                : (block.port === '2'
                    ? '<div class="port-dot"></div><div class="port-dot active-right"></div>'
                    : '<div class="port-dot active-left"></div><div class="port-dot active-right"></div>');

            innerHTML += `
                <div class="port-dots-container">${portDots}</div>
                <div class="block-icon">
                    ${arrowSvg}
                </div>
                <div class="block-param-icon">${speedEmoji}</div>
            `;
        } else if (block.type === 'motor-stop') {
            bgColor = 'var(--color-stop)';
            
            const portDots = block.port === '1'
                ? '<div class="port-dot active-left"></div><div class="port-dot"></div>'
                : (block.port === '2'
                    ? '<div class="port-dot"></div><div class="port-dot active-right"></div>'
                    : '<div class="port-dot active-left"></div><div class="port-dot active-right"></div>');

            innerHTML += `
                <div class="port-dots-container">${portDots}</div>
                <div class="block-icon">
                    <svg viewBox="0 0 24 24" width="36" height="36">
                        <polygon points="8,2 16,2 22,8 22,16 16,22 8,22 2,16 2,8" fill="#ffffff"/>
                    </svg>
                </div>
            `;
        } else if (block.type === 'led') {
            bgColor = 'var(--color-led)';
            const colorHex = LED_COLORS[block.color].hex;
            innerHTML += `
                <div class="block-icon">
                    <svg viewBox="0 0 24 24" width="36" height="36">
                        <path d="M12,2A7,7 0 0,0 5,9C5,12.63 7.39,15.7 10.76,16.5V19H13.24V16.5C16.61,15.7 19,12.63 19,9A7,7 0 0,0 12,2" fill="${colorHex}"/>
                    </svg>
                </div>
            `;
        } else if (block.type === 'wait') {
            bgColor = 'var(--color-wait)';
            innerHTML += `
                <div class="block-icon">
                    <svg viewBox="0 0 24 24" width="34" height="34">
                        <path d="M6 2H18V8H18V8L14 12L18 16V16H18V22H6V16H6V16L10 12L6 8V8H6V2M8 4V7.5L12 11.5L16 7.5V4H8" fill="#ffffff"/>
                    </svg>
                </div>
                <div class="block-param-icon" style="color: #ffffff; font-weight: bold; font-size: 13px;">${block.duration}</div>
            `;
        } else if (block.type === 'sound') {
            bgColor = 'var(--color-sound)';
            let emoji = '🐱';
            if (block.sound === 'dog') emoji = '🐶';
            else if (block.sound === 'bird') emoji = '🐦';
            else if (block.sound === 'robot') emoji = '🤖';
            else if (block.sound === 'alarm') emoji = '🚨';
            
            innerHTML += `
                <div class="block-icon">
                    <svg viewBox="0 0 24 24" width="34" height="34">
                        <path d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.85 14,18.71V20.77C18,19.86 21,16.28 21,12 M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16 M3,9V15H7L12,20V4L7,9H3Z" fill="#ffffff"/>
                    </svg>
                </div>
                <div class="block-param-icon">${emoji}</div>
            `;
        } else if (block.type === 'loop') {
            bgColor = 'var(--color-loop)';
            innerHTML += `
                <div class="block-icon">
                    <svg viewBox="0 0 24 24" width="34" height="34">
                        <path d="M19,8l-4,4h3c0,3.31-2.69,6-6,6c-1.01,0-1.97-0.25-2.8-0.7l-1.46,1.46C8.97,19.54,10.43,20,12,20c4.42,0,8-3.58,8-8h3L19,8z M6,12 c0-3.31,2.69-6,6-6c1.01,0,1.97,0.25,2.8,0.7l1.46-1.46C15.03,4.46,13.57,4,12,4c-4.42,0-8,3.58-8,8H1L5,16l4-4H6z" fill="#ffffff"/>
                    </svg>
                </div>
            `;
        }
        
        blockEl.innerHTML = innerHTML;
        blockEl.style.backgroundColor = bgColor;
        
        // Po dotknięciu bloku otwórz odpowiedni modal konfiguracji
        blockEl.addEventListener('click', () => {
            openBlockConfigModal(block.id);
        });
        
        timeline.appendChild(blockEl);
    });
}

function addBlock(type, defaults = {}) {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    let newBlock = { id, type };
    
    if (type === 'motor') {
        newBlock.dir = defaults.dir || 'right';
        newBlock.speed = defaults.speed || 'rabbit';
        newBlock.port = defaults.port || 'both';
    } else if (type === 'motor-stop') {
        newBlock.port = defaults.port || 'both';
    } else if (type === 'led') {
        newBlock.color = defaults.color || 'blue';
    } else if (type === 'wait') {
        newBlock.duration = defaults.duration || 1;
    } else if (type === 'sound') {
        newBlock.sound = defaults.sound || 'cat';
    }
    
    state.program.push(newBlock);
    renderTimeline();
    
    // Przewiń oś czasu w prawo do nowo dodanego bloku
    const timelineContainer = document.querySelector('.program-area');
    setTimeout(() => {
        timelineContainer.scrollTo({
            left: timelineContainer.scrollWidth,
            behavior: 'smooth'
        });
    }, 100);
}

function deleteBlock(id) {
    state.program = state.program.filter(b => b.id !== id);
    renderTimeline();
}

function clearAllBlocks() {
    state.program = [];
    renderTimeline();
}

// --- Obsługa Modali (Konfiguracja bloczków) ---
function openBlockConfigModal(id) {
    const block = state.program.find(b => b.id === id);
    if (!block) return;
    
    // Zamknij wszystkie najpierw
    closeAllModals();
    
    state.activeBlockIdToEdit = id;
    
    if (block.type === 'motor') {
        const modal = document.getElementById('modal-motor');
        modal.classList.remove('hidden');
        
        // Zaznacz aktualny kierunek
        document.querySelectorAll('.dir-btn').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.dir === block.dir);
        });
        
        // Zaznacz aktualną prędkość
        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.speed === block.speed);
        });
        
        // Zaznacz aktualny port
        document.querySelectorAll('.port-btn').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.port === block.port);
        });
    } else if (block.type === 'motor-stop') {
        const modal = document.getElementById('modal-motor-stop');
        modal.classList.remove('hidden');
        
        // Zaznacz aktualny port stopu
        document.querySelectorAll('.stop-port-btn').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.port === block.port);
        });
    } else if (block.type === 'led') {
        const modal = document.getElementById('modal-led');
        modal.classList.remove('hidden');
        
        // Zaznacz aktualny kolor
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.colorVal === block.color);
        });
    } else if (block.type === 'wait') {
        const modal = document.getElementById('modal-wait');
        modal.classList.remove('hidden');
        
        // Zaznacz aktualny czas czekania
        document.querySelectorAll('.dur-btn').forEach(btn => {
            btn.classList.toggle('selected', parseInt(btn.dataset.dur) === block.duration);
        });
    } else if (block.type === 'sound') {
        const modal = document.getElementById('modal-sound');
        modal.classList.remove('hidden');
        
        // Zaznacz aktualny dźwięk
        document.querySelectorAll('.sound-select-btn').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.soundVal === block.sound);
        });
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
    state.activeBlockIdToEdit = null;
}

// Zapisywanie ustawień w modalach
function initModalListeners() {
    // Zamykanie modali przyciskiem OK
    document.getElementById('btn-close-motor').addEventListener('click', closeAllModals);
    document.getElementById('btn-close-motor-stop').addEventListener('click', closeAllModals);
    document.getElementById('btn-close-led').addEventListener('click', closeAllModals);
    document.getElementById('btn-close-wait').addEventListener('click', closeAllModals);
    document.getElementById('btn-close-sound').addEventListener('click', closeAllModals);
    document.getElementById('btn-close-help').addEventListener('click', closeAllModals);
    document.getElementById('btn-close-no-bluetooth').addEventListener('click', closeAllModals);
    
    // Modal Silnika - Kierunek
    document.querySelectorAll('.dir-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const block = state.program.find(b => b.id === state.activeBlockIdToEdit);
            if (block) {
                block.dir = btn.dataset.dir;
                document.querySelectorAll('.dir-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                renderTimeline();
            }
        });
    });
    
    // Modal Silnika - Prędkość
    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const block = state.program.find(b => b.id === state.activeBlockIdToEdit);
            if (block) {
                block.speed = btn.dataset.speed;
                document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                renderTimeline();
            }
        });
    });

    // Modal Silnika - Port
    document.querySelectorAll('.port-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const block = state.program.find(b => b.id === state.activeBlockIdToEdit);
            if (block) {
                block.port = btn.dataset.port;
                document.querySelectorAll('.port-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                renderTimeline();
            }
        });
    });

    // Modal Stop Silnika - Port
    document.querySelectorAll('.stop-port-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const block = state.program.find(b => b.id === state.activeBlockIdToEdit);
            if (block) {
                block.port = btn.dataset.port;
                document.querySelectorAll('.stop-port-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                renderTimeline();
            }
        });
    });
    
    // Modal LED - Kolor
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const block = state.program.find(b => b.id === state.activeBlockIdToEdit);
            if (block) {
                block.color = btn.dataset.colorVal;
                document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                renderTimeline();
                
                // Zrób krótki podgląd koloru na klocku, jeśli jest podłączony
                if (state.isConnected) {
                    sendLedColorCommand(LED_COLORS[block.color].byte);
                }
            }
        });
    });
    
    // Modal Czekania - Czas
    document.querySelectorAll('.dur-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const block = state.program.find(b => b.id === state.activeBlockIdToEdit);
            if (block) {
                block.duration = parseInt(btn.dataset.dur);
                document.querySelectorAll('.dur-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                renderTimeline();
            }
        });
    });
    
    // Modal Dźwięku - Typ
    document.querySelectorAll('.sound-select-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const block = state.program.find(b => b.id === state.activeBlockIdToEdit);
            if (block) {
                block.sound = btn.dataset.soundVal;
                document.querySelectorAll('.sound-select-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                renderTimeline();
                
                // Odtwórz dźwięk w celach podglądu
                playSynthesizedSound(block.sound);
            }
        });
    });
}

// --- Interpreter Programu (Uruchamianie Bloczków) ---
async function startProgram() {
    if (state.program.length === 0) return;
    if (state.isRunning) return;
    
    state.isRunning = true;
    state.currentStepIndex = -1;
    
    document.getElementById('btn-play').classList.add('hidden');
    document.getElementById('btn-stop').classList.remove('hidden');
    
    runNextStep();
}

async function stopProgram() {
    state.isRunning = false;
    state.currentStepIndex = -1;
    
    document.getElementById('btn-play').classList.remove('hidden');
    
    // Usuń podświetlenie klocków
    document.querySelectorAll('.timeline-block').forEach(b => {
        b.classList.remove('active-executing');
    });
    
    // Wyślij sygnał zatrzymania do SmartHuba
    if (state.isConnected) {
        sendMotorStopCommand();
        // Przywróć domyślny zielony kolor LED
        sendLedColorCommand(LED_COLORS.green.byte);
    }
}

async function runNextStep() {
    if (!state.isRunning) return;
    
    state.currentStepIndex++;
    
    // Sprawdź czy to koniec programu
    if (state.currentStepIndex >= state.program.length) {
        stopProgram();
        return;
    }
    
    const block = state.program[state.currentStepIndex];
    
    // Wizualnie zaznacz aktywny blok
    document.querySelectorAll('.timeline-block').forEach(b => {
        b.classList.remove('active-executing');
    });
    const blockEl = document.querySelector(`.timeline-block[data-id="${block.id}"]`);
    if (blockEl) {
        blockEl.classList.add('active-executing');
        // Przewiń do aktywnego bloku
        blockEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    
    // Wykonaj logikę bloku
    let delay = 0;
    
    try {
        switch (block.type) {
            case 'motor': {
                // Wylicz prędkość
                let speedVal = 0;
                if (block.speed === 'turtle') speedVal = 30;
                else if (block.speed === 'rabbit') speedVal = 60;
                else if (block.speed === 'cheetah') speedVal = 100;
                
                if (block.dir === 'left') {
                    // Dla lewego kierunku: ujemna prędkość w systemie uzupełnień do 256
                    speedVal = 256 - speedVal;
                }
                
                if (state.isConnected) {
                    sendMotorCommand(speedVal, block.port);
                }
                break;
            }
            case 'motor-stop': {
                if (state.isConnected) {
                    sendMotorStopCommand(block.port);
                }
                break;
            }
            case 'led': {
                if (state.isConnected) {
                    sendLedColorCommand(LED_COLORS[block.color].byte);
                }
                break;
            }
            case 'wait': {
                delay = block.duration * 1000;
                break;
            }
            case 'sound': {
                playSynthesizedSound(block.sound);
                // Dźwięki trwają około 300ms do 1s, dajmy mały automatyczny delay
                delay = block.sound === 'alarm' ? 1000 : 400;
                break;
            }
            case 'loop': {
                // Skocz na początek programu (reset indeksu do -1, tak by następny krok był 0)
                state.currentStepIndex = -1;
                delay = 50; // krótka przerwa, aby nie zawiesić pętli
                break;
            }
        }
    } catch (e) {
        console.error("Błąd podczas uruchamiania bloczka:", e);
    }
    
    // Jeśli nie ma sztywnego delaya (np. dla silnika, dźwięku, stopu), przejdź natychmiast dalej
    if (delay > 0) {
        setTimeout(runNextStep, delay);
    } else {
        setTimeout(runNextStep, 100); // minimalne opóźnienie między krokami
    }
}

// --- Inicjalizacja Aplikacji ---
document.addEventListener('DOMContentLoaded', () => {
    // Nasłuchiwanie połączenia Bluetooth
    document.getElementById('btn-bluetooth').addEventListener('click', connectToWeDo);
    
    // Obsługa kliknięcia przycisku pomocy (instrukcji)
    document.getElementById('btn-help').addEventListener('click', () => {
        closeAllModals();
        document.getElementById('modal-help').classList.remove('hidden');
    });
    
    // Odtwarzanie i zatrzymywanie
    document.getElementById('btn-play').addEventListener('click', startProgram);
    document.getElementById('btn-stop').addEventListener('click', stopProgram);
    document.getElementById('btn-clear').addEventListener('click', clearAllBlocks);
    
    // Obsługa dodawania klocków z palety
    document.querySelectorAll('.palette-item').forEach(item => {
        item.addEventListener('click', () => {
            const type = item.dataset.type;
            const defaults = {};
            
            if (type === 'motor') {
                defaults.dir = item.dataset.dir;
                defaults.speed = item.dataset.speed;
            } else if (type === 'led') {
                defaults.color = item.dataset.color;
            } else if (type === 'wait') {
                defaults.duration = parseInt(item.dataset.duration);
            } else if (type === 'sound') {
                defaults.sound = item.dataset.sound;
            }
            
            addBlock(type, defaults);
        });
    });
    
    // Inicjalizacja nasłuchu modali i zamknięcie przy kliknięciu tła
    initModalListeners();
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeAllModals();
            }
        });
    });
    
    // Wyrenderuj początkowy stan osi czasu (tylko klocek Start)
    renderTimeline();
    
    // Audio context initialization on first touch (Safari and mobile security requirement)
    const initAudio = () => {
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        document.removeEventListener('touchstart', initAudio);
        document.removeEventListener('click', initAudio);
    };
    document.addEventListener('touchstart', initAudio);
    document.addEventListener('click', initAudio);
    
    // Sprawdzenie kompatybilności przeglądarki na telefonie
    checkBrowserCompatibility();

    // Wstępne wczytanie wszystkich plików MP3 w tle
    preloadAllSounds();
});

// Sprawdzenie kompatybilności przeglądarki na telefonie komórkowym
function checkBrowserCompatibility() {
    const ua = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    if (isMobile) {
        const isIOS = /iPhone|iPad|iPod/i.test(ua);
        const isAndroid = /Android/i.test(ua);
        
        // Chrome na Androidzie (wykluczając Edge, Firefox, Operę na Androidzie)
        const isChrome = isAndroid && /Chrome/i.test(ua) && !/Edg/i.test(ua) && !/Firefox/i.test(ua) && !/OPR/i.test(ua);
        // Bluefy na iOS lub inna przeglądarka z wstrzykniętym Web Bluetooth
        const isBluefy = isIOS && (ua.includes('Bluefy') || !!navigator.bluetooth);
        
        if (!isChrome && !isBluefy) {
            setTimeout(() => {
                closeAllModals();
                document.getElementById('modal-no-bluetooth').classList.remove('hidden');
            }, 300);
        }
    }
}
