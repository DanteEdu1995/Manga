export type MangaFormat = 'manga' | 'manhwa' | 'manhua';

export type MangaStatus = 'plan_to_read' | 'reading' | 'on_hold' | 'completed' | 'dropped';

export interface MangaItem {
  id: string;
  title: string;
  format: MangaFormat;
  status: MangaStatus;
  cover: string;
  currentChap: number;
  totalChap: number;
  score: number;
  genre?: string;
  author?: string;
  notes?: string;
  updatedAt?: string;
  anilistId?: number | null;
}

export type UserRole = 'admin' | 'user' | 'guest';

export interface UserAccount {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
  lastLogin: string;
  avatarGradient?: string;
  isAnonymous?: boolean;
  mangaCount?: number;
  password?: string;
}
