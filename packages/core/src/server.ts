import dotenv from "dotenv"
import http from "http"
import express, { Express } from "express"
import bodyParser from "body-parser"
import { ADDITIONAL_API } from "./controllers/AdditionalApi.js"
import { LIONWEB_BULK_API } from "./controllers/LionWebBulkApi.js"
import cors from "cors"
import { registerDBAdmin } from "@lionweb/repository-dbadmin/build/main.js"
import { dbConnection } from "./database/DbConnection.js"

dotenv.config()

const app: Express = express()

// Allow access,
// ERROR Access to XMLHttpRequest from origin has been blocked by CORS policy:
// Response to preflight request doesn't pass access control check:
// No 'Access-Control-Allow-Origin' header is present on the requ
// const cors = require('cors');
app.use(
    cors({
        origin: "*",
    }),
)
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.get("/bulk/partitions", LIONWEB_BULK_API.partitions)
app.post("/bulk/store", LIONWEB_BULK_API.store)
app.post("/bulk/retrieve", LIONWEB_BULK_API.retrieve)

app.post("/getNodeTree", ADDITIONAL_API.getNodeTree)
registerDBAdmin(app, dbConnection)

const httpServer = http.createServer(app)

httpServer.listen(3005, () => {
    console.log(`Server is running at port 3005 =========================================================`)
})
