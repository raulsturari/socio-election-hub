<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Brasil Data Lab architecture
- Official data is loaded only by `scripts/ingest/pipeline.py` (service role, run outside the app); the web app is read-only — keeps writes auditable via import_jobs/import_job_logs.
- An election is exposed in the UI only when `elections.validated = true`, set by the importer after file = zones = municipalities reconciliation — prevents showing unverified numbers.
- All joins between sources use the 7-digit IBGE code; TSE codes are mapped via `municipalities.tse_code`, validated against the IBGE Localidades API — single harmonization key.
- Public reads go through `createServerFn` in `src/lib/data.functions.ts` using a publishable-key client (`supabase-public.server.ts`, imported dynamically inside handlers) with paginated, ordered selects — PostgREST caps at 1000 rows.
- Filters live in URL search params (`src/lib/filters.ts`) shared by all content routes — survive refresh and carry across bottom-nav tabs.
- TSE codes missing from the community mapping are filled only by a unique exact normalized name+UF match, logged as a warning on the import job — keeps new municipalities (e.g. created after the mapping) reconcilable without guessing.
