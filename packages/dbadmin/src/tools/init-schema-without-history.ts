import {
    CONTAINMENTS_TABLE,
    NODES_TABLE,
    PROPERTIES_TABLE,
    REFERENCES_TABLE,
    RESERVED_IDS_TABLE
} from "@lionweb/repository-common";

export function initSchemaWithoutHistory(schema: string): string {
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
    
    DROP TABLE IF EXISTS ${RESERVED_IDS_TABLE};
    DROP TABLE IF EXISTS REPO_VERSIONS;
    DROP TABLE IF EXISTS CURRENT_DATA;
    
    -- Drop indices
    -- DROP INDEX IF EXISTS ContainmentsNodesIndex;
    -- DROP INDEX IF EXISTS PropertiesNodesIndex;
    -- DROP INDEX IF EXISTS ReferencesNodesIndex;
    
    -- Creates nodes table
    CREATE TABLE IF NOT EXISTS ${NODES_TABLE} (
        id                  text   NOT NULL, 
        classifier_language text   NOT NULL,
        classifier_version  text   NOT NULL,
        classifier_key      text   NOT NULL,
        annotations         text[],
        parent              text,
        PRIMARY KEY(id)
    );
    
    -- Creates containments table
    CREATE TABLE IF NOT EXISTS ${CONTAINMENTS_TABLE} (
        containment_language text   NOT NULL,
        containment_version  text   NOT NULL,
        containment_key      text   NOT NULL,
        children             text[],
        node_id              text,
        PRIMARY KEY(containment_key, node_id)
    );
    
    -- Creates properties table
    CREATE TABLE IF NOT EXISTS ${PROPERTIES_TABLE} (
        property_language text   NOT NULL,
        property_version  text   NOT NULL,
        property_key      text   NOT NULL,
        value             text,
        node_id           text,
        PRIMARY KEY(property_key, node_id)
    );
    
    -- Creates references table
    CREATE TABLE IF NOT EXISTS ${REFERENCES_TABLE} (
        reference_language text   NOT NULL,
        reference_version  text   NOT NULL,
        reference_key      text   NOT NULL,
        targets            jsonb[],
        node_id            text,
        PRIMARY KEY(reference_key, node_id)
    );
    
    -- Creates reserved_ids table
    CREATE TABLE IF NOT EXISTS ${RESERVED_IDS_TABLE} (
        node_id      text,
        client_id    text,
        PRIMARY KEY(node_id)
    );
    
    CREATE TABLE IF NOT EXISTS REPO_VERSIONS (
        version    integer NOT NULL,
        date       timestamp,
        client_id  text,
        PRIMARY KEY(version)
    );
    
    INSERT INTO REPO_VERSIONS 
        VALUES (0, NOW(), 'repository_id');
    
    -- this table contains "global variables per transaction"
    CREATE TABLE IF NOT EXISTS CURRENT_DATA (
        key    text,
        value  text,
        PRIMARY KEY(key)
    );
    -- initailize current data
    INSERT INTO CURRENT_DATA 
        ( key, value )  
    VALUES
        ('repo.version', '0'),
        ('repo.client_id', 'repository_id');
    
        
    -- TODO: Create indices to enable finding features for nodes quickly
    
    -- CREATE INDEX ContainmentsNodesIndex ON ${CONTAINMENTS_TABLE} (node_id)
    -- CREATE INDEX PropertiesNodesIndex   ON ${PROPERTIES_TABLE}   (node_id)
    -- CREATE INDEX ReferencesNodesIndex   ON ${REFERENCES_TABLE}   (node_id)
    -- CREATE INDEX ReservedIdsIndex       ON ${RESERVED_IDS_TABLE} (node_id)
    
    -- SET repo.version = 0;
    -- SET repo.version = (SELECT value FROM CURRENT_DATA WHERE key = 'repo.version');
    
    
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
        nextVersion := (SELECT value FROM current_data WHERE key = 'repo.version')::integer + 1;
        INSERT INTO repo_versions (version, date, client_id) 
        VALUES (
            nextVersion,
            NOW(),
            client
        );
        UPDATE current_data
            SET value = nextVersion
        WHERE key = 'repo.version';
        
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
        version := (SELECT value FROM current_data WHERE key = 'repo.version')::integer;
        RETURN version;
    END;
    $$ LANGUAGE plpgsql;
    `
}



