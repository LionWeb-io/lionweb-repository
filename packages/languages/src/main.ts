import { LanguageRegistry } from "@lionweb/validation";
import { Express } from "express"
import pgPromise from "pg-promise"
import pg from "pg-promise/typescript/pg-subset.js"
import { runWithTry } from "@lionweb/repository-common";
import { LanguageApiWorker } from "./controllers/LanguageApiWorker.js";
import { LanguageApiImpl } from "./controllers/index.js";

export class LanguageApiContext {
    dbConnection: pgPromise.IDatabase<object, pg.IClient>
    pgp: pgPromise.IMain<object, pg.IClient>
    languageApiWorker: LanguageApiWorker
    languageApi: LanguageApiImpl

    constructor(dbConnection: pgPromise.IDatabase<object, pg.IClient>, pgp: pgPromise.IMain<object, pg.IClient>) {
        this.dbConnection = dbConnection
        this.pgp = pgp
        this.languageApi = new LanguageApiImpl(this)
        this.languageApiWorker = new LanguageApiWorker(this)
    }
}

export function registerLanguagesApi(app: Express, dbConnection: pgPromise.IDatabase<object, pg.IClient>, pgp: pgPromise.IMain<object, pg.IClient>) {
    console.log("Registering Additional API Module");
    // Create all objects 
    const context = new LanguageApiContext(dbConnection, pgp)

    // Add routes to application
    app.get("/languages/registerLanguage", runWithTry(context.languageApi.registerLanguage))
}

// TODO Have a dummy  registry for other packages to use, needs proper implementation later
const registry: LanguageRegistry = new LanguageRegistry()

export function getLanguageRegistry(): LanguageRegistry {
    return registry
}
