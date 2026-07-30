import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { 
  Bot, 
  Power, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Settings, 
  Cpu, 
  MessageSquare, 
  QrCode, 
  CheckCircle,
  HelpCircle,
  Edit,
  Save,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const SOCKET_URL = 'http://localhost:5000';

interface Rule {
  id: string;
  trigger: string;
  reply: string;
  type: string;
  active: boolean;
}

interface Config {
  botEnabled: boolean;
  geminiEnabled: boolean;
  geminiApiKey: string;
  geminiPrompt: string;
  delayMin: number;
  delayMax: number;
}

interface ActivityLogItem {
  id: string;
  timestamp: string;
  type: 'incoming' | 'system';
  from: string;
  text: string;
  response?: string;
  success: boolean;
}

export const WaverDashboard: React.FC = () => {
  const [status, setStatus] = useState<string>('DISCONNECTED');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [config, setConfig] = useState<Config>({
    botEnabled: true,
    geminiEnabled: false,
    geminiApiKey: '',
    geminiPrompt: '',
    delayMin: 1,
    delayMax: 3
  });
  const [activity, setActivity] = useState<ActivityLogItem[]>([]);
  
  // Rule creation state
  const [newRule, setNewRule] = useState({
    trigger: '',
    reply: '',
    type: 'contains'
  });

  // Rule editing state
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editTrigger, setEditTrigger] = useState('');
  const [editReply, setEditReply] = useState('');
  const [editType, setEditType] = useState('contains');

  // UI state
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showDelaySettings, setShowDelaySettings] = useState(false);

  const handleStartEdit = (rule: Rule) => {
    setEditingRuleId(rule.id);
    setEditTrigger(rule.trigger);
    setEditReply(rule.reply);
    setEditType(rule.type);
  };

  const handleSaveRule = async (id: string) => {
    if (!editTrigger.trim() || !editReply.trim()) return;
    const updatedRules = rules.map(r => r.id === id ? { ...r, trigger: editTrigger, reply: editReply, type: editType } : r);
    setRules(updatedRules);
    setEditingRuleId(null);
    try {
      await fetch(`${SOCKET_URL}/api/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRules)
      });
    } catch (err) {
      console.error('Error saving updated rule:', err);
    }
  };

  useEffect(() => {
    // Fetch initial state
    fetchStatus();
    fetchRules();
    fetchConfig();
    fetchActivity();

    // Socket.io connection
    const socket = io(SOCKET_URL);

    // Periodic polling fallback
    const interval = setInterval(() => {
      fetchStatus();
    }, 3000);

    socket.on('status', (data: { status: string; qr: string | null }) => {
      setStatus(data.status);
      setQrCode(data.qr);
    });

    socket.on('activity', (logItem: ActivityLogItem) => {
      setActivity((prev) => [logItem, ...prev].slice(0, 100));
    });

    socket.on('activity-history', (history: ActivityLogItem[]) => {
      setActivity(history);
    });

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${SOCKET_URL}/api/status`);
      const data = await res.json();
      setStatus(data.status);
      setQrCode(data.qr);
    } catch (err) {
      console.error('Error fetching status:', err);
    }
  };

  const fetchRules = async () => {
    try {
      const res = await fetch(`${SOCKET_URL}/api/rules`);
      const data = await res.json();
      setRules(data);
    } catch (err) {
      console.error('Error fetching rules:', err);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${SOCKET_URL}/api/config`);
      const data = await res.json();
      setConfig({
        delayMin: 1,
        delayMax: 3,
        ...data
      });
    } catch (err) {
      console.error('Error fetching config:', err);
    }
  };

  const fetchActivity = async () => {
    try {
      const res = await fetch(`${SOCKET_URL}/api/activity`);
      const data = await res.json();
      setActivity(data);
    } catch (err) {
      console.error('Error fetching activity:', err);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${SOCKET_URL}/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error saving config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRule.trigger.trim() || !newRule.reply.trim()) return;

    const ruleToAdd: Rule = {
      id: Date.now().toString(),
      ...newRule,
      active: true
    };

    const updatedRules = [...rules, ruleToAdd];
    setRules(updatedRules);
    
    // Save to server
    try {
      await fetch(`${SOCKET_URL}/api/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRules)
      });
      setNewRule({ trigger: '', reply: '', type: 'contains' });
    } catch (err) {
      console.error('Error saving rule:', err);
    }
  };

  const handleDeleteRule = async (id: string) => {
    const updatedRules = rules.filter(r => r.id !== id);
    setRules(updatedRules);
    try {
      await fetch(`${SOCKET_URL}/api/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRules)
      });
    } catch (err) {
      console.error('Error deleting rule:', err);
    }
  };

  const handleToggleRule = async (id: string) => {
    const updatedRules = rules.map(r => r.id === id ? { ...r, active: !r.active } : r);
    setRules(updatedRules);
    try {
      await fetch(`${SOCKET_URL}/api/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRules)
      });
    } catch (err) {
      console.error('Error toggling rule:', err);
    }
  };

  const handleLogout = async () => {
    if (!confirm('¿Estás seguro de que quieres cerrar la sesión de WhatsApp? Deberás escanear el QR de nuevo.')) return;
    setLoading(true);
    try {
      await fetch(`${SOCKET_URL}/api/logout`, { method: 'POST' });
    } catch (err) {
      console.error('Error during logout:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = async () => {
    setLoading(true);
    try {
      await fetch(`${SOCKET_URL}/api/restart`, { method: 'POST' });
    } catch (err) {
      console.error('Error restarting:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderStatusBadge = () => {
    switch (status) {
      case 'CONNECTED':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Conectado
          </span>
        );
      case 'CONNECTING':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Iniciando...
          </span>
        );
      case 'QR_READY':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <QrCode className="h-3.5 w-3.5 mr-1.5" /> Esperando Escaneo
          </span>
        );
      case 'DISCONNECTED':
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
            <Power className="h-3.5 w-3.5 mr-1.5" /> Desconectado
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2 sm:p-4 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-800/40 border border-gray-700/50 rounded-2xl p-5 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-emerald-500 to-blue-600 p-3 rounded-xl shadow-md">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-wide">WaveBro - Asistente Virtual</h2>
            <p className="text-xs text-gray-400">Automatización de Turnos de Barbería por WhatsApp</p>
          </div>
        </div>
        <div className="flex items-center gap-3 self-end sm:self-auto">
          {renderStatusBadge()}
          <button 
            onClick={handleRestart} 
            disabled={loading} 
            className="p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-300 rounded-xl transition-all duration-200"
            title="Reiniciar WaveBro"
          >
            <RefreshCw className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (8 cols): Connection, Settings, Rules */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Connection Card */}
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <QrCode className="h-5 w-5 text-emerald-400" /> Vinculación de WhatsApp
            </h3>

            {status === 'DISCONNECTED' && (
              <div className="text-center py-6">
                <p className="text-gray-400 mb-4 text-sm">El bot de WhatsApp está desconectado en este entorno. Inicializa la conexión para obtener el QR.</p>
                <button 
                  onClick={handleRestart} 
                  disabled={loading}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  Conectar WhatsApp
                </button>
              </div>
            )}

            {status === 'CONNECTING' && (
              <div className="text-center py-8">
                <div className="border-4 border-gray-700 border-t-emerald-500 rounded-full w-12 h-12 mx-auto mb-4 animate-spin" />
                <p className="text-gray-400 text-sm">Iniciando motor de automatización de WhatsApp. Espera un momento...</p>
              </div>
            )}

            {status === 'QR_READY' && qrCode && (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="bg-white p-4 rounded-2xl shadow-xl">
                  <img src={qrCode} alt="WhatsApp QR Code" className="w-48 h-48 block" />
                </div>
                <div className="text-center max-w-sm">
                  <p className="font-bold text-white text-sm mb-1">Escanea este código QR</p>
                  <p className="text-xs text-gray-400">Desde tu aplicación de WhatsApp en el celular, ve a Dispositivos vinculados {'>'} Vincular dispositivo y escanea esta pantalla.</p>
                </div>
              </div>
            )}

            {status === 'CONNECTED' && (
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-emerald-400 font-semibold mb-0.5">WaveBro está Operativo</h4>
                  <p className="text-xs text-gray-400">Respondiendo automáticamente mensajes de clientes de la barbería.</p>
                </div>
                <button 
                  onClick={handleLogout} 
                  disabled={loading}
                  className="px-4 py-2 bg-red-500/15 hover:bg-red-500/25 border border-red-500/20 hover:border-red-500/30 text-red-400 rounded-lg text-xs font-semibold transition-all"
                >
                  Cerrar Sesión
                </button>
              </div>
            )}
          </div>

          {/* Configurations */}
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-400" /> Configuración de WaveBro
            </h3>

            <form onSubmit={handleSaveConfig} className="space-y-5">
              <div className="flex justify-between items-center bg-gray-900/40 p-4 rounded-xl border border-gray-700/30">
                <div>
                  <span className="text-sm font-semibold text-white block">Auto-Respuestas Activas</span>
                  <span className="text-xs text-gray-400">Habilitar o deshabilitar respuestas automáticas globales.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={config.botEnabled} 
                    onChange={(e: any) => setConfig({ ...config, botEnabled: e.target.checked })} 
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {/* Delay */}
              <div className="bg-gray-900/30 rounded-xl border border-gray-700/30 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowDelaySettings(!showDelaySettings)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-900/10 transition-colors text-left focus:outline-none"
                >
                  <span className="text-xs font-semibold text-gray-300 tracking-wider uppercase">
                    Simulación de Escritura Humana
                  </span>
                  {showDelaySettings ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </button>
                
                {showDelaySettings && (
                  <div className="px-4 pb-4 space-y-3 animate-fade-in">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Espera Mínima (seg)</label>
                        <input 
                          type="number" 
                          min="0" 
                          max="60"
                          className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          value={config.delayMin} 
                          onChange={(e: any) => setConfig({ ...config, delayMin: Math.max(0, parseInt(e.target.value) || 0) })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Espera Máxima (seg)</label>
                        <input 
                          type="number" 
                          min="0" 
                          max="60"
                          className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          value={config.delayMax} 
                          onChange={(e: any) => setConfig({ ...config, delayMax: Math.max(0, parseInt(e.target.value) || 0) })}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Gemini AI */}
              <div className="border-t border-gray-700/50 pt-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Cpu className="h-[18px] w-[18px] text-purple-400" /> Inteligencia Artificial (Gemini)
                  </h4>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={config.geminiEnabled} 
                      onChange={(e: any) => setConfig({ ...config, geminiEnabled: e.target.checked })} 
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                  </label>
                </div>

                {config.geminiEnabled && (
                  <div className="space-y-3 animate-fade-in">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Gemini API Key</label>
                      <input 
                        type="password" 
                        className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        placeholder="Ingresa tu API Key de Google Gemini..." 
                        value={config.geminiApiKey} 
                        onChange={(e: any) => setConfig({ ...config, geminiApiKey: e.target.value })}
                        required={config.geminiEnabled}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Instrucciones del Asistente (Personalidad / Reglas de la Barbería)</label>
                      <textarea 
                        className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        rows={3}
                        placeholder="Ej. Eres WaveBro, el recepcionista virtual de Wave Barber Shop. Tu tarea es agendar turnos cordialmente..." 
                        value={config.geminiPrompt} 
                        onChange={(e: any) => setConfig({ ...config, geminiPrompt: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-md active:scale-95 text-sm"
                >
                  Guardar Configuración
                </button>
                {saveSuccess && <span className="text-emerald-400 text-xs font-semibold">¡Cambios guardados con éxito!</span>}
              </div>
            </form>
          </div>

          {/* Keyword Rules */}
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-purple-400" /> Reglas de Auto-respuesta
            </h3>

            <form onSubmit={handleAddRule} className="bg-gray-900/30 p-4 rounded-xl border border-gray-700/30 space-y-4 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Palabra Clave</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    placeholder="Ej. turno" 
                    value={newRule.trigger}
                    onChange={(e: any) => setNewRule({ ...newRule, trigger: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Tipo de Búsqueda</label>
                  <select 
                    className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    value={newRule.type}
                    onChange={(e: any) => setNewRule({ ...newRule, type: e.target.value })}
                  >
                    <option value="contains">Contiene la palabra</option>
                    <option value="exact">Coincidencia exacta</option>
                    <option value="starts_with">Empieza con</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Respuesta de WaveBro</label>
                <textarea 
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  rows={2}
                  placeholder="Escribe la respuesta. Usa | o saltos de línea para múltiples opciones aleatorias."
                  value={newRule.reply}
                  onChange={(e: any) => setNewRule({ ...newRule, reply: e.target.value })}
                />
              </div>
              <p className="text-[10px] text-gray-500 leading-tight">
                * Consejo: Si pones múltiples respuestas separadas por <strong>|</strong>, WaveBro elegirá una aleatoria cada vez para dar una sensación más humana y natural.
              </p>
              <button 
                type="submit" 
                className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 text-sm"
              >
                <Plus className="h-4 w-4" /> Agregar Nueva Regla
              </button>
            </form>

            {/* List of rules */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {rules.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-4">No hay reglas registradas aún.</p>
              ) : (
                rules.map((rule) => (
                  editingRuleId === rule.id ? (
                    <div 
                      key={rule.id} 
                      className="p-3.5 bg-gray-900/40 border border-purple-500/30 rounded-xl space-y-3"
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-gray-400 mb-0.5">Palabra Clave</label>
                          <input 
                            type="text" 
                            className="w-full px-2 py-1 bg-gray-700/50 border border-gray-600 rounded text-white text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            value={editTrigger}
                            onChange={(e: any) => setEditTrigger(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-400 mb-0.5">Tipo</label>
                          <select 
                            className="w-full px-2 py-1 bg-gray-700/50 border border-gray-600 rounded text-white text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            value={editType}
                            onChange={(e: any) => setEditType(e.target.value)}
                          >
                            <option value="contains">Contiene</option>
                            <option value="exact">Exacta</option>
                            <option value="starts_with">Empieza con</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-400 mb-0.5">Respuesta</label>
                        <textarea 
                          className="w-full px-2 py-1 bg-gray-700/50 border border-gray-600 rounded text-white text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          rows={2}
                          value={editReply}
                          onChange={(e: any) => setEditReply(e.target.value)}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => setEditingRuleId(null)}
                          className="px-2.5 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs font-bold transition-all flex items-center gap-1"
                        >
                          <X className="h-3.5 w-3.5" /> Cancelar
                        </button>
                        <button 
                          onClick={() => handleSaveRule(rule.id)}
                          className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-bold transition-all flex items-center gap-1"
                        >
                          <Save className="h-3.5 w-3.5" /> Guardar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      key={rule.id} 
                      className={`flex items-center justify-between p-3.5 bg-gray-900/20 border border-gray-700/30 rounded-xl transition-all ${rule.active ? 'opacity-100' : 'opacity-50'}`}
                    >
                      <div className="max-w-[70%] space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-[10px] font-bold tracking-wider">{rule.trigger}</span>
                          <span className="text-[10px] text-gray-500">
                            {rule.type === 'exact' ? 'Exacta' : rule.type === 'starts_with' ? 'Empieza con' : 'Contiene'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-300 truncate" title={rule.reply}>{rule.reply}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => handleStartEdit(rule)}
                          className="text-gray-400 hover:text-white transition-colors"
                          title="Editar Regla"
                        >
                          <Edit className="h-[15px] w-[15px]" />
                        </button>
                        <input 
                          type="checkbox" 
                          checked={rule.active} 
                          onChange={() => handleToggleRule(rule.id)}
                          className="w-3.5 h-3.5 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500 cursor-pointer"
                        />
                        <button 
                          onClick={() => handleDeleteRule(rule.id)}
                          className="text-red-400 hover:text-red-500 transition-colors"
                          title="Eliminar Regla"
                        >
                          <Trash2 className="h-[15px] w-[15px]" />
                        </button>
                      </div>
                    </div>
                  )
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Activity Feed */}
        <div className="lg:col-span-5">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-lg h-full flex flex-col min-h-[500px]">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-emerald-400" /> Historial de Actividad
            </h3>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[700px]">
              {activity.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 gap-2 py-16">
                  <HelpCircle className="h-7 w-7" />
                  <p className="text-sm">Esperando mensajes o eventos de WaveBro...</p>
                </div>
              ) : (
                activity.map((item) => (
                  <div key={item.id} className="p-3 bg-gray-900/30 border border-gray-700/30 rounded-xl space-y-2 hover:bg-gray-900/40 transition-colors">
                    {item.type === 'system' ? (
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${item.success ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <p className="text-xs text-gray-400 italic flex-1">{item.text}</p>
                        <span className="text-[10px] text-gray-500">{item.timestamp}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-blue-400">{item.from}</span>
                          <span className="text-[10px] text-gray-500">{item.timestamp}</span>
                        </div>
                        <p className="text-xs text-gray-300 leading-normal">{item.text}</p>
                        {item.response && (
                          <div className="p-2 bg-emerald-500/5 border-l-2 border-emerald-500 rounded-r-lg text-xs text-emerald-300">
                            <span className="text-[9px] text-gray-500 block mb-0.5">Respuesta de WaveBro:</span>
                            {item.response}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
