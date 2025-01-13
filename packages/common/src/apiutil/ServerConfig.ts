import fs from "node:fs"
import { LevelWithSilent } from "pino"
import { expressLogger, verbosity } from "./logging.js"

// Define the possible values of database creation both as a type, and as an array of strings and a type
const CreationValues = ["always", "never", "if-not-exists"] as const
export type CreationType = (typeof CreationValues)[number]

export function isCreationType(v: string): v is CreationType {
    const s: readonly string[] = CreationValues
    return s.includes(v)
}

export type LionWebVersion = "2023.1" | "2024.1"
export const LIONWEB_VERSIONS = ["2023.1", "2024.1"];

export type RepositoryConfig = {
    create: CreationType
    name?: string
    history?: boolean
    lionWebVersion?: LionWebVersion
}

export type ServerConfigJson = {
    server: {
        serverPort?: number
        expectedToken?: string
        bodyLimit?: string
    }
    startup?: {
        createDatabase?: CreationType
        createRepositories?: RepositoryConfig[]
    }
    logging?: {
        request?: LevelWithSilent
        trace?: LevelWithSilent
        database?: LevelWithSilent
        express?: LevelWithSilent
    }
    postgres: {
        database: {
            host?: string
            user?: string
            db?: string
            maintenanceDb?: string
            password?: string
            port?: number
        }
        certificates?: {
            rootcert?: string
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
                // This is not ideal, but because of how `npm run dev` works I could not think of another solution
                // that works conveniently both to run the server specifying the configuration path and not specifying
                // it
                expressLogger.warn(`--config <filename> is missing <filename>, using default path ${configFile})`)
            }
        }
        if (fs.existsSync(configFile)) {
            const stats = fs.statSync(configFile)
            if (stats.isFile()) {
                try {
                    this.config = JSON.parse(fs.readFileSync(configFile).toString()) as ServerConfigJson
                } catch (e) {
                    expressLogger.error(`Error parsing JSON file ${configFile}: ${(e as Error).message}`)
                    process.exit(1)
                }
            } else {
                expressLogger.error(`Config file ${configFile} is not a file`)
                process.exit(1)
            }
        } else {
            if (configFlagIndex > -1) {
                // --config option used, given config file should exist
                expressLogger.error(`Config file ${configFile} does not exist`)
                process.exit(1)
            }
        }
    }

    createDatabase(): CreationType {
        const result = this?.config?.startup?.createDatabase
        if (typeof result === "string") {
            if (isCreationType(result)) {
                return result
            }
        }
        return "never"
    }

    createRepositories(): RepositoryConfig[] {
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

    traceLog(): LevelWithSilent {
        const result = this?.config?.logging?.trace
        return verbosity(result, "warn")
    }

    databaseLog(): LevelWithSilent {
        const result = this.config?.logging?.database
        return verbosity(result, "warn")
    }

    expressLog(): LevelWithSilent {
        const result = this?.config?.logging?.express
        return verbosity(result, "error")
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

    pgMaintenanceDb(): string {
        const result = this?.config?.postgres?.database?.maintenanceDb
        return result || "postgres"
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
        const result = this?.config?.server?.bodyLimit
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
