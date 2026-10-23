import type { Database } from './database.types';

// Migration overlay until server-side type generation is available again.
type ArchivedTable<T extends { Row: object; Insert: object; Update: object }> = Omit<T, 'Row' | 'Insert' | 'Update'> & {
  Row: T['Row'] & { archived_at: string | null };
  Insert: T['Insert'] & { archived_at?: string | null };
  Update: T['Update'] & { archived_at?: string | null };
};
export type AppDatabase = Omit<Database, 'public'> & {
  public: Omit<Database['public'], 'Tables' | 'Views' | 'Functions'> & {
    Tables: Omit<Database['public']['Tables'], 'customers' | 'repair_transactions'> & {
      customers: ArchivedTable<Database['public']['Tables']['customers']>;
      repair_transactions: ArchivedTable<Database['public']['Tables']['repair_transactions']>;
    };
    Views: { repair_overview: Omit<Database['public']['Views']['repair_overview'], 'Row'> & {
      Row: Database['public']['Views']['repair_overview']['Row'] & { archived_at: string | null };
    } };
    Functions: Omit<Database['public']['Functions'], 'search_customers' | 'search_repairs'> & {
      search_customers: Omit<Database['public']['Functions']['search_customers'], 'Returns'> & { Returns: ArchivedTable<Database['public']['Tables']['customers']>['Row'][] };
      search_repairs: Omit<Database['public']['Functions']['search_repairs'], 'Returns'> & { Returns: (Database['public']['Views']['repair_overview']['Row'] & { archived_at: string | null })[] };
      search_archived_repairs: Omit<Database['public']['Functions']['search_repairs'], 'Returns'> & { Returns: (Database['public']['Views']['repair_overview']['Row'] & { archived_at: string | null })[] };
      search_archived_customers: Omit<Database['public']['Functions']['search_customers'], 'Returns'> & { Returns: ArchivedTable<Database['public']['Tables']['customers']>['Row'][] };
      set_record_archived: { Args: { p_kind: string; p_id: string; p_archived: boolean }; Returns: undefined };
    };
  };
};
