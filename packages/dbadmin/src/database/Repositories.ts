import {
    CURRENT_DATA,
    CURRENT_DATA_LIONWEB_VERSION_KEY,
    getRepositoryParameter,
    getStringParam,
    isParameterError,
    ParameterError, REPOSITORIES_TABLE,
    RepositoryData,
    RepositoryInfo,
    requestLogger,
    SCHEMA_PREFIX
} from "@lionweb/repository-common";
import { Request } from "express";
import { DbAdminApiContext } from "../main.js";

export function getRepositoryData(request: Request, defaultClient?: string ): RepositoryData | ParameterError {
    const clientId = getStringParam(request, "clientId", defaultClient)
    if (isParameterError(clientId)) {
        return clientId
    } else {
        const repoName = getRepositoryParameter(request)
        const repo: RepositoryInfo = repositoryStore.getRepository(repoName)
        // requestLogger.info(`getRepository(...): FOUND REPO '${JSON.stringify(repo)}' for reponame ${repoName}`)
        if (repo === undefined) {
            return {
                success: false,
                error: {
                    kind: `RepositoryUnknown-ParameterIncorrect`,
                    message: `Repository ${repoName} not found`
                }
            }
        }
        return {
            clientId: clientId,
            repository: repo
        }
    }
}

/**
 * In memory representation of all repository administration info
 */
export class RepositoryStore {
    /**
     * Map from repository name to RepositoryInfo
     */
    repositoryName2repository: Map<string, RepositoryInfo> = new Map<string, RepositoryInfo>()
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
        this.repositoryName2repository.clear()
        const repos = await this.ctx.dbAdminApiWorker.listRepositories()
        // select schemas that represent a repository, make sure to remove the SCHEMA_PREFIX
        // TODO DRY with DbAdminApi.ts
        const repoNames = repos.queryResult
            .filter(repo => repo.schema_name.startsWith(SCHEMA_PREFIX))
            .map(repo => repo.schema_name.substring(SCHEMA_PREFIX.length))
        for(const repoName of repoNames) {
            const lionWebVersion = await this.ctx.dbConnection.query(
                {
                    repository: {
                        repositoryName: repoName,
                        schemaName: SCHEMA_PREFIX + repoName,
                        lionWebVersion: "NotApplicable"
                    },
                    clientId: "repository"
                },
                `SELECT value FROM ${CURRENT_DATA} WHERE key = '${CURRENT_DATA_LIONWEB_VERSION_KEY}'`)
            requestLogger.info("VERSION FOUND IS " + JSON.stringify(lionWebVersion))
            const repo: RepositoryInfo = {
                repositoryName: repoName,
                lionWebVersion: lionWebVersion[0].value,
                schemaName: SCHEMA_PREFIX + repoName
            }
            this.repositoryName2repository.set(repoName, repo)
        }
        requestLogger.info("done with repos " + repoNames)
        
        // Alternative listRepositories
        const repoTable = await this.ctx.dbConnection.queryWithoutRepository(`SELECT * FROM ${REPOSITORIES_TABLE};\n`) as
            { id: string, repo: string, schema1: string, lionWebVersion: string, created: Date}[]
        repoTable.forEach(repo => {
            requestLogger.info("Repo row: " + JSON.stringify(repo))
        })
        
    }
    
    getRepository(repoName: string): RepositoryInfo {
        const result =  this.repositoryName2repository.get(repoName)
        // requestLogger.info(`getRepository(${repoName}) => ${JSON.stringify(result)}`)
        return result
    }

    async toString(): Promise<string> {
        await this.initialize()
        let result = ""
        for(const entry of this.repositoryName2repository.entries()) {
            result += `repo ${entry[0]}: ${JSON.stringify(entry[1])}\n`
        }
        return result
    }
}

export const repositoryStore = new RepositoryStore()
