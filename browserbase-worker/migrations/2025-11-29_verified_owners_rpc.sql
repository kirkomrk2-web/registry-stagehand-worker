-- Migration: RPC helpers for verified_owners companies manipulation
-- Date: 2025-11-29

BEGIN;



-- Function: get a single company JSON by owner_id + eik
CREATE OR REPLACE FUNCTION public.owners_company_get(p_owner_id uuid, p_eik text)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT c
  FROM public.verified_owners o,
       LATERAL jsonb_array_elements(o.companies) AS c
  WHERE o.id = p_owner_id
    AND c->>'eik' = p_eik
  LIMIT 1;
$$;

-- Function: update/merge fields into a company JSON (identified by owner_id + eik)
-- Returns the updated company jsonb
CREATE OR REPLACE FUNCTION public.owners_company_update(
  p_owner_id uuid,
  p_eik text,
  p_updates jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated jsonb;
BEGIN
  UPDATE public.verified_owners o
  SET companies = (
    SELECT jsonb_agg(
      CASE WHEN elem->>'eik' = p_eik THEN (elem || p_updates) ELSE elem END
      ORDER BY ord
    )
    FROM jsonb_array_elements(o.companies) WITH ORDINALITY AS t(elem, ord)
  )
  WHERE o.id = p_owner_id
  RETURNING (SELECT elem
             FROM jsonb_array_elements(o.companies) AS elem
             WHERE elem->>'eik' = p_eik
             LIMIT 1)
  INTO v_updated;

  RETURN v_updated;
END;
$$;

-- Function: select best company for an owner by name
CREATE OR REPLACE FUNCTION public.select_best_company(p_owner_name text)
RETURNS TABLE(owner_id uuid, eik text, company jsonb)
LANGUAGE sql
STABLE
AS $$
  SELECT o.id, (c->>'eik')::text AS eik, c AS company
  FROM public.verified_owners o,
       LATERAL jsonb_array_elements(o.companies) AS c
  WHERE o.full_name = p_owner_name
    AND COALESCE((c->>'profile_status')::text, 'verified') = 'verified'
    AND COALESCE((c->>'selected_for_registration')::boolean, false) = false
    AND COALESCE(o.allocated_phone_number, '') <> ''
    AND COALESCE(o.email_alias_33mail, '') <> ''
    AND COALESCE((c->>'data_quality_score')::int, 0) >= 70
  ORDER BY COALESCE((c->>'data_quality_score')::int, 0) DESC,
           COALESCE((c->>'verified_at')::timestamptz, now()) DESC
  LIMIT 1;
$$;

-- Function: list companies in signing-up state
CREATE OR REPLACE FUNCTION public.list_signing_up_companies(p_limit int DEFAULT 1)
RETURNS TABLE(owner_id uuid, eik text, company jsonb)
LANGUAGE sql
STABLE
AS $$
  SELECT o.id, (c->>'eik')::text AS eik, c AS company
  FROM public.verified_owners o,
       LATERAL jsonb_array_elements(o.companies) AS c
  WHERE (c->>'profile_status')::text = 'signing-up'
    AND (c->>'wallester_status') IS NULL
  LIMIT p_limit;
$$;

COMMIT;
