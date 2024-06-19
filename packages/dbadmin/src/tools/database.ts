import { PGDB, PGHOST, PGPASSWORD, PGPORT, PGUSER } from "./configuration.js";

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

