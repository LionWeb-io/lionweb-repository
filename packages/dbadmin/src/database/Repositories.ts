import { CURRENT_DATA, CURRENT_DATA_LIONWEB_VERSION_KEY, requestLogger, SCHEMA_PREFIX } from "@lionweb/repository-common";
import { DbAdminApiContext } from "../main.js";

class Repositories {
    /**
     * Map from repository(name) to lionweb version
     */
    allRepositories: Map<string, string> = new Map<string, string>()    
    initialized: boolean = false
    ctx: DbAdminApiContext
    
    constructor() {
    }

    setContext(ctx: DbAdminApiContext) {
        this.ctx = ctx;
    }
    
    async initialize() {
        if (this.initialized) {
            requestLogger.info("ALREADY initialized")
            return
        }
        // requestLogger.info("initialize repositories")
        const repos = await this.ctx.dbAdminApiWorker.listRepositories()
        // requestLogger.info("initialize repositories 2")
        // select schemas that represent a repository, make sure to remove the SCHEMA_PREFIX
        // TODO DRY with DbAdminApi.ts
        const repoNames = repos.queryResult
            .filter(repo => repo.schema_name.startsWith(SCHEMA_PREFIX))
            .map(repo => repo.schema_name.substring(SCHEMA_PREFIX.length))
        for(const repoName of repoNames) {
            const lionWebVersion = await this.ctx.dbConnection.query({repository: SCHEMA_PREFIX + repoName, clientId: "repository"},
                `SELECT value FROM ${CURRENT_DATA} WHERE key = '${CURRENT_DATA_LIONWEB_VERSION_KEY}'`)
            this.allRepositories.set(repoName, lionWebVersion)
        }
        requestLogger.info("done")
    }
    
    async toString(): Promise<string> {
        await this.initialize()
        let result = "ALL REPOS\n"
        for(const entry of this.allRepositories.entries()) {
            result += `repo ${entry[0]} has lionweb version ${entry[1]}\n`
        }
        return result
    }
}

export const repositories = new Repositories()
