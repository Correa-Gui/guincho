-- Fase 5.7+: permite escolher o provider de IA (Gemini/OpenAI) por empresa,
-- pra comparar resultados sem precisar mudar variável de ambiente/redeploy.

alter table configuracoes_ia
  add column if not exists provider text check (provider in ('gemini', 'openai'));
