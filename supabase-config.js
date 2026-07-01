/* ================================================================
   supabase-config.js – Conexão com o Supabase (CronoCampo)
   ================================================================ */

const SUPABASE_URL      = 'https://ueiuafajbyimvqutgdnk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlaXVhZmFqYnlpbXZxdXRnZG5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MjUzNzQsImV4cCI6MjA5MDUwMTM3NH0.rIdGMOSkZKvPmt0RMKI9nbR3hV9l6T791WOR8Sj2waQ';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* Identificador fixo do cronograma compartilhado.
   Se um dia precisar de vários cronogramas separados, basta
   trocar esse valor (ou torná-lo dinâmico) para outro id. */
const CRONOGRAMA_ID = 'mecroc-principal';

/* ================================================================
   CloudSync – salvar/carregar o cronograma no Supabase
   ================================================================ */
const CloudSync = (() => {

  async function salvar(dados) {
    const { error } = await supabaseClient
      .from('cronogramas')
      .upsert({
        id: CRONOGRAMA_ID,
        dados,
        atualizado_em: new Date().toISOString(),
      });

    if (error) {
      console.error('Erro ao salvar no Supabase:', error);
      return { ok: false, error };
    }
    return { ok: true };
  }

  async function carregar() {
    const { data, error } = await supabaseClient
      .from('cronogramas')
      .select('dados')
      .eq('id', CRONOGRAMA_ID)
      .maybeSingle();

    if (error) {
      console.error('Erro ao carregar do Supabase:', error);
      return { ok: false, error };
    }
    if (!data) return { ok: true, dados: null };
    return { ok: true, dados: data.dados };
  }

  return { salvar, carregar };
})();
