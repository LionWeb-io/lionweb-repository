import dotenv from "dotenv"
import http from "http"
import express, { Express } from "express"
import bodyParser from "body-parser"
import { ADDITIONAL_API } from "./controllers/AdditionalApi.js"
import { LIONWEB_BULK_API } from "./controllers/LionWebBulkApi.js"
import cors from "cors"
import { registerDBAdmin } from "@lionweb/repository-dbadmin"
import { dbConnection } from "./database/DbConnection.js"
import { registerInspection } from "@lionweb/repository-inspection"

dotenv.config()

export const requestsVerbosity : boolean = process.env.REQUESTS_VERBOSITY == null || process.env.REQUESTS_VERBOSITY == 'true'

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
app.use(bodyParser.json({limit: process.env.BODY_LIMIT || '50mb'}))

app.get("/bulk/partitions", LIONWEB_BULK_API.partitions)
app.post("/bulk/store", LIONWEB_BULK_API.store)
app.post("/bulk/retrieve", LIONWEB_BULK_API.retrieve)

app.post("/getNodeTree", ADDITIONAL_API.getNodeTree)
registerDBAdmin(app, dbConnection)
registerInspection(app, dbConnection)

const httpServer = http.createServer(app)

const serverPort = parseInt(process.env.NODE_PORT || "3005")
httpServer.listen(serverPort, () => {
    console.log(`Server is running at port ${serverPort} =========================================================`)
})
