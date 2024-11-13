import { pino, LevelWithSilent } from "pino"
import { ServerConfig } from "./ServerConfig.js"

// Need to copy from pino, as we cannot check a string value against a type in TS
export const PINO_LEVELS = ["fatal", "error", "warn", "info", "debug", "trace", "silent"]

export function verbosity(level: string, defaultValue: LevelWithSilent): LevelWithSilent {
    if (level !== undefined && PINO_LEVELS.includes(level)) {
        return level as LevelWithSilent
    } else {
        return defaultValue
    }
}

const transport = pino.transport({
    targets: [
        {
            target: "pino/file",
            options: { destination: `./server-log.jsonl` }
        },
        // {
        //     target: "pino/file" // default destination is console
        // },
        {
            target: "pino-pretty",
            options: {
                colorize: true,
                ignore: "pid,hostname,level-label,type,query,chunk"
            }
        }
    ]
})

const pinoLogger = pino(
    {
        level: "info",
        formatters: {
            // level: (label: string) => {
            //     return { level: label.toUpperCase() }
            // },
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            bindings: () => {
                return {}
            }
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        timestamp: undefined
    },
    transport
)

export const requestLogger = pinoLogger.child({ type: "request" })
export const expressLogger = pinoLogger.child({ type: "express" })
export const dbLogger = pinoLogger.child({ type: "database" })
export const traceLogger = pinoLogger.child({ type: "trace" })
requestLogger.level = ServerConfig.getInstance().requestLog()
traceLogger.level = ServerConfig.getInstance().traceLog()
expressLogger.level = ServerConfig.getInstance().expressLog()
dbLogger.level = ServerConfig.getInstance().databaseLog()
