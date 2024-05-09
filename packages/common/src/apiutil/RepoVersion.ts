import { logger } from "./logging.js";

// TODO Store this in the database, otherwise this just works for one server session 
let REPO_VERSION = 0
export function getRepoVersion(): number {
    return REPO_VERSION
}
export function nextRepoVersion(): number {
    REPO_VERSION++
    logger.requestLog("REPO VERSION++ TO " + REPO_VERSION)
    return REPO_VERSION
}
