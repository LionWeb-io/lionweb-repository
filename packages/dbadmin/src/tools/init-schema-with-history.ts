import {
    CONTAINMENTS_TABLE, CONTAINMENTS_TABLE_HISTORY,
    NODES_TABLE, NODES_TABLE_HISTORY, FOREVER,
    PROPERTIES_TABLE, PROPERTIES_TABLE_HISTORY,
    REFERENCES_TABLE, REFERENCES_TABLE_HISTORY,
    RESERVED_IDS_TABLE
} from "@lionweb/repository-common";

export function dropSchema(schema: string): string {
        return `DROP SCHEMA IF EXISTS "${schema}" CASCADE;`
}

export function listSchemas(): string {
        return `-- select all schemas
        SELECT schema_name
        FROM information_schema.schemata;`
}

export function initSchemaWithHistory(schema: string): string {
        return  `-- Create schema
        -- drop if empty, otherwise fail
        DROP SCHEMA IF EXISTS "${schema}" RESTRICT;
        CREATE SCHEMA "${schema}";
        SET search_path TO "${schema}";

        -- Drops nodes table
        DROP VIEW IF EXISTS ${NODES_TABLE};
        DROP VIEW IF EXISTS ${PROPERTIES_TABLE};
        DROP VIEW IF EXISTS ${CONTAINMENTS_TABLE};
        DROP VIEW IF EXISTS ${REFERENCES_TABLE};

        DROP TABLE IF EXISTS ${NODES_TABLE_HISTORY};
        DROP TABLE IF EXISTS ${CONTAINMENTS_TABLE_HISTORY};
        DROP TABLE IF EXISTS ${PROPERTIES_TABLE_HISTORY};
        DROP TABLE IF EXISTS ${REFERENCES_TABLE_HISTORY};
        DROP TABLE IF EXISTS ${RESERVED_IDS_TABLE};
        DROP TABLE IF EXISTS REPO_VERSIONS;
        DROP TABLE IF EXISTS CURRENT_DATA;

        -- Drop indices
        -- DROP INDEX IF EXISTS ContainmentsNodesIndex;
        -- DROP INDEX IF EXISTS PropertiesNodesIndex;
        -- DROP INDEX IF EXISTS ReferencesNodesIndex;

        -- Creates nodes table
        CREATE TABLE IF NOT EXISTS ${NODES_TABLE_HISTORY} (
            from_version        integer NOT NULL,
            to_version          integer,
            id                  text   NOT NULL, 
            classifier_language text   NOT NULL,
            classifier_version  text   NOT NULL,
            classifier_key      text   NOT NULL,
            annotations         text[],
            parent              text,
            PRIMARY KEY(id, from_version)
        );

        CREATE OR REPLACE VIEW ${NODES_TABLE} AS
          SELECT * FROM ${NODES_TABLE_HISTORY}
            WHERE to_version = ${FOREVER};

        --------------------------------------------------------------------        
        -- Dynamic subset of ${NODES_TABLE_HISTORY} for repoVersion
        --------------------------------------------------------------------        
        CREATE OR REPLACE FUNCTION nodesForVersion(repoVersion integer)
            RETURNS table(
                id                  text, 
                classifier_language text,
                classifier_version  text,
                classifier_key      text,
                annotations         text[],
                parent              text)
        AS $$
        BEGIN
            RETURN QUERY SELECT 
                ${NODES_TABLE_HISTORY}.id, 
                ${NODES_TABLE_HISTORY}.classifier_language, 
                ${NODES_TABLE_HISTORY}.classifier_version, 
                ${NODES_TABLE_HISTORY}.classifier_key, 
                ${NODES_TABLE_HISTORY}.annotations, 
                ${NODES_TABLE_HISTORY}.parent
            FROM ${NODES_TABLE_HISTORY}
            WHERE from_version <= repoVersion AND to_version >= repoVersion;
        END;
        $$ LANGUAGE plpgsql;

        -- Creates containments table
        CREATE TABLE IF NOT EXISTS ${CONTAINMENTS_TABLE_HISTORY} (
            from_version         integer NOT NULL,
            to_version           integer,
            containment_language text   NOT NULL,
            containment_version  text   NOT NULL,
            containment_key      text   NOT NULL,
            children             text[],
            node_id              text,
            PRIMARY KEY(containment_key, node_id, from_version)
        );

        CREATE OR REPLACE VIEW ${CONTAINMENTS_TABLE} AS
          SELECT * FROM ${CONTAINMENTS_TABLE_HISTORY}
            WHERE to_version = ${FOREVER};

        --------------------------------------------------------------------        
        -- Dynamic subset of ${CONTAINMENTS_TABLE_HISTORY} for repoVersion
        --------------------------------------------------------------------        
        CREATE OR REPLACE FUNCTION containmentsForVersion(repoVersion integer)
            RETURNS table(
                containment_language text,
                containment_version  text,
                containment_key      text,
                children             text[],
                node_id              text)
        AS $$
        BEGIN
            RETURN QUERY SELECT 
                ${CONTAINMENTS_TABLE_HISTORY}.containment_language, 
                ${CONTAINMENTS_TABLE_HISTORY}.containment_version, 
                ${CONTAINMENTS_TABLE_HISTORY}.containment_key, 
                ${CONTAINMENTS_TABLE_HISTORY}.children, 
                ${CONTAINMENTS_TABLE_HISTORY}.node_id
            FROM ${CONTAINMENTS_TABLE_HISTORY}
            WHERE from_version <= repoVersion AND to_version >= repoVersion;
        END;
        $$ LANGUAGE plpgsql;

        -- Creates properties table
        CREATE TABLE IF NOT EXISTS ${PROPERTIES_TABLE_HISTORY} (
            from_version      integer NOT NULL,
            to_version        integer,
            property_language text   NOT NULL,
            property_version  text   NOT NULL,
            property_key      text   NOT NULL,
            value             text,
            node_id           text,
            PRIMARY KEY(property_key, node_id, from_version)
        );

        CREATE OR REPLACE VIEW ${PROPERTIES_TABLE} AS
          SELECT * FROM ${PROPERTIES_TABLE_HISTORY}
            WHERE to_version = ${FOREVER};

        --------------------------------------------------------------------        
        -- Dynamic subset of ${PROPERTIES_TABLE_HISTORY} for repoVersion
        --------------------------------------------------------------------        
        CREATE OR REPLACE FUNCTION propertiesForVersion(repoVersion integer)
            RETURNS table(
                property_language text,
                property_version  text,
                property_key      text,
                value             text,
                node_id           text)
        AS $$
        BEGIN
             RETURN QUERY SELECT 
                ${PROPERTIES_TABLE_HISTORY}.property_language, 
                ${PROPERTIES_TABLE_HISTORY}.property_version, 
                ${PROPERTIES_TABLE_HISTORY}.property_key, 
                ${PROPERTIES_TABLE_HISTORY}.value, 
                ${PROPERTIES_TABLE_HISTORY}.node_id
            FROM ${PROPERTIES_TABLE_HISTORY}
            WHERE from_version <= repoVersion AND to_version >= repoVersion;
        END;
        $$ LANGUAGE plpgsql;

        -- Creates references table
        CREATE TABLE IF NOT EXISTS ${REFERENCES_TABLE_HISTORY} (
            from_version       integer NOT NULL,
            to_version         integer,
            reference_language text   NOT NULL,
            reference_version  text   NOT NULL,
            reference_key      text   NOT NULL,
            targets            jsonb[],
            node_id            text,
            PRIMARY KEY(reference_key, node_id, from_version)
        );

        CREATE OR REPLACE VIEW ${REFERENCES_TABLE} AS
          SELECT * FROM ${REFERENCES_TABLE_HISTORY}
            WHERE to_version = ${FOREVER};

        --------------------------------------------------------------------        
        -- Dynamic subset of ${REFERENCES_TABLE_HISTORY} for repoVersion
        --------------------------------------------------------------------        
        CREATE OR REPLACE FUNCTION referencesForVersion(repoVersion integer)
            RETURNS table(
                reference_language text,
                reference_version  text,
                reference_key      text,
                targets            jsonb[],
                node_id             text)
        AS $$
        BEGIN
            RETURN QUERY SELECT 
                ${REFERENCES_TABLE_HISTORY}.reference_language, 
                ${REFERENCES_TABLE_HISTORY}.reference_version, 
                ${REFERENCES_TABLE_HISTORY}.reference_key, 
                ${REFERENCES_TABLE_HISTORY}.targets, 
                ${REFERENCES_TABLE_HISTORY}.node_id
            FROM ${REFERENCES_TABLE_HISTORY}
            WHERE from_version <= repoVersion AND to_version >= repoVersion;
        END;
        $$ LANGUAGE plpgsql;

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

        --------------------------------------------------------------------        
        -- On insert node, just make sure the FROM_VERSION column is filled
        --------------------------------------------------------------------        
        CREATE OR REPLACE FUNCTION insertNode()
            RETURNS TRIGGER
            AS 
        $$
        DECLARE
            repo_version integer;
            BEGIN
                SELECT value INTO repo_version FROM CURRENT_DATA WHERE key = 'repo.version';
                INSERT INTO ${NODES_TABLE_HISTORY} 
                    VALUES ( repo_version, ${FOREVER}, NEW.id, NEW.classifier_language, NEW.classifier_version, NEW.classifier_key, NEW.annotations, NEW.parent );
                RETURN NEW;
            END;
        $$  LANGUAGE plpgsql;

        CREATE TRIGGER nodes_insertView
        INSTEAD OF INSERT ON ${NODES_TABLE} 
            FOR EACH ROW 
                EXECUTE FUNCTION insertNode();

        --------------------------------------------------------------------        
        -- On update node, just make new row and fill TO_VERSION of old row
        --------------------------------------------------------------------        
        CREATE OR REPLACE FUNCTION updateNode()
            RETURNS TRIGGER
            LANGUAGE plpgsql
            AS 
        $$ 
        DECLARE
            repo_version integer;
        BEGIN
                SELECT value INTO repo_version FROM CURRENT_DATA WHERE key = 'repo.version';
            UPDATE ${NODES_TABLE_HISTORY} nh 
                SET to_version = repo_version - 1 
            WHERE 
                to_version = ${FOREVER} AND id = NEW.id; 
            INSERT INTO ${NODES_TABLE_HISTORY} 
                VALUES ( repo_version, ${FOREVER}, NEW.id, NEW.classifier_language, NEW.classifier_version, NEW.classifier_key, NEW.annotations, NEW.parent ); 
            RETURN NEW;
         END;
        $$;

        CREATE TRIGGER nodes_update
        INSTEAD OF UPDATE ON ${NODES_TABLE} 
            FOR EACH ROW 
                EXECUTE FUNCTION updateNode();

        -------------------------------------------------------------------        
        -- On delete node, just fill TO_VERSION of old row
        --------------------------------------------------------------------        
        --        repo.version = (SELECT value FROM CURRENT_DATA WHERE key = 'repo.version');
        CREATE OR REPLACE FUNCTION deleteNode()
            RETURNS TRIGGER
            LANGUAGE plpgsql
            AS 
        $$ 
        DECLARE
            repo_version integer;
            BEGIN
                SELECT value INTO repo_version FROM CURRENT_DATA WHERE key = 'repo.version';
                UPDATE ${NODES_TABLE_HISTORY} 
                    SET to_version = repo_version - 1 
                WHERE to_version = ${FOREVER} AND id = OLD.id; 
                RETURN NEW; 
            END; 
        $$;

        DROP TRIGGER IF EXISTS nodes_delete ON ${NODES_TABLE};

        CREATE TRIGGER nodes_delete
        INSTEAD OF DELETE ON ${NODES_TABLE} 
            FOR EACH ROW
                EXECUTE FUNCTION deleteNode();

        --------------------------------------------------------------------        
        -- On insert property, just make sure the FROM_VERSION column is filled
        --------------------------------------------------------------------        
        CREATE OR REPLACE FUNCTION insertProperty()
            RETURNS TRIGGER
            LANGUAGE plpgsql
            AS
        $$ 
        DECLARE repo_version integer; BEGIN
                SELECT value INTO repo_version FROM CURRENT_DATA WHERE key = 'repo.version';
            IF NOT EXISTS (SELECT FROM ${PROPERTIES_TABLE_HISTORY} 
                            WHERE property_language = NEW.property_language AND property_version = NEW.property_version AND property_key = NEW.property_key AND node_id = NEW.node_id 
                          )
            THEN 
                INSERT INTO ${PROPERTIES_TABLE_HISTORY} 
                VALUES ( repo_version, ${FOREVER}, NEW.property_language, NEW.property_version, NEW.property_key, NEW.value, NEW.node_id ); 
            ELSE 
                UPDATE ${PROPERTIES_TABLE} 
                    SET value = NEW.value WHERE to_version = ${FOREVER} AND property_language = NEW.property_language AND property_version = NEW.property_version AND property_key = NEW.property_key AND node_id = NEW.node_id; 
            END IF; 
            RETURN NEW; 
        END;
        $$;

        CREATE TRIGGER nodes_insertProperty
        INSTEAD OF INSERT ON ${PROPERTIES_TABLE} 
            FOR EACH ROW 
                EXECUTE FUNCTION insertProperty();

        --------------------------------------------------------------------        
        -- On update property, just make new row and fill TO_VERSION of old row
        --------------------------------------------------------------------        
        CREATE OR REPLACE FUNCTION updateProperty()
            RETURNS TRIGGER
            LANGUAGE plpgsql
            AS
        $$ DECLARE repo_version integer; BEGIN 
                SELECT value INTO repo_version FROM CURRENT_DATA WHERE key = 'repo.version';
            UPDATE ${PROPERTIES_TABLE_HISTORY} nh 
            SET
                to_version = repo_version - 1 
            WHERE 
                to_version = ${FOREVER} AND
                property_language = NEW.property_language AND 
                property_version = NEW.property_version AND 
                property_key = NEW.property_key AND 
                node_id = NEW.node_id; 
            INSERT INTO ${PROPERTIES_TABLE_HISTORY} 
                VALUES ( repo_version, ${FOREVER}, NEW.property_language, NEW.property_version, NEW.property_key, NEW.value, NEW.node_id ); RETURN NEW; END; $$;

        CREATE TRIGGER property_update
        INSTEAD OF UPDATE ON ${PROPERTIES_TABLE} 
            FOR EACH ROW 
                EXECUTE FUNCTION updateProperty();

        -------------------------------------------------------------------        
        -- On delete property, just fill TO_VERSION of old row
        --------------------------------------------------------------------        
        CREATE OR REPLACE FUNCTION deleteProperty()
            RETURNS TRIGGER
            LANGUAGE plpgsql
            AS 
        $$ DECLARE repo_version integer; 
        BEGIN 
                SELECT value INTO repo_version FROM CURRENT_DATA WHERE key = 'repo.version';
            UPDATE ${PROPERTIES_TABLE_HISTORY} SET to_version = repo_version - 1 WHERE to_version = ${FOREVER} AND node_id = OLD.node_id; RETURN NEW; END; $$;

        DROP TRIGGER IF EXISTS property_delete ON ${PROPERTIES_TABLE};

        CREATE TRIGGER property_delete
        INSTEAD OF DELETE ON ${PROPERTIES_TABLE} 
            FOR EACH ROW
                EXECUTE FUNCTION deleteProperty();

        --------------------------------------------------------------------        
        -- On insert containment, just make sure the FROM_VERSION column is filled
        --------------------------------------------------------------------        
        CREATE OR REPLACE FUNCTION insertContainment()
            RETURNS TRIGGER
            LANGUAGE plpgsql
            AS 
        $$ DECLARE repo_version integer; BEGIN 
                SELECT value INTO repo_version FROM CURRENT_DATA WHERE key = 'repo.version';
            IF NOT EXISTS (SELECT FROM ${CONTAINMENTS_TABLE_HISTORY} WHERE containment_key = NEW.containment_key AND node_id = NEW.node_id ) THEN INSERT INTO ${CONTAINMENTS_TABLE_HISTORY} VALUES ( repo_version, ${FOREVER}, NEW.containment_language, NEW.containment_version, NEW.containment_key, NEW.children, NEW.node_id ); ELSE UPDATE ${CONTAINMENTS_TABLE} SET children = NEW.children WHERE to_version = ${FOREVER} AND containment_key = NEW.containment_key AND node_id = NEW.node_id; END IF; RETURN NEW; END; $$;

        CREATE TRIGGER nodes_insertContainment
        INSTEAD OF INSERT ON ${CONTAINMENTS_TABLE} 
            FOR EACH ROW 
                EXECUTE FUNCTION insertContainment();

        --------------------------------------------------------------------        
        -- On update containment, just make new row and fill TO_VERSION of old row
        --------------------------------------------------------------------        
        CREATE OR REPLACE FUNCTION updateContainment()
            RETURNS TRIGGER
            LANGUAGE plpgsql
            AS 
        $$
        DECLARE 
            repo_version integer;
        BEGIN 
                SELECT value INTO repo_version FROM CURRENT_DATA WHERE key = 'repo.version';
            UPDATE ${CONTAINMENTS_TABLE_HISTORY} nh 
                SET to_version = repo_version - 1 
                WHERE to_version = ${FOREVER} AND containment_key = NEW.containment_key AND node_id = NEW.node_id; 
                INSERT INTO ${CONTAINMENTS_TABLE_HISTORY} 
                VALUES ( repo_version, ${FOREVER}, NEW.containment_language, NEW.containment_version, NEW.containment_key, NEW.children, NEW.node_id ); 
            RETURN NEW; 
        END; 
        $$;

        CREATE TRIGGER containment_update
        INSTEAD OF UPDATE ON ${CONTAINMENTS_TABLE} 
            FOR EACH ROW 
                EXECUTE FUNCTION updateContainment();

        -------------------------------------------------------------------        
        -- On delete containment, just fill TO_VERSION of old row
        --------------------------------------------------------------------        
        CREATE OR REPLACE FUNCTION deleteContainment()
            RETURNS TRIGGER
            LANGUAGE plpgsql
            AS 
        $$ DECLARE 
            repo_version integer; 
        BEGIN 
            SELECT value INTO repo_version 
                FROM CURRENT_DATA 
            WHERE key = 'repo.version';
            UPDATE ${CONTAINMENTS_TABLE_HISTORY} 
                SET to_version = repo_version - 1 
            WHERE to_version = ${FOREVER} AND node_id = OLD.node_id; RETURN NEW; END; $$;

        DROP TRIGGER IF EXISTS containment_delete ON ${CONTAINMENTS_TABLE};

        CREATE TRIGGER containment_delete
        INSTEAD OF DELETE ON ${CONTAINMENTS_TABLE} 
            FOR EACH ROW
                EXECUTE FUNCTION deleteContainment();

        --------------------------------------------------------------------        
        -- On insert reference, just make sure the FROM_VERSION column is filled
        --------------------------------------------------------------------        
        CREATE OR REPLACE FUNCTION insertReference()
            RETURNS TRIGGER
            LANGUAGE plpgsql
            AS 
        $$
        DECLARE
            repo_version integer;
        BEGIN 
                SELECT value INTO repo_version FROM CURRENT_DATA WHERE key = 'repo.version';
            IF NOT EXISTS (SELECT FROM ${REFERENCES_TABLE_HISTORY} 
                                WHERE reference_key = NEW.reference_key AND node_id = NEW.node_id ) 
            THEN
                INSERT INTO ${REFERENCES_TABLE_HISTORY}
                    VALUES ( repo_version, ${FOREVER}, NEW.reference_language, NEW.reference_version, NEW.reference_key, NEW.targets, NEW.node_id ); ELSE UPDATE ${REFERENCES_TABLE} SET targets = NEW.targets WHERE to_version = ${FOREVER} AND reference_key = NEW.reference_key AND node_id = NEW.node_id;
            END IF;
            RETURN NEW;
        END;
        $$;

        CREATE TRIGGER nodes_insertReference
        INSTEAD OF INSERT ON ${REFERENCES_TABLE} 
            FOR EACH ROW 
                EXECUTE FUNCTION insertReference();

        --------------------------------------------------------------------        
        -- On update reference, just make new row and fill TO_VERSION of old row
        --------------------------------------------------------------------        
        CREATE OR REPLACE FUNCTION updateReference()
            RETURNS TRIGGER
            LANGUAGE plpgsql
            AS 
        $$
        DECLARE 
            repo_version integer;
        BEGIN
                SELECT value INTO repo_version FROM CURRENT_DATA WHERE key = 'repo.version';
            UPDATE ${REFERENCES_TABLE_HISTORY} nh SET to_version = repo_version - 1 
                WHERE to_version = ${FOREVER} AND reference_key = NEW.reference_key AND node_id = NEW.node_id; 
            INSERT INTO ${REFERENCES_TABLE_HISTORY} 
                VALUES ( repo_version, ${FOREVER}, NEW.reference_language, NEW.reference_version, NEW.reference_key, NEW.targets, NEW.node_id ); 
            RETURN NEW; 
        END; 
        $$;

        CREATE TRIGGER reference_update
        INSTEAD OF UPDATE ON ${REFERENCES_TABLE} 
            FOR EACH ROW 
                EXECUTE FUNCTION updateReference();

        -------------------------------------------------------------------        
        -- On delete reference, just fill TO_VERSION of old row
        --------------------------------------------------------------------        
        CREATE OR REPLACE FUNCTION deleteReference()
            RETURNS TRIGGER
            LANGUAGE plpgsql
            AS
        $$ 
        DECLARE 
            repo_version integer; 
        BEGIN 
                SELECT value INTO repo_version FROM CURRENT_DATA WHERE key = 'repo.version';
            UPDATE ${REFERENCES_TABLE_HISTORY} 
                SET to_version = repo_version - 1 
                WHERE to_version = ${FOREVER} AND node_id = OLD.node_id; 
            RETURN NEW; 
        END; 
        $$;

        DROP TRIGGER IF EXISTS reference_delete ON ${REFERENCES_TABLE};

        CREATE TRIGGER reference_delete
        INSTEAD OF DELETE ON ${REFERENCES_TABLE} 
            FOR EACH ROW
                EXECUTE FUNCTION deleteReference();

        `
}



