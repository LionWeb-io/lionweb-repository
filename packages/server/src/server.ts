import { registerHistoryApi } from "@lionweb/repository-history"
import http from "http"
import express, { Express, NextFunction, Response, Request } from "express"
import bodyParser from "body-parser"
import cors from "cors"
import pgPromise from "pg-promise"
import { postgresConnectionWithDatabase, pgp, postgresConnectionWithoutDatabase } from "./DbConnection.js"
import { DbConnection, expressLogger, requestLogger, SCHEMA_PREFIX, ServerConfig } from "@lionweb/repository-common"
import { initializeCommons } from "@lionweb/repository-common"
import { registerDBAdmin } from "@lionweb/repository-dbadmin"
import { registerInspection } from "@lionweb/repository-inspection"
import { registerBulkApi } from "@lionweb/repository-bulkapi"
import { registerAdditionalApi } from "@lionweb/repository-additionalapi"
import { registerLanguagesApi } from "@lionweb/repository-languages"
import { HttpClientErrors } from "@lionweb/repository-common"
import { pinoHttp } from "pino-http"

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
app.use(bodyParser.json({ limit: ServerConfig.getInstance().bodyLimit() }))

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
// Must be first to initialize
initializeCommons(pgp)
const dbAdminApi = registerDBAdmin(app, DbConnection.getInstance(), postgresConnectionWithoutDatabase, pgp)
registerBulkApi(app, DbConnection.getInstance(), pgp)
registerInspection(app, DbConnection.getInstance(), pgp)
registerAdditionalApi(app, DbConnection.getInstance(), pgp)
registerLanguagesApi(app, DbConnection.getInstance(), pgp)
registerHistoryApi(app, DbConnection.getInstance(), pgp)

const httpServer = http.createServer(app)

const serverPort = ServerConfig.getInstance().serverPort()

if (ServerConfig.getInstance().createDatabase()) {
    await dbAdminApi.createDatabase()
}

for (const repository of ServerConfig.getInstance().createRepositories()) {
    if (repository?.history !== undefined && repository?.history !== null && repository?.history === true) {
        await dbAdminApi.createRepository({clientId: "repository", repository: SCHEMA_PREFIX + repository.name})
    } else {
        await dbAdminApi.createRepositoryWithoutHistory({clientId: "repository", repository: SCHEMA_PREFIX + repository.name})
    }
}

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
