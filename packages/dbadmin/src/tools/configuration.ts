import { ServerConfig } from "@lionweb/repository-common";

export const PGHOST = ServerConfig.getInstance().pgHost()
export const PGUSER = ServerConfig.getInstance().pgUser()
export const PGDB = ServerConfig.getInstance().pgDb()
export const PGPASSWORD = ServerConfig.getInstance().pgPassword()
export const PGPORT = ServerConfig.getInstance().pgPort()
export const PGROOTCERT = ServerConfig.getInstance().pgRootcert() || undefined
export const PGROOTCERTCONTENT = ServerConfig.getInstance().pgRootcertcontents() || undefined
