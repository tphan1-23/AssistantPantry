import { supabase } from '@/services/supabase';

/**
 * Uploads a profile photo to the `avatars` bucket and returns its public URL.
 * Always writes to the same path per user ("<userId>/avatar.jpg"), so a new
 * photo replaces the old one rather than accumulating orphaned files.
 */
export async function uploadAvatar(
  userId: string,
  base64: string,
  contentType = 'image/jpeg'
): Promise<string> {
  // RN's fetch() can turn a data: URI into a Blob directly - avoids pulling
  // in a base64-to-ArrayBuffer package just for this one upload.
  const blob = await (await fetch(`data:${contentType};base64,${base64}`)).blob();
  const path = `${userId}/avatar.jpg`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, blob, { contentType, upsert: true });
  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  // Cache-bust: the path never changes between photos, so without this the
  // CDN/browser could keep showing the previous image after an update.
  return `${data.publicUrl}?v=${Date.now()}`;
}
