import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Star,
  BookOpen,
  Sparkles,
  ScrollText,
  Compass,
  CheckCircle2,
  Plus,
  LogIn,
  UserPlus,
  Check,
  ChevronRight,
  Flame,
  Award,
  Layers,
  Globe,
  Crown,
  BookmarkCheck,
  ArrowRight
} from 'lucide-react';
import { MangaItem } from '../types';

export interface TopManga {
  id: string;
  anilistId: number;
  title: string;
  format: 'manga' | 'manhwa' | 'manhua';
  score: number;
  votes: string;
  rank: number;
  cover: string;
  author: string;
  genre: string;
  totalChap: number;
  description: string;
  highlight?: string;
}

// Catálogo curado de las obras con las más altas puntuaciones según MangaKura
export const TOP_RATED_MANGAS: TopManga[] = [
  {
    id: 'top-berserk',
    anilistId: 30002,
    title: 'Berserk',
    format: 'manga',
    score: 10.0,
    votes: '18.4k',
    rank: 1,
    cover: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    author: 'Kentaro Miura',
    genre: 'Fantasía Oscura, Drama, Épico',
    totalChap: 375,
    highlight: 'Puntuación Perfecta en MangaKura',
    description: 'La obra cumbre absoluta del manga de fantasía oscura. Guts, el Espadachín Negro, desafía el destino en un viaje visceral por la supervivencia y la redención.'
  },
  {
    id: 'top-solo-leveling',
    anilistId: 105398,
    title: 'Solo Leveling',
    format: 'manhwa',
    score: 9.8,
    votes: '24.1k',
    rank: 2,
    cover: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    author: 'Chugong & DUBU (REDICE)',
    genre: 'Acción, Mazmorras, Sobrenatural',
    totalChap: 200,
    highlight: 'El Manhwa Más Popular',
    description: 'El cazador de rango E Sung Jin-Woo despierta un sistema único que le permite evolucionar en solitario hasta convertirse en el soberano de las sombras.'
  },
  {
    id: 'top-orv',
    anilistId: 119760,
    title: "Omniscient Reader's Viewpoint",
    format: 'manhwa',
    score: 9.7,
    votes: '16.7k',
    rank: 3,
    cover: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
    author: 'Sing Shong / Sleepy-C',
    genre: 'Apocalipsis, Acción, Psicológico',
    totalChap: 230,
    highlight: 'Aclamado por la Crítica',
    description: 'Dokja Kim es el único lector que terminó la novela "Formas de Sobrevivir". Cuando el mundo real se transforma en esa misma historia, su conocimiento es la clave.'
  },
  {
    id: 'top-vagabond',
    anilistId: 30656,
    title: 'Vagabond',
    format: 'manga',
    score: 9.6,
    votes: '13.9k',
    rank: 4,
    cover: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80',
    author: 'Takehiko Inoue',
    genre: 'Histórico, Samuráis, Filosofía',
    totalChap: 327,
    highlight: 'Obra Maestra del Arte',
    description: 'La vida inmortalizada de Miyamoto Musashi. Un camino hacia la iluminación a través del filo de la espada y la introspección humana.'
  },
  {
    id: 'top-tower-of-god',
    anilistId: 85143,
    title: 'Tower of God',
    format: 'manhwa',
    score: 9.4,
    votes: '14.5k',
    rank: 5,
    cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    author: 'SIU',
    genre: 'Fantasía, Misterio, Batallas',
    totalChap: 600,
    highlight: 'Fantasía Épica Extensa',
    description: '¿Qué deseas? Dinero, gloria o venganza. Todo espera en la cima de la Torre de Dios para quienes tengan la determinación de ascenderla.'
  },
  {
    id: 'top-tales-of-demons',
    anilistId: 86707,
    title: 'Tales of Demons and Gods',
    format: 'manhua',
    score: 9.1,
    votes: '11.2k',
    rank: 6,
    cover: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
    author: 'Mad Snail',
    genre: 'Cultivación, Isekai, Artes Marciales',
    totalChap: 500,
    highlight: 'Top Manhua de Cultivación',
    description: 'Nie Li renace en su juventud con todo el conocimiento de su vida previa como el espiritista demoníaco más poderoso para reescribir el destino de Ciudad Gloria.'
  }
];

interface PortadaLandingProps {
  user: any;
  items: MangaItem[];
  onAddFromTop?: (topItem: TopManga) => void;
  onGoToLibrary?: () => void;
  onOpenAuth?: (tab: 'login' | 'register') => void;
  onGuestLogin?: () => void;
  showBackToLibraryButton?: boolean;
}

export const PortadaLanding: React.FC<PortadaLandingProps> = ({
  user,
  items,
  onAddFromTop,
  onGoToLibrary,
  onOpenAuth,
  onGuestLogin,
  showBackToLibraryButton = false
}) => {
  const [formatFilter, setFormatFilter] = useState<'all' | 'manga' | 'manhwa' | 'manhua'>('all');
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  // Filtrar catálogo top
  const filteredTop = useMemo(() => {
    if (formatFilter === 'all') return TOP_RATED_MANGAS;
    return TOP_RATED_MANGAS.filter((m) => m.format === formatFilter);
  }, [formatFilter]);

  // Verificar si una obra ya está en la biblioteca del usuario
  const isItemInLibrary = (topItem: TopManga) => {
    return items.some(
      (it) =>
        it.title.toLowerCase() === topItem.title.toLowerCase() ||
        (it.anilistId && it.anilistId === topItem.anilistId)
    );
  };

  const handleAddClick = (topItem: TopManga) => {
    if (onAddFromTop) {
      onAddFromTop(topItem);
      setAddedIds((prev) => ({ ...prev, [topItem.id]: true }));
    }
  };

  const getFormatBadge = (fmt: 'manga' | 'manhwa' | 'manhua') => {
    switch (fmt) {
      case 'manga':
        return { label: 'Manga', flag: '🇯🇵', color: 'bg-rose-500/15 text-rose-300 border-rose-500/30' };
      case 'manhwa':
        return { label: 'Manhwa', flag: '🇰🇷', color: 'bg-violet-500/15 text-violet-300 border-violet-500/30' };
      case 'manhua':
        return { label: 'Manhua', flag: '🇨🇳', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
    }
  };

  return (
    <div className="w-full text-slate-100 font-sans pb-16">
      {/* ========================================================
          1. HERO / PORTADA PRINCIPAL DE MANGA KURA
         ======================================================== */}
      <section className="relative overflow-hidden pt-8 pb-16 lg:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Luces y Gradientes de fondo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-tr from-rose-600/20 via-purple-600/20 to-indigo-600/10 blur-[130px] pointer-events-none rounded-full" />
        <div className="absolute top-1/3 right-10 w-[300px] h-[300px] bg-pink-500/10 blur-[100px] pointer-events-none rounded-full" />

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          {/* Pill superior con animación */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/70 text-xs font-semibold text-rose-300 mb-6 shadow-lg shadow-rose-950/40 backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-rose-400 animate-pulse" />
            <span>Biblioteca y Tracker de Manga, Manhwa & Manhua</span>
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span className="text-slate-400 font-normal">AniList API v2</span>
          </div>

          {/* Gran Título de Portada */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.15] mb-6">
            Tu Santuario para Almacenar{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-rose-400 via-pink-400 to-indigo-300">
              Mangas, Manhwas y Manhuas
            </span>
          </h1>

          {/* Descripción Explicativa de la Plataforma */}
          <p className="text-base sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed mb-8">
            Bienvenido a <strong className="text-white font-bold">MangaKura</strong>, la plataforma web todo-en-uno diseñada para amantes de las historietas asiáticas. 
            Crea tu propia <span className="text-rose-400 font-semibold">biblioteca digital</span> para clasificar tus lecturas en estados (Leyendo, Por Leer, Terminados), 
            llevar el conteo exacto de tus capítulos con un clic y consultar sinopsis y portadas oficiales de <strong>Japón 🇯🇵, Corea 🇰🇷 y China 🇨🇳</strong>.
          </p>

          {/* Botones de Acción (CTA) */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-12">
            {user ? (
              <>
                {showBackToLibraryButton && onGoToLibrary && (
                  <button
                    onClick={onGoToLibrary}
                    className="px-6 py-3.5 bg-gradient-to-r from-rose-600 via-rose-500 to-pink-600 hover:opacity-95 text-white font-bold text-sm sm:text-base rounded-2xl shadow-xl shadow-rose-600/30 transition duration-200 active:scale-95 flex items-center gap-2"
                  >
                    <BookOpen className="w-5 h-5" />
                    <span>Ir a Mi Biblioteca ({items.length} obras)</span>
                  </button>
                )}
                <a
                  href="#ranking-top"
                  className="px-6 py-3.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 font-bold text-sm sm:text-base rounded-2xl border border-slate-700/80 transition duration-200 active:scale-95 flex items-center gap-2"
                >
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <span>Ver Top Obras Más Puntuadas</span>
                </a>
              </>
            ) : (
              <>
                <button
                  onClick={() => onOpenAuth && onOpenAuth('register')}
                  className="px-6 py-3.5 bg-gradient-to-r from-rose-600 via-rose-500 to-pink-600 hover:opacity-95 text-white font-bold text-sm sm:text-base rounded-2xl shadow-xl shadow-rose-600/30 transition duration-200 active:scale-95 flex items-center gap-2"
                >
                  <UserPlus className="w-5 h-5" />
                  <span>Crear mi Biblioteca Gratis</span>
                </button>
                <button
                  onClick={onGuestLogin}
                  className="px-6 py-3.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 font-bold text-sm sm:text-base rounded-2xl border border-slate-700/80 transition duration-200 active:scale-95 flex items-center gap-2"
                >
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  <span>Probar Demo Invitado</span>
                </button>
                <a
                  href="#ranking-top"
                  className="px-5 py-3.5 text-slate-400 hover:text-white font-medium text-sm transition flex items-center gap-1.5"
                >
                  <span>Ver Ranking Top</span>
                  <ChevronRight className="w-4 h-4" />
                </a>
              </>
            )}
          </div>

          {/* Tres Pilares Visuales / Ventajas de MangaKura */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md hover:border-slate-700 transition group shadow-lg">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/25 flex items-center justify-center mb-3 group-hover:scale-105 transition">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base mb-1">Manga, Manhwa & Manhua</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Clasificación automática por banderas de origen. Distingue sin esfuerzo las historias tradicionales japonesas, los webtoons coreanos y el drama chino.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md hover:border-slate-700 transition group shadow-lg">
              <div className="w-10 h-10 rounded-xl bg-violet-500/15 text-violet-400 border border-violet-500/25 flex items-center justify-center mb-3 group-hover:scale-105 transition">
                <BookmarkCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base mb-1">Control de Capítulos en 1 Clic</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Lleva la cuenta de cada capítulo que lees sin perder el hilo. Vistas de tarjetas y tablero Kanban para organizar tus prioridades de lectura.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md hover:border-slate-700 transition group shadow-lg">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/25 flex items-center justify-center mb-3 group-hover:scale-105 transition">
                <Star className="w-5 h-5 fill-amber-400" />
              </div>
              <h3 className="font-bold text-white text-base mb-1">Puntuaciones & Calificaciones</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Puntúa del 1 al 10 tus historias favoritas. Descubre cuáles son las mejores calificadas del sitio web y consulta notas privadas en cada obra.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          2. SECCIÓN: RANKING DE MANGAS CON MÁS PUNTUACIÓN SEGÚN ESTE SITIO
         ======================================================== */}
      <section id="ranking-top" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 pt-12 border-t border-slate-800/60">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              Ranking Oficial MangaKura
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white">
              Obras con Mayor Puntuación en el Sitio Web
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              Las mejores obras maestras de Manga, Manhwa y Manhua evaluadas por los lectores de MangaKura.
            </p>
          </div>

          {/* Filtros de Formato para el Ranking */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-1 rounded-xl text-xs font-semibold self-start md:self-auto">
            <button
              onClick={() => setFormatFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition ${
                formatFilter === 'all'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos ({TOP_RATED_MANGAS.length})
            </button>
            <button
              onClick={() => setFormatFilter('manga')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
                formatFilter === 'manga'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🇯🇵 Mangas</span>
            </button>
            <button
              onClick={() => setFormatFilter('manhwa')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
                formatFilter === 'manhwa'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🇰🇷 Manhwas</span>
            </button>
            <button
              onClick={() => setFormatFilter('manhua')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
                formatFilter === 'manhua'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🇨🇳 Manhuas</span>
            </button>
          </div>
        </div>

        {/* Podio Destacado: Top 3 */}
        {formatFilter === 'all' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
            {TOP_RATED_MANGAS.slice(0, 3).map((item) => {
              const inLib = isItemInLibrary(item) || addedIds[item.id];
              const badge = getFormatBadge(item.format);
              const isFirst = item.rank === 1;
              const isSecond = item.rank === 2;
              const isThird = item.rank === 3;

              return (
                <div
                  key={item.id}
                  className={`relative rounded-3xl p-5 border transition-all duration-300 hover:-translate-y-1 overflow-hidden flex flex-col justify-between ${
                    isFirst
                      ? 'bg-gradient-to-b from-amber-500/10 via-slate-900/90 to-slate-950 border-amber-500/50 shadow-2xl shadow-amber-500/10'
                      : isSecond
                      ? 'bg-gradient-to-b from-slate-400/10 via-slate-900/90 to-slate-950 border-slate-500/40 shadow-xl'
                      : 'bg-gradient-to-b from-orange-500/10 via-slate-900/90 to-slate-950 border-orange-500/30 shadow-xl'
                  }`}
                >
                  {/* Badge de Puesto de Podio */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shadow-md ${
                          isFirst
                            ? 'bg-gradient-to-tr from-amber-400 to-yellow-200 text-slate-950'
                            : isSecond
                            ? 'bg-gradient-to-tr from-slate-300 to-slate-100 text-slate-950'
                            : 'bg-gradient-to-tr from-orange-400 to-amber-600 text-white'
                        }`}
                      >
                        {isFirst ? <Crown className="w-5 h-5" /> : `#${item.rank}`}
                      </div>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${badge.color}`}>
                        {badge.flag} {badge.label}
                      </span>
                    </div>

                    {/* Nota Estelar */}
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-400/15 border border-amber-400/30">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span className="text-sm font-black text-amber-300">{item.score.toFixed(1)}</span>
                      <span className="text-[10px] text-amber-200/70">/ 10</span>
                    </div>
                  </div>

                  {/* Cuerpo con Portada y Datos */}
                  <div className="flex gap-4 mb-4">
                    <img
                      src={item.cover}
                      alt={item.title}
                      className="w-24 h-36 object-cover rounded-xl bg-slate-900 border border-slate-800 shadow-md flex-shrink-0 group-hover:scale-105 transition"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-lg text-white line-clamp-1 mb-1" title={item.title}>
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-1 mb-1">
                        Por <span className="text-slate-300 font-medium">{item.author}</span>
                      </p>
                      <p className="text-[11px] text-rose-400/90 font-medium line-clamp-1 mb-2">
                        {item.genre}
                      </p>
                      <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Pie de la tarjeta con acción rápida */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 mt-auto">
                    <span className="text-[11px] text-slate-500 font-mono">
                      {item.totalChap} Capítulos • {item.votes} votos
                    </span>

                    {user ? (
                      inLib ? (
                        <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                          <Check className="w-3.5 h-3.5" /> En tu biblioteca
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAddClick(item)}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-rose-600/20 transition active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Añadir a mi lista</span>
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => onOpenAuth && onOpenAuth('login')}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-slate-700 transition"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Guardar</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Grilla completa de obras del ranking */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredTop.map((item) => {
            const inLib = isItemInLibrary(item) || addedIds[item.id];
            const badge = getFormatBadge(item.format);

            return (
              <div
                key={item.id}
                className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 hover:border-slate-700 transition group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded font-mono">
                        #{item.rank}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${badge.color}`}>
                        {badge.flag} {badge.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-400/20">
                      <Star className="w-3 h-3 fill-amber-400" />
                      <span>{item.score.toFixed(1)}</span>
                    </div>
                  </div>

                  <div className="flex gap-3 mb-3">
                    <img
                      src={item.cover}
                      alt={item.title}
                      className="w-16 h-24 object-cover rounded-lg bg-slate-950 border border-slate-800 flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-white text-sm line-clamp-1 group-hover:text-rose-400 transition" title={item.title}>
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {item.author}
                      </p>
                      <p className="text-[10px] text-slate-500 line-clamp-1 italic mt-0.5">
                        {item.genre}
                      </p>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-snug">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                  <span className="text-[11px] text-slate-500 font-mono">
                    {item.totalChap > 0 ? `${item.totalChap} caps` : 'En emisión'}
                  </span>

                  {user ? (
                    inLib ? (
                      <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
                        <Check className="w-3 h-3" /> En tu lista
                      </span>
                    ) : (
                      <button
                        onClick={() => handleAddClick(item)}
                        className="text-xs text-rose-400 hover:text-white hover:bg-rose-600/20 px-2.5 py-1 rounded-lg border border-rose-500/30 font-semibold transition active:scale-95 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Añadir
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => onOpenAuth && onOpenAuth('login')}
                      className="text-xs text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded transition"
                    >
                      Añadir a lista
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================
          3. SECCIÓN DE ACCESO RÁPIDO SI EL USUARIO NO ESTÁ LOGUEADO
         ======================================================== */}
      {!user && (
        <section className="max-w-4xl mx-auto px-4 mt-16 text-center">
          <div className="bg-gradient-to-r from-rose-950/40 via-purple-950/30 to-indigo-950/40 border border-rose-500/30 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
            <h3 className="text-2xl font-black text-white mb-2">
              ¿Listo para empezar tu propia colección en MangaKura?
            </h3>
            <p className="text-sm text-slate-300 max-w-xl mx-auto mb-6">
              Regístrate en menos de 10 segundos, no requiere confirmación de correo. Podrás acceder a tu biblioteca personal en cualquier momento.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => onOpenAuth && onOpenAuth('register')}
                className="px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-rose-600/30 transition active:scale-95"
              >
                Crear Cuenta Gratis
              </button>
              <button
                onClick={() => onOpenAuth && onOpenAuth('login')}
                className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-sm rounded-xl border border-slate-700 transition active:scale-95"
              >
                Ya tengo cuenta
              </button>
              <button
                onClick={onGuestLogin}
                className="px-5 py-3 text-slate-400 hover:text-white font-semibold text-sm transition"
              >
                Entrar como Invitado
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
