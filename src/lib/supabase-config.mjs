// The Supabase project fragments shares with the previous site (studieslog).
// The anon key is public by design: row-level security limits it to reading
// published articles and adding subscribers; writing needs a signed-in user.
export const SUPABASE_URL = process.env.SUPABASE_URL || 'https://eiyzlawmcyybchxzyozr.supabase.co';
export const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpeXpsYXdtY3l5YmNoeHp5b3pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMDI2MjQsImV4cCI6MjA5NTU3ODYyNH0.SZVwqWKkk31npqdiiG5m3HdkF4JnQ7SgEzThaFfZ4q4';
