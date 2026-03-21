-- Readonly query execution function for AI-generated SQL
-- Uses SECURITY DEFINER to execute with elevated permissions
-- but constrains queries to read-only with a 10-second timeout.

CREATE OR REPLACE FUNCTION execute_readonly_query(
  query_text TEXT,
  store_id_param UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '10s'
AS $$
DECLARE
  result JSONB;
  final_query TEXT;
BEGIN
  -- Replace $1 parameter with actual store_id
  final_query := REPLACE(query_text, '$1', quote_literal(store_id_param::TEXT));

  -- Verify it's a SELECT or WITH statement
  IF NOT (UPPER(TRIM(final_query)) LIKE 'SELECT%' OR UPPER(TRIM(final_query)) LIKE 'WITH%') THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed';
  END IF;

  -- Execute and capture results as JSONB
  EXECUTE 'SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (' || final_query || ') t'
    INTO result;

  RETURN result;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION execute_readonly_query(TEXT, UUID) TO authenticated;
