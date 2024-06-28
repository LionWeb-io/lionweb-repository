import { LanguageRegistry } from "@lionweb/validation";
import { Express } from "express"
import pgPromise from "pg-promise"
import pg from "pg-promise/typescript/pg-subset.js"
import { DbConnection, requestLogger, runWithTry } from "@lionweb/repository-common";
import { LanguageApiWorker } from "./controllers/LanguageApiWorker.js";
import { LanguageApiImpl } from "./controllers/index.js";

/**
 * Object containing 'global' contextual objects for this API.
 * Avoids using glocal variables, as they easily get mixed up between the various API packages.
 */
export class LanguageApiContext {
    dbConnection: DbConnection
    pgp: pgPromise.IMain<object, pg.IClient>
    languageApiWorker: LanguageApiWorker
    languageApi: LanguageApiImpl

    constructor(dbConnection: DbConnection, pgp: pgPromise.IMain<object, pg.IClient>) {
        this.dbConnection = dbConnection
        this.pgp = pgp
        this.languageApi = new LanguageApiImpl(this)
        this.languageApiWorker = new LanguageApiWorker(this)
    }
}

/**
 * Register all api methods with the _app_
 * @param app           The app to which the api is registered
 * @param dbConnection  The database connection to be used by this API
 * @param pgp           The pg-promise object to gain access to the pg helpers
 */
export function registerLanguagesApi(app: Express, dbConnection: DbConnection, pgp: pgPromise.IMain<object, pg.IClient>) {
    requestLogger.info("Registering Additional API Module");
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
