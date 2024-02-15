import dotenv from "dotenv"

dotenv.config()

class Logger {
    requestsVerbosity() : boolean {
        return process.env.REQUESTS_VERBOSITY == null || process.env.REQUESTS_VERBOSITY == 'true'
    }
    dbVerbosity() : boolean {
        return process.env.DB_VERBOSITY == null || process.env.DB_VERBOSITY == 'true'
        // return process.env.DB_VERBOSITY == 'true'
    }
    requestLog(message: string | string[]) {
        if (this.requestsVerbosity()) {
            console.log(message)
        }
    }

    dbLog(message: string | string[]) {
        if (this.dbVerbosity()) {
            console.log(message)
        }
    }
}

export const logger = new Logger()
