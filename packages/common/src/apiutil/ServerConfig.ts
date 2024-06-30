import fs from "node:fs";
import { LevelWithSilent } from "pino";
import { verbosity } from "./logging.js";

export type ServerConfigJson = {
    server: {
        serverPort?: number
        expectedToken?: string,
        body_limit?: string
    },
    startup?: {
        createDatabase?: boolean,
        createRepositories?: {
            name?: string,
            history?: boolean
        }[]
    },
    logging?: {
        request?: LevelWithSilent,
        database?: LevelWithSilent,
        express?: LevelWithSilent
    },
    postgres: {
        database: {
            host?: string,
            user?: string,
            db?: string,
            password?: string,
            port?: number
        },
        certificates?: {
            rootcert? : string,
            rootcertcontent?: string
        }
    }
}

export class ServerConfig {
    static instance: ServerConfig
    static getInstance(): ServerConfig {
        if (ServerConfig.instance === undefined) {
            ServerConfig.instance = new ServerConfig()
        }
        return ServerConfig.instance
    }

    config: ServerConfigJson
    private constructor() {
        this.readConfigFile()
    }

    /**
     * Reads the config file and assumes that the file contains JSON structured as ServerConfigJson
     */
    readConfigFile(): void {
        if (fs.existsSync("./server-config.json")) {
            const stats = fs.statSync("./server-config.json")
            if (stats.isFile()) {
                this.config = JSON.parse(fs.readFileSync("./server-config.json").toString()) as ServerConfigJson
            }
        }
    }

    createDatabase(): boolean {
        const result = this?.config?.startup?.createDatabase
        return result === true
    }

    createRepositories(): { name?: string, history?: boolean }[] {
        const result = this?.config?.startup?.createRepositories
        if (result !== undefined && result !== null && Array.isArray(result)) {
            return result
        } else {
            return []
        }
    }

    requestLog(): LevelWithSilent {
        const result = this?.config?.logging?.request
        return verbosity(result, "silent")
    }

    databaseLog(): LevelWithSilent {
        const result = this.config?.logging?.database
        return verbosity(result, "silent")
    }

    expressLog(): LevelWithSilent {
        const result = this?.config?.logging?.express
        return verbosity(result, "silent")
    }

    pgHost(): string {
        const result = this?.config?.postgres?.database?.host
        return result || "postgres"
    }

    pgUser(): string {
        const result = this?.config?.postgres?.database?.user
        return result || "postgres"
    }

    pgDb(): string {
        const result = this?.config?.postgres?.database?.db
        return result || "lionweb"
    }

    pgPassword(): string {
        const result = this?.config?.postgres?.database?.password
        return result || "lionweb"
    }

    pgPort(): number {
        const result = this.config?.postgres?.database?.port
        return result || 5432
    }

    pgRootcert(): string {
        const result = this?.config?.postgres?.certificates?.rootcert
        return result
    }

    pgRootcertcontents(): string {
        const result = this?.config?.postgres?.certificates?.rootcertcontent
        return result
    }

    serverPort(): number {
        const result = this?.config?.server?.serverPort
        if (result !== undefined && result !== null && typeof result === "number") {
            return result
        }
        return 3005 // default
    }

    bodyLimit(): string {
        const result = this?.config?.server?.body_limit
        if (result !== undefined && result !== null && typeof result === "string") {
            return result
        }
        return "50mb" // default
    }

    expectedToken(): string {
        const result = this?.config?.server?.expectedToken
        if (result !== undefined && result !== null && typeof result === "string") {
            return result
        }
        return null
    }
}
