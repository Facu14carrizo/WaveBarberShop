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

// WhatsApp Client Init
let client;

function initWhatsApp() {
  updateStatus('CONNECTING');
  
  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: path.join(__dirname, '.wwebjs_auth')
    }),
    puppeteer: {
      headless: true,
      // Usa Chrome local en Windows, y la ruta por defecto o del entorno en Linux (producción)
      ...(process.platform === 'win32' ? {
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
      } : process.env.PUPPETEER_EXECUTABLE_PATH ? {
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH
      } : {}),
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
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
    
  const date = appointment.date;
  const time = appointment.time;
  
  // Format date to Spanish if it is a raw YYYY-MM-DD date string
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

  const message = `Tu turno se agendó con exito perro: \n\nServicio: ${service} ${priceFormatted ? `(${priceFormatted})` : ''}\nFecha: ${dateFormatted}\nHora: ${time} hs\n\n¡Te espero bro! 💈🔥`;
  
  try {
    await client.sendMessage(targetJid, message);
    console.log(`[WaveBro] Confirmación de turno enviada con éxito a: ${targetJid}`);
    logActivity('system', 'System', `Confirmación enviada a ${name} (${phone})`, message);
  } catch (err) {
    console.error(`[WaveBro] Error al enviar confirmación a ${targetJid}:`, err);
    logActivity('system', 'System', `Error enviando confirmación a ${name} (${phone})`, err.message, false);
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
}
