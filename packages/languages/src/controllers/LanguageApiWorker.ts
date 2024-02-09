import { LanguageApiContext } from "../main.js";

/**
 * Implementations of the additional non-LionWeb methods.
 */
export class LanguageApiWorker {
    constructor(private context: LanguageApiContext) {
    }
    registerLanguage = async (nodeIds: string[], depthLimit: number)=> {
        console.log("TODO: 'registerLanguage' not implemented yet " + nodeIds + " " + depthLimit)
    }

}
