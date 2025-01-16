// import pgPromise from "pg-promise"
import { ServerConfig } from "@lionweb/repository-common"
import * as fs from "node:fs"

export type PostgresConfig = {
    host: string
    port: number
    user: string
    database?: string
    password: string
    ssl?: { ca: string }
}

if (ServerConfig.getInstance().pgRootcert() && ServerConfig.getInstance().pgRootcertcontents()) {
    throw Error("PGROOTCERT and PGROOTCERTCONTENT should not be set at the same time")
}
export let pgSSLConf: { ca: string } | undefined = undefined
if (ServerConfig.getInstance().pgRootcertcontents()) {
    pgSSLConf = { ca: ServerConfig.getInstance().pgRootcertcontents() }
} else if (ServerConfig.getInstance().pgRootcert()) {
    pgSSLConf = { ca: fs.readFileSync(ServerConfig.getInstance().pgRootcert()).toString() }
}

export const CREATE_CONFIG: PostgresConfig = {
    host: ServerConfig.getInstance().pgHost(),
    port: ServerConfig.getInstance().pgPort(),
    user: ServerConfig.getInstance().pgUser(),
    password: ServerConfig.getInstance().pgPassword(),
    database: ServerConfig.getInstance().pgMaintenanceDb(),
    ssl: pgSSLConf
}
