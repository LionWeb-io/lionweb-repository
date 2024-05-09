import {
    CONTAINMENTS_TABLE, CONTAINMENTS_TABLE_HISTORY,
    NODES_TABLE, NODES_TABLE_HISTORY,
    PROPERTIES_TABLE, PROPERTIES_TABLE_HISTORY,
    REFERENCES_TABLE, REFERENCES_TABLE_HISTORY,
    RESERVED_IDS_TABLE
} from "@lionweb/repository-common";

export const INIT_TABLES_SQL = `
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
    WHERE to_version = 99999;

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
    WHERE to_version = 99999;

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
    WHERE to_version = 99999;

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
    WHERE to_version = 99999;

-- Creates reserved_ids table
CREATE TABLE IF NOT EXISTS ${RESERVED_IDS_TABLE} (
    node_id      text,
    client_id    text,
    PRIMARY KEY(node_id)
);

-- TODO: Create indices to enable finding features for nodes quickly

-- CREATE INDEX ContainmentsNodesIndex ON ${CONTAINMENTS_TABLE} (node_id)
-- CREATE INDEX PropertiesNodesIndex   ON ${PROPERTIES_TABLE}   (node_id)
-- CREATE INDEX ReferencesNodesIndex   ON ${REFERENCES_TABLE}   (node_id)
-- CREATE INDEX ReservedIdsIndex       ON ${RESERVED_IDS_TABLE} (node_id)

SET repo.version = 0;

--------------------------------------------------------------------        
-- On insert node, just make sure the FROM_VERSION column is filled
--------------------------------------------------------------------        
CREATE OR REPLACE FUNCTION public.insertNode()
    RETURNS TRIGGER
    AS 
$insert_node$
DECLARE
   repo_version integer;
BEGIN
    repo_version = current_setting('repo.version', true)::integer;
    INSERT INTO ${NODES_TABLE_HISTORY} VALUES ( repo_version, 99999, NEW.id, NEW.classifier_language, NEW.classifier_version, NEW.classifier_key, NEW.annotations, NEW.parent );
    RETURN NEW;
END;
$insert_node$     
LANGUAGE plpgsql;

CREATE TRIGGER nodes_insertView
INSTEAD OF INSERT ON ${NODES_TABLE} 
    FOR EACH ROW 
        EXECUTE FUNCTION public.insertNode();

--------------------------------------------------------------------        
-- On update node, just make new row and fill TO_VERSION of old row
--------------------------------------------------------------------        
CREATE OR REPLACE FUNCTION public.updateNode()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $update_function$
DECLARE
   repo_version integer;
BEGIN
    repo_version = current_setting('repo.version', true)::integer;
    UPDATE ${NODES_TABLE_HISTORY} nh 
        SET to_version = repo_version - 1
        WHERE to_version = 99999 AND id = NEW.id;
    INSERT INTO ${NODES_TABLE_HISTORY} 
        VALUES ( repo_version, 99999, NEW.id, NEW.classifier_language, NEW.classifier_version, NEW.classifier_key, NEW.annotations, NEW.parent );
    RETURN NEW;
END;
$update_function$;

CREATE TRIGGER nodes_update
INSTEAD OF UPDATE ON ${NODES_TABLE} 
    FOR EACH ROW 
        EXECUTE FUNCTION public.updateNode();

-------------------------------------------------------------------        
-- On delete node, just fill TO_VERSION of old row
--------------------------------------------------------------------        
CREATE OR REPLACE FUNCTION public.deleteNode()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $delete_function$
DECLARE
   repo_version integer;
BEGIN
    repo_version = current_setting('repo.version', true)::integer;
    UPDATE ${NODES_TABLE_HISTORY} 
        SET to_version = repo_version - 1
        WHERE to_version = 99999 AND id = OLD.id;
    RETURN NEW;
END;
$delete_function$;

DROP TRIGGER IF EXISTS nodes_delete ON ${NODES_TABLE};

CREATE TRIGGER nodes_delete
INSTEAD OF DELETE ON ${NODES_TABLE} 
    FOR EACH ROW
        EXECUTE FUNCTION public.deleteNode();
      
--------------------------------------------------------------------        
-- On insert property, just make sure the FROM_VERSION column is filled
--------------------------------------------------------------------        
CREATE OR REPLACE FUNCTION public.insertProperty()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $insert_property$
DECLARE
   repo_version integer;
BEGIN
    repo_version = current_setting('repo.version', true)::integer;
    IF NOT EXISTS 
        (SELECT FROM ${PROPERTIES_TABLE_HISTORY} 
         WHERE 
             property_language = NEW.property_language AND
             property_version = NEW.property_version AND
             property_key = NEW.property_key AND
             node_id = NEW.node_id )
    THEN
        INSERT INTO ${PROPERTIES_TABLE_HISTORY} 
            VALUES ( repo_version, 99999, NEW.property_language, NEW.property_version, NEW.property_key, NEW.value, NEW.node_id );
    ELSE
        UPDATE ${PROPERTIES_TABLE} 
            SET value = NEW.value
        WHERE
            to_version = 99999 AND
            property_language = NEW.property_language AND
            property_version = NEW.property_version AND
            property_key = NEW.property_key AND
            node_id = NEW.node_id;
    END IF;
    RETURN NEW;
END;
$insert_property$;

CREATE TRIGGER nodes_insertProperty
INSTEAD OF INSERT ON ${PROPERTIES_TABLE} 
    FOR EACH ROW 
        EXECUTE FUNCTION public.insertProperty();

--------------------------------------------------------------------        
-- On update property, just make new row and fill TO_VERSION of old row
--------------------------------------------------------------------        
CREATE OR REPLACE FUNCTION public.updateProperty()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $update_property$
DECLARE
   repo_version integer;
BEGIN
    repo_version = current_setting('repo.version', true)::integer;
    UPDATE ${PROPERTIES_TABLE_HISTORY} nh 
        SET to_version = repo_version - 1
        WHERE
            to_version = 99999 AND 
            property_language = NEW.property_language AND
            property_version = NEW.property_version AND
            property_key = NEW.property_key AND
            node_id = NEW.node_id;
    INSERT INTO ${PROPERTIES_TABLE_HISTORY} 
        VALUES ( repo_version, 99999, NEW.property_language, NEW.property_version, NEW.property_key, NEW.value, NEW.node_id );
    RETURN NEW;
END;
$update_property$;

CREATE TRIGGER property_update
INSTEAD OF UPDATE ON ${PROPERTIES_TABLE} 
    FOR EACH ROW 
        EXECUTE FUNCTION public.updateProperty();

-------------------------------------------------------------------        
-- On delete property, just fill TO_VERSION of old row
--------------------------------------------------------------------        
CREATE OR REPLACE FUNCTION public.deleteProperty()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $delete_property_function$
DECLARE
   repo_version integer;
BEGIN
    repo_version = current_setting('repo.version', true)::integer;
    UPDATE ${PROPERTIES_TABLE_HISTORY} 
        SET to_version = repo_version - 1
        WHERE to_version = 99999 AND node_id = OLD.node_id;
    RETURN NEW;
END;
$delete_property_function$;

DROP TRIGGER IF EXISTS property_delete ON ${PROPERTIES_TABLE};

CREATE TRIGGER property_delete
INSTEAD OF DELETE ON ${PROPERTIES_TABLE} 
    FOR EACH ROW
        EXECUTE FUNCTION public.deleteProperty();
      
--------------------------------------------------------------------        
-- On insert containment, just make sure the FROM_VERSION column is filled
--------------------------------------------------------------------        
CREATE OR REPLACE FUNCTION public.insertContainment()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $insert_Containment$
DECLARE
   repo_version integer;
BEGIN
    repo_version = current_setting('repo.version', true)::integer;
    IF NOT EXISTS (SELECT FROM ${CONTAINMENTS_TABLE_HISTORY} 
        WHERE 
            containment_key = NEW.containment_key AND node_id = NEW.node_id ) 
    THEN
        INSERT INTO ${CONTAINMENTS_TABLE_HISTORY} 
            VALUES ( repo_version, 99999, NEW.containment_language, NEW.containment_version, NEW.containment_key, NEW.children, NEW.node_id );
    ELSE
        UPDATE ${CONTAINMENTS_TABLE} 
            SET children = NEW.children
        WHERE
            to_version = 99999 AND containment_key = NEW.containment_key AND node_id = NEW.node_id;
    END IF;
    RETURN NEW;
END;
$insert_Containment$;

CREATE TRIGGER nodes_insertContainment
INSTEAD OF INSERT ON ${CONTAINMENTS_TABLE} 
    FOR EACH ROW 
        EXECUTE FUNCTION public.insertContainment();

--------------------------------------------------------------------        
-- On update containment, just make new row and fill TO_VERSION of old row
--------------------------------------------------------------------        
CREATE OR REPLACE FUNCTION public.updateContainment()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $update_containment$
DECLARE
   repo_version integer;
BEGIN
    repo_version = current_setting('repo.version', true)::integer;
    UPDATE ${CONTAINMENTS_TABLE_HISTORY} nh 
        SET to_version = repo_version - 1
        WHERE
            to_version = 99999 AND containment_key = NEW.containment_key AND node_id = NEW.node_id;
    INSERT INTO ${CONTAINMENTS_TABLE_HISTORY} 
        VALUES ( repo_version, 99999, NEW.containment_language, NEW.containment_version, NEW.containment_key, NEW.children, NEW.node_id );
    RETURN NEW;
END;
$update_containment$;

CREATE TRIGGER containment_update
INSTEAD OF UPDATE ON ${CONTAINMENTS_TABLE} 
    FOR EACH ROW 
        EXECUTE FUNCTION public.updateContainment();

-------------------------------------------------------------------        
-- On delete containment, just fill TO_VERSION of old row
--------------------------------------------------------------------        
CREATE OR REPLACE FUNCTION public.deleteContainment()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $delete_containment_function$
DECLARE
   repo_version integer;
BEGIN
    repo_version = current_setting('repo.version', true)::integer;
    UPDATE ${CONTAINMENTS_TABLE_HISTORY} 
        SET to_version = repo_version - 1
        WHERE to_version = 99999 AND node_id = OLD.node_id;
    RETURN NEW;
END;
$delete_containment_function$;

DROP TRIGGER IF EXISTS containment_delete ON ${CONTAINMENTS_TABLE};

CREATE TRIGGER containment_delete
INSTEAD OF DELETE ON ${CONTAINMENTS_TABLE} 
    FOR EACH ROW
        EXECUTE FUNCTION public.deleteContainment();
      
--------------------------------------------------------------------        
-- On insert reference, just make sure the FROM_VERSION column is filled
--------------------------------------------------------------------        
CREATE OR REPLACE FUNCTION public.insertReference()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $insert_Reference$
DECLARE
   repo_version integer;
BEGIN
    repo_version = current_setting('repo.version', true)::integer;
    IF NOT EXISTS (SELECT FROM ${REFERENCES_TABLE_HISTORY} 
        WHERE 
            reference_key = NEW.reference_key AND node_id = NEW.node_id ) 
    THEN
        INSERT INTO ${REFERENCES_TABLE_HISTORY} 
            VALUES ( repo_version, 99999, NEW.reference_language, NEW.reference_version, NEW.reference_key, NEW.targets, NEW.node_id );
    ELSE
        UPDATE ${REFERENCES_TABLE} 
            SET targets = NEW.targets
        WHERE
            to_version = 99999 AND reference_key = NEW.reference_key AND node_id = NEW.node_id;
    END IF;
    RETURN NEW;
END;
$insert_Reference$;

CREATE TRIGGER nodes_insertReference
INSTEAD OF INSERT ON ${REFERENCES_TABLE} 
    FOR EACH ROW 
        EXECUTE FUNCTION public.insertReference();

--------------------------------------------------------------------        
-- On update reference, just make new row and fill TO_VERSION of old row
--------------------------------------------------------------------        
CREATE OR REPLACE FUNCTION public.updateReference()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $update_reference$
DECLARE
   repo_version integer;
BEGIN
    repo_version = current_setting('repo.version', true)::integer;
    UPDATE ${REFERENCES_TABLE_HISTORY} nh 
        SET to_version = repo_version - 1
        WHERE
            to_version = 99999 AND reference_key = NEW.reference_key AND node_id = NEW.node_id;
    INSERT INTO ${REFERENCES_TABLE_HISTORY} 
        VALUES ( repo_version, 99999, NEW.reference_language, NEW.reference_version, NEW.reference_key, NEW.targets, NEW.node_id );
    RETURN NEW;
END;
$update_reference$;

CREATE TRIGGER reference_update
INSTEAD OF UPDATE ON ${REFERENCES_TABLE} 
    FOR EACH ROW 
        EXECUTE FUNCTION public.updateReference();

-------------------------------------------------------------------        
-- On delete reference, just fill TO_VERSION of old row
--------------------------------------------------------------------        
CREATE OR REPLACE FUNCTION public.deleteReference()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $delete_reference_function$
DECLARE
   repo_version integer;
BEGIN
    repo_version = current_setting('repo.version', true)::integer;
    UPDATE ${REFERENCES_TABLE_HISTORY} 
        SET to_version = repo_version - 1
        WHERE to_version = 99999 AND node_id = OLD.node_id;
    RETURN NEW;
END;
$delete_reference_function$;

DROP TRIGGER IF EXISTS reference_delete ON ${REFERENCES_TABLE};

CREATE TRIGGER reference_delete
INSTEAD OF DELETE ON ${REFERENCES_TABLE} 
    FOR EACH ROW
        EXECUTE FUNCTION public.deleteReference();
      
`



