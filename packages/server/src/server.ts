import dotenv from "dotenv"
import http from "http"
import express, { Express } from "express"
import bodyParser from "body-parser"
import cors from "cors"
import { dbConnection, pgp } from "./DbConnection.js"
import { initializeCommons } from "@lionweb/repository-common"
import { registerDBAdmin } from "@lionweb/repository-dbadmin"
import { registerInspection } from "@lionweb/repository-inspection"
import { registerBulkApi } from "@lionweb/repository-bulkapi"
import { registerAdditionalApi } from "@lionweb/repository-additionalapi"
import { registerLanguagesApi } from "@lionweb/repository-languages"

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
})
