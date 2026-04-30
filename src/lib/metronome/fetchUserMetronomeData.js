import { supabase } from '../supabaseClient.js'

/**
 * Fetches the signed-in user's `user_data` row (songs, setlists, practice stats, etc.).
 * @param {string} userId
 */
export function fetchUserMetronomeDataRow(userId) {
  return supabase.from('user_data').select('*').eq('user_id', userId).maybeSingle()
}
