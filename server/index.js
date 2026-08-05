const express = require('express'); // WaveBro Bot Init
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Supabase Setup
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
let supabase = null;

if (supabaseUrl && supabaseKey) {
  const isServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  supabase = createClient(supabaseUrl, supabaseKey, {
    realtime: {
      transport: WebSocket
    }
  });
  console.log(`[WaveBro] Supabase Client inicializado con éxito (${isServiceRole ? 'Service Role Key' : 'Anon Key'}).`);
  listenToAppointments();
} else {
  console.warn('[WaveBro] Faltan credenciales de Supabase. Confirmaciones automáticas desactivadas.');
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Paths
const RULES_PATH = path.join(__dirname, 'rules.json');
const CONFIG_PATH = path.join(__dirname, 'config.json');

// State
let botStatus = 'DISCONNECTED'; // DISCONNECTED, CONNECTING, QR_READY, CONNECTED
let currentQr = null;
let activityLog = [];

// Helper functions for storage
function readRules() {
  try {
    return JSON.parse(fs.readFileSync(RULES_PATH, 'utf8'));
  } catch (err) {
    return [];
  }
}

function writeRules(rules) {
  fs.writeFileSync(RULES_PATH, JSON.stringify(rules, null, 2));
}

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (err) {
    return {
      botEnabled: true,
      geminiEnabled: false,
      geminiApiKey: '',
      geminiPrompt: 'Eres WaveBro, el asistente virtual de Wave Barber Shop. Responde en tono amigable y profesional.',
      delayMin: 1,
      delayMax: 3
    };
  }
}

function writeConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

// Log helper
function logActivity(type, from, text, response, success = true) {
  const logItem = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
    timestamp: new Date().toLocaleTimeString(),
    type, // 'incoming' | 'system'
    from,
    text,
    response,
    success
  };
  activityLog.unshift(logItem);
  if (activityLog.length > 100) activityLog.pop();
  io.emit('activity', logItem);
}

// Update Status helper
function updateStatus(newStatus) {
  botStatus = newStatus;
  io.emit('status', { status: botStatus, qr: currentQr });
  console.log(`[WaveBro Status] ${newStatus}`);
}

// Helper to find valid local Chrome/Edge executable
function getChromeExecutablePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google\\Chrome\\Application\\chrome.exe') : '',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ].filter(Boolean);

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return undefined;
}

function cleanStaleLockFiles() {
  const sessionDir = path.join(__dirname, '.wwebjs_auth', 'session');
  const lockFiles = ['DevToolsActivePort', 'lockfile', 'SingletonLock', 'SingletonCookie', 'SingletonSocket'];
  lockFiles.forEach(file => {
    const filePath = path.join(sessionDir, file);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`[WaveBro] Archivo de bloqueo residual eliminado: ${file}`);
      } catch (err) {
        console.warn(`[WaveBro] No se pudo eliminar ${file}:`, err.message);
      }
    }
  });
}

// WhatsApp Client Init
let client;

function initWhatsApp() {
  cleanStaleLockFiles();
  updateStatus('CONNECTING');
  
  const isWin = process.platform === 'win32';
  const chromeArgs = isWin ? [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu'
  ] : [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--no-first-run',
    '--disable-extensions',
    '--disable-software-rasterizer',
    '--js-flags="--max-old-space-size=120"',
    '--disable-dev-tools',
    '--disable-features=Translate,BackForwardCache,SharedArrayBuffer',
    '--disable-default-apps',
    '--disable-background-networking',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-client-side-phishing-detection',
    '--disable-ipc-flooding-protection',
    '--disable-hang-monitor',
    '--disable-popup-blocking',
    '--disable-prompt-on-repost',
    '--disable-renderer-backgrounding',
    '--disable-sync',
    '--force-color-profile=srgb',
    '--metrics-recording-only',
    '--no-default-browser-check',
    '--password-store=basic',
    '--use-mock-keychain'
  ];

  const execPath = isWin ? getChromeExecutablePath() : (process.env.PUPPETEER_EXECUTABLE_PATH || undefined);

  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: path.join(__dirname, '.wwebjs_auth')
    }),
    webVersionCache: {
      type: 'remote',
      remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1018905047-alpha.html',
    },
    puppeteer: {
      headless: true,
      ...(execPath ? { executablePath: execPath } : {}),
      args: chromeArgs
    }
  });

  client.on('authenticated', () => {
    console.log('[WaveBro] Autenticado correctamente con WhatsApp!');
    logActivity('system', 'System', 'Autenticado correctamente con WhatsApp.', '');
  });

  client.on('qr', async (qr) => {
    try {
      currentQr = await QRCode.toDataURL(qr);
      updateStatus('QR_READY');
    } catch (err) {
      console.error('Error generating QR code data URL', err);
    }
  });

  client.on('ready', () => {
    currentQr = null;
    updateStatus('CONNECTED');
    logActivity('system', 'System', '¡WaveBro conectado y listo para recibir mensajes!', '');
  });

  client.on('auth_failure', (msg) => {
    console.error('Authentication failure:', msg);
    currentQr = null;
    updateStatus('DISCONNECTED');
    logActivity('system', 'System', `Error de autenticación: ${msg}`, '', false);
  });

  client.on('disconnected', (reason) => {
    console.log('Client was logged out:', reason);
    currentQr = null;
    updateStatus('DISCONNECTED');
    logActivity('system', 'System', `Desconectado: ${reason}`, '', false);
  });

  client.on('message_create', async (msg) => {
    try {
      console.log(`[DEBUG] Evento message_create recibido! From: ${msg.from}, Body: ${msg.body}, FromMe: ${msg.fromMe}`);
      
      // Ignore self-sent messages
      if (msg.fromMe) return;

      const config = readConfig();
      if (!config.botEnabled) return;

      // Ignore status broadcasts immediately
      if (msg.from === 'status@broadcast') return;

      // Ignore group chats (JIDs ending in @g.us)
      const isGroup = msg.from.endsWith('@g.us');
      if (isGroup) return;

      const incomingText = msg.body;
      const fromNumber = msg.from;
      
      let senderName = 'Usuario';
      try {
        const contact = await msg.getContact();
        senderName = contact.pushname || contact.name || fromNumber.split('@')[0];
      } catch (e) {
        console.error('Error fetching contact info:', e);
      }

      console.log(`[Message Received] From: ${senderName} (${fromNumber}): ${incomingText}`);

      // Helper function to normalize text (lowercase, no accents, trimmed)
      const normalizeText = (str) => {
        if (!str) return '';
        return str
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim();
      };

      // 1. Check local rules
      const rules = readRules();
      let matchedRule = null;

      for (const rule of rules) {
        if (!rule.active) continue;
        
        const triggerClean = normalizeText(rule.trigger);
        const msgClean = normalizeText(incomingText);

        if (rule.type === 'exact' && msgClean === triggerClean) {
          matchedRule = rule;
          break;
        } else if (rule.type === 'contains' && msgClean.includes(triggerClean)) {
          matchedRule = rule;
          break;
        } else if (rule.type === 'starts_with' && msgClean.startsWith(triggerClean)) {
          matchedRule = rule;
          break;
        }
      }

      // Add response delay helper
      const applyDelay = async () => {
        const min = parseInt(config.delayMin) || 0;
        const max = Math.max(min, parseInt(config.delayMax) || 0);
        if (max > 0) {
          const delayMs = (Math.floor(Math.random() * (max - min + 1)) + min) * 1000;
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      };

      if (matchedRule) {
        try {
          // Parse multiple responses separated by | or newline
          const options = matchedRule.reply
            .split(/[|\n]/)
            .map(r => r.trim())
            .filter(r => r.length > 0);
          
          const selectedReply = options.length > 0 
            ? options[Math.floor(Math.random() * options.length)]
            : matchedRule.reply;

          // Apply natural delay
          await applyDelay();

          await client.sendMessage(msg.from, selectedReply);
          logActivity('incoming', senderName, incomingText, selectedReply);
          console.log(`[Auto-Reply] Sent: ${selectedReply}`);
          return;
        } catch (err) {
          console.error('Error sending reply:', err);
          logActivity('incoming', senderName, incomingText, 'Error al responder', false);
          return;
        }
      }

      // 2. Check Gemini AI if enabled
      if (config.geminiEnabled && config.geminiApiKey) {
        try {
          const ai = new GoogleGenerativeAI(config.geminiApiKey);
          const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
          
          const prompt = `${config.geminiPrompt}\n\nUsuario: ${incomingText}\nRespuesta:`;
          
          // Apply natural delay
          await applyDelay();

          const result = await model.generateContent(prompt);
          const aiResponse = result.response.text().trim();

          if (aiResponse) {
            await client.sendMessage(msg.from, aiResponse);
            logActivity('incoming', senderName, incomingText, aiResponse);
            console.log(`[Gemini-Reply] Sent: ${aiResponse}`);
          }
        } catch (err) {
          console.error('Error calling Gemini AI:', err);
          logActivity('incoming', senderName, incomingText, `Error de AI: ${err.message}`, false);
        }
      }
    } catch (globalErr) {
      console.error('Global message handler error:', globalErr);
    }
  });

  client.initialize().catch(err => {
    console.error('Error initializing whatsapp client:', err);
    updateStatus('DISCONNECTED');
  });
}

// Graceful Shutdown
async function gracefulShutdown(signal) {
  console.log(`[WaveBro] Cerrando WhatsApp client por señal: ${signal}...`);
  if (client) {
    try {
      await client.destroy();
    } catch (e) {}
  }
}

process.once('SIGUSR2', async () => {
  await gracefulShutdown('SIGUSR2');
  process.kill(process.pid, 'SIGUSR2');
});

process.on('SIGINT', async () => {
  await gracefulShutdown('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await gracefulShutdown('SIGTERM');
  process.exit(0);
});

// REST API Endpoints
app.get('/api/status', (req, res) => {
  res.json({ status: botStatus, qr: currentQr });
});


app.get('/api/rules', (req, res) => {
  res.json(readRules());
});

app.post('/api/rules', (req, res) => {
  const rules = req.body;
  if (Array.isArray(rules)) {
    writeRules(rules);
    res.json({ success: true, message: 'Reglas guardadas correctamente.' });
  } else {
    res.status(400).json({ error: 'Formato de reglas inválido.' });
  }
});

app.get('/api/config', (req, res) => {
  res.json(readConfig());
});

app.post('/api/config', (req, res) => {
  const config = req.body;
  writeConfig(config);
  res.json({ success: true, message: 'Configuración guardada correctamente.' });
});

app.get('/api/activity', (req, res) => {
  res.json(activityLog);
});

app.post('/api/logout', async (req, res) => {
  try {
    if (client) {
      await client.logout();
      await client.destroy();
    }
    // Delete session files
    const authDir = path.join(__dirname, '.wwebjs_auth');
    if (fs.existsSync(authDir)) {
      fs.rmSync(authDir, { recursive: true, force: true });
    }
    updateStatus('DISCONNECTED');
    res.json({ success: true, message: 'Sesión cerrada correctamente.' });
    // Re-init client to wait for a new QR
    initWhatsApp();
  } catch (err) {
    console.error('Error during logout:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/restart', async (req, res) => {
  try {
    if (client) {
      await client.destroy();
    }
    initWhatsApp();
    res.json({ success: true, message: 'Reiniciando bot...' });
  } catch (err) {
    console.error('Error restarting:', err);
    res.status(500).json({ error: err.message });
  }
});

// Socket Connections
io.on('connection', (socket) => {
  console.log('Client connected to socket');
  socket.emit('status', { status: botStatus, qr: currentQr });
  socket.emit('activity-history', activityLog);
});

// Start Node application
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  initWhatsApp();
});

// --- Supabase Realtime Helpers ---

function formatPhoneNumberToJID(phone) {
  if (!phone) return null;
  let cleaned = phone.replace(/\D/g, '');
  
  // Argentina country code mobile format fix
  if (cleaned.startsWith('54') && !cleaned.startsWith('549') && cleaned.length === 12) {
    cleaned = '549' + cleaned.slice(2);
  }
  
  if (!cleaned.startsWith('54')) {
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.slice(1);
    }
    if (cleaned.includes('15') && cleaned.length >= 10) {
      cleaned = cleaned.replace('15', '');
    }
    if (cleaned.length === 10) {
      cleaned = '549' + cleaned;
    }
  }
  
  return `${cleaned}@c.us`;
}

function formatDateForWhatsApp(date) {
  if (!date) return '';
  let dateFormatted = date;
  if (date && date.includes('-')) {
    try {
      const [year, month, day] = date.split('-').map(Number);
      const parsedDate = new Date(year, month - 1, day);
      const options = { weekday: 'long', day: 'numeric', month: 'long' };
      dateFormatted = parsedDate.toLocaleDateString('es-ES', options).replace(',', '');
    } catch (e) {
      console.error('Error formatting date:', e);
    }
  }
  // Convert day of the week to UPPERCASE (e.g. VIERNES, SÁBADO)
  return dateFormatted.replace(/\b(lunes|martes|miercoles|miércoles|jueves|viernes|sabado|sábado|domingo)\b/gi, (m) => m.toUpperCase());
}

async function sendConfirmationMessage(appointment) {
  if (!client || botStatus !== 'CONNECTED') {
    console.warn('[WaveBro] No se puede enviar confirmación, el bot no está CONECTADO.');
    return;
  }
  
  const phone = appointment.customer_phone;
  if (!phone) return;
  
  const targetJid = formatPhoneNumberToJID(phone);
  if (!targetJid) return;
  
  const name = appointment.customer_name || 'Cliente';
  const service = appointment.service_name || 'Servicio';
  
  // Format price (e.g. 14000 -> $14.000)
  const priceFormatted = appointment.service_price 
    ? `$${Number(appointment.service_price).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` 
    : '';
    
  const dateFormatted = formatDateForWhatsApp(appointment.date);
  const time = appointment.time;

  const message = `Que onda *${name}*!\n\n*Tu turno se agendó con éxito! 💥*\n\n💈 *${service} ${priceFormatted ? `(${priceFormatted})` : ''}*\n📅 *${dateFormatted}*\n⏰ *${time} hs*\n\n¡Te espero! 💈🔥`;
  
  try {
    await client.sendMessage(targetJid, message);
    console.log(`[WaveBro] Confirmación de turno enviada con éxito a: ${targetJid}`);
    logActivity('system', 'System', `Confirmación enviada a ${name} (${phone})`, message);
  } catch (err) {
    console.error(`[WaveBro] Error al enviar confirmación a ${targetJid}:`, err);
    logActivity('system', 'System', `Error enviando confirmación a ${name} (${phone})`, err.message, false);
  }
}

function parseAppointmentDateTime(dateLabel, time, createdAtString) {
  try {
    const m = dateLabel.match(/\b(\d{1,2})\s+de\s+([a-záéíóúñ]+)/i);
    if (!m) return null;
    const day = parseInt(m[1], 10);
    const monthName = m[2].toLowerCase();
    const monthMap = {
      'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
      'julio': 6, 'agosto': 7, 'septiembre': 8, 'setiembre': 8,
      'octubre': 9, 'noviembre': 10, 'diciembre': 11
    };
    const month = monthMap[monthName];
    if (month == null) return null;
    const [hour, minute] = time.split(':').map(Number);
    
    const createdAt = new Date(createdAtString);
    const dateMonth = month;
    const createdMonth = createdAt.getMonth();
    let year = createdAt.getFullYear();

    if (dateMonth < createdMonth && (createdMonth - dateMonth) > 6) {
      year++;
    }

    return new Date(year, dateMonth, day, hour || 0, minute || 0, 0, 0);
  } catch (e) {
    return null;
  }
}

async function checkAndSendReminders() {
  if (!supabase || !client || botStatus !== 'CONNECTED') return;
  
  try {
    // Buscamos turnos confirmados que falten enviar algún recordatorio
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('status', 'confirmed')
      .or('reminder_sent_1day.eq.false,reminder_sent_1hour.eq.false');
      
    if (error) {
      console.error('[WaveBro Reminders] Error cargando turnos para recordatorios:', error);
      return;
    }
    
    if (!appointments || appointments.length === 0) return;
    
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    for (const apt of appointments) {
      const aptDate = parseAppointmentDateTime(apt.date, apt.time, apt.created_at);
      if (!aptDate) continue;
      
      const diffMs = aptDate.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      
      const phone = apt.customer_phone;
      if (!phone) continue;
      
      const targetJid = formatPhoneNumberToJID(phone);
      if (!targetJid) continue;
      
      const name = apt.customer_name || 'Cliente';
      const service = apt.service_name || 'Servicio';
      const priceFormatted = apt.service_price 
        ? `$${Number(apt.service_price).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` 
        : '';
      const dateFormatted = formatDateForWhatsApp(apt.date);

      // 1. Recordatorio 1 día antes a partir de las 9:00 AM
      const isTomorrow = tomorrow.getFullYear() === aptDate.getFullYear() &&
                         tomorrow.getMonth() === aptDate.getMonth() &&
                         tomorrow.getDate() === aptDate.getDate();
                         
      if (isTomorrow && now.getHours() >= 9 && !apt.reminder_sent_1day) {
        const message = `Hola *${name}*! 👋\n\n¡Recordatorio de tu turno de mañana! 💈\n\nTe espero en *Wave Barber Shop*:\n\n💈 *Servicio:* ${service} ${priceFormatted ? `(${priceFormatted})` : ''}\n📅 *Fecha:* *${dateFormatted}*\n⏰ *Hora:* *${apt.time} hs*\n\n¡Que tengas un gran día! 🔥`;
        
        try {
          await client.sendMessage(targetJid, message);
          console.log(`[WaveBro Reminders] Recordatorio de 1 día enviado con éxito a: ${targetJid}`);
          
          await supabase
            .from('appointments')
            .update({ reminder_sent_1day: true })
            .eq('id', apt.id);
            
          logActivity('system', 'System', `Recordatorio 1 día enviado a ${name} (${phone})`, message);
        } catch (err) {
          console.error(`[WaveBro Reminders] Error enviando recordatorio 1 día a ${targetJid}:`, err);
        }
      }
      
      // 2. Recordatorio 2 horas antes
      if (diffHours > 0 && diffHours <= 2.0 && !apt.reminder_sent_1hour) {
        const message = `Hola *${name}*! 👋\n\n¡Falta poco para tu turno! 💈\n\nRecordá que hoy tenés turno en *Wave Barber Shop* en menos de 2 horas:\n\n💈 *Servicio:* ${service} ${priceFormatted ? `(${priceFormatted})` : ''}\n⏰ *Hora:* *${apt.time} hs*\n\n¡Te espero! 🔥`;
        
        try {
          await client.sendMessage(targetJid, message);
          console.log(`[WaveBro Reminders] Recordatorio de 2 horas enviado con éxito a: ${targetJid}`);
          
          await supabase
            .from('appointments')
            .update({ reminder_sent_1hour: true })
            .eq('id', apt.id);
            
          logActivity('system', 'System', `Recordatorio 2 horas enviado a ${apt.customer_name} (${phone})`, message);
        } catch (err) {
          console.error(`[WaveBro Reminders] Error enviando recordatorio 2 horas a ${targetJid}:`, err);
        }
      }
    }
  } catch (err) {
    console.error('[WaveBro Reminders] Error procesando recordatorios:', err);
  }
}

function listenToAppointments() {
  if (!supabase) return;
  
  console.log('[WaveBro] Iniciando escucha en tiempo real de turnos...');
  
  supabase
    .channel('public:appointments')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'appointments' },
      async (payload) => {
        try {
          console.log('[WaveBro] Nuevo turno registrado en Supabase:', payload.new);
          await sendConfirmationMessage(payload.new);
        } catch (err) {
          console.error('[WaveBro] Error procesando notificación de nuevo turno:', err);
        }
      }
    )
    .subscribe((status) => {
      console.log(`[WaveBro] Estado suscripción Supabase Realtime: ${status}`);
    });

  // Chequear recordatorios cada 5 minutos
  setInterval(checkAndSendReminders, 5 * 60 * 1000);
  // Y correr un chequeo inicial al iniciar conexión
  setTimeout(checkAndSendReminders, 10000);
}
