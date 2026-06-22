/* ==========================================================================
   LEGO WeDo 2.0 Motor Lab - Child-Friendly (5yo Safe) Javascript Logic
   ========================================================================== */

// BLE UUIDs Constants
const UUIDS = {
  DEVICE_SERVICE:  '00001523-1212-efde-1523-785feabcd123',
  CHAR_ATTACHED:   '00001527-1212-efde-1523-785feabcd123',
  IO_SERVICE:      '00004f0e-1212-efde-1523-785feabcd123',
  CHAR_OUTPUT:     '00001565-1212-efde-1523-785feabcd123',
  BATTERY_SERVICE: '0000180f-0000-1000-8000-00805f9b34fb',
  CHAR_BATTERY:    '00002a19-0000-1000-8000-00805f9b34fb'
};

// LEGO WeDo Hub LED Color mapping to Hex (for simulator visual feedback)
const LED_COLORS = {
  0: '#1e293b', // off (dark slate)
  1: '#ec4899', // pink
  2: '#8b5cf6', // purple
  3: '#3b82f6', // blue
  4: '#22d3ee', // cyan
  5: '#4ade80', // light green
  6: '#10b981', // green
  7: '#facc15', // yellow
  8: '#f97316', // orange
  9: '#ef4444', // red
  10: '#ffffff' // white
};

// Application State
const state = {
  device: null,
  server: null,
  connected: false,
  battery: 100,
  manualSpeed: 61,   // Default speed level (42, 61, 100)
  currentSpeed: 0,   // Speed currently set (-100 to 100)
  
  // Sequence block data
  sequence: [],
  seqRunning: false,
  seqLoop: false,
  seqCurrentIndex: -1,
  seqAbortController: null,

  // GATT Characteristics
  characteristics: {
    attached: null,
    output: null,
    battery: null
  },

  // Audio Context for sound effects
  audioCtx: null
};

// UI Elements References
const el = {
  btnConnect: document.getElementById('btnConnect'),
  btnDisconnect: document.getElementById('btnDisconnect'),
  batteryContainer: document.getElementById('batteryContainer'),
  batteryLevelBar: document.getElementById('batteryLevelBar'),
  batteryPercentage: document.getElementById('batteryPercentage'),
  legoWheelSvg: document.getElementById('legoWheelSvg'),
  speedDisplayBubble: document.getElementById('speedDisplayBubble'),
  btnHoldLeft: document.getElementById('btnHoldLeft'),
  btnHoldRight: document.getElementById('btnHoldRight'),
  btnBrakeStop: document.getElementById('btnBrakeStop'),
  sequenceTimeline: document.getElementById('sequenceTimeline'),
  timelineEmptyState: document.getElementById('timelineEmptyState'),
  btnPlaySeq: document.getElementById('btnPlaySeq'),
  btnStopSeq: document.getElementById('btnStopSeq'),
  btnClearSeq: document.getElementById('btnClearSeq'),
  chkLoopSeq: document.getElementById('chkLoopSeq')
};

// Init application
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  updateSpeedPresets();
  updateTimelineUI();
  console.log("LEGO WeDo Motor Lab: Child Mode Initialized.");
});

// Setup event listeners
function setupEventListeners() {
  el.btnConnect.addEventListener('click', connectHub);
  el.btnDisconnect.addEventListener('click', disconnectHub);

  // Speed selector buttons
  document.querySelectorAll('.btn-speed').forEach(btn => {
    btn.addEventListener('click', (e) => {
      state.manualSpeed = parseInt(btn.dataset.speed);
      updateSpeedPresets();
      playChime(250, 'sine', 0.05, 0.1);
    });
  });

  // Hold-to-Run Mouse / Touch Event Handlers
  setupHoldEvents(el.btnHoldLeft, () => {
    runMotor(-state.manualSpeed);
  });
  
  setupHoldEvents(el.btnHoldRight, () => {
    runMotor(state.manualSpeed);
  });

  // Emergency brake
  el.btnBrakeStop.addEventListener('click', () => {
    runMotor(127); // Brake value
    playChime(100, 'sawtooth', 0.2, 0.3);
  });

  // Sequence block clicks
  document.querySelectorAll('.blocks-library .toy-block').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      const duration = parseInt(btn.dataset.duration || 1);
      const color = btn.dataset.color || null;
      const colorIdx = btn.dataset.colorIdx ? parseInt(btn.dataset.colorIdx) : null;
      const tone = btn.dataset.tone || null;

      addBlock(action, duration, color, colorIdx, tone);
    });
  });

  el.btnPlaySeq.addEventListener('click', startSequence);
  el.btnStopSeq.addEventListener('click', stopSequence);
  el.btnClearSeq.addEventListener('click', clearSequence);
  el.chkLoopSeq.addEventListener('change', (e) => {
    state.seqLoop = e.target.checked;
    playChime(300, 'sine', 0.05, 0.1);
  });
}

// Bind mouse and touch events safely for hold-to-run without double-tap zoom
function setupHoldEvents(button, onStart) {
  let isPressed = false;

  const startAction = (e) => {
    e.preventDefault();
    if (isPressed || state.seqRunning) return;
    isPressed = true;
    button.classList.add('holding');
    playChime(400, 'sine', 0.08, 0.08);
    onStart();
  };

  const endAction = (e) => {
    e.preventDefault();
    if (!isPressed) return;
    isPressed = false;
    button.classList.remove('holding');
    playChime(200, 'sine', 0.05, 0.05);
    runMotor(0); // Stop motor
  };

  button.addEventListener('pointerdown', startAction);
  button.addEventListener('pointerup', endAction);
  button.addEventListener('pointerleave', endAction);
  button.addEventListener('pointercancel', endAction);
}

// Update Active States for Speed Presets
function updateSpeedPresets() {
  document.querySelectorAll('.btn-speed').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.speed) === state.manualSpeed);
  });
}

// Send speed command to LEGO WeDo 2.0 motor (Runs on ALL PORTS)
async function runMotor(speed) {
  state.currentSpeed = speed;
  
  // 1. UPDATE UI ANIMATION AND EMOTE
  updateWheelAnimation(speed);

  // 2. SEND BLUETOOTH PACKETS IF CONNECTED
  if (!state.connected || !state.characteristics.output) {
    return;
  }

  // Target Port 1 and Port 2 simultaneously
  await writeSpeedToPort(1, speed);
  await writeSpeedToPort(2, speed);
}

// Write GATT command helper for a specific port
async function writeSpeedToPort(portId, speed) {
  try {
    let speedByte = 0;

    if (speed === 127) {
      speedByte = 127; // Brake
    } else if (speed > 0) {
      speedByte = Math.min(speed, 100);
    } else if (speed < 0) {
      speedByte = Math.max(256 + speed, 156);
    }

    const command = new Uint8Array([portId, 0x01, 0x01, speedByte]);
    console.log(`[TX] Port ${portId} Speed ${speed}%: [${byteToHex(command)}]`);
    await state.characteristics.output.writeValueWithoutResponse(command);
  } catch (err) {
    console.error(`GATT Port ${portId} speed write error:`, err);
  }
}

// Send RGB color command to LEGO WeDo 2.0 Hub LED
async function runLed(colorIdx) {
  // Update simulator center wheel color
  const centerCircle = document.getElementById('legoWheelCenter');
  if (centerCircle) {
    centerCircle.style.fill = LED_COLORS[colorIdx] || '#1e293b';
  }

  if (!state.connected || !state.characteristics.output) {
    console.log(`[Simulator] LED Color index set to: ${colorIdx}`);
    return;
  }

  try {
    // LED service uses type index packet: [0x06, 0x04, 0x01, colorIdx]
    const command = new Uint8Array([0x06, 0x04, 0x01, colorIdx]);
    console.log(`[TX] Set LED Color Index=${colorIdx}: [${byteToHex(command)}]`);
    await state.characteristics.output.writeValueWithoutResponse(command);
  } catch (err) {
    console.error("GATT LED write error:", err);
  }
}

// Update rotation animation on SVG Wheel
function updateWheelAnimation(speed) {
  const wheel = el.legoWheelSvg;
  const bubble = el.speedDisplayBubble;
  
  wheel.classList.remove('cw', 'ccw');
  bubble.classList.remove('active-spin', 'active-back');

  if (speed === 127) {
    bubble.className = "speed-bubble";
    bubble.textContent = "🛑";
    wheel.style.setProperty('--wheel-duration', '0s');
  } else if (speed === 0) {
    bubble.className = "speed-bubble";
    bubble.textContent = "🛑";
    wheel.style.setProperty('--wheel-duration', '0s');
  } else if (speed > 0) {
    bubble.className = "speed-bubble active-spin";
    bubble.textContent = "▶️";
    wheel.classList.add('cw');
    const duration = (100 / speed) * 0.45;
    wheel.style.setProperty('--wheel-duration', `${duration}s`);
  } else {
    bubble.className = "speed-bubble active-back";
    bubble.textContent = "◀️";
    wheel.classList.add('ccw');
    const duration = (100 / Math.abs(speed)) * 0.45;
    wheel.style.setProperty('--wheel-duration', `${duration}s`);
  }
}

// Chime synthesiser for kid interaction
function playChime(freq, type = 'sine', volume = 0.05, duration = 0.1) {
  try {
    if (!state.audioCtx) {
      state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (state.audioCtx.state === 'suspended') {
      state.audioCtx.resume();
    }

    const osc = state.audioCtx.createOscillator();
    const gain = state.audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, state.audioCtx.currentTime);
    
    gain.gain.setValueAtTime(volume, state.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, state.audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(state.audioCtx.destination);

    osc.start();
    osc.stop(state.audioCtx.currentTime + duration);
  } catch (e) {
    // Autoplay policy blocker
  }
}

// Fanfares
function playFanfare() {
  setTimeout(() => playChime(523.25, 'sine', 0.1, 0.15), 0);   // C5
  setTimeout(() => playChime(659.25, 'sine', 0.1, 0.15), 120); // E5
  setTimeout(() => playChime(783.99, 'sine', 0.1, 0.15), 240); // G5
  setTimeout(() => playChime(1046.5, 'sine', 0.1, 0.3), 360);  // C6
}

function playDisconnectSound() {
  setTimeout(() => playChime(392.00, 'sawtooth', 0.08, 0.15), 0); // G4
  setTimeout(() => playChime(261.63, 'sawtooth', 0.08, 0.3), 150); // C4
}

// ==========================================================================
// Web Bluetooth Hub Connection
// ==========================================================================

async function connectHub() {
  console.log("Requesting Web Bluetooth connection...");
  try {
    state.device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: 'LPF2' }, { services: [UUIDS.DEVICE_SERVICE] }],
      optionalServices: [UUIDS.IO_SERVICE, UUIDS.BATTERY_SERVICE]
    });

    console.log(`Connected to: ${state.device.name}`);
    state.device.addEventListener('gattserverdisconnected', onDisconnected);

    state.server = await state.device.gatt.connect();
    state.connected = true;
    playFanfare();

    // Services
    const devService = await state.server.getPrimaryService(UUIDS.DEVICE_SERVICE);
    const ioService = await state.server.getPrimaryService(UUIDS.IO_SERVICE);
    
    state.characteristics.output = await ioService.getCharacteristic(UUIDS.CHAR_OUTPUT);
    state.characteristics.attached = await devService.getCharacteristic(UUIDS.CHAR_ATTACHED);
    
    // Subscribe to auto-plug alerts (optional logging)
    await state.characteristics.attached.startNotifications();
    state.characteristics.attached.addEventListener('characteristicvaluechanged', handleAttachedNotification);

    // Battery Service
    try {
      const batService = await state.server.getPrimaryService(UUIDS.BATTERY_SERVICE);
      state.characteristics.battery = await batService.getCharacteristic(UUIDS.CHAR_BATTERY);
      await state.characteristics.battery.startNotifications();
      state.characteristics.battery.addEventListener('characteristicvaluechanged', (e) => {
        const level = e.target.value.getUint8(0);
        state.battery = level;
        updateBatteryUI(level);
      });
      const batVal = await state.characteristics.battery.readValue();
      state.battery = batVal.getUint8(0);
      updateBatteryUI(state.battery);
    } catch(batErr) {
      console.log("Battery service not available.");
    }

    // Toggle Connect Status UI
    el.btnConnect.style.display = 'none';
    el.btnDisconnect.style.display = 'inline-flex';
    el.batteryContainer.style.display = 'flex';
  } catch (err) {
    console.error("Connection failed:", err);
    playChime(150, 'sawtooth', 0.15, 0.4);
  }
}

// Disconnect GATT Device
function disconnectHub() {
  if (state.device && state.device.gatt.connected) {
    state.device.gatt.disconnect();
  } else {
    onDisconnected();
  }
}

function onDisconnected() {
  state.connected = false;
  state.device = null;
  state.server = null;
  state.characteristics.output = null;
  state.characteristics.attached = null;
  state.characteristics.battery = null;

  el.btnConnect.style.display = 'inline-flex';
  el.btnDisconnect.style.display = 'none';
  el.batteryContainer.style.display = 'none';

  playDisconnectSound();
  updateWheelAnimation(0);
}

// Log motor attachment info in background
function handleAttachedNotification(event) {
  const value = event.target.value;
  if (value.byteLength < 4) return;
  const portId = value.getUint8(0);
  const connectType = value.getUint8(1); 
  const deviceId = value.getUint8(3);    

  if (connectType === 1 && deviceId === 1) {
    console.log(`Motor attached to Port ${portId}`);
    playChime(600, 'sine', 0.1, 0.2);
  }
}

function updateBatteryUI(level) {
  el.batteryPercentage.textContent = `${level}%`;
  el.batteryLevelBar.style.setProperty('width', `${level}%`);
  if (level < 20) {
    el.batteryLevelBar.setAttribute('fill', '#ef4444');
  } else if (level < 50) {
    el.batteryLevelBar.setAttribute('fill', '#f97316');
  } else {
    el.batteryLevelBar.setAttribute('fill', '#10b981');
  }
}

// ==========================================================================
// Sequence blocks programmer
// ==========================================================================

function addBlock(action, duration, color, colorIdx, tone) {
  const blockId = 'block_' + Math.random().toString(36).substr(2, 9);
  const blockObj = { id: blockId, action, duration, color, colorIdx, tone };
  state.sequence.push(blockObj);
  
  // Play click chime (pitch goes up with length)
  playChime(600 + (state.sequence.length * 35), 'sine', 0.05, 0.1);

  updateTimelineUI();
}

function removeBlock(blockId) {
  state.sequence = state.sequence.filter(b => b.id !== blockId);
  playChime(300, 'sine', 0.05, 0.1);
  updateTimelineUI();
}

function clearSequence() {
  if (state.seqRunning) stopSequence();
  state.sequence = [];
  playChime(150, 'sawtooth', 0.05, 0.2);
  updateTimelineUI();
}

// Render Timeline DOM elements
function updateTimelineUI() {
  // Clear all workspace blocks
  const blocks = el.sequenceTimeline.querySelectorAll('.workspace-block');
  blocks.forEach(b => b.remove());

  if (state.sequence.length === 0) {
    el.timelineEmptyState.style.display = 'flex';
    return;
  }

  el.timelineEmptyState.style.display = 'none';

  state.sequence.forEach((block) => {
    const blockEl = document.createElement('div');
    blockEl.className = `toy-block workspace-block`;
    blockEl.id = block.id;

    let colorClass = '';
    let emojiText = '';

    if (block.action === 'left') {
      colorClass = 'block-left';
      emojiText = `◀️ ${block.duration === 1 ? '1️⃣' : '2️⃣'}`;
    } else if (block.action === 'right') {
      colorClass = 'block-right';
      emojiText = `▶️ ${block.duration === 1 ? '1️⃣' : '2️⃣'}`;
    } else if (block.action === 'stop') {
      colorClass = 'block-stop';
      emojiText = `🛑 1️⃣`;
    } else if (block.action === 'beep') {
      colorClass = 'block-sound';
      emojiText = block.tone === 'high' ? '🔊 🎶' : '🔊 🎵';
    } else if (block.action === 'led') {
      colorClass = `block-led block-led-${block.color}`;
      if (block.color === 'red') emojiText = '🔴';
      else if (block.color === 'green') emojiText = '🟢';
      else if (block.color === 'blue') emojiText = '🔵';
      else emojiText = '🌈';
    }

    if (colorClass) {
      colorClass.split(' ').forEach(cls => {
        if (cls) blockEl.classList.add(cls);
      });
    }
    blockEl.innerHTML = `<span>${emojiText}</span><div class="delete-badge">✕</div>`;

    blockEl.querySelector('.delete-badge').addEventListener('click', (e) => {
      e.stopPropagation();
      removeBlock(block.id);
    });

    el.sequenceTimeline.appendChild(blockEl);
  });
}

// Sequence Engine Execution
async function startSequence() {
  if (state.sequence.length === 0) {
    playChime(150, 'sawtooth', 0.2, 0.4);
    return;
  }
  if (state.seqRunning) return;

  state.seqRunning = true;
  el.btnPlaySeq.style.display = 'none';
  el.btnStopSeq.style.display = 'inline-flex';
  
  el.btnHoldLeft.disabled = true;
  el.btnHoldRight.disabled = true;

  playChime(523, 'sine', 0.1, 0.2);

  state.seqAbortController = { aborted: false };
  const abort = state.seqAbortController;

  try {
    do {
      for (let i = 0; i < state.sequence.length; i++) {
        if (abort.aborted) break;

        state.seqCurrentIndex = i;
        const block = state.sequence[i];
        
        highlightTimelineBlock(block.id);

        // Execute action
        if (block.action === 'left') {
          await runMotor(-state.manualSpeed);
          await sleep(block.duration * 1000, abort);
        } else if (block.action === 'right') {
          await runMotor(state.manualSpeed);
          await sleep(block.duration * 1000, abort);
        } else if (block.action === 'stop') {
          await runMotor(0);
          await sleep(block.duration * 1000, abort);
        } else if (block.action === 'beep') {
          const freq = block.tone === 'high' ? 880 : 330;
          playChime(freq, 'triangle', 0.15, 0.3);
          await sleep(400, abort);
        } else if (block.action === 'led') {
          if (block.color === 'rainbow') {
            // Flashing rainbow cycle for 480ms (60ms per color)
            const rainbowColors = [9, 8, 7, 6, 4, 3, 2, 1];
            for (let c of rainbowColors) {
              if (abort.aborted) break;
              await runLed(c);
              await sleep(60, abort);
            }
          } else {
            await runLed(block.colorIdx);
            await sleep(400, abort);
          }
        }
      }
    } while (state.seqLoop && !abort.aborted);
  } catch (e) {
    // Aborted
  } finally {
    state.seqRunning = false;
    el.btnPlaySeq.style.display = 'inline-flex';
    el.btnStopSeq.style.display = 'none';
    el.btnHoldLeft.disabled = false;
    el.btnHoldRight.disabled = false;
    highlightTimelineBlock(null);
    runMotor(0);
    playChime(784, 'sine', 0.05, 0.15);
  }
}

// Stop active program sequence
function stopSequence() {
  if (state.seqAbortController) {
    state.seqAbortController.aborted = true;
  }
}

// Highlight the block in timeline
function highlightTimelineBlock(blockId) {
  const blocks = el.sequenceTimeline.querySelectorAll('.workspace-block');
  blocks.forEach(b => {
    b.classList.toggle('active-run', b.id === blockId);
  });
}

// Promise-based sleep that responds to sequence aborts
function sleep(ms, abortObj) {
  return new Promise((resolve, reject) => {
    const checkInterval = 25;
    let elapsed = 0;

    const timer = setInterval(() => {
      if (abortObj && abortObj.aborted) {
        clearInterval(timer);
        reject(new Error("Aborted"));
      } else {
        elapsed += checkInterval;
        if (elapsed >= ms) {
          clearInterval(timer);
          resolve();
        }
      }
    }, checkInterval);
  });
}

function byteToHex(uint8Array) {
  return Array.from(uint8Array)
    .map(b => b.toString(16).padStart(2, '0').toUpperCase())
    .join(' ');
}
