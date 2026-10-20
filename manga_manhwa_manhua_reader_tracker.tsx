import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Star,
  CheckCircle2,
  Clock,
  PlayCircle,
  PauseCircle,
  Sparkles,
  Trash2,
  Edit3,
  LayoutGrid,
  Kanban,
  Flame,
  ArrowUpDown,
  X,
  Compass,
  BookmarkCheck,
  ScrollText,
  Layers,
  Globe,
  Loader2,
  Check,
  LogIn,
  UserPlus,
  LogOut,
  User,
  Mail,
  Lock,
  AlertCircle,
  ShieldCheck,
  UserCheck,
  Crown,
  Users,
  UserCog,
  ShieldAlert,
  Eye,
  Download,
  RefreshCw,
  Copy,
  ExternalLink,
  Shield,
  Trophy,
  Database
} from 'lucide-react';

import { AdminPanelModal } from './src/components/AdminPanelModal';
import { SupabaseConfigModal } from './src/components/SupabaseConfigModal';
import { PortadaLanding, TOP_RATED_MANGAS, TopManga } from './src/components/PortadaLanding';
import { UserAccount, MangaItem, MangaFormat, MangaStatus } from './src/types';
import {
  isSupabaseConfigured,
  getSupabaseConfig,
  saveSupabaseConfig,
  fetchAccountsFromSupabase,
  upsertAccountToSupabase,
  updateAccountInSupabase,
  updatePasswordInSupabase,
  deleteAccountFromSupabase,
  fetchMangasFromSupabase,
  saveMangaToSupabase,
  deleteMangaFromSupabase,
  updateMangaStatusInSupabase,
  updateMangaProgressInSupabase,
  authenticateUserWithSupabase,
  registerUserInSupabase,
  fetchUserAccountByUid,
  cleanLegacyLocalStorage,
  syncUserMangasToSupabase,
  SUPABASE_SETUP_SQL
} from './src/lib/supabase';


// Formatos reconocidos según origen
const FORMAT_CONFIG = {
  manga: {
    label: 'Manga',
    origin: 'Japón',
    flag: '🇯🇵',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    accentColor: 'rose',
    gradient: 'from-rose-500 to-pink-600'
  },
  manhwa: {
    label: 'Manhwa',
    origin: 'Corea',
    flag: '🇰🇷',
    badgeClass: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    accentColor: 'violet',
    gradient: 'from-violet-500 to-purple-600'
  },
  manhua: {
    label: 'Manhua',
    origin: 'China',
    flag: '🇨🇳',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    accentColor: 'emerald',
    gradient: 'from-emerald-500 to-teal-600'
  }
};

// Mapeo automático desde countryOfOrigin de AniList
const mapCountryToFormat = (country) => {
  if (country === 'KR') return 'manhwa';
  if (country === 'CN' || country === 'TW') return 'manhua';
  return 'manga'; // Default Japón
};

// Opciones de Estado de lectura
const STATUS_OPTIONS = [
  { 
    id: 'plan_to_read', 
    label: 'Por Leer', 
    shortLabel: 'Por Leer', 
    icon: Clock, 
    color: 'text-amber-400', 
    bg: 'bg-amber-400/10 border-amber-500/20' 
  },
  { 
    id: 'reading', 
    label: 'Leyendo', 
    shortLabel: 'Leyendo', 
    icon: PlayCircle, 
    color: 'text-cyan-400', 
    bg: 'bg-cyan-400/10 border-cyan-500/20' 
  },
  { 
    id: 'on_hold', 
    label: 'En Pausa / Pendiente', 
    shortLabel: 'En Pausa', 
    icon: PauseCircle, 
    color: 'text-orange-400', 
    bg: 'bg-orange-400/10 border-orange-500/20' 
  },
  { 
    id: 'completed', 
    label: 'Terminado', 
    shortLabel: 'Terminado', 
    icon: CheckCircle2, 
    color: 'text-emerald-400', 
    bg: 'bg-emerald-400/10 border-emerald-500/20' 
  },
];

// Base de datos alojada íntegramente en Supabase (sin datos demo locales)


// Query GraphQL de AniList
const ANILIST_GRAPHQL_QUERY = `
query ($search: String) {
  Page(page: 1, perPage: 8) {
    media(search: $search, type: MANGA, sort: SEARCH_MATCH) {
      id
      title {
        romaji
        english
        native
      }
      countryOfOrigin
      coverImage {
        extraLarge
        large
      }
      chapters
      status
      description
      genres
      staff(perPage: 2) {
        nodes {
          name {
            full
          }
        }
      }
    }
  }
}
`;

export default function App() {
  // Estado de Usuario & Auth
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [authModalTab, setAuthModalTab] = useState('login'); // 'login' | 'register'
  const [authForm, setAuthForm] = useState({ displayName: '', email: '', password: '' });
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Datos en la nube (Firestore)
  const [items, setItems] = useState([]);
  const [firestoreLoading, setFirestoreLoading] = useState(true);

  // Estados de vista y filtros
  const [search, setSearch] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('all'); // all | manga | manhwa | manhua
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('updatedAt'); // updatedAt | score | title | currentChap
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'kanban'

  // Estados del Modal de Agregar/Editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState('anilist'); // 'anilist' | 'manual'
  const [editingItem, setEditingItem] = useState(null);

  // Estados del Administrador de Cuentas
  const [registeredAccounts, setRegisteredAccounts] = useState<UserAccount[]>([]);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [adminToast, setAdminToast] = useState('');
  const [impersonatedOriginalUser, setImpersonatedOriginalUser] = useState<any>(null);

  // Pestaña principal de navegación: 'library' | 'portada'
  const [activeMainTab, setActiveMainTab] = useState<'library' | 'portada'>('library');
  const [isVisitorAuthOpen, setIsVisitorAuthOpen] = useState(false);

  const showAdminToast = (msg: string) => {
    setAdminToast(msg);
    setTimeout(() => setAdminToast(''), 3500);
  };

  // Obtener cuentas directamente desde Supabase
  const refreshAccountsList = async (): Promise<UserAccount[]> => {
    try {
      const cloudAccounts = await fetchAccountsFromSupabase();
      if (cloudAccounts && Array.isArray(cloudAccounts)) {
        setRegisteredAccounts(cloudAccounts);
        return cloudAccounts;
      }
    } catch (err) {
      console.warn('Error sincronizando cuentas desde Supabase:', err);
    }
    return [];
  };

  // Sincronización multi-pestaña mediante BroadcastChannel y eventos storage
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel('mangakura_sync_channel');
        bc.onmessage = (event) => {
          if (event.data?.type === 'ACCOUNT_SAVED') {
            refreshAccountsList();
          }
        };
      } catch (e) {}
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'mangakura_supabase_config') {
        refreshAccountsList();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Estados de Búsqueda AniList
  const [apiQuery, setApiQuery] = useState('');
  const [apiResults, setApiResults] = useState([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [selectedAniListMedia, setSelectedAniListMedia] = useState(null);

  // Formulario de Manga
  const [formData, setFormData] = useState({
    title: '',
    format: 'manga',
    status: 'plan_to_read',
    cover: '',
    currentChap: 0,
    totalChap: 0,
    score: 8,
    genre: '',
    author: '',
    notes: '',
    anilistId: null
  });

  // 1. Inicialización de sesión y autenticación con Supabase
  useEffect(() => {
    let isMounted = true;
    const initAuth = async () => {
      try {
        // Limpiar claves antiguas de almacenamiento mock local
        cleanLegacyLocalStorage();

        const savedUser = localStorage.getItem('mangakura_user');
        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          if (parsed && parsed.uid) {
            // Verificar datos actualizados en Supabase
            const freshAcc = await fetchUserAccountByUid(parsed.uid);
            if (isMounted) {
              const active = freshAcc || parsed;
              setUser(active);
              localStorage.setItem('mangakura_user', JSON.stringify(active));
            }
          }
        }
      } catch (err) {
        console.warn('Error inicializando autenticación con Supabase:', err);
      } finally {
        await refreshAccountsList();
        if (isMounted) setAuthLoading(false);
      }
    };

    initAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Carga de mangas directamente desde Supabase
  useEffect(() => {
    let isMounted = true;
    if (!user) {
      setItems([]);
      setFirestoreLoading(false);
      return;
    }

    setFirestoreLoading(true);
    fetchMangasFromSupabase(user.uid)
      .then((loaded) => {
        if (isMounted) {
          setItems(loaded);
          setFirestoreLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error cargando mangas desde Supabase:', err);
        if (isMounted) {
          setItems([]);
          setFirestoreLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Manejo de Registro con Email y Contraseña (Supabase)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSubmitting(true);

    try {
      const isFirstUserOrAdmin =
        authForm.email.toLowerCase().includes('admin') || registeredAccounts.length === 0;
      const assignedRole: 'admin' | 'user' = isFirstUserOrAdmin ? 'admin' : 'user';

      const newUser: UserAccount = {
        uid: 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        displayName: authForm.displayName.trim() || authForm.email.split('@')[0],
        email: authForm.email.trim().toLowerCase(),
        password: authForm.password,
        role: assignedRole,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        isAnonymous: false,
        mangaCount: 0,
        avatarGradient:
          assignedRole === 'admin'
            ? 'from-amber-500 via-rose-500 to-red-600'
            : 'from-indigo-500 via-purple-500 to-violet-600'
      };

      const regResult = await registerUserInSupabase(newUser);
      if (!regResult.success || !regResult.user) {
        throw new Error(regResult.error || 'Error al crear la cuenta en Supabase.');
      }
      const registered = regResult.user;
      localStorage.setItem('mangakura_user', JSON.stringify(registered));
      setUser(registered);
      setItems([]);
      await refreshAccountsList();
      setIsVisitorAuthOpen(false);
      showAdminToast(`¡Cuenta de ${registered.displayName} creada en Supabase!`);
    } catch (err: any) {
      console.error('Error en registro:', err);
      setAuthError(err.message || 'Error al crear la cuenta en Supabase. Verifica tu conexión.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Manejo de Login con Email y Contraseña (Supabase)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSubmitting(true);

    try {
      const authResult = await authenticateUserWithSupabase(authForm.email, authForm.password);
      if (!authResult.success || !authResult.user) {
        throw new Error(authResult.error || 'Correo o contraseña incorrectos en Supabase.');
      }
      const account = authResult.user;
      localStorage.setItem('mangakura_user', JSON.stringify(account));
      setUser(account);
      await refreshAccountsList();
      setIsVisitorAuthOpen(false);
      showAdminToast(`¡Bienvenido de nuevo, ${account.displayName}!`);
    } catch (err: any) {
      console.error('Error en inicio de sesión:', err);
      setAuthError(err.message || 'Correo o contraseña incorrectos en Supabase.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Acceso como Invitado (Registrado en Supabase con rol guest)
  const handleGuestLogin = async () => {
    setAuthError('');
    setAuthSubmitting(true);

    try {
      const guestId = 'guest_' + Date.now();
      const guestUser: UserAccount = {
        uid: guestId,
        displayName: 'Lector Invitado',
        email: `invitado_${Date.now()}@mangakura.local`,
        password: 'guest_' + Math.random().toString(36).substring(2, 8),
        role: 'guest',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        isAnonymous: true,
        mangaCount: 0,
        avatarGradient: 'from-slate-600 to-zinc-700'
      };

      const regRes = await registerUserInSupabase(guestUser);
      const savedGuest = regRes.success && regRes.user ? regRes.user : guestUser;
      localStorage.setItem('mangakura_user', JSON.stringify(savedGuest));
      setUser(savedGuest);
      setItems([]);
      await refreshAccountsList();
      setIsVisitorAuthOpen(false);
      showAdminToast('Sesión iniciada como Invitado');
    } catch (err: any) {
      console.error('Error iniciando sesión como invitado:', err);
      setAuthError('Error al iniciar como invitado.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Cierre de Sesión
  const handleSignOut = async () => {
    try {
      localStorage.removeItem('mangakura_user');
      localStorage.removeItem('inkrealm_user');
      setUser(null);
      setItems([]);
    } catch (err) {
      console.error('Error cerrando sesión:', err);
    }
  };

  // Alternar Rol (Admin <-> Lector) en Supabase
  const handleToggleRole = async (targetUid: string) => {
    const target = registeredAccounts.find((a) => a.uid === targetUid);
    if (!target) return;
    const newRole: 'admin' | 'user' = target.role === 'admin' ? 'user' : 'admin';
    await updateAccountInSupabase(targetUid, { role: newRole });

    if (user && user.uid === targetUid) {
      const updatedUser = { ...user, role: newRole };
      setUser(updatedUser);
      localStorage.setItem('mangakura_user', JSON.stringify(updatedUser));
    }

    await refreshAccountsList();
    showAdminToast(
      `Rol de ${target.displayName || target.email} actualizado a ${
        newRole === 'admin' ? 'Administrador' : 'Lector'
      }`
    );
  };

  // Suplantar / Entrar como este usuario
  const handleImpersonate = (account: any) => {
    if (user && user.role === 'admin' && !impersonatedOriginalUser) {
      setImpersonatedOriginalUser(user);
    }
    const impersonated = {
      uid: account.uid,
      displayName: account.displayName || account.email?.split('@')[0] || 'Usuario',
      email: account.email,
      role: account.role || 'user',
      isAnonymous: !!account.isAnonymous
    };
    localStorage.setItem('mangakura_user', JSON.stringify(impersonated));
    setUser(impersonated);
    setIsAdminModalOpen(false);
    showAdminToast(`Navegando ahora como: ${impersonated.displayName}`);
  };

  // Restaurar sesión de Administrador
  const handleRestoreAdmin = async () => {
    if (impersonatedOriginalUser) {
      localStorage.setItem('mangakura_user', JSON.stringify(impersonatedOriginalUser));
      setUser(impersonatedOriginalUser);
      setImpersonatedOriginalUser(null);
      await refreshAccountsList();
      showAdminToast('Sesión de administrador restaurada');
    }
  };

  // Eliminar Cuenta en Supabase
  const handleDeleteAccount = async (targetUid: string) => {
    if (user && user.uid === targetUid) {
      alert('No puedes eliminar la cuenta en la que estás actualmente conectado.');
      return;
    }
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta cuenta y todos sus mangas de Supabase?')) {
      return;
    }
    await deleteAccountFromSupabase(targetUid);
    await refreshAccountsList();
    showAdminToast('Cuenta eliminada de Supabase con éxito.');
  };

  // Crear usuario desde el panel de administración en Supabase
  const handleCreateAccountFromAdmin = async ({
    displayName,
    email,
    password,
    role
  }: {
    displayName: string;
    email: string;
    password?: string;
    role: 'admin' | 'user';
    seedMangas?: boolean;
  }) => {
    const newUid = 'user_' + Date.now();
    const newAcc: UserAccount = {
      uid: newUid,
      email: email.trim().toLowerCase(),
      displayName: displayName.trim(),
      password: password || 'mangakura123',
      role: role,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      isAnonymous: false,
      mangaCount: 0,
      avatarGradient:
        role === 'admin'
          ? 'from-amber-500 via-rose-500 to-red-600'
          : 'from-indigo-500 via-purple-500 to-violet-600'
    };

    await registerUserInSupabase(newAcc);
    await refreshAccountsList();
    showAdminToast(`Usuario ${newAcc.displayName} creado correctamente en Supabase`);
  };

  // Actualizar datos de cuenta desde el panel en Supabase
  const handleUpdateAccount = async (updatedData: {
    uid: string;
    displayName: string;
    email: string;
    password?: string;
    role: 'admin' | 'user' | 'guest';
  }) => {
    await updateAccountInSupabase(updatedData.uid, updatedData);
    if (user && user.uid === updatedData.uid) {
      const updatedUser = { ...user, ...updatedData };
      setUser(updatedUser);
      localStorage.setItem('mangakura_user', JSON.stringify(updatedUser));
    }
    await refreshAccountsList();
    showAdminToast(`Cuenta de "${updatedData.displayName}" actualizada en Supabase`);
  };

  // Modificar o restablecer contraseña desde el panel de administración en Supabase
  const handleUpdatePassword = async (uid: string, newPassword: string): Promise<boolean> => {
    try {
      await updatePasswordInSupabase(uid, newPassword);
      if (user && user.uid === uid) {
        const updatedUser = { ...user, password: newPassword };
        setUser(updatedUser);
        localStorage.setItem('mangakura_user', JSON.stringify(updatedUser));
      }
      await refreshAccountsList();
      showAdminToast('Contraseña actualizada correctamente en Supabase');
      return true;
    } catch (err) {
      console.error('Error al actualizar contraseña:', err);
      showAdminToast('Error al actualizar contraseña en Supabase');
      return false;
    }
  };

  // Guardar configuración de Supabase desde el panel
  const handleSaveSupabaseConfig = (url: string, anonKey: string) => {
    const ok = saveSupabaseConfig(url, anonKey);
    if (ok) {
      showAdminToast('¡Supabase conectado exitosamente!');
      refreshAccountsList();
    } else {
      showAdminToast('Configuración de Supabase removida o inválida.');
    }
    return ok;
  };

  // Sincronizar todas las cuentas y sus bibliotecas a Supabase
  const handleSyncAllToSupabase = async () => {
    await refreshAccountsList();
    showAdminToast('¡Cuentas y mangas sincronizados directamente con Supabase!');
  };

  // Exportar cuentas a JSON
  const handleExportAccountsJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(registeredAccounts, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `mangakura_cuentas_supabase_${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showAdminToast('Archivo de auditoría JSON descargado');
  };

  // Renderizador unificado para el Panel de Administrador e Inspector
  const renderAdminModals = () => {
    const isAdmin = user && user.role === 'admin';

    return (
      <>
        {/* Toast Notificación flotante */}
        {adminToast && (
          <div className="fixed bottom-6 right-6 z-[70] bg-slate-900 border border-amber-500/50 text-amber-200 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-pulse">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>{adminToast}</span>
          </div>
        )}

        {isAdmin && (
          <AdminPanelModal
            isOpen={isAdminModalOpen}
            onClose={() => setIsAdminModalOpen(false)}
            currentUser={user}
            accounts={registeredAccounts}
            onRefreshAccounts={refreshAccountsList}
            onToggleRole={handleToggleRole}
            onImpersonate={handleImpersonate}
            onDeleteAccount={handleDeleteAccount}
            onCreateAccount={handleCreateAccountFromAdmin}
            onUpdateAccount={handleUpdateAccount}
            onUpdatePassword={handleUpdatePassword}
            onExportJson={handleExportAccountsJson}
            isCloudMode={true}
            isSupabaseOnline={isSupabaseConfigured()}
            supabaseUrl={getSupabaseConfig().url}
            onSaveSupabaseConfig={handleSaveSupabaseConfig}
            onSyncAllToSupabase={handleSyncAllToSupabase}
            supabaseSqlScript={SUPABASE_SETUP_SQL}
          />
        )}

        {/* Modal de Configuración Rápida de Supabase */}
        <SupabaseConfigModal
          isOpen={isSupabaseModalOpen}
          onClose={() => setIsSupabaseModalOpen(false)}
          onConfigSaved={() => {
            refreshAccountsList();
            if (user) {
              fetchMangasFromSupabase(user.uid).then(setItems);
            }
          }}
        />
      </>
    );
  };

  // Búsqueda en Vivo contra AniList GraphQL
  const searchAniList = async (queryText: string) => {
    if (!queryText || queryText.trim().length < 2) {
      setApiResults([]);
      return;
    }

    setApiLoading(true);
    setApiError(null);

    try {
      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          query: ANILIST_GRAPHQL_QUERY,
          variables: { search: queryText }
        })
      });

      if (!response.ok) {
        throw new Error('Error al conectar con AniList API');
      }

      const json = await response.json();
      const mediaList = json.data?.Page?.media || [];
      setApiResults(mediaList);
    } catch (err) {
      console.error(err);
      setApiError('No se pudo conectar con la API de AniList.');
    } finally {
      setApiLoading(false);
    }
  };

  // Debounce para AniList
  useEffect(() => {
    const timer = setTimeout(() => {
      if (apiQuery.trim().length >= 2) {
        searchAniList(apiQuery);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [apiQuery]);

  // Modal Crear / Editar
  const handleOpenAddModal = (formatPreset: any = 'manga', statusPreset: any = 'plan_to_read') => {
    setEditingItem(null);
    setSelectedAniListMedia(null);
    setApiQuery('');
    setApiResults([]);
    setModalTab('anilist');
    setFormData({
      title: '',
      format: selectedFormat !== 'all' ? selectedFormat : formatPreset,
      status: statusPreset,
      cover: '',
      currentChap: 0,
      totalChap: 0,
      score: 8,
      genre: '',
      author: '',
      notes: '',
      anilistId: null
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: any) => {
    setEditingItem(item);
    setSelectedAniListMedia(null);
    setModalTab('manual');
    setFormData({
      title: item.title,
      format: item.format || 'manga',
      status: item.status,
      cover: item.cover || '',
      currentChap: item.currentChap || 0,
      totalChap: item.totalChap || 0,
      score: item.score || 0,
      genre: item.genre || '',
      author: item.author || '',
      notes: item.notes || '',
      anilistId: item.anilistId || null
    });
    setIsModalOpen(true);
  };

  const handleSelectAniListResult = (media: any) => {
    setSelectedAniListMedia(media);
    const detectedFormat = mapCountryToFormat(media.countryOfOrigin);
    const primaryTitle = media.title?.english || media.title?.romaji || media.title?.native || 'Sin título';
    const authors = media.staff?.nodes?.map((n: any) => n.name.full).join(', ') || '';
    const cleanDesc = media.description ? media.description.replace(/<[^>]*>?/gm, '').slice(0, 150) + '...' : '';

    setFormData((prev) => ({
      ...prev,
      title: primaryTitle,
      format: detectedFormat,
      cover: media.coverImage?.extraLarge || media.coverImage?.large || '',
      totalChap: media.chapters || 0,
      currentChap: 0,
      genre: (media.genres || []).slice(0, 4).join(', '),
      author: authors,
      notes: cleanDesc,
      anilistId: media.id
    }));
  };

  // Guardar en Supabase (Crear o Editar)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !user) return;

    const fallbackCover =
      formData.cover.trim() ||
      (formData.format === 'manhwa'
        ? 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80'
        : formData.format === 'manhua'
        ? 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80');

    const targetId = editingItem ? editingItem.id : `manga_${Date.now()}`;
    const docPayload: MangaItem = {
      id: targetId,
      title: formData.title.trim(),
      format: (formData.format as MangaFormat) || 'manga',
      status: (formData.status as MangaStatus) || 'plan_to_read',
      cover: fallbackCover,
      currentChap: Number(formData.currentChap) || 0,
      totalChap: Number(formData.totalChap) || 0,
      score: Number(formData.score) || 0,
      genre: formData.genre || '',
      author: formData.author || '',
      notes: formData.notes || '',
      anilistId: formData.anilistId || undefined,
      updatedAt: new Date().toISOString()
    };

    try {
      await saveMangaToSupabase(user.uid, docPayload);
      setItems((prev) => {
        const exists = prev.some((i) => i.id === targetId);
        return exists
          ? prev.map((i) => (i.id === targetId ? docPayload : i))
          : [docPayload, ...prev];
      });
      setIsModalOpen(false);
      showAdminToast(`"${docPayload.title}" guardado en Supabase`);
    } catch (err: any) {
      console.error('Error guardando en Supabase:', err);
      showAdminToast('Error al guardar el manga en Supabase');
    }
  };

  // Eliminar en Supabase
  const handleDeleteItem = async (id: string) => {
    if (!user) return;
    try {
      await deleteMangaFromSupabase(user.uid, id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      showAdminToast('Manga eliminado de Supabase');
    } catch (err) {
      console.error('Error eliminando de Supabase:', err);
      showAdminToast('Error eliminando manga de Supabase');
    }
  };

  // Cambiar estado en Supabase
  const handleStatusChange = async (id: string, newStatus: MangaStatus) => {
    if (!user) return;
    const targetItem = items.find((i) => i.id === id);
    if (!targetItem) return;

    let updatedChap = targetItem.currentChap;
    if (newStatus === 'completed' && targetItem.totalChap > 0) {
      updatedChap = targetItem.totalChap;
    }

    try {
      await updateMangaStatusInSupabase(user.uid, id, newStatus, updatedChap);
      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? { ...i, status: newStatus, currentChap: updatedChap, updatedAt: new Date().toISOString() }
            : i
        )
      );
    } catch (err) {
      console.error('Error actualizando estado en Supabase:', err);
    }
  };

  // +1 Capítulo con avance automático a terminado en Supabase
  const handleIncrementChapter = async (id: string) => {
    if (!user) return;
    const item = items.find((i) => i.id === id);
    if (!item) return;

    const nextVal = (Number(item.currentChap) || 0) + 1;
    const max = Number(item.totalChap) || Infinity;
    const cappedVal = Math.min(nextVal, max);
    const autoFinished = item.totalChap > 0 && cappedVal >= item.totalChap;
    const newStatus: MangaStatus = autoFinished
      ? 'completed'
      : item.status === 'plan_to_read'
      ? 'reading'
      : item.status;

    try {
      await updateMangaProgressInSupabase(user.uid, id, cappedVal, newStatus);
      setItems((prev) =>
        prev.map((i) => {
          if (i.id !== id) return i;
          return {
            ...i,
            currentChap: cappedVal,
            status: newStatus,
            updatedAt: new Date().toISOString()
          };
        })
      );
    } catch (err) {
      console.error('Error incrementando capítulo en Supabase:', err);
    }
  };

  // Marcar como terminado instantáneo
  const handleQuickComplete = (id: string) => {
    handleStatusChange(id, 'completed');
  };

  // Añadir directamente desde el Top Puntuados a la biblioteca del usuario en Supabase
  const handleAddFromTop = async (topItem: TopManga) => {
    if (!user) {
      setIsVisitorAuthOpen(true);
      return;
    }

    const alreadyExists = items.some(
      (i) =>
        i.title.toLowerCase() === topItem.title.toLowerCase() ||
        (i.anilistId && i.anilistId === topItem.anilistId)
    );

    if (alreadyExists) {
      showAdminToast(`"${topItem.title}" ya está en tu biblioteca.`);
      return;
    }

    const targetId = `manga_${Date.now()}`;
    const docPayload: MangaItem = {
      id: targetId,
      title: topItem.title,
      format: topItem.format,
      status: 'plan_to_read',
      cover: topItem.cover,
      currentChap: 0,
      totalChap: topItem.totalChap,
      score: topItem.score,
      genre: topItem.genre,
      author: topItem.author,
      notes: topItem.highlight || topItem.description,
      anilistId: topItem.anilistId,
      updatedAt: new Date().toISOString()
    };

    try {
      await saveMangaToSupabase(user.uid, docPayload);
      setItems((prev) => [docPayload, ...prev]);
      showAdminToast(`¡"${topItem.title}" guardado en tu biblioteca de Supabase!`);
    } catch (err) {
      console.error('Error guardando desde Top en Supabase:', err);
      showAdminToast('Error guardando en Supabase');
    }
  };

  // Métricas
  const stats = useMemo(() => {
    const total = items.length;
    const mangas = items.filter((i) => i.format === 'manga').length;
    const manhwas = items.filter((i) => i.format === 'manhwa').length;
    const manhuas = items.filter((i) => i.format === 'manhua').length;

    const reading = items.filter((i) => i.status === 'reading').length;
    const completed = items.filter((i) => i.status === 'completed').length;
    const totalChaptersRead = items.reduce(
      (acc, curr) => acc + (Number(curr.currentChap) || 0),
      0
    );

    const scored = items.filter((i) => Number(i.score) > 0);
    const avgScore =
      scored.length > 0
        ? (scored.reduce((acc, curr) => acc + Number(curr.score), 0) / scored.length).toFixed(1)
        : '0.0';

    return { total, mangas, manhwas, manhuas, reading, completed, totalChaptersRead, avgScore };
  }, [items]);

  // Filtrado y ordenación
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        const matchesSearch =
          (item.title || '').toLowerCase().includes(search.toLowerCase()) ||
          (item.genre && item.genre.toLowerCase().includes(search.toLowerCase())) ||
          (item.author && item.author.toLowerCase().includes(search.toLowerCase())) ||
          (item.notes && item.notes.toLowerCase().includes(search.toLowerCase()));

        const matchesFormat =
          selectedFormat === 'all' || item.format === selectedFormat;

        const matchesStatus =
          selectedStatusFilter === 'all' || item.status === selectedStatusFilter;

        return matchesSearch && matchesFormat && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
        if (sortBy === 'score') return (b.score || 0) - (a.score || 0);
        if (sortBy === 'currentChap') return (b.currentChap || 0) - (a.currentChap || 0);
        return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
      });
  }, [items, search, selectedFormat, selectedStatusFilter, sortBy]);

  // Si está cargando el estado de autenticación inicial
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#070913] flex flex-col items-center justify-center text-slate-200">
        <Loader2 className="w-10 h-10 text-rose-500 animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wider text-slate-400">Iniciando MangaKura Tracker...</p>
      </div>
    );
  }

  // Pantalla de Bienvenida / Portada con Ranking Top (si no hay sesión activa)
  if (!user) {
    return (
      <div className="min-h-screen bg-[#070913] text-slate-100 flex flex-col font-sans selection:bg-rose-500/30 selection:text-rose-200">
        {/* Barra de Navegación Superior para Visitantes */}
        <header className="border-b border-slate-800/80 bg-[#0c1020]/90 backdrop-blur-md sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-rose-600/25 ring-1 ring-white/20">
                <ScrollText className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
                    MANGA<span className="text-rose-500">KURA</span>
                  </h1>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hidden sm:inline-flex items-center gap-1">
                    <Globe className="w-2.5 h-2.5" /> AniList API
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">Biblioteca de Manga • Manhwa • Manhua</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3">
              <a
                href="#ranking-top"
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 hover:text-white font-semibold transition"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Top Puntuados</span>
              </a>


              <button
                onClick={handleGuestLogin}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-semibold rounded-xl transition active:scale-95 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Demo</span>
                <span>Invitado</span>
              </button>

              <button
                onClick={() => {
                  setAuthModalTab('login');
                  setAuthError('');
                  setIsVisitorAuthOpen(true);
                }}
                className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-rose-600/30 transition active:scale-95 flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Iniciar Sesión</span>
              </button>
            </div>
          </div>
        </header>

        {/* Portada Principal y Sección de Ranking con mayor puntuación */}
        <main className="flex-1">
          <PortadaLanding
            user={user}
            items={items}
            onAddFromTop={handleAddFromTop}
            onOpenAuth={(tab) => {
              setAuthModalTab(tab);
              setAuthError('');
              setIsVisitorAuthOpen(true);
            }}
            onGuestLogin={handleGuestLogin}
          />
        </main>

        {/* Modal de Autenticación para Visitantes (Login / Registro / Demo) */}
        {isVisitorAuthOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative my-auto">
              <button
                onClick={() => setIsVisitorAuthOpen(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Logo y Encabezado Modal */}
              <div className="text-center mb-6">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-rose-600 via-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-rose-600/30 ring-1 ring-white/20 mb-2">
                  <ScrollText className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-black tracking-wider text-white">
                  MANGA<span className="text-rose-500">KURA</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Accede a tu biblioteca personal en la nube
                </p>
              </div>

              {/* Pestañas Login vs Registro */}
              <div className="grid grid-cols-2 bg-slate-950/80 p-1 rounded-xl border border-slate-800/80 mb-5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalTab('login');
                    setAuthError('');
                  }}
                  className={`py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                    authModalTab === 'login'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Iniciar Sesión
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalTab('register');
                    setAuthError('');
                  }}
                  className={`py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                    authModalTab === 'register'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Registrarse
                </button>
              </div>

              {authError && (
                <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={authModalTab === 'login' ? handleLogin : handleRegister} className="space-y-4">
                {authModalTab === 'register' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Nombre o Nickname
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="Ej. OtakuReader"
                        value={authForm.displayName}
                        onChange={(e) => setAuthForm({ ...authForm, displayName: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="tucorreo@ejemplo.com"
                      value={authForm.email}
                      onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="••••••••"
                      value={authForm.password}
                      onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authSubmitting}
                  className="w-full py-3 bg-gradient-to-r from-rose-600 via-rose-500 to-pink-600 hover:opacity-95 text-white text-sm font-bold rounded-xl shadow-lg shadow-rose-600/30 transition duration-200 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {authSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>
                    {authModalTab === 'login' ? 'Acceder a mi Cuenta' : 'Crear Cuenta Gratis'}
                  </span>
                </button>
              </form>

              {/* Botón de Acceso Rápido como Invitado dentro del Modal */}
              <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleGuestLogin}
                  className="w-full py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Probar como Lector Invitado (Sin Registro)</span>
                </button>
              </div>
            </div>
          </div>
        )}


        {/* Footer */}
        <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500 mt-auto">
          <p>MangaKura Tracker • Manga, Manhwa y Manhua con AniList API y Supabase Cloud Database</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 flex flex-col font-sans selection:bg-rose-500/30 selection:text-rose-200">
      {/* Barra de Notificación de Suplantación / Impersonación */}
      {impersonatedOriginalUser && (
        <div className="bg-gradient-to-r from-amber-600 via-rose-600 to-indigo-600 text-white text-xs px-4 py-2 flex items-center justify-between shadow-lg sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 animate-bounce" />
            <span>
              Modo Simulación Activo: Estás navegando como <strong>{user?.displayName || user?.email}</strong> ({user?.role === 'admin' ? '👑 Admin' : '📖 Lector'})
            </span>
          </div>
          <button
            onClick={handleRestoreAdmin}
            className="bg-black/30 hover:bg-black/50 text-white px-3 py-1 rounded-lg font-bold text-xs transition border border-white/20 active:scale-95"
          >
            Volver a mi Cuenta Admin
          </button>
        </div>
      )}

      {/* Fondo ambiental */}
      <div className="fixed top-0 left-0 right-0 h-[450px] bg-gradient-to-b from-indigo-900/20 via-purple-900/10 to-transparent pointer-events-none -z-10" />

      {/* Header Superior con Perfil de Usuario */}
      <header className="border-b border-slate-800/80 bg-[#0c1020]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Logo y título */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-rose-600/25 ring-1 ring-white/20">
              <ScrollText className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
                  MANGA<span className="text-rose-500">KURA</span>
                </h1>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hidden sm:inline-flex items-center gap-1">
                  <Globe className="w-2.5 h-2.5" /> AniList API
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Manga • Manhwa • Manhua Reader</p>
            </div>
          </div>

          {/* Vistas, Botón Añadir y Panel de Usuario */}
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            {/* Pestañas Principales: Biblioteca vs Portada & Top */}
            <div className="flex bg-slate-900/90 border border-slate-800 rounded-xl p-1 text-xs">
              <button
                onClick={() => setActiveMainTab('library')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                  activeMainTab === 'library'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Mi Biblioteca de Lecturas"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Biblioteca</span>
              </button>
              <button
                onClick={() => setActiveMainTab('portada')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                  activeMainTab === 'portada'
                    ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Portada y Ranking de Obras Más Puntuadas"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden sm:inline">Top Puntuados</span>
              </button>
            </div>

            {/* Selector de Vistas de Tarjeta/Kanban (visible cuando está en biblioteca) */}
            {activeMainTab === 'library' && (
              <div className="flex bg-slate-900/90 border border-slate-800 rounded-xl p-1 text-xs">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition ${
                    viewMode === 'grid'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Vista de Cuadrícula"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Tarjetas</span>
                </button>
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition ${
                    viewMode === 'kanban'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Vista Kanban"
                >
                  <Kanban className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Tablero</span>
                </button>
              </div>
            )}

            {/* Botón Estado / Configuración de Supabase - Solo visible para Administradores */}
            {user.role === 'admin' && (
              <button
                onClick={() => setIsSupabaseModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-2 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs sm:text-sm font-semibold rounded-xl transition active:scale-95"
                title="Configurar conexión con Supabase"
              >
                <Database className={`w-4 h-4 ${isSupabaseConfigured() ? 'text-emerald-400' : 'text-amber-400'}`} />
                <span className="hidden md:inline">Supabase</span>
                <span className={`w-2 h-2 rounded-full ${isSupabaseConfigured() ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              </button>
            )}

            {/* Botón Administrador / Cuentas - Solo visible para cuentas con rol Admin */}
            {user.role === 'admin' && (
              <button
                onClick={() => {
                  refreshAccountsList();
                  setIsAdminModalOpen(true);
                }}
                className="flex items-center space-x-1.5 px-3 py-2 bg-gradient-to-r from-amber-500/20 via-rose-500/15 to-purple-500/20 hover:from-amber-500/30 hover:to-purple-500/30 text-amber-300 border border-amber-500/40 text-xs sm:text-sm font-semibold rounded-xl shadow-lg shadow-amber-500/10 transition duration-200 active:scale-95 animate-in fade-in"
                title="Panel de Administración y Cuentas Creadas"
              >
                <Crown className="w-4 h-4 text-amber-400 animate-pulse" />
                <span className="hidden sm:inline">Panel Admin</span>
                <span className="bg-amber-400/20 text-amber-300 text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-0.5">
                  {registeredAccounts.length}
                </span>
              </button>
            )}

            {/* Botón Añadir */}
            <button
              onClick={() => handleOpenAddModal()}
              className="flex items-center space-x-1.5 px-3 sm:px-4 py-2 bg-gradient-to-r from-rose-600 via-rose-500 to-pink-600 hover:opacity-95 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-lg shadow-rose-600/30 transition duration-200 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir Obra</span>
            </button>

            {/* Perfil de Usuario & Cerrar Sesión */}
            <div className="flex items-center pl-2 border-l border-slate-800 space-x-2">
              <div className="hidden lg:flex flex-col text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-xs font-bold text-slate-200 truncate max-w-[130px]">
                    {user.displayName || (user.isAnonymous ? 'Invitado' : user.email?.split('@')[0])}
                  </span>
                  {user.role === 'admin' ? (
                    <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded">
                      ADMIN
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 text-[9px] font-medium text-slate-400 bg-slate-800/80 rounded">
                      LECTOR
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 font-mono truncate max-w-[140px]">
                  {user.isAnonymous ? 'Modo Demo' : user.email}
                </span>
              </div>

              <div
                title={user.email || user.uid}
                className={`w-8 h-8 rounded-xl border flex items-center justify-center text-xs font-bold ${
                  user.role === 'admin'
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                    : 'bg-slate-800 border-slate-700/80 text-rose-400'
                }`}
              >
                {user.role === 'admin' ? (
                  <Crown className="w-4 h-4 text-amber-400" />
                ) : user.displayName ? (
                  user.displayName.charAt(0).toUpperCase()
                ) : user.email ? (
                  user.email.charAt(0).toUpperCase()
                ) : (
                  'U'
                )}
              </div>

              <button
                onClick={handleSignOut}
                title="Cerrar sesión"
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-xl transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Indicador de ID de Usuario y Estado de Supabase */}
      <div className="bg-slate-950/60 border-b border-slate-900 py-1.5 px-4 text-center flex flex-wrap items-center justify-center gap-3">
        <span className="text-[11px] text-slate-400 font-mono">
          UID: <strong className="text-slate-300">{user.uid}</strong>
        </span>
        <span className="text-slate-600 hidden sm:inline">•</span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Base de Datos: Supabase Cloud
        </span>
        {!isSupabaseConfigured() && user.role === 'admin' && (
          <button
            onClick={() => setIsSupabaseModalOpen(true)}
            className="text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-bold hover:bg-amber-500/30 transition flex items-center gap-1"
          >
            <Database className="w-3 h-3 text-amber-400" />
            Configurar Conexión
          </button>
        )}
      </div>

      {/* Alerta si Supabase no está configurado - Solo visible para Administradores */}
      {!isSupabaseConfigured() && user.role === 'admin' && (
        <div className="bg-amber-950/70 border-b border-amber-800/60 py-2.5 px-4 text-center flex flex-wrap items-center justify-center gap-3 text-xs">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span className="text-amber-200 font-medium">
            Supabase aún no está conectado. Para asegurar la persistencia en la nube de tu biblioteca, conecta tu proyecto.
          </span>
          <button
            onClick={() => setIsSupabaseModalOpen(true)}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow transition flex items-center gap-1 active:scale-95"
          >
            <Database className="w-3.5 h-3.5" /> Conectar Supabase
          </button>
        </div>
      )}

      {/* Contenido Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
        {activeMainTab === 'portada' ? (
          <PortadaLanding
            user={user}
            items={items}
            onAddFromTop={handleAddFromTop}
            onGoToLibrary={() => setActiveMainTab('library')}
            showBackToLibraryButton={true}
          />
        ) : (
          <>
            {/* Banner de Descubrimiento de Top Obras */}
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-rose-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                    <span>Ranking de Obras Mejor Puntuadas</span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold">TOP SITIO</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    Descubre Berserk (10⭐), Solo Leveling (9.8⭐) y más obras maestras para almacenar en tu biblioteca.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveMainTab('portada')}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-rose-600 hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center gap-1.5 flex-shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ver Portada & Ranking</span>
              </button>
            </div>

            {/* Estadísticas Superiores */}
        <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm shadow-inner relative overflow-hidden group">
            <div className="absolute right-2 top-2 p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Colección Total</p>
            <p className="text-2xl font-black text-white mt-1">{stats.total}</p>
            <div className="flex gap-2 text-[10px] text-slate-400 mt-1 font-mono">
              <span className="text-rose-400 font-semibold">{stats.mangas} Man.</span>
              <span className="text-violet-400 font-semibold">{stats.manhwas} Mhw.</span>
              <span className="text-emerald-400 font-semibold">{stats.manhuas} Mha.</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm shadow-inner relative overflow-hidden group">
            <div className="absolute right-2 top-2 p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <PlayCircle className="w-5 h-5" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">En Curso</p>
            <p className="text-2xl font-black text-cyan-400 mt-1">{stats.reading}</p>
            <span className="text-[11px] text-slate-500">Lecturas activas</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm shadow-inner relative overflow-hidden group">
            <div className="absolute right-2 top-2 p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <BookmarkCheck className="w-5 h-5" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Terminados</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">{stats.completed}</p>
            <span className="text-[11px] text-slate-500">Completamente leídos</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm shadow-inner relative overflow-hidden group">
            <div className="absolute right-2 top-2 p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <ScrollText className="w-5 h-5" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Capítulos Leídos</p>
            <p className="text-2xl font-black text-purple-300 mt-1">{stats.totalChaptersRead}</p>
            <span className="text-[11px] text-slate-500">Total acumulado</span>
          </div>

          <div className="col-span-2 sm:col-span-4 lg:col-span-1 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm shadow-inner relative overflow-hidden group">
            <div className="absolute right-2 top-2 p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Star className="w-5 h-5 fill-amber-400" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Nota Media</p>
            <p className="text-2xl font-black text-amber-400 mt-1">
              {stats.avgScore} <span className="text-xs font-normal text-slate-500">/ 10</span>
            </p>
            <span className="text-[11px] text-slate-500">Calidad general</span>
          </div>
        </section>

        {/* Pestañas de Formato */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button
            onClick={() => setSelectedFormat('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
              selectedFormat === 'all'
                ? 'bg-slate-800 border-slate-600 text-white shadow-md'
                : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Todos los formatos
            <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-950/60 text-slate-300 font-mono">
              {items.length}
            </span>
          </button>

          <button
            onClick={() => setSelectedFormat('manga')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border ${
              selectedFormat === 'manga'
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-md ring-1 ring-rose-500/30'
                : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-rose-300'
            }`}
          >
            <span>🇯🇵</span> Manga (Japón)
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-950/80 text-rose-200 font-mono">
              {stats.mangas}
            </span>
          </button>

          <button
            onClick={() => setSelectedFormat('manhwa')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border ${
              selectedFormat === 'manhwa'
                ? 'bg-violet-500/20 border-violet-500/50 text-violet-300 shadow-md ring-1 ring-violet-500/30'
                : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-violet-300'
            }`}
          >
            <span>🇰🇷</span> Manhwa (Corea)
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-950/80 text-violet-200 font-mono">
              {stats.manhwas}
            </span>
          </button>

          <button
            onClick={() => setSelectedFormat('manhua')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border ${
              selectedFormat === 'manhua'
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-md ring-1 ring-emerald-500/30'
                : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-emerald-300'
            }`}
          >
            <span>🇨🇳</span> Manhua (China)
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-200 font-mono">
              {stats.manhuas}
            </span>
          </button>
        </div>

        {/* Buscador y Filtros */}
        <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 mb-6 shadow-xl flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar en tu lista por título, autor o género..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 transition"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {viewMode === 'grid' && (
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              >
                <option value="all">Todos los Estados</option>
                <option value="reading">Leyendo</option>
                <option value="plan_to_read">Por Leer</option>
                <option value="on_hold">En Pausa / Pendiente</option>
                <option value="completed">Terminado</option>
              </select>
            )}

            <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="updatedAt">Recientes</option>
                <option value="score">Calificación</option>
                <option value="title">Título</option>
                <option value="currentChap">Capítulos Leídos</option>
              </select>
            </div>
          </div>
        </section>

        {/* Visualización */}
        {firestoreLoading ? (
          <div className="text-center py-20">
            <Loader2 className="w-8 h-8 text-rose-500 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400">Sincronizando tu biblioteca en la nube...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/30 border border-slate-800/60 rounded-3xl p-8">
            <Flame className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-300">Tu biblioteca está vacía</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              Empieza añadiendo tu primer Manga, Manhwa o Manhua buscando en AniList o explorando los más puntuados.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
              <button
                onClick={() => handleOpenAddModal()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2 shadow-md shadow-rose-600/20 transition active:scale-95"
              >
                <Plus className="w-4 h-4" /> Buscar en AniList
              </button>
              <button
                onClick={() => setActiveMainTab('portada')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl inline-flex items-center gap-2 border border-slate-700 transition active:scale-95"
              >
                <Trophy className="w-4 h-4 text-amber-400" /> Ver Top Puntuados
              </button>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          /* Vista Cuadrícula */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {filteredItems.map((item) => (
              <ReaderCard
                key={item.id}
                item={item}
                onEdit={() => handleOpenEditModal(item)}
                onDelete={() => handleDeleteItem(item.id)}
                onStatusChange={(newStatus) => handleStatusChange(item.id, newStatus)}
                onIncrement={() => handleIncrementChapter(item.id)}
                onQuickComplete={() => handleQuickComplete(item.id)}
              />
            ))}
          </div>
        ) : (
          /* Vista Tablero Kanban */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
            {STATUS_OPTIONS.map((col) => {
              const colItems = filteredItems.filter((i) => i.status === col.id);
              const Icon = col.icon;
              return (
                <div
                  key={col.id}
                  className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-3 flex flex-col h-full min-h-[550px]"
                >
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 px-1">
                    <div className="flex items-center space-x-2">
                      <span className={`p-1.5 rounded-lg ${col.bg} ${col.color}`}>
                        <Icon className="w-4 h-4" />
                      </span>
                      <h3 className="font-bold text-sm text-slate-200">{col.label}</h3>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                      {colItems.length}
                    </span>
                  </div>

                  <div className="space-y-3 flex-1 overflow-y-auto pr-0.5">
                    {colItems.map((item) => (
                      <KanbanReaderCard
                        key={item.id}
                        item={item}
                        onEdit={() => handleOpenEditModal(item)}
                        onDelete={() => handleDeleteItem(item.id)}
                        onStatusChange={(newStatus) => handleStatusChange(item.id, newStatus)}
                        onIncrement={() => handleIncrementChapter(item.id)}
                        onQuickComplete={() => handleQuickComplete(item.id)}
                      />
                    ))}
                    {colItems.length === 0 && (
                      <div className="h-32 border-2 border-dashed border-slate-800/80 rounded-xl flex items-center justify-center text-xs text-slate-600">
                        Sin obras en este estado
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
          </>
        )}
      </main>

      {/* Modal: Búsqueda AniList & Entrada Manual */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl relative my-auto overflow-hidden">
            {/* Header Modal */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                  {editingItem ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {editingItem ? 'Editar Obra' : 'Añadir a mi Biblioteca'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {editingItem ? 'Modifica los datos y progreso' : 'Busca en directo en AniList o crea una entrada manual'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pestañas AniList vs Manual */}
            {!editingItem && (
              <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 pt-3 gap-4">
                <button
                  type="button"
                  onClick={() => setModalTab('anilist')}
                  className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition ${
                    modalTab === 'anilist'
                      ? 'border-rose-500 text-rose-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  Buscar en AniList API (Recomendado)
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('manual')}
                  className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition ${
                    modalTab === 'manual'
                      ? 'border-rose-500 text-rose-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Entrada Manual
                </button>
              </div>
            )}

            {/* Cuerpo del Modal */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {!editingItem && modalTab === 'anilist' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                      Buscar Manga, Manhwa o Manhua
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Escribe el nombre (ej. Solo Leveling, Berserk, Tales of Demons and Gods...)"
                        value={apiQuery}
                        onChange={(e) => setApiQuery(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                      {apiLoading && (
                        <Loader2 className="w-4 h-4 text-rose-400 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Detecta automáticamente si es Manga (🇯🇵 Japón), Manhwa (🇰🇷 Corea) o Manhua (🇨🇳 China).
                    </p>
                  </div>

                  {apiError && (
                    <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300">
                      {apiError}
                    </div>
                  )}

                  {apiResults.length > 0 && (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      <p className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                        Resultados encontrados ({apiResults.length})
                      </p>
                      {apiResults.map((item) => {
                        const fmt = mapCountryToFormat(item.countryOfOrigin);
                        const fmtCfg = FORMAT_CONFIG[fmt];
                        const isSelected = selectedAniListMedia?.id === item.id;
                        const mainTitle = item.title?.english || item.title?.romaji || item.title?.native;

                        return (
                          <div
                            key={item.id}
                            onClick={() => handleSelectAniListResult(item)}
                            className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition ${
                              isSelected
                                ? 'bg-rose-500/10 border-rose-500/50'
                                : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              <img
                                src={item.coverImage?.large || item.coverImage?.extraLarge}
                                alt={mainTitle}
                                className="w-10 h-14 object-cover rounded-md bg-slate-900 border border-slate-800 flex-shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${fmtCfg.badgeClass}`}>
                                    {fmtCfg.flag} {fmtCfg.label}
                                  </span>
                                  {item.chapters && (
                                    <span className="text-[10px] text-slate-400">
                                      {item.chapters} capítulos
                                    </span>
                                  )}
                                  <span className="text-[10px] text-slate-500 capitalize">
                                    • {item.status?.toLowerCase().replace('_', ' ')}
                                  </span>
                                </div>
                                <h4 className="text-xs font-bold text-white truncate mt-1">
                                  {mainTitle}
                                </h4>
                                {item.genres && (
                                  <p className="text-[10px] text-slate-400 truncate">
                                    {item.genres.slice(0, 3).join(', ')}
                                  </p>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 flex-shrink-0 transition ${
                                isSelected
                                  ? 'bg-rose-500 text-white'
                                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                              }`}
                            >
                              {isSelected ? <Check className="w-3.5 h-3.5" /> : null}
                              {isSelected ? 'Seleccionado' : 'Seleccionar'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Formulario de Configuración */}
              <form onSubmit={handleSubmitForm} className="space-y-4 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {modalTab === 'anilist' && selectedAniListMedia ? 'Detalles de tu lectura' : 'Información de la Obra'}
                  </h3>
                  {formData.anilistId && (
                    <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> AniList #{formData.anilistId}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Título</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Berserk, Solo Leveling..."
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Formato</label>
                    <select
                      value={formData.format}
                      onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    >
                      <option value="manga">🇯🇵 Manga (Japón)</option>
                      <option value="manhwa">🇰🇷 Manhwa (Corea)</option>
                      <option value="manhua">🇨🇳 Manhua (China)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Tu Estado</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Capítulos Leídos</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.currentChap}
                      onChange={(e) => setFormData({ ...formData, currentChap: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Total Capítulos</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0 si está en emisión"
                      value={formData.totalChap}
                      onChange={(e) => setFormData({ ...formData, totalChap: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Tu Puntuación (1-10)</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.5"
                      value={formData.score}
                      onChange={(e) => setFormData({ ...formData, score: Math.min(10, Math.max(0, parseFloat(e.target.value) || 0)) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Autor / Artista</label>
                    <input
                      type="text"
                      placeholder="Ej. Kentaro Miura, SIU..."
                      value={formData.author}
                      onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">URL de Portada</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formData.cover}
                    onChange={(e) => setFormData({ ...formData, cover: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Notas / Reseña</label>
                  <textarea
                    rows={2}
                    placeholder="Escribe tus impresiones o dónde dejaste la lectura..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl bg-slate-800/60 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 transition shadow-lg shadow-rose-600/30"
                  >
                    {editingItem ? 'Guardar Cambios' : 'Añadir a mi Lista'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modales del Administrador */}
      {renderAdminModals()}

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500 mt-auto">
        <p>MangaKura Tracker • Manga, Manhwa y Manhua con AniList API y Firebase Cloud</p>
      </footer>
    </div>
  );
}

// Componente: Tarjeta de Lectura (Vista Grid)
function ReaderCard({ item, onEdit, onDelete, onStatusChange, onIncrement, onQuickComplete }) {
  const formatInfo = FORMAT_CONFIG[item.format] || FORMAT_CONFIG.manga;
  const currentStatusObj = STATUS_OPTIONS.find((s) => s.id === item.status) || STATUS_OPTIONS[0];
  const isComplete = item.status === 'completed';
  const progressPercent = item.totalChap > 0 ? Math.min(100, Math.round((item.currentChap / item.totalChap) * 100)) : null;

  return (
    <div className="group bg-slate-900/70 border border-slate-800/90 hover:border-slate-700 rounded-2xl overflow-hidden shadow-lg flex flex-col transition duration-200 hover:-translate-y-1">
      {/* Portada & Badges */}
      <div className="relative h-60 w-full overflow-hidden bg-slate-950">
        <img
          src={item.cover}
          alt={item.title}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

        {/* Badge Formato Oriental */}
        <span
          className={`absolute top-2.5 left-2.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider backdrop-blur-md border shadow-md flex items-center gap-1.5 ${formatInfo.badgeClass}`}
        >
          <span>{formatInfo.flag}</span>
          <span>{formatInfo.label}</span>
        </span>

        {/* Calificación */}
        {item.score > 0 && (
          <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-amber-400 text-slate-950 flex items-center gap-1 shadow-md">
            <Star className="w-3 h-3 fill-slate-950" />
            {item.score}
          </span>
        )}

        {/* Selector de Estado Directo */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5">
          <select
            value={item.status}
            onChange={(e) => onStatusChange(e.target.value)}
            className={`w-full text-xs font-bold rounded-xl px-3 py-1.5 backdrop-blur-md border cursor-pointer focus:outline-none transition ${currentStatusObj.bg} ${currentStatusObj.color}`}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id} className="bg-slate-900 text-slate-200">
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Info de la obra */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-sm sm:text-base text-white line-clamp-1 group-hover:text-rose-400 transition" title={item.title}>
            {item.title}
          </h3>
          {item.author && (
            <p className="text-[11px] text-slate-400 font-medium line-clamp-1 mt-0.5">
              Por {item.author}
            </p>
          )}
          {item.genre && (
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 italic">{item.genre}</p>
          )}

          {/* Progreso de Capítulos */}
          <div className="mt-3">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-slate-400 font-medium">Progreso:</span>
              <span className="font-bold text-slate-200">
                {item.currentChap} {item.totalChap > 0 ? `/ ${item.totalChap}` : '(en emisión)'}
                {progressPercent !== null && (
                  <span className="text-[10px] text-slate-400 font-normal ml-1">
                    ({progressPercent}%)
                  </span>
                )}
              </span>
            </div>

            {progressPercent !== null ? (
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-rose-500 via-purple-500 to-indigo-500 h-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            ) : (
              <div className="w-full bg-slate-800 h-1 rounded-full" />
            )}
          </div>

          {/* Notas */}
          {item.notes && (
            <p className="text-xs text-slate-400 bg-slate-950/50 p-2 rounded-lg border border-slate-800/60 mt-3 italic line-clamp-2">
              "{item.notes}"
            </p>
          )}
        </div>

        {/* Acciones Rápidas */}
        <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={onIncrement}
              title="Avanzar 1 Capítulo"
              className="px-2.5 py-1 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-rose-400 hover:text-rose-300 rounded-lg border border-slate-700/60 transition active:scale-95"
            >
              +1 Cap
            </button>

            {!isComplete && (
              <button
                onClick={onQuickComplete}
                title="Mover a Terminado directamente"
                className="p-1.5 text-xs text-emerald-400 hover:text-white hover:bg-emerald-500/20 rounded-lg border border-emerald-500/20 transition"
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={onEdit}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              title="Editar"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
              title="Eliminar"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente: Tarjeta para Tablero Kanban
function KanbanReaderCard({ item, onEdit, onDelete, onStatusChange, onIncrement, onQuickComplete }) {
  const formatInfo = FORMAT_CONFIG[item.format] || FORMAT_CONFIG.manga;
  const isComplete = item.status === 'completed';

  return (
    <div className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-xl p-3 shadow-md transition duration-150">
      <div className="flex gap-2.5 items-start">
        <img
          src={item.cover}
          alt={item.title}
          className="w-12 h-16 rounded-lg object-cover flex-shrink-0 bg-slate-900 border border-slate-800"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80';
          }}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${formatInfo.badgeClass}`}>
              {formatInfo.flag} {formatInfo.label}
            </span>
            {item.score > 0 && (
              <span className="text-[10px] font-bold text-amber-400 flex items-center gap-0.5">
                <Star className="w-2.5 h-2.5 fill-amber-400" />
                {item.score}
              </span>
            )}
          </div>

          <h4 className="font-semibold text-xs text-white truncate mt-1" title={item.title}>
            {item.title}
          </h4>

          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>
              Cap. {item.currentChap} {item.totalChap > 0 ? `/ ${item.totalChap}` : ''}
            </span>
            <button
              onClick={onIncrement}
              className="text-[10px] font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20"
            >
              +1
            </button>
          </div>
        </div>
      </div>

      {/* Mover de columna rápido */}
      <div className="mt-2.5 pt-2 border-t border-slate-900 flex items-center justify-between">
        <select
          value={item.status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="text-[11px] bg-slate-900 text-slate-300 rounded border border-slate-800 px-1.5 py-1 focus:outline-none"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              Mover a: {opt.shortLabel}
            </option>
          ))}
        </select>

        <div className="flex items-center space-x-1">
          {!isComplete && (
            <button
              onClick={onQuickComplete}
              title="Terminado"
              className="p-1 text-emerald-400 hover:bg-emerald-500/20 rounded"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onEdit}
            title="Editar"
            className="p-1 text-slate-400 hover:text-white rounded"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            title="Eliminar"
            className="p-1 text-slate-500 hover:text-rose-400 rounded"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}