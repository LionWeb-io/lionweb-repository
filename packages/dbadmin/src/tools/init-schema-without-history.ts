import {
    CONTAINMENTS_TABLE,
    NODES_TABLE,
    PROPERTIES_TABLE,
    REFERENCES_TABLE,
    RESERVED_IDS_TABLE,
    METAPOINTERS_TABLE,
    CURRENT_DATA,
    REPO_VERSIONS, CURRENT_DATA_REPO_VERSION_KEY, CURRENT_DATA_REPO_CLIENT_ID_KEY, CURRENT_DATA_LIONWEB_VERSION_KEY
} from "@lionweb/repository-common";

export function initSchemaWithoutHistory(schema: string, lionWebVersion: string): string {
    return `-- Create schema
    -- drop if empty, otherwise fail
    DROP SCHEMA IF EXISTS "${schema}" RESTRICT;
    CREATE SCHEMA "${schema}";
    SET search_path TO "${schema}";
    
    -- Drops nodes table
    DROP TABLE IF EXISTS ${NODES_TABLE};
    DROP TABLE IF EXISTS ${PROPERTIES_TABLE};
    DROP TABLE IF EXISTS ${CONTAINMENTS_TABLE};
    DROP TABLE IF EXISTS ${REFERENCES_TABLE};
    
    DROP TABLE IF EXISTS ${METAPOINTERS_TABLE};
    
    DROP TABLE IF EXISTS ${RESERVED_IDS_TABLE};
    DROP TABLE IF EXISTS ${REPO_VERSIONS};
    DROP TABLE IF EXISTS ${CURRENT_DATA};
    
    -- Drop indices
    -- DROP INDEX IF EXISTS ContainmentsNodesIndex;
    -- DROP INDEX IF EXISTS PropertiesNodesIndex;
    -- DROP INDEX IF EXISTS ReferencesNodesIndex;
    -- DROP INDEX IF EXISTS MpsValuesIndex;
    -- DROP INDEX IF EXISTS MpsIdIndex;
    
    -- Creates metapointers table
    CREATE TABLE IF NOT EXISTS ${METAPOINTERS_TABLE} (
        id                  int    NOT NULL generated by default as identity, 
        language            text   NOT NULL,
        _version            text   NOT NULL,
        key                 text   NOT NULL,       
        PRIMARY KEY(id),
        UNIQUE (language, _version, key)
    );  
    
    -- Creates nodes table
    CREATE TABLE IF NOT EXISTS ${NODES_TABLE} (
        id                  text   NOT NULL, 
        classifier          int   NOT NULL,
        annotations         text[],
        parent              text,
        PRIMARY KEY(id),
        FOREIGN KEY(classifier) REFERENCES ${METAPOINTERS_TABLE}(id)
    );
    
    -- Creates containments table
    CREATE TABLE IF NOT EXISTS ${CONTAINMENTS_TABLE} (
        containment          int   NOT NULL,
        children             text[],
        node_id              text,
        PRIMARY KEY(containment, node_id),
        FOREIGN KEY(containment) REFERENCES ${METAPOINTERS_TABLE}(id)
    );
    
    -- Creates properties table
    CREATE TABLE IF NOT EXISTS ${PROPERTIES_TABLE} (
        property          int   NOT NULL,
        value             text,
        node_id           text,
        PRIMARY KEY(property, node_id),
        FOREIGN KEY(property) REFERENCES ${METAPOINTERS_TABLE}(id)
    );
    
    -- Creates references table
    CREATE TABLE IF NOT EXISTS ${REFERENCES_TABLE} (
        reference          int   NOT NULL,
        targets            jsonb[],
        node_id            text,
        PRIMARY KEY(reference, node_id),
        FOREIGN KEY(reference) REFERENCES ${METAPOINTERS_TABLE}(id)
    );
    
    -- Creates reserved_ids table
    CREATE TABLE IF NOT EXISTS ${RESERVED_IDS_TABLE} (
        node_id      text,
        client_id    text,
        PRIMARY KEY(node_id)
    );
    
    CREATE TABLE IF NOT EXISTS ${REPO_VERSIONS} (
        version    integer NOT NULL,
        date       timestamp,
        client_id  text,
        PRIMARY KEY(version)
    );
    
    INSERT INTO ${REPO_VERSIONS} 
        VALUES (0, NOW(), 'repository_id');
    
    -- this table contains "global variables per transaction"
    CREATE TABLE IF NOT EXISTS ${CURRENT_DATA} (
        key    text,
        value  text,
        PRIMARY KEY(key)
    );
    -- initialize current data
    INSERT INTO ${CURRENT_DATA} 
        ( key, value )  
    VALUES
        ('${CURRENT_DATA_REPO_VERSION_KEY}', '0'),
        ('${CURRENT_DATA_REPO_CLIENT_ID_KEY}', 'repository_id'),
        ('${CURRENT_DATA_LIONWEB_VERSION_KEY}', '${lionWebVersion}');
        
    -- TODO: Create indices to enable finding features for nodes quickly
    
    -- CREATE INDEX ContainmentsNodesIndex ON ${CONTAINMENTS_TABLE} (node_id)
    -- CREATE INDEX PropertiesNodesIndex   ON ${PROPERTIES_TABLE}   (node_id)
    -- CREATE INDEX ReferencesNodesIndex   ON ${REFERENCES_TABLE}   (node_id)
    -- CREATE INDEX ReservedIdsIndex       ON ${RESERVED_IDS_TABLE} (node_id)
    -- CREATE INDEX MpsValuesIndex       ON ${METAPOINTERS_TABLE} (language, _version, key)
    -- CREATE INDEX MpsIdIndex       ON ${METAPOINTERS_TABLE} (id)
    
    -- SET repo.version = 0;
    -- SET repo.version = (SELECT value FROM ${CURRENT_DATA} WHERE key = 'repo.version');
    
    
    --------------------------------------------------------------------        
    -- Function to go to the next repo version
    -- The table currenbt_data should reflect the new repo.version and
    -- The new repo.version should be added to the repo_versions table 
    --------------------------------------------------------------------        
    CREATE OR REPLACE FUNCTION nextRepoVersion(client text)
        RETURNS integer
    AS
    $$
    DECLARE nextVersion integer;
    BEGIN
        nextVersion := (SELECT value FROM ${CURRENT_DATA} WHERE key = '${CURRENT_DATA_REPO_VERSION_KEY}')::integer + 1 FOR UPDATE;
        INSERT INTO repo_versions (version, date, client_id) 
        VALUES (
            nextVersion,
            NOW(),
            client
        );
        UPDATE ${CURRENT_DATA}
            SET value = nextVersion
        WHERE key = '${CURRENT_DATA_REPO_VERSION_KEY}';
        
        RETURN nextVersion;
    END;
    $$ LANGUAGE plpgsql;
    
    --------------------------------------------------------------------        
    -- Function get current repo version
    --------------------------------------------------------------------        
    CREATE OR REPLACE FUNCTION currentRepoVersion()
        RETURNS integer
    AS
    $$
    DECLARE version integer;
    BEGIN
        version := (SELECT value FROM ${CURRENT_DATA} WHERE key = '${CURRENT_DATA_REPO_VERSION_KEY}')::integer;
        RETURN version;
    END;
    $$ LANGUAGE plpgsql;
    
    --------------------------------------------------------------------        
    -- Function to get the id for a list of MetaPointers. This
    -- function also stores such MetaPointers, if they are not already
    -- present
    --------------------------------------------------------------------
    CREATE OR REPLACE FUNCTION toMetaPointerIDs(
        language_values text[], 
        version_values text[], 
        key_values text[]
    ) RETURNS TABLE(res_id int, res_language text, res_version text, res_key text)
    AS
    $$
    BEGIN
        WITH input_values AS (
            SELECT unnest(language_values) AS i_language,
                   unnest(version_values) AS i_version,
                   unnest(key_values) AS i_key
        )
        INSERT INTO ${METAPOINTERS_TABLE}("language", "_version", "key")
            SELECT i_language, i_version, i_key
            FROM input_values
            ON CONFLICT("language", "_version", "key") DO NOTHING;
    
        RETURN QUERY (WITH input_values AS (
            SELECT unnest(language_values) AS i_language,
                   unnest(version_values) AS i_version,
                   unnest(key_values) AS i_key
        )
        
        SELECT id, language, _version, key
        FROM ${METAPOINTERS_TABLE}
        WHERE (language, _version, key) IN (
            SELECT i_language, i_version, i_key FROM input_values
        ));
    END
    $$ LANGUAGE plpgsql;
    `
}



