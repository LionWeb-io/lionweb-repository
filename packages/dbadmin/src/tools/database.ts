// import pgPromise from "pg-promise"
import { PGDB, PGHOST, PGPASSWORD, PGPORT, PGUSER, PGROOTCERT } from "./configuration.js";
import * as fs from "node:fs";

export type PostgresConfig = {
    host: string
    port: number
    user: string
    database?: string
    password: string
    ssl?: { ca: string }
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
    password: PGPASSWORD,
    ssl: PGROOTCERT === PGROOTCERT ? undefined : {
        ca: fs.readFileSync(PGROOTCERT).toString(),
    },
}
