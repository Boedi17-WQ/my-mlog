import { supabase } from '../supabase';

export async function testStorage() {
  try {
    // Tes autentikasi
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError) throw authError;
    if (!session) {
      console.log('No active session, trying to sign in anonymously...');
      const { error: signInError } = await supabase.auth.signInAnonymously();
      if (signInError) throw signInError;
    }

    // Tes akses storage
    const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
    if (storageError) throw storageError;
    
    console.log('Storage buckets:', buckets);
    console.log('Storage configuration is correct!');
    return true;
  } catch (error) {
    console.error('Storage test failed:', error);
    return false;
  }
}