/**
 * Tables names for LionWeb data
 */
export const NODES_TABLE: string = "lionweb_nodes"
export const CONTAINMENTS_TABLE: string = "lionweb_containments"
export const REFERENCES_TABLE: string = "lionweb_references"
export const PROPERTIES_TABLE: string = "lionweb_properties"
export const RESERVED_IDS_TABLE: string = "lionweb_reserved_ids"
export const METAPOINTERS_TABLE: string = "lionweb_metapointers"
export const REPOSITORIES_TABLE: string = "public.repositories"
export const CURRENT_DATA: string = "current_data"
export const REPO_VERSIONS: string = "repo_versions"

/**
 * Key names for repository wide current values
 */
export const CURRENT_DATA_REPO_VERSION_KEY = "repo.version"
export const CURRENT_DATA_REPO_CLIENT_ID_KEY = "repo.client_id"

/**
 * Table names for history tables
 */
export const NODES_TABLE_HISTORY: string = NODES_TABLE + "_history"
export const CONTAINMENTS_TABLE_HISTORY: string = CONTAINMENTS_TABLE + "_history"
export const REFERENCES_TABLE_HISTORY: string = REFERENCES_TABLE + "_history"
export const PROPERTIES_TABLE_HISTORY: string = PROPERTIES_TABLE + "_history"
export const METAPOINTERS_TABLE_HISTORY: string = METAPOINTERS_TABLE + "_history"

export const SCHEMA_PREFIX = "repository:"
