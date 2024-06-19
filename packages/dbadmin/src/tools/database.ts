// import pgPromise from "pg-promise"
import {PGDB, PGHOST, PGPASSWORD, PGPORT, PGUSER, PGROOTCERT, PGROOTCERTCONTENT} from "./configuration.js";
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

if (PGROOTCERT && PGROOTCERTCONTENT) {
    throw Error("PGROOTCERT and PGROOTCERTCONTENT should not be set at the same time")
}
export let pgSSLConf = undefined
if (PGROOTCERTCONTENT) {
    pgSSLConf = {ca: PGROOTCERTCONTENT}
} else if (PGROOTCERT) {
    pgSSLConf = {ca: fs.readFileSync(PGROOTCERT).toString()}
}

export const INIT_CONFIG: PostgresConfig = {
    host: PGHOST,
    database: PGDB,
    port: PGPORT,
    user: PGUSER,
    password: PGPASSWORD,
    ssl: pgSSLConf
}

