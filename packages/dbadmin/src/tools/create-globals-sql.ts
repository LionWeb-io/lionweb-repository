import { REPOSITORIES_TABLE } from "@lionweb/repository-common";

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

--------------------------------------------------------------------        
-- Global table with all repositories with their LionWeb version
--------------------------------------------------------------------        

DROP TABLE IF EXISTS ${REPOSITORIES_TABLE};

-- Creates repository table
CREATE TABLE IF NOT EXISTS ${REPOSITORIES_TABLE} (
    id                  int    NOT NULL generated by default as identity, 
    repositoryName      text   NOT NULL,
    schemaName          text   NOT NULL,
    lionWebVersion      text   NOT NULL,
    created             timestamp,
    PRIMARY KEY(id),
    UNIQUE (repositoryName)
); 

--------------------------------------------------------------------        
-- Global function to add repo
--------------------------------------------------------------------        
CREATE FUNCTION public.createRepositoryInfo(repositoryName text, schemaName text, lionWebVersion text)
    RETURNS void
AS
$$
BEGIN
    INSERT INTO ${REPOSITORIES_TABLE} (repositoryName, schemaName, lionWebVersion, created) 
    VALUES (repositoryName, schemaName, lionWebVersion, NOW());
END
$$ LANGUAGE plpgsql;

--------------------------------------------------------------------        
-- Global function to delete repo
--------------------------------------------------------------------        
CREATE FUNCTION public.deleteRepositoryInfo(repo text)
    RETURNS void
AS
$$
BEGIN
    DELETE FROM ${REPOSITORIES_TABLE} r
    WHERE r.repositoryName = repo;
END
$$ LANGUAGE plpgsql;
`
