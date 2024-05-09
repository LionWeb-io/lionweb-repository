import pgPromise from "pg-promise"
import {PGDB, PGHOST, PGUSER} from "./configuration.js";
import { CREATE_DATABASE_SQL } from "./create-database-sql.js"
import { INIT_TABLES_SQL } from "./init-tables-sql.js"

type PostgresConfig = {
    host: string
    port: number
    user: string
    database?: string
    password: string
}

const CREATE_CONFIG: PostgresConfig = {
    host: PGHOST,
    port: parseInt(process.env.PGPORT || "5432", 10),
    user: PGUSER,
    password: process.env.PGPASSWORD || "lionweb"
}
const INIT_CONFIG: PostgresConfig = {
    host: PGHOST,
    database: PGDB,
    port: parseInt(process.env.PGPORT || "5432", 10),
    user: PGUSER,
    password: process.env.PGPASSWORD || "lionweb"
}

const init = async (config: PostgresConfig, sqlFile: string) => {
    try {
        // connect to the local database server
        const pgp = pgPromise()
        console.log("config " + JSON.stringify(config, null, 2))
        const db = pgp(config)

        const sql = sqlFile
        console.log("FS: " + JSON.stringify(sql))
        // split the file into separate statements
        const statements = sql.split(/;\s*$/m)
        for (const statement of statements) {
            if (statement.length > 3) {
                // execute each of the statements
                console.log("STATEMENT " + statement)
                await db.query(statement)
            }
        }
        console.log("Done SQLing")
    } catch (err) {
        console.error("ERROR: " + err)
        throw err
    }
    return true
}
//
let command = process.argv[2]
let sqlFile = ""
let envFile: PostgresConfig | null = null
command = "create"
if (command === "create") {
    sqlFile = CREATE_DATABASE_SQL
    // Environment without database name
    envFile = CREATE_CONFIG
} else if (command === "init") {
    sqlFile = INIT_TABLES_SQL
    envFile = INIT_CONFIG
} else {
    console.log("Usage: node database (create | init)")
    process.exit(1)
}
//
init(envFile, sqlFile)
    .then(() => {
        console.log("finished ok")
        process.exit(0)
    })
    .catch(e => {
        console.log("finished with errors: " + JSON.stringify(e))
        process.exit(1)
    })
