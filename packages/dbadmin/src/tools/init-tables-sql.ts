import {
    CONTAINMENTS_TABLE,
    NODES_TABLE,
    ORPHANS_CONTAINMENTS_TABLE,
    ORPHANS_NODES_TABLE,
    ORPHANS_PROPERTIES_TABLE, ORPHANS_REFERENCES_TABLE,
    PROPERTIES_TABLE,
    REFERENCES_TABLE
} from "@lionweb/repository-common";

export const INIT_TABLES_SQL = `
-- Drops nodes table
DROP TABLE IF EXISTS ${NODES_TABLE};
DROP TABLE IF EXISTS ${CONTAINMENTS_TABLE};
DROP TABLE IF EXISTS ${PROPERTIES_TABLE};
DROP TABLE IF EXISTS ${REFERENCES_TABLE};
DROP TABLE IF EXISTS ${ORPHANS_NODES_TABLE};
DROP TABLE IF EXISTS ${ORPHANS_CONTAINMENTS_TABLE};
DROP TABLE IF EXISTS ${ORPHANS_PROPERTIES_TABLE};
DROP TABLE IF EXISTS ${ORPHANS_REFERENCES_TABLE};

-- Drop indices
-- DROP INDEX IF EXISTS ContainmentsNodesIndex;
-- DROP INDEX IF EXISTS PropertiesNodesIndex;
-- DROP INDEX IF EXISTS ReferencesNodesIndex;

-- Creates nodes table
CREATE TABLE IF NOT EXISTS ${NODES_TABLE} (
    id                  text   NOT NULL PRIMARY KEY, 
    classifier_language text   NOT NULL,
    classifier_version  text   NOT NULL,
    classifier_key      text   NOT NULL,
    annotations         text[],
    parent              text
);

-- Creates containments table
CREATE TABLE IF NOT EXISTS ${CONTAINMENTS_TABLE} (
    c_id        SERIAL NOT NULL,
    containment jsonb  NOT NULL,
    children    text[],
    node_id     text,
    PRIMARY KEY(containment, node_id)
);

-- Creates properties table
CREATE TABLE IF NOT EXISTS ${PROPERTIES_TABLE} (
    p_id     SERIAL NOT NULL,
    property jsonb  NOT NULL,
    value    text,
    node_id  text,
    PRIMARY KEY(property, node_id)
);

-- Creates references table
CREATE TABLE IF NOT EXISTS ${REFERENCES_TABLE} (
    r_id         SERIAL  NOT NULL, 
    reference    jsonb   NOT NULL,
    targets      jsonb[],
    node_id      text,
    PRIMARY KEY(reference, node_id)
);

-- Create indices to enable finding features for nodes quickly

-- CREATE INDEX ContainmentsNodesIndex ON ${CONTAINMENTS_TABLE} (node_id)
-- CREATE INDEX PropertiesNodesIndex   ON ${PROPERTIES_TABLE}   (node_id)
-- CREATE INDEX ReferencesNodesIndex   ON ${REFERENCES_TABLE}   (node_id)

CREATE TABLE IF NOT EXISTS ${ORPHANS_NODES_TABLE} (
    id                  text, 
    classifier_language text   NOT NULL,
    classifier_version  text   NOT NULL,
    classifier_key      text   NOT NULL,
    annotations         text[],
    parent              text
);
CREATE TABLE IF NOT EXISTS ${ORPHANS_CONTAINMENTS_TABLE} (
    c_id        integer,
    containment jsonb     NOT NULL,
    children    text[],
    node_id     text
);
CREATE TABLE IF NOT EXISTS ${ORPHANS_PROPERTIES_TABLE}   (
    p_id     integer,
    property jsonb    NOT NULL,
    value    text,
    node_id  text
);
CREATE TABLE IF NOT EXISTS ${ORPHANS_REFERENCES_TABLE}   (
    r_id         integer, 
    reference jsonb     NOT NULL,
    targets      jsonb[],
    node_id      text
);
`
