// import pgPromise from "pg-promise"
import { PGDB, PGHOST, PGPASSWORD, PGPORT, PGUSER } from "./configuration.js";
// import { CREATE_DATABASE_SQL } from "./create-database-sql.js"
// import { INIT_TABLES_SQL } from "./init-tables-sql.js"

export type PostgresConfig = {
    host: string
    port: number
    user: string
    database?: string
    password: string
}

export const CREATE_CONFIG: PostgresConfig = {
    host: PGHOST,
    port: PGPORT,
    user: PGUSER,
    password: PGPASSWORD
}
export const INIT_CONFIG: PostgresConfig = {
    host: PGHOST,
    database: PGDB,
    port: PGPORT,
    user: PGUSER,
    password: PGPASSWORD
}

// const init = async (config: PostgresConfig, sqlCommands: string) => {
//     console.log("dummy init " + JSON.stringify(config) )
//     console.log("SQL: " + sqlCommands)
//     // try {
//     //     // connect to the local database server
//     //     const pgp = pgPromise()
//     //     console.log("config " + JSON.stringify(config, null, 2))
//     //     const db = pgp(config)
//     //
//     //     const sql = sqlCommands
//     //     console.log("FS: " + JSON.stringify(sql))
//     //     // split the file into separate statements
//     //     const statements = sql.split(/;\s*$/m)
//     //     for (const statement of statements) {
//     //         if (statement.length > 3) {
//     //             // execute each of the statements
//     //             console.log("STATEMENT " + statement)
//     //             await db.query(statement)
//     //         }
//     //     }
//     //     console.log("Done SQLing")
//     // } catch (err) {
//     //     console.error("ERROR: " + err)
//     //     throw err
//     // }
//     return true
// }
//
// let command = process.argv[2]
// let sqlCommands = ""
// let config: PostgresConfig | null = null
// command = "create"
// if (command === "create") {
//     sqlCommands = CREATE_DATABASE_SQL
//     // Environment without database name
//     config = CREATE_CONFIG
// } else if (command === "init") {
//     sqlCommands = INIT_TABLES_SQL
//     config = INIT_CONFIG
// } else {
//     console.log("Usage: node database (create | init)")
//     process.exit(1)
// }
// //
// init(config, sqlCommands)
//     .then(() => {
//         console.log("finished ok")
//         // process.exit(0)
//     })
//     .catch(e => {
//         console.log("finished with errors: " + JSON.stringify(e))
//         // process.exit(1)
//     })
