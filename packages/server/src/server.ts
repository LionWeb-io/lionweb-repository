import dotenv from "dotenv"
import http from "http"
import express, {Express, NextFunction, Response, Request} from "express"
import bodyParser from "body-parser"
import cors from "cors"
import { dbConnection, pgp } from "./DbConnection.js"
import { initializeCommons } from "@lionweb/repository-common"
import { registerDBAdmin } from "@lionweb/repository-dbadmin"
import { registerInspection } from "@lionweb/repository-inspection"
import { registerBulkApi } from "@lionweb/repository-bulkapi"
import { registerAdditionalApi } from "@lionweb/repository-additionalapi"
import { registerLanguagesApi } from "@lionweb/repository-languages"
import { HttpClientErrors } from "@lionweb/repository-common"

dotenv.config()

export const app: Express = express()

// Allow access,
// ERROR Access to XMLHttpRequest from origin has been blocked by CORS policy:
// Response to preflight request doesn't pass access control check:
// No 'Access-Control-Allow-Origin' header is present on the request
// const cors = require('cors');
app.use(
    cors({
        origin: "*",
    }),
)
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json({limit: process.env.BODY_LIMIT || '50mb'}))

const expectedToken = process.env.EXPECTED_TOKEN

function verifyToken(request: Request, response: Response, next: NextFunction) {
    if (expectedToken != null) {
        const providedToken = request.headers['authorization']
        if (providedToken == null || typeof providedToken !== "string" || providedToken.trim() != expectedToken) {
            return response.status(HttpClientErrors.Unauthorized).send("Invalid token or no token provided")
        } else {
            next();
        }
    } else {
        next()
    }
}

app.use(verifyToken)

// Must be first to initialize
initializeCommons(pgp)
registerDBAdmin(app, dbConnection, pgp)
registerBulkApi(app, dbConnection, pgp)
registerInspection(app, dbConnection, pgp)
registerAdditionalApi(app, dbConnection, pgp)
registerLanguagesApi(app, dbConnection, pgp)

const httpServer = http.createServer(app)

const serverPort = parseInt(process.env.NODE_PORT || "3005")

httpServer.listen(serverPort, () => {
    console.log(`Server is running at port ${serverPort} =========================================================`)
    if (expectedToken == null) {
        console.log("WARNING! The server is not protected by a token. It can be accessed freely. " +
            "If that is NOT your intention act accordingly.")
    } else if (expectedToken.length < 24) {
        console.log("WARNING! The used token is quite short. Consider using a token of 24 characters or more.")
    }
})
