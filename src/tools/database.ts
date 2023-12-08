import dotenv from "dotenv";
import fs from "fs-extra";
import pgPromise from "pg-promise";

const init = async (envFile: string, sqlFile: string) => {
    // read environment variables
    dotenv.config({ path: envFile });
    const port = parseInt( process.env.PGPORT || "5432", 10 );
    const config = {
        // database: process.env.PGDATABASE || "postgres",
        host: process.env.PGHOST || "localhost",
        port,
        user: process.env.PGUSER || "postgres",
        password: process.env.PGPASSWORD || "lionweb"
    };
    let db;
    // create an instance of the PostgreSQL client
    // const client = new Client.Client();
    try {
        // connect to the local database server
        const pgp = pgPromise();
        console.log("config " + JSON.stringify(config, null, 2))
        db = pgp( config );

        console.log("???")
        // await db.connect();
        console.log("!!!")
        // read the contents of the initdb.pgsql file
        const sql = await fs.readFile(sqlFile, { encoding: "UTF-8" });
        console.log("FS: " + JSON.stringify(sql));
        // split the file into separate statements
        // client.database;
        const statements = sql.split(/;\s*$/m);
        for (const statement of statements) {
            if (statement.length > 3) {
                // execute each of the statements
                console.log("STATEMENT " + statement)
                await db.query(statement);
            }
        }
        console.log("Done SQLing")
    } catch (err) {
        console.error("ERROR: " + err);
        throw err;
    } finally {
        // close the database client
        console.log("Closing database")
    }
    // await db.end();
    console.log("Closed")
    return true;
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
        process.exit(0);
    })
    .catch((e) => {
        console.log("finished with errors: " + JSON.stringify(e));
        process.exit(1);
    });
