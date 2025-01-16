import {
    getRepositoryParameter,
    getStringParam,
    isParameterError,
    ParameterError,
    REPOSITORIES_TABLE,
    RepositoryData,
    RepositoryInfo,
    requestLogger
} from "@lionweb/repository-common"
import { GenericIssue, JsonContext, LionWebJsonChunk, ValidationResult } from "@lionweb/validation"
import { Request } from "express"
import { DbAdminApiContext } from "../main.js"

export function getRepositoryData(request: Request, defaultClient?: string): RepositoryData | ParameterError {
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

    constructor() {}

    setContext(ctx: DbAdminApiContext) {
        this.ctx = ctx
    }

    async refresh(): Promise<void> {
        this.initialized = false
        await this.initialize()
    }

    async initialize() {
        if (this.initialized) {
            requestLogger.info("ALREADY initialized")
            return
        }
        this.repositoryName2repository.clear()
        const repoTable = (await this.ctx.dbConnection.queryWithoutRepository(`SELECT * FROM ${REPOSITORIES_TABLE};\n`)) as RepositoryInfo[]
        repoTable.forEach(repo => {
            this.repositoryName2repository.set(repo.repository_name, repo)
            requestLogger.info("Repo row: " + JSON.stringify(repo))
        })
    }

    allRepositories(): RepositoryInfo[] {
        return Array.from(this.repositoryName2repository.values())
    }

    getRepository(repoName: string): RepositoryInfo {
        const result = this.repositoryName2repository.get(repoName)
        // requestLogger.info(`getRepository(${repoName}) => ${JSON.stringify(result)}`)
        return result
    }

    async toString(): Promise<string> {
        await this.initialize()
        let result = ""
        for (const entry of this.repositoryName2repository.entries()) {
            result += `repo ${entry[0]}: ${JSON.stringify(entry[1])}\n`
        }
        return result
    }
}

/**
 * Validate whether the LionWeb versions in `chunk` and `repositoryData` are the same.
 * @param chunk
 * @param repositoryData
 * @param validationResult
 */
export function validateLionWebVersion(chunk: LionWebJsonChunk, repositoryData: RepositoryData, validationResult: ValidationResult): void {
    if (chunk?.serializationFormatVersion !== repositoryData.repository.lionweb_version) {
        requestLogger.info(
            `SeralizationVersion ${chunk.serializationFormatVersion} is incorrect for repository ${repositoryData.repository.repository_name} with LionWeb version ${repositoryData.repository.lionweb_version}.`
        )
        validationResult.issues.push(
            new GenericIssue(
                new JsonContext(null, ["$"]),
                `SeralizationVersion ${chunk.serializationFormatVersion} is incorrect for repository ${repositoryData.repository.repository_name} with LionWeb version ${repositoryData.repository.lionweb_version}.`
            )
        )
    }
}

export const repositoryStore = new RepositoryStore()
