import React, { useState, useMemo, useEffect } from 'react';
import {
  Crown,
  Users,
  UserPlus,
  Search,
  X,
  ShieldCheck,
  BookOpen,
  Eye,
  EyeOff,
  LogIn,
  Trash2,
  Edit3,
  Download,
  RefreshCw,
  Copy,
  Check,
  Star,
  User,
  Filter,
  ArrowUpDown,
  Sparkles,
  Calendar,
  Activity,
  AlertCircle,
  Database,
  Globe,
  Settings,
  UploadCloud,
  CheckCircle2,
  ExternalLink,
  Code,
  KeyRound,
  Lock,
  Unlock
} from 'lucide-react';
import { UserAccount, MangaItem, MangaFormat } from '../types';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  accounts: UserAccount[];
  onRefreshAccounts: () => void;
  onToggleRole: (uid: string) => void;
  onImpersonate: (account: UserAccount) => void;
  onDeleteAccount: (uid: string) => void;
  onCreateAccount: (accountData: {
    displayName: string;
    email: string;
    role: 'admin' | 'user';
    password?: string;
    seedMangas?: boolean;
  }) => Promise<void> | void;
  onUpdateAccount?: (accountData: {
    uid: string;
    displayName: string;
    email: string;
    role: 'admin' | 'user' | 'guest';
    password?: string;
  }) => void;
  onUpdatePassword?: (uid: string, newPassword: string) => Promise<boolean> | boolean;
  onExportJson: () => void;
  isCloudMode: boolean;
  isSupabaseOnline?: boolean;
  supabaseUrl?: string;
  onSaveSupabaseConfig?: (url: string, anonKey: string) => boolean;
  onSyncAllToSupabase?: () => Promise<void>;
  supabaseSqlScript?: string;
}

const FORMAT_CONFIG: Record<
  MangaFormat,
  { label: string; flag: string; badgeClass: string }
> = {
  manga: {
    label: 'Manga',
    flag: '🇯🇵',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30'
  },
  manhwa: {
    label: 'Manhwa',
    flag: '🇰🇷',
    badgeClass: 'bg-violet-500/15 text-violet-300 border-violet-500/30'
  },
  manhua: {
    label: 'Manhua',
    flag: '🇨🇳',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
  }
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  plan_to_read: { label: 'Por Leer', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  reading: { label: 'Leyendo', color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20' },
  on_hold: { label: 'En Pausa', color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
  completed: { label: 'Terminado', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  dropped: { label: 'Abandonado', color: 'text-rose-400 bg-rose-400/10 border-rose-400/20' }
};

// Generador de contraseñas seguras
const generateSecurePassword = (): string => {
  const words = ['Manga', 'Hunter', 'Shadow', 'Titan', 'Dragon', 'Ninja', 'RealM', 'Otaku'];
  const symbols = ['#', '!', '$', '&', '@'];
  const randomWord = words[Math.floor(Math.random() * words.length)];
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const randomSym = symbols[Math.floor(Math.random() * symbols.length)];
  return `${randomWord}${randomSym}${randomNum}`;
};

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  accounts,
  onRefreshAccounts,
  onToggleRole,
  onImpersonate,
  onDeleteAccount,
  onCreateAccount,
  onUpdateAccount,
  onUpdatePassword,
  onExportJson,
  isCloudMode,
  isSupabaseOnline = false,
  supabaseUrl = '',
  onSaveSupabaseConfig,
  onSyncAllToSupabase,
  supabaseSqlScript = ''
}) => {
  // Estados de búsqueda, filtros y ordenamiento
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user' | 'guest'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'mangas' | 'name' | 'lastLogin'>('recent');

  // Actualizar lista de cuentas automáticamente al abrir el panel de administración
  useEffect(() => {
    if (isOpen) {
      onRefreshAccounts();
    }
  }, [isOpen]);

  // Sondeo periódico cada 10 segundos mientras el panel esté abierto para detectar nuevas cuentas registradas
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      onRefreshAccounts();
    }, 10000);
    return () => clearInterval(interval);
  }, [isOpen, onRefreshAccounts]);

  // Control de contraseñas visibles por usuario (uid -> boolean)
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedPasswordUid, setCopiedPasswordUid] = useState<string | null>(null);

  // Modal para cambiar contraseña
  const [passwordModalUser, setPasswordModalUser] = useState<UserAccount | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [passwordToast, setPasswordToast] = useState('');

  // Modal para inspeccionar mangas del usuario
  const [inspectingUser, setInspectingUser] = useState<UserAccount | null>(null);
  const [inspectingMangas, setInspectingMangas] = useState<MangaItem[]>([]);

  // Formulario crear cuenta
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newForm, setNewForm] = useState({
    displayName: '',
    email: '',
    role: 'user' as 'admin' | 'user',
    password: generateSecurePassword(),
    seedMangas: true
  });

  // Modal para editar datos de cuenta
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editForm, setEditForm] = useState({
    displayName: '',
    email: '',
    role: 'user' as 'admin' | 'user' | 'guest',
    password: ''
  });

  // Modal de configuración de Supabase
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [supabaseForm, setSupabaseForm] = useState({
    url: supabaseUrl || '',
    anonKey: ''
  });
  const [supabaseSyncing, setSupabaseSyncing] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [supabaseMessage, setSupabaseMessage] = useState('');

  // Copiado al portapapeles de UID
  const [copiedUid, setCopiedUid] = useState<string | null>(null);

  const toggleRevealPassword = (uid: string) => {
    setRevealedPasswords((prev) => ({ ...prev, [uid]: !prev[uid] }));
  };

  const handleCopyPassword = (pwd: string, uid: string) => {
    navigator.clipboard?.writeText(pwd);
    setCopiedPasswordUid(uid);
    setTimeout(() => setCopiedPasswordUid(null), 2000);
  };

  const handleCopyUid = (uid: string) => {
    navigator.clipboard?.writeText(uid);
    setCopiedUid(uid);
    setTimeout(() => setCopiedUid(null), 2000);
  };

  const handleCopySql = () => {
    if (supabaseSqlScript) {
      navigator.clipboard?.writeText(supabaseSqlScript);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    }
  };

  const handleOpenPasswordModal = (account: UserAccount) => {
    setPasswordModalUser(account);
    setNewPasswordInput(generateSecurePassword());
    setPasswordToast('');
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser || !newPasswordInput.trim()) return;

    if (onUpdatePassword) {
      await onUpdatePassword(passwordModalUser.uid, newPasswordInput.trim());
    } else if (onUpdateAccount) {
      onUpdateAccount({
        uid: passwordModalUser.uid,
        displayName: passwordModalUser.displayName,
        email: passwordModalUser.email,
        role: passwordModalUser.role,
        password: newPasswordInput.trim()
      });
    }

    setPasswordToast('✅ Contraseña actualizada correctamente en Supabase y Local.');
    setTimeout(() => {
      setPasswordModalUser(null);
      setPasswordToast('');
    }, 1500);
  };

  const handleSaveSupabase = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSaveSupabaseConfig) {
      const ok = onSaveSupabaseConfig(supabaseForm.url, supabaseForm.anonKey);
      if (ok) {
        setSupabaseMessage('✅ ¡Conexión con Supabase guardada exitosamente!');
        onRefreshAccounts();
        setTimeout(() => {
          setIsSupabaseModalOpen(false);
          setSupabaseMessage('');
        }, 1500);
      } else {
        setSupabaseMessage('❌ Verifica que la URL y la Anon Key de Supabase sean correctas.');
      }
    }
  };

  const handleSyncToSupabase = async () => {
    if (!onSyncAllToSupabase) return;
    setSupabaseSyncing(true);
    setSupabaseMessage('Subiendo cuentas y contraseñas a Supabase...');
    try {
      await onSyncAllToSupabase();
      setSupabaseMessage('✅ Cuentas y contraseñas sincronizadas con Supabase.');
      onRefreshAccounts();
    } catch {
      setSupabaseMessage('❌ Error sincronizando cuentas con Supabase.');
    } finally {
      setSupabaseSyncing(false);
    }
  };

  const handleInspect = (account: UserAccount) => {
    setInspectingUser(account);
    try {
      const raw = localStorage.getItem(`mangakura_mangas_${account.uid}`) || localStorage.getItem(`inkrealm_mangas_${account.uid}`);
      if (raw) {
        setInspectingMangas(JSON.parse(raw));
      } else {
        setInspectingMangas([]);
      }
    } catch {
      setInspectingMangas([]);
    }
  };

  const handleStartEdit = (account: UserAccount) => {
    setEditingUser(account);
    setEditForm({
      displayName: account.displayName || '',
      email: account.email || '',
      role: account.role || 'user',
      password: account.password || 'mangakura123'
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (onUpdateAccount) {
      onUpdateAccount({
        uid: editingUser.uid,
        displayName: editForm.displayName.trim() || editForm.email.split('@')[0],
        email: editForm.email.trim(),
        role: editForm.role,
        password: editForm.password.trim() || 'mangakura123'
      });
    }
    setEditingUser(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.email.trim()) return;
    await onCreateAccount({
      displayName: newForm.displayName.trim() || newForm.email.split('@')[0],
      email: newForm.email.trim(),
      role: newForm.role,
      password: newForm.password.trim() || generateSecurePassword(),
      seedMangas: newForm.seedMangas
    });
    setNewForm({
      displayName: '',
      email: '',
      role: 'user',
      password: generateSecurePassword(),
      seedMangas: true
    });
    setIsCreateOpen(false);
  };

  const stats = useMemo(() => {
    const total = accounts.length;
    const admins = accounts.filter((a) => a.role === 'admin').length;
    const readers = accounts.filter((a) => a.role === 'user').length;
    const guests = accounts.filter((a) => a.role === 'guest' || a.isAnonymous).length;
    const totalMangas = accounts.reduce((acc, curr) => acc + (curr.mangaCount || 0), 0);
    return { total, admins, readers, guests, totalMangas };
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    return accounts
      .filter((acc) => {
        const query = search.toLowerCase().trim();
        const matchesQuery =
          !query ||
          acc.displayName?.toLowerCase().includes(query) ||
          acc.email?.toLowerCase().includes(query) ||
          acc.uid?.toLowerCase().includes(query);

        const matchesRole =
          roleFilter === 'all' ||
          (roleFilter === 'guest'
            ? acc.role === 'guest' || acc.isAnonymous
            : acc.role === roleFilter);

        return matchesQuery && matchesRole;
      })
      .sort((a, b) => {
        if (sortBy === 'recent') {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        }
        if (sortBy === 'oldest') {
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        }
        if (sortBy === 'mangas') {
          return (b.mangaCount || 0) - (a.mangaCount || 0);
        }
        if (sortBy === 'name') {
          return (a.displayName || a.email || '').localeCompare(b.displayName || b.email || '');
        }
        if (sortBy === 'lastLogin') {
          return new Date(b.lastLogin || 0).getTime() - new Date(a.lastLogin || 0).getTime();
        }
        return 0;
      });
  }, [accounts, search, roleFilter, sortBy]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr || dateStr === 'Nunca') return 'Nunca';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatRelativeTime = (dateStr?: string) => {
    if (!dateStr || dateStr === 'Nunca') return 'Nunca';
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHours / 24);
      if (diffMin < 2) return 'Ahora mismo';
      if (diffMin < 60) return `Hace ${diffMin} min`;
      if (diffHours < 24) return `Hace ${diffHours} h`;
      if (diffDays === 1) return 'Ayer';
      if (diffDays < 30) return `Hace ${diffDays} d`;
      return formatDate(dateStr);
    } catch {
      return dateStr;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#0b0f1e] border border-slate-700/80 rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* ENCABEZADO */}
        <div className="p-4 sm:p-6 border-b border-slate-800 bg-[#080b16] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-amber-500/20 ring-1 ring-white/20">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black tracking-wide text-white">
                  Panel de Administrador de Cuentas
                </h2>
                
                {/* Badge de conexión a Supabase */}
                {isSupabaseOnline ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Supabase Online (Conectado)
                  </span>
                ) : (
                  <button
                    onClick={() => setIsSupabaseModalOpen(true)}
                    className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 flex items-center gap-1 transition cursor-pointer"
                    title="Conectar a base de datos Supabase"
                  >
                    <Database className="w-3 h-3 text-amber-400" />
                    <span>Conectar Supabase</span>
                  </button>
                )}

                {/* Badge de conexión a Firebase Firestore */}
                {isCloudMode && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40 flex items-center gap-1.5 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                    Firebase Firestore (Nube)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isSupabaseOnline || isCloudMode
                  ? 'Sincronizado en tiempo real con la base de datos (con auditoría y control de contraseñas)'
                  : 'Audita y gestiona cuentas, contraseñas y permisos del sistema'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Botón Configurar Supabase */}
            <button
              onClick={() => setIsSupabaseModalOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs font-semibold rounded-xl transition ${
                isSupabaseOnline
                  ? 'bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-300 border-emerald-500/30'
                  : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-amber-500/30'
              }`}
              title="Configurar conexión con Supabase"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">
                {isSupabaseOnline ? 'Supabase Activo' : 'Configurar Supabase'}
              </span>
            </button>

            <button
              onClick={onExportJson}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold rounded-xl transition"
              title="Exportar archivo de auditoría JSON"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Exportar JSON</span>
            </button>

            <button
              onClick={onRefreshAccounts}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-xl transition"
              title="Recargar cuentas en tiempo real"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
              title="Cerrar panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CUERPO DEL PANEL */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          
          {/* TARJETAS KPI DE RESUMEN */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Cuentas</span>
                <p className="text-xl font-black text-white">{stats.total}</p>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Admins</span>
                <p className="text-xl font-black text-amber-300">{stats.admins}</p>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Obras Guardadas</span>
                <p className="text-xl font-black text-rose-300">{stats.totalMangas}</p>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Control Claves</span>
                <p className="text-xs font-bold text-white truncate">
                  Gestión Activa
                </p>
                <span className="text-[10px] text-emerald-400 font-semibold">
                  {isSupabaseOnline ? 'En Supabase' : 'En Local'}
                </span>
              </div>
            </div>
          </div>

          {/* BARRA DE BÚSQUEDA, FILTROS Y BOTÓN CREAR */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
              {/* Buscador */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por correo, nombre o UID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filtro por Rol */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 border border-slate-800 rounded-xl text-xs">
                <button
                  onClick={() => setRoleFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    roleFilter === 'all'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Todos ({stats.total})
                </button>
                <button
                  onClick={() => setRoleFilter('admin')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    roleFilter === 'admin'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  👑 Admins ({stats.admins})
                </button>
                <button
                  onClick={() => setRoleFilter('user')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    roleFilter === 'user'
                      ? 'bg-indigo-500/20 text-indigo-300'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📖 Lectores ({stats.readers})
                </button>
                <button
                  onClick={() => setRoleFilter('guest')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    roleFilter === 'guest'
                      ? 'bg-slate-700/50 text-slate-300'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  👻 Invitados ({stats.guests})
                </button>
              </div>

              {/* Ordenamiento */}
              <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 border border-slate-800 rounded-xl">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="recent" className="bg-slate-900">Más recientes</option>
                  <option value="lastLogin" className="bg-slate-900">Última conexión</option>
                  <option value="mangas" className="bg-slate-900">Más mangas</option>
                  <option value="name" className="bg-slate-900">Nombre (A-Z)</option>
                  <option value="oldest" className="bg-slate-900">Más antiguos</option>
                </select>
              </div>
            </div>

            {/* Botón Crear Usuario */}
            <button
              onClick={() => setIsCreateOpen(!isCreateOpen)}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white text-xs font-bold rounded-xl shadow-lg transition active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isCreateOpen ? 'Ocultar Formulario' : 'Crear Usuario'}</span>
            </button>
          </div>

          {/* FORMULARIO CREAR CUENTA NUEVA CON CONTRASEÑA */}
          {isCreateOpen && (
            <div className="bg-[#080c18] border border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-xl animate-in fade-in duration-200">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4" /> Registrar Nueva Cuenta {isSupabaseOnline && '(Se guardará en Supabase con contraseña)'}
                </h4>
                <span className="text-[10px] text-slate-500">Se registrará y sincronizará de inmediato</span>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Nombre / Nickname</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. OtakuLover"
                      value={newForm.displayName}
                      onChange={(e) => setNewForm({ ...newForm, displayName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Correo Electrónico</label>
                    <input
                      type="email"
                      required
                      placeholder="usuario@ejemplo.com"
                      value={newForm.email}
                      onChange={(e) => setNewForm({ ...newForm, email: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Rol Asignado</label>
                    <select
                      value={newForm.role}
                      onChange={(e) => setNewForm({ ...newForm, role: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      <option value="user">📖 Lector Normal</option>
                      <option value="admin">👑 Administrador</option>
                    </select>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-semibold text-slate-300">Contraseña</label>
                      <button
                        type="button"
                        onClick={() => setNewForm({ ...newForm, password: generateSecurePassword() })}
                        className="text-[10px] text-amber-400 hover:underline font-bold"
                      >
                        🎲 Generar
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Clave segura..."
                      value={newForm.password}
                      onChange={(e) => setNewForm({ ...newForm, password: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newForm.seedMangas}
                      onChange={(e) => setNewForm({ ...newForm, seedMangas: e.target.checked })}
                      className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-amber-500"
                    />
                    <span>Precargar obras de ejemplo en su biblioteca personal</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCreateOpen(false)}
                      className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold rounded-xl transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-gradient-to-r from-amber-600 to-rose-600 text-white text-xs font-bold rounded-xl shadow transition hover:opacity-95 active:scale-95"
                    >
                      Guardar y Crear Cuenta
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* LISTA DE CUENTAS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>Mostrando {filteredAccounts.length} de {accounts.length} cuentas</span>
              <span className="text-[11px] text-slate-500">
                Tip: Haz clic en el ícono de llave 🔑 para ver o cambiar la contraseña de cualquier usuario
              </span>
            </div>

            {filteredAccounts.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
                <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-300">No se encontraron cuentas</p>
                <p className="text-xs text-slate-500 mt-1">Intenta con otro término de búsqueda o limpia los filtros.</p>
                <button
                  onClick={() => {
                    setSearch('');
                    setRoleFilter('all');
                  }}
                  className="mt-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 rounded-xl transition"
                >
                  Restablecer Filtros
                </button>
              </div>
            ) : (
              filteredAccounts.map((acc) => {
                const isSelf = currentUser?.uid === acc.uid;
                const isAccountAdmin = acc.role === 'admin';
                const isGuest = acc.role === 'guest' || acc.isAnonymous;
                const isRevealed = !!revealedPasswords[acc.uid];
                const displayPassword = acc.password || 'mangakura123';

                return (
                  <div
                    key={acc.uid}
                    className={`bg-slate-900/70 border rounded-2xl p-4 transition duration-200 hover:bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isSelf ? 'border-amber-500/50 shadow-md shadow-amber-500/5' : 'border-slate-800/90'
                    }`}
                  >
                    {/* Avatar e Información Principal */}
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                      <div
                        className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${
                          acc.avatarGradient ||
                          (isAccountAdmin
                            ? 'from-amber-500 via-rose-500 to-red-600'
                            : isGuest
                            ? 'from-slate-600 to-zinc-700'
                            : 'from-indigo-500 via-purple-500 to-violet-600')
                        } flex items-center justify-center font-bold text-white shadow-md flex-shrink-0 text-base ring-1 ring-white/10`}
                      >
                        {acc.displayName?.charAt(0).toUpperCase() || acc.email?.charAt(0).toUpperCase() || 'U'}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-white truncate max-w-[220px]" title={acc.displayName}>
                            {acc.displayName || 'Sin nombre'}
                          </h4>
                          {isSelf && (
                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Tú (Sesión Actual)
                            </span>
                          )}

                          {isSupabaseOnline && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Online
                            </span>
                          )}

                          {/* Botón de Rol Interactivo */}
                          <button
                            onClick={() => onToggleRole(acc.uid)}
                            title="Haz clic para alternar rol (Lector ↔ Admin)"
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition flex items-center gap-1 active:scale-95 ${
                              isAccountAdmin
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                                : isGuest
                                ? 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                                : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/25'
                            }`}
                          >
                            {isAccountAdmin ? (
                              <Crown className="w-3 h-3 text-amber-400" />
                            ) : (
                              <User className="w-3 h-3" />
                            )}
                            <span>{isAccountAdmin ? 'Administrador' : isGuest ? 'Invitado' : 'Lector'}</span>
                          </button>
                        </div>

                        <p className="text-xs text-slate-400 truncate max-w-[280px] mt-0.5" title={acc.email}>
                          {acc.email}
                        </p>

                        {/* Fila de Contraseña con Revelar y Copiar */}
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800/90 w-fit flex-wrap">
                          <Lock className="w-3 h-3 text-amber-400 flex-shrink-0" />
                          <span className="text-slate-400">Clave:</span>
                          <span className="font-mono text-slate-200 select-all font-semibold">
                            {isRevealed ? displayPassword : '••••••••'}
                          </span>
                          <button
                            onClick={() => toggleRevealPassword(acc.uid)}
                            className="p-0.5 text-slate-400 hover:text-white transition"
                            title={isRevealed ? "Ocultar contraseña" : "Ver contraseña"}
                          >
                            {isRevealed ? (
                              <EyeOff className="w-3 h-3 text-indigo-400" />
                            ) : (
                              <Eye className="w-3 h-3 text-slate-400" />
                            )}
                          </button>
                          <button
                            onClick={() => handleCopyPassword(displayPassword, acc.uid)}
                            className="p-0.5 text-slate-400 hover:text-white transition"
                            title="Copiar contraseña"
                          >
                            {copiedPasswordUid === acc.uid ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-400" />
                            )}
                          </button>
                          <button
                            onClick={() => handleOpenPasswordModal(acc)}
                            className="ml-1 text-[10px] text-amber-400 hover:underline font-bold"
                            title="Cambiar o restablecer contraseña"
                          >
                            (Cambiar)
                          </button>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 flex-wrap font-mono">
                          <span className="flex items-center gap-1">
                            UID: <span className="text-slate-400">{acc.uid.slice(0, 14)}...</span>
                            <button
                              onClick={() => handleCopyUid(acc.uid)}
                              className="text-slate-500 hover:text-slate-200 transition"
                              title="Copiar UID completo"
                            >
                              {copiedUid === acc.uid ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </span>
                          <span>•</span>
                          <span title={`Fecha exacta: ${acc.createdAt}`}>
                            Reg: {formatDate(acc.createdAt)}
                          </span>
                          <span>•</span>
                          <span title={`Último login: ${acc.lastLogin}`}>
                            Activo: {formatRelativeTime(acc.lastLogin)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Acciones y Biblioteca */}
                    <div className="flex items-center gap-2 flex-wrap justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                      {/* Botón Ver Biblioteca de Mangas */}
                      <button
                        onClick={() => handleInspect(acc)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/70 rounded-xl text-xs font-semibold transition"
                        title="Ver mangas guardados en su biblioteca privada"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Ver Obras</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-slate-950 text-indigo-300 font-bold text-[10px] border border-slate-700">
                          {acc.mangaCount || 0}
                        </span>
                      </button>

                      {/* Botón Gestionar Contraseña */}
                      <button
                        onClick={() => handleOpenPasswordModal(acc)}
                        className="p-2 text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-xl border border-transparent hover:border-amber-500/20 transition"
                        title="Cambiar o restablecer contraseña"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                      </button>

                      {/* Botón Editar Cuenta */}
                      <button
                        onClick={() => handleStartEdit(acc)}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl border border-transparent hover:border-slate-700 transition"
                        title="Editar nombre, correo o contraseña"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* Botón Suplantar / Entrar como este usuario */}
                      {!isSelf && (
                        <button
                          onClick={() => onImpersonate(acc)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold transition active:scale-95"
                          title="Iniciar sesión inmediatamente como este usuario"
                        >
                          <LogIn className="w-3.5 h-3.5" />
                          <span>Entrar</span>
                        </button>
                      )}

                      {/* Botón Eliminar Cuenta */}
                      {!isSelf && (
                        <button
                          onClick={() => onDeleteAccount(acc.uid)}
                          className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl border border-transparent hover:border-rose-500/20 transition"
                          title="Eliminar cuenta y su biblioteca personal"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* PIE DEL MODAL */}
        <div className="p-4 border-t border-slate-800 bg-[#080b16] flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isSupabaseOnline ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`} />
            <span>
              {isSupabaseOnline
                ? 'Conectado a Supabase Cloud Database • Control de Contraseñas Activo'
                : 'Modo Local • Control de Contraseñas Local'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition"
          >
            Cerrar Panel
          </button>
        </div>
      </div>

      {/* MODAL: CAMBIO / GESTIÓN DE CONTRASEÑA */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-[75] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in zoom-in-95 duration-200">
          <div className="bg-[#0b0f20] border border-amber-500/40 rounded-2xl max-w-md w-full p-5 shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Gestionar Contraseña
                  </h3>
                  <p className="text-xs text-slate-400 truncate max-w-[240px]">
                    {passwordModalUser.displayName || passwordModalUser.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPasswordModalUser(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {passwordToast && (
              <div className="p-3 bg-slate-900 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 font-medium">
                {passwordToast}
              </div>
            )}

            <form onSubmit={handleSavePassword} className="space-y-4">
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">Contraseña Actual Registrada:</span>
                <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs font-mono text-slate-200">
                  <span>{passwordModalUser.password || 'mangakura123'}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyPassword(passwordModalUser.password || 'mangakura123', 'current')}
                    className="text-slate-400 hover:text-white text-[11px] flex items-center gap-1 font-sans"
                  >
                    <Copy className="w-3 h-3" /> Copiar
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Nueva Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewPasswordInput(generateSecurePassword())}
                    className="text-[11px] text-amber-400 hover:underline font-bold"
                  >
                    🎲 Generar Aleatoria
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="Escribe la nueva contraseña..."
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono font-semibold"
                />
              </div>

              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-[11px] text-slate-400 space-y-1">
                <span className="font-bold text-slate-300 block">Sincronización:</span>
                <p>
                  Esta contraseña se actualizará de inmediato en la tabla <strong>user_accounts</strong> de Supabase y en el almacenamiento local.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPasswordModalUser(null)}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-xs text-slate-400 hover:text-white font-semibold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white text-xs font-bold rounded-xl shadow transition"
                >
                  Guardar en Supabase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SECUNDARIO: CONFIGURACIÓN DE SUPABASE */}
      {isSupabaseModalOpen && (
        <div className="fixed inset-0 z-[75] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in zoom-in-95 duration-200">
          <div className="bg-[#0b0f20] border border-emerald-500/40 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Conectar Base de Datos Supabase
                  </h3>
                  <p className="text-xs text-slate-400">
                    Sincroniza todas las cuentas y contraseñas creadas en la nube para verlas online desde cualquier lugar
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsSupabaseModalOpen(false);
                  setSupabaseMessage('');
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {supabaseMessage && (
              <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 font-medium">
                {supabaseMessage}
              </div>
            )}

            <form onSubmit={handleSaveSupabase} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Project URL de Supabase
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://xyzabcdefg.supabase.co"
                  value={supabaseForm.url}
                  onChange={(e) => setSupabaseForm({ ...supabaseForm, url: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Anon / Public API Key
                </label>
                <input
                  type="password"
                  required
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={supabaseForm.anonKey}
                  onChange={(e) => setSupabaseForm({ ...supabaseForm, anonKey: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Acciones principales */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-indigo-500/30 text-xs font-semibold rounded-xl transition"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Code className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? '¡SQL Copiado!' : 'Copiar Script SQL para Supabase'}</span>
                </button>

                <div className="flex items-center gap-2">
                  {isSupabaseOnline && (
                    <button
                      type="button"
                      onClick={handleSyncToSupabase}
                      disabled={supabaseSyncing}
                      className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold rounded-xl transition disabled:opacity-50"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>{supabaseSyncing ? 'Sincronizando...' : 'Subir Cuentas Locales a Supabase'}</span>
                    </button>
                  )}

                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow transition"
                  >
                    Guardar y Conectar
                  </button>
                </div>
              </div>
            </form>

            {/* Guía Rápida */}
            <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl text-xs text-slate-400 space-y-2">
              <span className="font-bold text-slate-300 block">¿Cómo obtener estos datos en 2 minutos?</span>
              <ol className="list-decimal pl-4 space-y-1 text-[11px] text-slate-400">
                <li>Crea un proyecto gratis en <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline">supabase.com</a>.</li>
                <li>En tu proyecto, ve a <strong>SQL Editor</strong>, haz clic en <em>"Copiar Script SQL"</em> arriba, pégalo y haz clic en <strong>Run</strong>.</li>
                <li>Ve a <strong>Project Settings ➜ API</strong> y copia la <strong>Project URL</strong> y la <strong>anon public key</strong>.</li>
                <li>Pégalas en los campos de arriba y presiona <strong>Guardar y Conectar</strong>.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SECUNDARIO: INSPECTOR DE BIBLIOTECA */}
      {inspectingUser && (
        <div className="fixed inset-0 z-[65] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in zoom-in-95 duration-200">
          <div className="bg-[#0c1022] border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow">
                  {inspectingUser.displayName?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">
                      Biblioteca de {inspectingUser.displayName || inspectingUser.email}
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {inspectingUser.role === 'admin' ? '👑 Admin' : '📖 Lector'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {inspectingUser.email} • {inspectingMangas.length} obras registradas en su perfil
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectingUser(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[65vh]">
              {inspectingMangas.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-300">Esta cuenta no tiene obras guardadas</p>
                  <p className="text-xs text-slate-500 mt-1">El usuario aún no ha agregado ningún manga a su lista.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {inspectingMangas.map((m) => {
                    const fmt = FORMAT_CONFIG[m.format] || FORMAT_CONFIG.manga;
                    const statusInfo = STATUS_LABELS[m.status] || {
                      label: m.status,
                      color: 'text-slate-400 bg-slate-800 border-slate-700'
                    };

                    return (
                      <div
                        key={m.id}
                        className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex gap-3 items-center hover:border-slate-700 transition"
                      >
                        <img
                          src={m.cover}
                          alt={m.title}
                          className="w-14 h-20 object-cover rounded-lg bg-slate-950 flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80';
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded border ${fmt.badgeClass}`}>
                              {fmt.flag} {fmt.label}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-white truncate" title={m.title}>
                            {m.title}
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Cap. {m.currentChap} {m.totalChap > 0 ? `/ ${m.totalChap}` : ''}
                          </p>
                          <div className="flex items-center gap-1 text-[10px] text-amber-400 mt-1 font-semibold">
                            <Star className="w-3 h-3 fill-amber-400" />
                            <span>{m.score || 0} / 10</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-slate-800 bg-slate-950 flex justify-end">
              <button
                onClick={() => setInspectingUser(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition"
              >
                Volver a Lista de Usuarios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SECUNDARIO: EDITAR USUARIO */}
      {editingUser && (
        <div className="fixed inset-0 z-[65] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in zoom-in-95 duration-200">
          <div className="bg-[#0c1022] border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-400" />
                Editar Cuenta de Usuario
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre / Display Name</label>
                <input
                  type="text"
                  required
                  value={editForm.displayName}
                  onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Rol</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="user">📖 Lector Normal</option>
                  <option value="admin">👑 Administrador</option>
                  <option value="guest">👻 Invitado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Contraseña</label>
                <input
                  type="text"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800 mt-4">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-amber-600 to-rose-600 text-white text-xs font-bold rounded-xl shadow transition hover:opacity-90"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
