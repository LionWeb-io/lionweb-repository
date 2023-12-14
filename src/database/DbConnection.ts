import pgPromise from "pg-promise"
import dotenv from "dotenv"

// Ininitalize and export the database connection with configuration from _env_

dotenv.config()

const port = parseInt(process.env.PGPORT || "5432", 10)

export const config = {
    database: process.env.PGDATABASE || "lionweb_test",
    host: process.env.PGHOST || "postgres",
    port: port,
    user: process.env.PGUSER || "postgres",
    password: process.env.PGPASSWORD || "lionweb",
}

console.log("POSTGRES CONFIG: " + JSON.stringify(config, null, 2))

const pgp = pgPromise()
export const db = pgp(config)
console.log("next again")
