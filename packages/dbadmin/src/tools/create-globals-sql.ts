/**
 * Query to create the `schemaExists()` function in the _public_ schema of the database.
 * Can't be inside a repository schema, as it checks whether a repository exists.
 * 
 * NOTE that the query begins with `SET search_path TO` avoiding the insertion of a search_path in `DbConnection`
 */
export const CREATE_GLOBALS_SQL: string = `SET search_path TO 'public';
--------------------------------------------------------------------        
-- Global function to check whether schema exists
--------------------------------------------------------------------        
CREATE FUNCTION public.existsSchema(name text)
    RETURNS void
AS
$$
BEGIN
    IF NOT EXISTS(
        SELECT schema_name
          FROM information_schema.schemata
          WHERE schema_name = name
      )
    THEN
        RAISE exception 'Schema does not exist';
    END IF;
END
$$ LANGUAGE plpgsql;
`
