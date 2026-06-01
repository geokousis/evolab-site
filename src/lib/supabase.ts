import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface Member {
  id: string;
  name: string;
  role: string;
  description: string;
  photo_url?: string | null;
  photo_storage_path?: string | null;
  is_current: boolean;
  cv_link: string | null;
  cv_storage_path?: string | null;
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
  from: <T>(table: string) => {
    select: (columns: string) => {
      order: (column: string, options?: { ascending?: boolean }) => QueryResult<T>;
    };
  };
};

const fallbackClient: FallbackClient = {
  from: <T>(table: string) => ({
    select: (columns: string) => ({
      order: async (column: string, options?: { ascending?: boolean }) => {
        void table;
        void columns;
        void column;
        void options;
        return {
          data: [] as T[],
          error: null,
        };
      },
    }),
  }),
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabaseClient: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;

export const supabase = (supabaseClient ?? fallbackClient) as unknown as SupabaseClient;
