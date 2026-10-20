import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserAccount, MangaItem } from '../types';

// Leer configuración desde variables de entorno de Vite o desde LocalStorage
const getStoredCredentials = () => {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  try {
    const local = localStorage.getItem('mangakura_supabase_config') || localStorage.getItem('inkrealm_supabase_config');
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed.url && parsed.anonKey) {
        return { url: parsed.url.trim(), anonKey: parsed.anonKey.trim() };
      }
    }
  } catch (e) {
    console.error('Error leyendo config local de Supabase:', e);
  }

  return { url: envUrl.trim(), anonKey: envKey.trim() };
};

let currentConfig = getStoredCredentials();
let supabaseInstance: SupabaseClient | null =
  currentConfig.url && currentConfig.anonKey
    ? createClient(currentConfig.url, currentConfig.anonKey)
    : null;

export const isSupabaseConfigured = (): boolean => {
  return !!(currentConfig.url && currentConfig.anonKey && supabaseInstance);
};

export const getSupabaseConfig = () => {
  return { ...currentConfig };
};

export const saveSupabaseConfig = (url: string, anonKey: string): boolean => {
  const cleanUrl = url.trim();
  const cleanKey = anonKey.trim();

  if (!cleanUrl || !cleanKey) {
    localStorage.removeItem('mangakura_supabase_config');
    localStorage.removeItem('inkrealm_supabase_config');
    currentConfig = { url: '', anonKey: '' };
    supabaseInstance = null;
    return false;
  }

  try {
    const client = createClient(cleanUrl, cleanKey);
    supabaseInstance = client;
    currentConfig = { url: cleanUrl, anonKey: cleanKey };
    localStorage.setItem(
      'mangakura_supabase_config',
      JSON.stringify({ url: cleanUrl, anonKey: cleanKey })
    );
    return true;
  } catch (err) {
    console.error('Error inicializando Supabase con nueva configuración:', err);
    return false;
  }
};

export const getSupabaseClient = (): SupabaseClient | null => {
  return supabaseInstance;
};

// ==========================================
// OPERACIONES CON CUENTAS EN SUPABASE
// ==========================================

export const fetchAccountsFromSupabase = async (): Promise<UserAccount[]> => {
  if (!supabaseInstance) return [];

  try {
    const { data, error } = await supabaseInstance
      .from('user_accounts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error al obtener cuentas desde Supabase:', error.message);
      return [];
    }

    if (!data) return [];

    return data.map((row: any) => ({
      uid: row.uid,
      email: row.email,
      displayName: row.display_name || row.email?.split('@')[0] || 'Lector',
      role: row.role || 'user',
      createdAt: row.created_at,
      lastLogin: row.last_login || row.created_at,
      avatarGradient: row.avatar_gradient,
      isAnonymous: !!row.is_anonymous,
      mangaCount: row.manga_count || 0,
      password: row.password || 'mangakura123'
    }));
  } catch (err) {
    console.error('Fallo de conexión con Supabase user_accounts:', err);
    return [];
  }
};

export const upsertAccountToSupabase = async (account: UserAccount): Promise<boolean> => {
  if (!supabaseInstance) return false;

  try {
    const payload = {
      uid: account.uid,
      email: account.email,
      display_name: account.displayName,
      role: account.role,
      created_at: account.createdAt,
      last_login: account.lastLogin,
      avatar_gradient: account.avatarGradient || null,
      is_anonymous: !!account.isAnonymous,
      manga_count: account.mangaCount || 0,
      password: account.password || 'mangakura123'
    };

    const { error } = await supabaseInstance.from('user_accounts').upsert(payload, {
      onConflict: 'uid'
    });

    if (error) {
      console.warn('Error haciendo upsert de cuenta en Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error de red al guardar cuenta en Supabase:', err);
    return false;
  }
};

export const updateAccountInSupabase = async (
  uid: string,
  updates: Partial<UserAccount>
): Promise<boolean> => {
  if (!supabaseInstance) return false;

  try {
    const dbPayload: any = {};
    if (updates.displayName !== undefined) dbPayload.display_name = updates.displayName;
    if (updates.email !== undefined) dbPayload.email = updates.email;
    if (updates.role !== undefined) dbPayload.role = updates.role;
    if (updates.lastLogin !== undefined) dbPayload.last_login = updates.lastLogin;
    if (updates.mangaCount !== undefined) dbPayload.manga_count = updates.mangaCount;
    if (updates.password !== undefined) dbPayload.password = updates.password;

    const { error } = await supabaseInstance
      .from('user_accounts')
      .update(dbPayload)
      .eq('uid', uid);

    if (error) {
      console.warn('Error actualizando cuenta en Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Fallo actualizando cuenta en Supabase:', err);
    return false;
  }
};

export const updatePasswordInSupabase = async (
  uid: string,
  newPassword: string
): Promise<boolean> => {
  if (!supabaseInstance) return false;

  try {
    const { error } = await supabaseInstance
      .from('user_accounts')
      .update({ password: newPassword })
      .eq('uid', uid);

    if (error) {
      console.warn('Error actualizando contraseña en Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Fallo actualizando contraseña en Supabase:', err);
    return false;
  }
};

export const deleteAccountFromSupabase = async (uid: string): Promise<boolean> => {
  if (!supabaseInstance) return false;

  try {
    // Eliminar primero sus mangas asociados
    await supabaseInstance.from('user_mangas').delete().eq('user_uid', uid);

    const { error } = await supabaseInstance
      .from('user_accounts')
      .delete()
      .eq('uid', uid);

    if (error) {
      console.warn('Error eliminando cuenta en Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Fallo eliminando cuenta en Supabase:', err);
    return false;
  }
};

// ==========================================
// OPERACIONES CON MANGAS EN SUPABASE
// ==========================================

export const fetchMangasFromSupabase = async (userUid: string): Promise<MangaItem[]> => {
  if (!supabaseInstance) return [];

  try {
    const { data, error } = await supabaseInstance
      .from('user_mangas')
      .select('*')
      .eq('user_uid', userUid)
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('Error obteniendo mangas desde Supabase:', error.message);
      return [];
    }

    if (!data) return [];

    return data.map((row: any) => ({
      id: row.id,
      title: row.title,
      format: row.format,
      status: row.status,
      cover: row.cover,
      currentChap: row.current_chap || 0,
      totalChap: row.total_chap || 0,
      score: row.score || 0,
      genre: row.genre || '',
      author: row.author || '',
      notes: row.notes || '',
      updatedAt: row.updated_at,
      anilistId: row.anilist_id
    }));
  } catch (err) {
    console.error('Error cargando mangas desde Supabase:', err);
    return [];
  }
};

export const syncUserMangasToSupabase = async (
  userUid: string,
  mangas: MangaItem[]
): Promise<boolean> => {
  if (!supabaseInstance) return false;

  try {
    // Actualizar conteo en user_accounts
    await updateAccountInSupabase(userUid, { mangaCount: mangas.length });

    if (mangas.length === 0) {
      await supabaseInstance.from('user_mangas').delete().eq('user_uid', userUid);
      return true;
    }

    const rows = mangas.map((m) => ({
      id: m.id,
      user_uid: userUid,
      title: m.title,
      format: m.format,
      status: m.status,
      cover: m.cover,
      current_chap: m.currentChap,
      total_chap: m.totalChap,
      score: m.score,
      genre: m.genre || null,
      author: m.author || null,
      notes: m.notes || null,
      updated_at: m.updatedAt || new Date().toISOString(),
      anilist_id: m.anilistId || null
    }));

    const { error } = await supabaseInstance.from('user_mangas').upsert(rows, {
      onConflict: 'id'
    });

    if (error) {
      console.warn('Error sincronizando mangas en Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error de red al sincronizar mangas:', err);
    return false;
  }
};

// ==========================================
// CÓDIGO SQL COPIABLE PARA SUPABASE
// ==========================================
export const SUPABASE_SETUP_SQL = `-- 1. Tabla de Cuentas para el Panel de Administrador de MangaKura (con control de contraseñas)
CREATE TABLE IF NOT EXISTS public.user_accounts (
  uid TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  password TEXT DEFAULT 'mangakura123',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ DEFAULT NOW(),
  avatar_gradient TEXT,
  is_anonymous BOOLEAN DEFAULT FALSE,
  manga_count INTEGER DEFAULT 0
);

-- Migración segura por si la tabla ya existía previamente:
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS password TEXT DEFAULT 'mangakura123';

-- 2. Tabla de Mangas / Obras asociadas a cada usuario
CREATE TABLE IF NOT EXISTS public.user_mangas (
  id TEXT PRIMARY KEY,
  user_uid TEXT NOT NULL REFERENCES public.user_accounts(uid) ON DELETE CASCADE,
  title TEXT NOT NULL,
  format TEXT DEFAULT 'manga',
  status TEXT DEFAULT 'plan_to_read',
  cover TEXT,
  current_chap INTEGER DEFAULT 0,
  total_chap INTEGER DEFAULT 0,
  score NUMERIC DEFAULT 0,
  genre TEXT,
  author TEXT,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  anilist_id INTEGER
);

-- 3. Habilitar Row Level Security (RLS) con políticas para acceso público / anon
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_mangas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo en user_accounts" ON public.user_accounts;
CREATE POLICY "Permitir todo en user_accounts" ON public.user_accounts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo en user_mangas" ON public.user_mangas;
CREATE POLICY "Permitir todo en user_mangas" ON public.user_mangas FOR ALL USING (true) WITH CHECK (true);
`;
