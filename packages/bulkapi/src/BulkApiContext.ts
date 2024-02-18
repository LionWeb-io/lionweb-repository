import { runWithTry, TableDefinitions } from "@lionweb/repository-dbadmin";
import { Express } from "express"
import pgPromise from "pg-promise"
import pg from "pg-promise/typescript/pg-subset.js"
import { BulkApiWorker } from "./controllers/BulkApiWorker.js";
import { BulkApi, BulkApiImpl } from "./controllers/index.js";
import { LionWebQueries, QueryMaker } from "./database/index.js";

export class BulkApiContext {
    dbConnection: pgPromise.IDatabase<object, pg.IClient>
    pgp: pgPromise.IMain<object, pg.IClient>
    bulkApiWorker: BulkApiWorker
    bulkApi: BulkApi 
    queries: LionWebQueries
    queryMaker: QueryMaker
    tableDefinitions: TableDefinitions
    
    constructor(dbConnection: pgPromise.IDatabase<object, pg.IClient>, pgp: pgPromise.IMain<object, pg.IClient>) {
        this.dbConnection = dbConnection
        this.pgp = pgp
        this.bulkApi = new BulkApiImpl(this)
        this.bulkApiWorker = new BulkApiWorker(this)
        this.queries = new LionWebQueries(this)
        this.queryMaker = new QueryMaker(this)
        this.tableDefinitions = new TableDefinitions(pgp)
    }   
}

export function registerBulkApi(app: Express, dbConnection: pgPromise.IDatabase<object, pg.IClient>, pgp: pgPromise.IMain<object, pg.IClient>) {
    console.log("Registering Bulk API Module");
    // Create all objects 
    const context = new BulkApiContext(dbConnection, pgp)
    
    // Add routes to application
    app.post("/bulk/createPartitions", runWithTry(context.bulkApi.createPartitions))
    app.post("/bulk/deletePartitions", runWithTry(context.bulkApi.deletePartitions))
    app.get("/bulk/partitions", runWithTry(context.bulkApi.partitions))
    app.post("/bulk/store", runWithTry(context.bulkApi.store))
    app.post("/bulk/retrieve", runWithTry(context.bulkApi.retrieve))
}
