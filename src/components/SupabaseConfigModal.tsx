import React, { useState } from 'react';
import { Database, X, Check, Copy, ExternalLink, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';
import { getSupabaseConfig, saveSupabaseConfig, isSupabaseConfigured, SUPABASE_SETUP_SQL } from '../lib/supabase';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected?: () => void;
  onConfigSaved?: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onConnected,
  onConfigSaved
}) => {
  const current = getSupabaseConfig();
  const [url, setUrl] = useState(current.url || '');
  const [anonKey, setAnonKey] = useState(current.anonKey || '');
  const [copiedSql, setCopiedSql] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  if (!isOpen) return null;

  const handleCopySql = () => {
    navigator.clipboard?.writeText(SUPABASE_SETUP_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = url.trim();
    const cleanKey = anonKey.trim();

    if (!cleanUrl || !cleanKey) {
      setMessage({ text: 'Por favor ingresa tanto la URL como la Anon Key de Supabase.', isError: true });
      return;
    }

    const ok = saveSupabaseConfig(cleanUrl, cleanKey);
    if (ok) {
      setMessage({ text: '¡Conexión guardada con éxito! Supabase está activo.', isError: false });
      if (onConnected) onConnected();
      if (onConfigSaved) onConfigSaved();
      setTimeout(() => {
        setMessage(null);
        onClose();
      }, 1200);
    } else {
      setMessage({ text: 'No se pudo inicializar el cliente de Supabase. Revisa las credenciales.', isError: true });
    }
  };

  const handleDisconnect = () => {
    saveSupabaseConfig('', '');
    setUrl('');
    setAnonKey('');
    setMessage({ text: 'Configuración de Supabase removida.', isError: false });
    if (onConnected) onConnected();
    setTimeout(() => {
      setMessage(null);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-[#0b0f1e] border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative my-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-600/25 ring-1 ring-white/20">
            <Database className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-white">Conectar Base de Datos Supabase</h3>
              {isSupabaseConfigured() && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Online
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Todas las cuentas y bibliotecas se almacenarán en tu proyecto de Supabase.
            </p>
          </div>
        </div>

        {/* Mensaje de estado */}
        {message && (
          <div
            className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 border ${
              message.isError
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}
          >
            {message.isError ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> : <ShieldCheck className="w-4 h-4 flex-shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Paso 1: Copiar SQL */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Paso 1: Tablas en Supabase (SQL)
            </span>
            <button
              type="button"
              onClick={handleCopySql}
              className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/20 transition flex items-center gap-1 active:scale-95"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSql ? '¡Copiado!' : 'Copiar SQL'}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Pega este código en el <strong>SQL Editor</strong> de tu proyecto en{' '}
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:underline inline-flex items-center gap-0.5"
            >
              Supabase Dashboard <ExternalLink className="w-2.5 h-2.5" />
            </a>{' '}
            para crear automáticamente las tablas <code className="text-slate-300 bg-slate-900 px-1 rounded">user_accounts</code> y <code className="text-slate-300 bg-slate-900 px-1 rounded">user_mangas</code>.
          </p>
        </div>

        {/* Paso 2: Credenciales de Supabase */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Paso 2: Project URL (Supabase URL)
            </label>
            <input
              type="url"
              required
              placeholder="https://xyzcompany.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Encuéntrala en: <em>Project Settings &gt; API &gt; Project URL</em>
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Paso 3: Project API Anon Key (Public Key)
            </label>
            <textarea
              required
              rows={2}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono resize-none"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Encuéntrala en: <em>Project Settings &gt; API &gt; Project API Keys &gt; anon public</em>
            </p>
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
            {isSupabaseConfigured() ? (
              <button
                type="button"
                onClick={handleDisconnect}
                className="px-3 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition"
              >
                Desconectar
              </button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/60 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 transition rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 active:scale-95"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Guardar y Conectar</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
