import { dbLogger, ServerConfig } from "@lionweb/repository-common";
import {
    CREATE_CONFIG,
    PostgresConfig,
    pgSSLConf
} from "@lionweb/repository-dbadmin";
import pgPromise from "pg-promise"
import dotenv from "dotenv"
import pg from "pg";

// Initialize and export the database connection with configuration from _env_

dotenv.config()

export const config: PostgresConfig = {
    database: ServerConfig.getInstance().pgDb(),
    host: ServerConfig.getInstance().pgHost(),
    port: ServerConfig.getInstance().pgPort(),
    user: ServerConfig.getInstance().pgUser(),
    password: ServerConfig.getInstance().pgPassword(),
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

export const postgresPool = new pg.Pool(config)
