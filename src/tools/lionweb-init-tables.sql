-- Drops nodes table
DROP TABLE IF EXISTS lionweb_nodes;
DROP TABLE IF EXISTS lionweb_containments;
DROP TABLE IF EXISTS lionweb_properties;
DROP TABLE IF EXISTS lionweb_references;
DROP TABLE IF EXISTS lionweb_nodes_orphans;
DROP TABLE IF EXISTS lionweb_containments_orphans;
DROP TABLE IF EXISTS lionweb_properties_orphans;
DROP TABLE IF EXISTS lionweb_references_orphans;

-- Creates nodes table
CREATE TABLE IF NOT EXISTS lionweb_nodes (
    id                  text   NOT NULL PRIMARY KEY, 
    classifier_language text   NOT NULL,
    classifier_version  text   NOT NULL,
    classifier_key      text   NOT NULL,
    annotations         text[],
    parent              text
);

-- Creates containments table
CREATE TABLE IF NOT EXISTS lionweb_containments (
    c_id        SERIAL NOT NULL,
    containment jsonb  NOT NULL,
    children    text[],
    node_id     text,
    PRIMARY KEY(containment, node_id)
);

-- Creates properties table
CREATE TABLE IF NOT EXISTS lionweb_properties (
    p_id     SERIAL NOT NULL,
    property jsonb  NOT NULL,
    value    text,
    node_id  text,
    PRIMARY KEY(property, node_id)
);

-- Creates references table
CREATE TABLE IF NOT EXISTS lionweb_references (
    r_id         SERIAL  NOT NULL, 
    lw_reference jsonb   NOT NULL,
    targets      jsonb[],
    node_id      text,
    PRIMARY KEY(lw_reference, node_id)
);

CREATE TABLE IF NOT EXISTS lionweb_nodes_orphans (
    id                  text, 
    classifier_language text   NOT NULL,
    classifier_version  text   NOT NULL,
    classifier_key      text   NOT NULL,
    annotations         text[],
    parent              text
);
CREATE TABLE IF NOT EXISTS lionweb_containments_orphans (
    c_id        integer,
    containment jsonb     NOT NULL,
    children    text[],
    node_id     text
);
CREATE TABLE IF NOT EXISTS lionweb_properties_orphans   (
    p_id     integer,
    property jsonb    NOT NULL,
    value    text,
    node_id  text
);
CREATE TABLE IF NOT EXISTS lionweb_references_orphans   (
    r_id         integer, 
    lw_reference jsonb     NOT NULL,
    targets      jsonb[],
    node_id      text
);
