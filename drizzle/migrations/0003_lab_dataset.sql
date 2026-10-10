-- Statistical lab: one row per municipality with the chosen outcome (y), predictor (x) and fixed covariates.
-- Missing values stay NULL (no imputation); the server handles listwise deletion and reports it.
CREATE OR REPLACE FUNCTION public.lab_dataset(
  _election_id integer,
  _metric text,
  _candidate_number integer DEFAULT NULL,
  _base_election_id integer DEFAULT NULL,
  _x text DEFAULT 'renda_domiciliar_pc_media_2022',
  _uf text DEFAULT NULL
)
RETURNS TABLE(ibge_code character, name text, uf character, y numeric, x numeric,
              renda numeric, superior numeric, populacao numeric, eligible integer)
LANGUAGE sql STABLE SET search_path = public AS $$
  WITH cand AS (
    SELECT r.ibge_code, r.share FROM municipal_results r JOIN candidates c ON c.id = r.candidate_id
    WHERE r.election_id = _election_id AND c.number = _candidate_number
  ), cand_base AS (
    SELECT r.ibge_code, r.share FROM municipal_results r JOIN candidates c ON c.id = r.candidate_id
    WHERE r.election_id = _base_election_id AND c.number = _candidate_number
  ), t AS (SELECT * FROM municipal_turnout WHERE election_id = _election_id),
     tb AS (SELECT * FROM municipal_turnout WHERE election_id = _base_election_id),
  ind AS (
    SELECT v.ibge_code,
      max(v.value) FILTER (WHERE v.indicator_id = _x) AS x,
      max(v.value) FILTER (WHERE v.indicator_id = 'renda_domiciliar_pc_media_2022') AS renda,
      max(v.value) FILTER (WHERE v.indicator_id = 'superior_completo_25mais_2022') AS superior,
      max(v.value) FILTER (WHERE v.indicator_id = 'populacao_residente_2022') AS populacao
    FROM indicator_values v
    WHERE v.indicator_id IN (_x, 'renda_domiciliar_pc_media_2022', 'superior_completo_25mais_2022', 'populacao_residente_2022')
    GROUP BY v.ibge_code
  )
  SELECT m.ibge_code, m.name, m.uf,
    CASE _metric
      WHEN 'share' THEN cand.share
      WHEN 'share_delta' THEN cand.share - cand_base.share
      WHEN 'turnout' THEN round(100.0 * t.turnout / NULLIF(t.eligible, 0), 4)
      WHEN 'abstention' THEN round(100.0 * t.abstentions / NULLIF(t.eligible, 0), 4)
      WHEN 'blank_null' THEN round(100.0 * (t.blank_votes + t.null_votes) / NULLIF(t.turnout, 0), 4)
      WHEN 'turnout_delta' THEN round(100.0 * t.turnout / NULLIF(t.eligible, 0), 4)
                              - round(100.0 * tb.turnout / NULLIF(tb.eligible, 0), 4)
    END AS y,
    ind.x, ind.renda, ind.superior, ind.populacao, t.eligible
  FROM municipalities m
  JOIN t ON t.ibge_code = m.ibge_code
  LEFT JOIN cand ON cand.ibge_code = m.ibge_code
  LEFT JOIN cand_base ON cand_base.ibge_code = m.ibge_code
  LEFT JOIN tb ON tb.ibge_code = m.ibge_code
  LEFT JOIN ind ON ind.ibge_code = m.ibge_code
  WHERE _uf IS NULL OR m.uf = _uf
  ORDER BY m.ibge_code
$$;
GRANT EXECUTE ON FUNCTION public.lab_dataset(integer, text, integer, integer, text, text) TO anon, authenticated, service_role;