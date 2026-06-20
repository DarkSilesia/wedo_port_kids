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

function playSynthesizedSound(type) {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    const now = audioCtx.currentTime;
    
    switch (type) {
        case 'cat': { // meow
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
            osc.frequency.exponentialRampToValueAtTime(600, now + 0.4);
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
            
            osc.start(now);
            osc.stop(now + 0.4);
            break;
        }
        case 'dog': { // bark
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(120, now);
            osc.frequency.exponentialRampToValueAtTime(250, now + 0.05);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.4, now + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            
            osc.start(now);
            osc.stop(now + 0.2);
            break;
        }
        case 'bird': { // chirp
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1500, now);
            osc.frequency.exponentialRampToValueAtTime(3000, now + 0.08);
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
            
            osc.start(now);
            osc.stop(now + 0.08);
            break;
        }
        case 'robot': { // bleep bloop
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
        case 'alarm': { // siren
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.type = 'sine';
            
            // LFO do syreny
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
    
    try {
        statusText.innerText = "Skanowanie...";
        btnBt.className = "btn-header bt-connecting";
        
        state.device = await navigator.bluetooth.requestDevice({
            filters: [
                { namePrefix: 'LPF2 Smart Hub' },
                { namePrefix: 'WeDo' }
            ],
            optionalServices: [WEDO_SERVICE_UUID, BATTERY_SERVICE_UUID]
        });
        
        state.device.addEventListener('gattserverdisconnected', onDisconnected);
        
        statusText.innerText = "Łączenie...";
        const server = await state.device.gatt.connect();
        
        // Pobierz główny serwis kontroli
        const service = await server.getPrimaryService(WEDO_SERVICE_UUID);
        state.controlCharacteristic = await service.getCharacteristic(WEDO_CHAR_UUID);
        
        state.isConnected = true;
        btnBt.className = "btn-header bt-connected";
        statusText.innerText = "Połączono!";
        
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
    statusText.innerText = "Połącz klocki";
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
// Aby ułatwić dziecku sterowanie, wysyłamy komendę do obu fizycznych portów (1 i 2)
function sendMotorCommand(speed) {
    // Port 1
    writeCommandBytes([0x01, 0x01, 0x01, speed]);
    // Port 2
    setTimeout(() => {
        writeCommandBytes([0x02, 0x01, 0x01, speed]);
    }, 20);
}

function sendMotorStopCommand() {
    writeCommandBytes([0x01, 0x01, 0x01, 0x00]);
    setTimeout(() => {
        writeCommandBytes([0x02, 0x01, 0x01, 0x00]);
    }, 20);
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
            const arrowDir = block.dir === 'right' ? '➡️' : '⬅️';
            const speedEmoji = block.speed === 'turtle' ? '🐢' : (block.speed === 'rabbit' ? '🐇' : '🐆');
            bgColor = block.dir === 'right' ? 'var(--color-motor-right)' : 'var(--color-motor-left)';
            
            const arrowPath = block.dir === 'right' 
                ? 'M12,2 A10,10 0 0,1 22,12' 
                : 'M12,2 A10,10 0 0,0 2,12';
            const headPath = block.dir === 'right' 
                ? 'M22,9 L22,14 L17,13 Z' 
                : 'M2,9 L2,14 L7,13 Z';
            
            innerHTML += `
                <div class="block-icon">
                    <svg viewBox="0 0 24 24" width="36" height="36">
                        <circle cx="12" cy="12" r="3" fill="#ffffff"/>
                        <circle cx="12" cy="12" r="6" fill="none" stroke="#ffffff" stroke-width="2"/>
                        <line x1="12" y1="2" x2="12" y2="6" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
                        <line x1="12" y1="18" x2="12" y2="22" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
                        <line x1="2" y1="12" x2="6" y2="12" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
                        <line x1="18" y1="12" x2="22" y2="12" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
                        <path d="${arrowPath}" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
                        <path d="${headPath}" fill="#ffffff"/>
                    </svg>
                </div>
                <div class="block-param">${arrowDir} ${speedEmoji}</div>
            `;
        } else if (block.type === 'motor-stop') {
            bgColor = 'var(--color-stop)';
            innerHTML += `
                <div class="block-icon">
                    <svg viewBox="0 0 24 24" width="36" height="36">
                        <polygon points="8,2 16,2 22,8 22,16 16,22 8,22 2,16 2,8" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
                        <path d="M12,6 A2,2 0 0,1 14,8 L14,11 A1,1 0 0,1 15,12 A1,1 0 0,1 16,13 L16,15 A4,4 0 0,1 12,19 L12,19 A4,4 0 0,1 8,15 L8,10 A2,2 0 0,1 10,8 A2,2 0 0,1 12,6 Z" fill="#ffffff"/>
                    </svg>
                </div>
                <div class="block-param">🛑</div>
            `;
        } else if (block.type === 'led') {
            bgColor = 'var(--color-led)';
            const colorHex = LED_COLORS[block.color].hex;
            innerHTML += `
                <div class="block-icon">
                    <svg viewBox="0 0 24 24" width="36" height="36">
                        <path d="M12,2A7,7 0 0,0 5,9C5,12.63 7.39,15.7 10.76,16.5V19H13.24V16.5C16.61,15.7 19,12.63 19,9A7,7 0 0,0 12,2" fill="#ffffff"/>
                    </svg>
                </div>
                <div class="block-param" style="border: 2px solid ${colorHex}; background: rgba(0,0,0,0.5);">💡</div>
            `;
        } else if (block.type === 'wait') {
            bgColor = 'var(--color-wait)';
            innerHTML += `
                <div class="block-icon">
                    <svg viewBox="0 0 24 24" width="36" height="36">
                        <path d="M6 2H18V8H18V8L14 12L18 16V16H18V22H6V16H6V16L10 12L6 8V8H6V2M8 4V7.5L12 11.5L16 7.5V4H8" fill="#ffffff"/>
                    </svg>
                </div>
                <div class="block-param">${block.duration}s</div>
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
                    <svg viewBox="0 0 24 24" width="36" height="36">
                        <path d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.85 14,18.71V20.77C18,19.86 21,16.28 21,12" fill="#ffffff"/>
                    </svg>
                </div>
                <div class="block-param">${emoji}</div>
            `;
        } else if (block.type === 'loop') {
            bgColor = 'var(--color-loop)';
            innerHTML += `
                <div class="block-icon">
                    <svg viewBox="0 0 24 24" width="36" height="36">
                        <path d="M19,8l-4,4h3c0,3.31-2.69,6-6,6c-1.01,0-1.97-0.25-2.8-0.7l-1.46,1.46C8.97,19.54,10.43,20,12,20c4.42,0,8-3.58,8-8" fill="#ffffff"/>
                    </svg>
                </div>
                <div class="block-param">🔄</div>
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
    
    state.activeBlockIdToEdit = id;
    
    // Zamknij wszystkie najpierw
    closeAllModals();
    
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
    document.getElementById('btn-close-led').addEventListener('click', closeAllModals);
    document.getElementById('btn-close-wait').addEventListener('click', closeAllModals);
    document.getElementById('btn-close-sound').addEventListener('click', closeAllModals);
    
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
                    sendMotorCommand(speedVal);
                }
                break;
            }
            case 'motor-stop': {
                if (state.isConnected) {
                    sendMotorStopCommand();
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
});
