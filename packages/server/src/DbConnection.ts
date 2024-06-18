import { logger } from "@lionweb/repository-common";
import {
    PGDB,
    PGHOST,
    PGPASSWORD,
    PGPORT,
    PGUSER,
    CREATE_CONFIG,
    PostgresConfig,
    PGROOTCERT
} from "@lionweb/repository-dbadmin";
import pgPromise from "pg-promise"
import dotenv from "dotenv"
import fs from "node:fs";

// Initialize and export the database connection with configuration from _env_

dotenv.config()

export const config: PostgresConfig = {
    database: PGDB,
    host: PGHOST,
    port: PGPORT,
    user: PGUSER,
    password: PGPASSWORD,
    ssl: PGROOTCERT === undefined ? undefined : {
        ca: fs.readFileSync(PGROOTCERT).toString(),
    },
}

logger.dbLog("POSTGRES CONFIG: " + JSON.stringify(config, null, 2))

export const pgp = pgPromise()
export const dbConnection = pgp(config)
export const postgresConnection = pgp(CREATE_CONFIG)
