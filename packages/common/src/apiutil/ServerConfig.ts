import fs from "node:fs";
import { LevelWithSilent } from "pino";
import { expressLogger, verbosity } from "./logging.js";

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

/**
 * Class for accessing all configuration properties of the server.
 */
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
        let configFile = "./server-config.json"
        const configFlagIndex = process.argv.indexOf("--config")
        if (configFlagIndex > -1) {
            const configParam = process.argv[configFlagIndex + 1]
            if (configParam !== undefined) {
                configFile = configParam
            } else {
                expressLogger.warn("--config <filename>  is missing <filename>")
            }
        }
        if (fs.existsSync(configFile)) {
            const stats = fs.statSync(configFile)
            if (stats.isFile()) {
                this.config = JSON.parse(fs.readFileSync(configFile).toString()) as ServerConfigJson
            } else {
                expressLogger.warn(`Config file ${configFile} is not a file`)
            }
        } else {
            expressLogger.warn(`Config file ${configFile} does not exist`)
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
        return verbosity(result, "warn")
    }

    databaseLog(): LevelWithSilent {
        const result = this.config?.logging?.database
        return verbosity(result, "warn")
    }

    expressLog(): LevelWithSilent {
        const result = this?.config?.logging?.express
        return verbosity(result, "warn")
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
