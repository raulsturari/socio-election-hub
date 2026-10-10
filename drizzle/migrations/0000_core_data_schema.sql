CREATE TYPE public.import_status AS ENUM ('pending','running','succeeded','failed');

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TABLE public.data_sources (
  id text PRIMARY KEY,
  name text NOT NULL,
  url text NOT NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.municipalities (
  ibge_code char(7) PRIMARY KEY CHECK (ibge_code ~ '^[0-9]{7}$'),
  tse_code integer UNIQUE,
  name text NOT NULL,
  uf char(2) NOT NULL,
  is_capital boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX municipalities_uf_idx ON public.municipalities(uf, name);

CREATE TABLE public.import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text NOT NULL REFERENCES public.data_sources(id),
  kind text NOT NULL,
  status public.import_status NOT NULL DEFAULT 'pending',
  source_url text NOT NULL,
  file_name text,
  file_sha256 text,
  source_last_modified timestamptz,
  pipeline_version text NOT NULL,
  rows_read integer,
  rows_written integer,
  coverage jsonb NOT NULL DEFAULT '{}'::jsonb,
  integrity jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX import_jobs_source_idx ON public.import_jobs(source_id, started_at DESC);

CREATE TABLE public.import_job_logs (
  id bigserial PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES public.import_jobs(id) ON DELETE CASCADE,
  level text NOT NULL CHECK (level IN ('info','warn','error')),
  message text NOT NULL,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX import_job_logs_job_idx ON public.import_job_logs(job_id, id);

CREATE TABLE public.elections (
  id serial PRIMARY KEY,
  year smallint NOT NULL CHECK (year BETWEEN 1990 AND 2100),
  round smallint NOT NULL CHECK (round IN (1,2)),
  office text NOT NULL,
  election_date date,
  validated boolean NOT NULL DEFAULT false,
  import_job_id uuid REFERENCES public.import_jobs(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (year, round, office)
);

CREATE TABLE public.candidates (
  id serial PRIMARY KEY,
  year smallint NOT NULL,
  office text NOT NULL,
  number integer NOT NULL,
  ballot_name text NOT NULL,
  party text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (year, office, number)
);

CREATE TABLE public.zone_results (
  election_id integer NOT NULL REFERENCES public.elections(id),
  ibge_code char(7) NOT NULL REFERENCES public.municipalities(ibge_code),
  zone integer NOT NULL,
  candidate_id integer NOT NULL REFERENCES public.candidates(id),
  votes integer NOT NULL CHECK (votes >= 0),
  import_job_id uuid NOT NULL REFERENCES public.import_jobs(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (election_id, ibge_code, zone, candidate_id)
);

CREATE TABLE public.municipal_results (
  election_id integer NOT NULL REFERENCES public.elections(id),
  ibge_code char(7) NOT NULL REFERENCES public.municipalities(ibge_code),
  candidate_id integer NOT NULL REFERENCES public.candidates(id),
  votes integer NOT NULL CHECK (votes >= 0),
  valid_votes integer NOT NULL CHECK (valid_votes >= votes),
  share numeric(7,4) GENERATED ALWAYS AS (CASE WHEN valid_votes > 0 THEN votes::numeric * 100 / valid_votes END) STORED,
  zones_count integer NOT NULL,
  import_job_id uuid NOT NULL REFERENCES public.import_jobs(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (election_id, ibge_code, candidate_id)
);
CREATE INDEX municipal_results_candidate_idx ON public.municipal_results(election_id, candidate_id);

CREATE TABLE public.indicators (
  id text PRIMARY KEY,
  name text NOT NULL,
  unit text NOT NULL,
  source_id text NOT NULL REFERENCES public.data_sources(id),
  source_table text NOT NULL,
  source_variable text NOT NULL,
  methodology text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.indicator_values (
  indicator_id text NOT NULL REFERENCES public.indicators(id),
  ibge_code char(7) NOT NULL REFERENCES public.municipalities(ibge_code),
  year smallint NOT NULL,
  value numeric,
  import_job_id uuid NOT NULL REFERENCES public.import_jobs(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (indicator_id, ibge_code, year)
);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['data_sources','municipalities','import_jobs','import_job_logs','elections','candidates','zone_results','municipal_results','indicators','indicator_values'] LOOP
    EXECUTE format('CREATE TRIGGER %I_touch BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at()', t, t);
    EXECUTE format('GRANT SELECT ON public.%I TO anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    -- Official public statistics: read-only for everyone; writes only via service role / importer.
    EXECUTE format('CREATE POLICY "public read official data" ON public.%I FOR SELECT TO anon, authenticated USING (true)', t);
  END LOOP;
END $$;

-- Candidate summary for a whole election, optionally restricted to one UF.
CREATE OR REPLACE FUNCTION public.election_summary(_election_id integer, _uf text DEFAULT NULL)
RETURNS TABLE(candidate_id integer, ballot_name text, party text, number integer, votes bigint, share numeric)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH s AS (
    SELECT r.candidate_id, sum(r.votes)::bigint AS votes
    FROM municipal_results r JOIN municipalities m USING (ibge_code)
    WHERE r.election_id = _election_id AND (_uf IS NULL OR m.uf = _uf)
    GROUP BY r.candidate_id
  )
  SELECT c.id, c.ballot_name, c.party, c.number, s.votes,
         round(s.votes::numeric * 100 / nullif(sum(s.votes) OVER (), 0), 2)
  FROM s JOIN candidates c ON c.id = s.candidate_id
  ORDER BY s.votes DESC
$$;
GRANT EXECUTE ON FUNCTION public.election_summary(integer, text) TO anon, authenticated;