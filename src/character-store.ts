import { isSupabaseConfigured, supabase } from './supabase';

export type CharacterDepartmentId = 'sales' | 'purchase' | 'operations';

export interface CustomCharacterRecord {
  id: string;
  display_name: string;
  department_id: CharacterDepartmentId;
  created_at: string;
}

export function canUseCharacterStore(): boolean {
  return isSupabaseConfigured && !!supabase;
}

export async function fetchCustomCharacters(): Promise<CustomCharacterRecord[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('characters')
    .select('id, display_name, department_id, created_at')
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to load characters: ${error.message}`);
  }

  return (data ?? []) as CustomCharacterRecord[];
}

export async function addCustomCharacter(
  displayName: string,
  departmentId: CharacterDepartmentId
): Promise<CustomCharacterRecord> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const cleanedName = displayName.trim();
  if (!cleanedName) {
    throw new Error('Character name is required.');
  }

  const { data, error } = await supabase
    .from('characters')
    .insert({ display_name: cleanedName, department_id: departmentId })
    .select('id, display_name, department_id, created_at')
    .single();

  if (error || !data) {
    throw new Error(`Failed to add character: ${error?.message ?? 'Unknown error'}`);
  }

  return data as CustomCharacterRecord;
}

export async function deleteCustomCharacter(recordId: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const { error } = await supabase.from('characters').delete().eq('id', recordId);
  if (error) {
    throw new Error(`Failed to delete character: ${error.message}`);
  }
}
