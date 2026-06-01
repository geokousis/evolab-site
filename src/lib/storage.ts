import { supabaseClient } from './supabase';

const BUCKET = 'evolab-assets';

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'file';

const uniqueSuffix = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const fileExt = (name: string) => /\.([a-zA-Z0-9]+)$/.exec(name)?.[1]?.toLowerCase();

export type UploadResult = { publicUrl: string; storagePath: string };

export async function uploadMemberPhoto(identifier: string, file: File): Promise<UploadResult> {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) throw new Error('Only JPEG, PNG, or WebP images are allowed.');
  if (!supabaseClient) throw new Error('Supabase not configured.');
  const ext = fileExt(file.name) ?? 'jpg';
  const storagePath = `members/${slugify(identifier)}/photo-${uniqueSuffix()}.${ext}`;
  const { error } = await supabaseClient.storage.from(BUCKET).upload(storagePath, file, {
    upsert: true,
    cacheControl: '3600',
    contentType: file.type,
  });
  if (error) throw error;
  const { data } = supabaseClient.storage.from(BUCKET).getPublicUrl(storagePath);
  return { publicUrl: data.publicUrl, storagePath };
}

export async function uploadMemberCV(identifier: string, file: File): Promise<UploadResult> {
  if (file.type !== 'application/pdf') throw new Error('Only PDF files are allowed for CVs.');
  if (!supabaseClient) throw new Error('Supabase not configured.');
  const storagePath = `members/${slugify(identifier)}/cv-${uniqueSuffix()}.pdf`;
  const { error } = await supabaseClient.storage.from(BUCKET).upload(storagePath, file, {
    upsert: true,
    cacheControl: '3600',
    contentType: 'application/pdf',
  });
  if (error) throw error;
  const { data } = supabaseClient.storage.from(BUCKET).getPublicUrl(storagePath);
  return { publicUrl: data.publicUrl, storagePath };
}

export async function uploadLabPhoto(id: string, file: File): Promise<UploadResult> {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) throw new Error('Only JPEG, PNG, or WebP images are allowed.');
  if (!supabaseClient) throw new Error('Supabase not configured.');
  const ext = fileExt(file.name) ?? 'jpg';
  const storagePath = `lab-photos/${slugify(id)}-${uniqueSuffix()}.${ext}`;
  const { error } = await supabaseClient.storage.from(BUCKET).upload(storagePath, file, {
    upsert: true,
    cacheControl: '3600',
    contentType: file.type,
  });
  if (error) throw error;
  const { data } = supabaseClient.storage.from(BUCKET).getPublicUrl(storagePath);
  return { publicUrl: data.publicUrl, storagePath };
}

export async function deleteStorageFile(path: string): Promise<void> {
  if (!supabaseClient || !path) return;
  const { error } = await supabaseClient.storage.from(BUCKET).remove([path]);
  if (error) console.error('Failed to delete storage file:', error);
}
