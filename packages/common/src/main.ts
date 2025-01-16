import pgPromise from "pg-promise"
import pg from "pg-promise/typescript/pg-subset.js"
import { TableDefinitions } from "./database/TableDefinitions.js"

export let TableHelpers: TableDefinitions

export function initializeCommons(pgp: pgPromise.IMain<object, pg.IClient>) {
    TableHelpers = new TableDefinitions(pgp)
}
