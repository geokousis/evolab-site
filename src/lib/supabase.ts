import { createClient } from '@supabase/supabase-js';

export interface Member {
  id: string;
  name: string;
  role: string;
  description: string;
  photo_url?: string | null;
  image_url?: string | null;
  avatar_url?: string | null;
  is_current: boolean;
  cv_link: string | null;
  display_order: number;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'past';
  start_year: number | null;
  end_year: number | null;
  display_order: number;
}

export interface Publication {
  id: string;
  title: string;
  authors: string;
  journal: string;
  year: number;
  doi: string | null;
  link: string | null;
}

type QueryResult<T> = Promise<{ data: T[]; error: null }>;

type FallbackClient = {
  from: <T>(_table: string) => {
    select: (_columns: string) => {
      order: (_column: string, _options?: { ascending?: boolean }) => QueryResult<T>;
    };
  };
};

const fallbackClient: FallbackClient = {
  from: <T>(_table: string) => ({
    select: (_columns: string) => ({
      order: async (_column: string, _options?: { ascending?: boolean }) => ({
        data: [] as T[],
        error: null,
      }),
    }),
  }),
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase: FallbackClient =
  supabaseUrl && supabaseAnonKey
    ? (createClient(supabaseUrl, supabaseAnonKey) as unknown as FallbackClient)
    : fallbackClient;
