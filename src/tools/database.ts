import dotenv from "dotenv";
import fs from "fs-extra";
// import  Client from "pg";
import { config, db } from "../database/DbConnection.js" 

const init = async (envFile: string, sqlFile: string) => {
    // read environment variables
    dotenv.config({ path: envFile });
    // create an instance of the PostgreSQL client
    // const client = new Client.Client();
    try {
        // connect to the local database server
        await db.connect();
        // read the contents of the initdb.pgsql file
        const sql = await fs.readFile(sqlFile, { encoding: "UTF-8" });
        console.log("FS: " + JSON.stringify(sql));
        // split the file into separate statements
        // client.database;
        const statements = sql.split(/;\s*$/m);
        for (const statement of statements) {
            if (statement.length > 3) {
                // execute each of the statements
                await db.query(statement);
            }
        }
    } catch (err) {
        console.error("ERROR: " + err);
        throw err;
    } finally {
        // close the database client
        // await db.end();
    }
};

const command = process.argv[2];
let sqlfile = "";
let envFile = "";
if (command === "create") {
    sqlfile = "./src/tools/lionweb-create-database.sql";
    // Environment without database name
    envFile = "./src/tools/.env_create";
} else if (command === "init") {
    sqlfile = "./src/tools/lionweb-init-tables.sql";
    envFile = "./src/tools/.env_init";
} else {
    console.log("Usage: node initdb (create | init)");
    process.exit(1);
}

init(envFile, sqlfile)
    .then(() => {
        console.log("finished ok");
    })
    .catch((e) => {
        console.log("finished with errors: " + JSON.stringify(e));
    });
