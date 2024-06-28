import { dbLogger } from "@lionweb/repository-common";
import {
    PGDB,
    PGHOST,
    PGPASSWORD,
    PGPORT,
    PGUSER,
    CREATE_CONFIG,
    PostgresConfig,
    pgSSLConf
} from "@lionweb/repository-dbadmin";
import pgPromise from "pg-promise"
import dotenv from "dotenv"

// Initialize and export the database connection with configuration from _env_

dotenv.config()

export const config: PostgresConfig = {
    database: PGDB,
    host: PGHOST,
    port: PGPORT,
    user: PGUSER,
    password: PGPASSWORD,
    ssl: pgSSLConf
}

dbLogger.info("POSTGRES CONFIG: " + JSON.stringify(config, null, 2))

export const pgp = pgPromise()
/**
 * Connection to a specific database, which needs to exist.
 */
export const postgresConnectionWithDatabase = pgp(config)
/**
 * Connection to postgres, without having a database.
 * Used for queries that create the actual database.
 */
export const postgresConnectionWithoutDatabase = pgp(CREATE_CONFIG)
