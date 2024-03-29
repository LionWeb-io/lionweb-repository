import { logger } from "@lionweb/repository-common";
import pgPromise from "pg-promise"
import dotenv from "dotenv"

// Initialize and export the database connection with configuration from _env_

dotenv.config()

const port = parseInt(process.env.PGPORT || "5432", 10)

export const config = {
    database: process.env.PGDB || "lionweb_test",
    host: process.env.PGHOST || "postgres",
    port: port,
    user: process.env.PGUSER || "postgres",
    password: process.env.PGPASSWORD || "lionweb",
}

logger.dbLog("POSTGRES CONFIG: " + JSON.stringify(config, null, 2))

export const pgp = pgPromise()
export const dbConnection = pgp(config)
