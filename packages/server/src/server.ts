import { registerHistoryApi } from "@lionweb/repository-history"
import express, { Express, NextFunction, Response, Request } from "express"
import bodyParser from "body-parser"
import cors from "cors"
import pgPromise from "pg-promise"
import { postgresConnectionWithDatabase, pgp, postgresConnectionWithoutDatabase, postgresPool } from "./DbConnection.js"
import {
    DbConnection,
    expressLogger,
    LionWebTask,
    RepositoryConfig,
    requestLogger,
    SCHEMA_PREFIX,
    ServerConfig
} from "@lionweb/repository-common"
import { initializeCommons } from "@lionweb/repository-common"
import { registerDBAdmin, repositoryStore } from "@lionweb/repository-dbadmin"
import { registerInspection } from "@lionweb/repository-inspection"
import { registerBulkApi } from "@lionweb/repository-bulkapi"
import {
    FLATBUFFERS_CONTENT_TYPE,
    JSON_CONTENT_TYPE,
    PROTOBUF_CONTENT_TYPE,
    registerAdditionalApi
} from "@lionweb/repository-additionalapi"
import { registerLanguagesApi } from "@lionweb/repository-languages"
import { HttpClientErrors } from "@lionweb/repository-common"
import { pinoHttp } from "pino-http"
import * as http from "node:http"

export const app: Express = express()

// Allow access,
// ERROR Access to XMLHttpRequest from origin has been blocked by CORS policy:
// Response to preflight request doesn't pass access control check:
// No 'Access-Control-Allow-Origin' header is present on the request
// const cors = require('cors');
app.use(
    cors({
        origin: "*"
    })
)
// Setup automatic logging of request/result pairs
app.use(
    pinoHttp({
        logger: expressLogger,
        useLevel: ServerConfig.getInstance().expressLog()
    })
)

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json({ limit: ServerConfig.getInstance().bodyLimit(), type: JSON_CONTENT_TYPE }))
app.use(bodyParser.raw({ inflate: true, limit: ServerConfig.getInstance().bodyLimit(), type: PROTOBUF_CONTENT_TYPE }))
app.use(bodyParser.raw({ inflate: true, limit: ServerConfig.getInstance().bodyLimit(), type: FLATBUFFERS_CONTENT_TYPE }))

const expectedToken = ServerConfig.getInstance().expectedToken()

function verifyToken(request: Request, response: Response, next: NextFunction) {
    if (expectedToken != null) {
        const providedToken = request.headers["authorization"]
        if (providedToken == null || typeof providedToken !== "string" || providedToken.trim() != expectedToken) {
            return response.status(HttpClientErrors.Unauthorized).send("Invalid token or no token provided")
        } else {
            next()
        }
    } else {
        next()
    }
}

app.use(verifyToken)

const dbConnection = DbConnection.getInstance()
dbConnection.postgresConnection = postgresConnectionWithoutDatabase
dbConnection.dbConnection = postgresConnectionWithDatabase
dbConnection.pgp = pgPromise()
const { TransactionMode } = pgPromise.txMode
const mode = new TransactionMode({
    deferrable: true,
    readOnly: false,
    tiLevel: pgPromise.txMode.isolationLevel.serializable
})
dbConnection.transactionMode = mode
requestLogger.info("mode " + JSON.stringify((mode as never)["_inner"]))
dbConnection.pgPool = postgresPool
// Must be first to initialize
initializeCommons(pgp)
const dbAdminApi = registerDBAdmin(app, DbConnection.getInstance(), postgresConnectionWithoutDatabase, pgp)
registerBulkApi(app, DbConnection.getInstance(), pgp)
registerInspection(app, DbConnection.getInstance(), pgp)
registerAdditionalApi(app, DbConnection.getInstance(), pgp, dbConnection.pgPool)
registerLanguagesApi(app, DbConnection.getInstance(), pgp)
registerHistoryApi(app, DbConnection.getInstance(), pgp)

/**********************************************************************
 *
 * Server can be started with either argument --setup or --run
 *
 **********************************************************************/

const setupOnly = process.argv.includes("--setup")
const noSetup = process.argv.includes("--run")
if (setupOnly && noSetup) {
    requestLogger.error("Cannot use flags --run and --setup together.")
    process.exit(-1)
}
if (setupOnly) {
    await setupDatabase()
} else if (noSetup) {
    await repositoryStore.refresh()
    await startServer()
} else {
    requestLogger.error("Server should be called with either flag --setup or --run")
    process.exit(-1)
}

async function setupDatabase() {
    // Initialize database
    const databaseCreation = ServerConfig.getInstance().createDatabase()

    // Do we need to create the database?
    switch (databaseCreation) {
        case "always":
            requestLogger.info(`Creating new database ${ServerConfig.getInstance().pgDb()} (config option 'always')`)
            await dbAdminApi.createDatabase()
            break
        case "never":
            requestLogger.info(`Not creating database ${ServerConfig.getInstance().pgDb()} (config option 'never')`)
            break
        case "if-not-exists": {
            const dbExists = await dbAdminApi.databaseExists()
            if (dbExists.queryResult) {
                requestLogger.info(
                    `Database ${ServerConfig.getInstance().pgDb()} already exists, keep existing database, (config option 'if-not-exists').`
                )
            } else {
                requestLogger.info(
                    `Creating new database ${ServerConfig.getInstance().pgDb()} because it does not exist yet, (config option 'if-not-exists').`
                )
                await dbAdminApi.createDatabase()
            }
            break
        }
    }

    // Initialize repositories
    const existingRepositoryNames = repositoryStore.allRepositories().map(r => r.repository_name)
    requestLogger.info("Existing repositories " + existingRepositoryNames)
    for (const repository of ServerConfig.getInstance().createRepositories()) {
        const repoCreation = repository.create
        switch (repoCreation) {
            case "always":
                requestLogger.info(`Creating new repository ${repository.name} (config option 'always')`)
                if (existingRepositoryNames.includes(repository.name)) {
                    // need to remove the repository first
                    dbAdminApi.tx(async (task: LionWebTask) => {
                        const deletedn = await dbAdminApi.deleteRepository(task, {
                            clientId: "setup",
                            repository: {
                                repository_name: repository.name,
                                schema_name: SCHEMA_PREFIX + repository.name,
                                history: repository.history,
                                lionweb_version: repository.lionWebVersion
                            }
                        })
                        requestLogger.info(`Delete repository ${repository.name} result is ` + JSON.stringify(deletedn))
                        const newExistingRepositoryNames = repositoryStore.allRepositories().map(r => r.repository_name)
                        requestLogger.info("Repositories in schemata now are: " + newExistingRepositoryNames)
                    })
                }
                await createRepository(repository)
                break
            case "never":
                requestLogger.info(`Not creating repository ${repository.name} (config option 'never')`)
                break
            case "if-not-exists": {
                if (existingRepositoryNames.includes(repository.name)) {
                    requestLogger.info(
                        `Repository ${repository.name} already exists, keep existing repository, (config option 'if-not-exists').`
                    )
                } else {
                    requestLogger.info(
                        `Creating new repository ${repository.name} because it does not exist yet, (config option 'if-not-exists').`
                    )
                    await createRepository(repository)
                }
                break
            }
        }
    }
}

async function createRepository(repository: RepositoryConfig) {
    await dbAdminApi.tx(async (task: LionWebTask) => {
        const history = repository?.history !== undefined && repository?.history !== null && repository?.history === true
        const repositoryData = {
            clientId: "repository",
            repository: {
                repository_name: repository.name,
                schema_name: SCHEMA_PREFIX + repository.name,
                history: history,
                lionweb_version: repository.lionWebVersion
            }
        };
        await dbAdminApi.createRepository(task, repositoryData)
        await dbAdminApi.addRepositoryToTable(task, repositoryData)
        requestLogger.info(`creation of repository ${JSON.stringify(repository)} completed`)
    })
}

async function startServer() {
    const httpServer = http.createServer(app)

    const serverPort = ServerConfig.getInstance().serverPort()

    httpServer.listen(serverPort, () => {
        requestLogger.info(`Server is running at port ${serverPort} =========================================================`)
        if (expectedToken == null) {
            requestLogger.warn(
                "WARNING! The server is not protected by a token. It can be accessed freely. " +
                    "If that is NOT your intention act accordingly."
            )
        } else if (expectedToken.length < 24) {
            requestLogger.warn("WARNING! The used token is quite short. Consider using a token of 24 characters or more.")
        }
    })
}
