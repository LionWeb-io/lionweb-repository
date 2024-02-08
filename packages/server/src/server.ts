import dotenv from "dotenv"
import http from "http"
import express, { Express } from "express"
import bodyParser from "body-parser"
import cors from "cors"
import { dbConnection, pgp } from "./DbConnection.js"
import { registerDBAdmin } from "@lionweb/repository-dbadmin"
import { registerInspection } from "@lionweb/repository-inspection"
import { registerBulkApi } from "@lionweb/repository-bulkapi"
import { registerAdditionalApi } from "@lionweb/repository-additionalapi"

dotenv.config()

const app: Express = express()

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
app.use(bodyParser.json())
app.use(bodyParser({limit: '100mb'}))

registerDBAdmin(app, dbConnection, pgp)
registerBulkApi(app, dbConnection, pgp)
registerInspection(app, dbConnection, pgp)
registerAdditionalApi(app, dbConnection, pgp)

const httpServer = http.createServer(app)

httpServer.listen(3005, () => {
    console.log(`Server is running at port 3005 =========================================================`)
})
