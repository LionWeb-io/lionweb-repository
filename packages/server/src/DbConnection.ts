import { logger } from "@lionweb/repository-common";
import { PGDB, PGHOST, PGPASSWORD, PGPORT, PGUSER, CREATE_CONFIG, INIT_CONFIG, PostgresConfig } from "@lionweb/repository-dbadmin";
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
}

logger.dbLog("POSTGRES CONFIG: " + JSON.stringify(config, null, 2))

export const pgp = pgPromise()
export const databaseConnection = pgp(INIT_CONFIG)
export const postgresConnection = pgp(CREATE_CONFIG)
