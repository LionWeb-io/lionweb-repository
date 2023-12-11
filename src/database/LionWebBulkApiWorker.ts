import { LionWebJsonChunk, LionWebJsonMetaPointer, LionWebJsonNode, LwJsonUsedLanguage } from "@lionweb/validation";
import { LIONWEB_QUERIES } from "./LionWebQueries.js";

/**
 * Implementations of the LionWebBulkApi methods.
 */
class LionWebBulkApiWorker {
    // private lionwebDb2: LionWebQueries ;
    
    constructor() {
        // this.lionwebDb2 = LIONWEB_QUERIES ;
    }
    
    async bulkPartitions(): Promise<LionWebJsonNode[]> {
        return await LIONWEB_QUERIES.getPartitions();
    }

    async bulkStore(nodes: LionWebJsonNode[]) {
        return await LIONWEB_QUERIES.store(nodes);
    }

    /**
     * This implementation uses Postgres for querying
     * @param nodeIdList
     * @param mode
     * @param depthLimit
     */
    async bulkRetrieve(nodeIdList: string[], mode: string, depthLimit: number): Promise<LionWebJsonChunk> {
        const allNodes = await LIONWEB_QUERIES.getNodeTree(nodeIdList, depthLimit);
        console.log("LionWebBulkApiWorker.bulkRetrieve: all " + JSON.stringify(allNodes));
        if (allNodes.length === 0) {
            return {
                serializationFormatVersion: "2023.1",
                languages: [],
                nodes: []
            }        
        } 
        const nodes = await LIONWEB_QUERIES.getNodesFromIdList(allNodes.map(node => node.id));
        // find all languages used
        // Map from language key to set of versions 
        const languages: Map<string, Set<string>> = new Map<string, Set<string>>()
        nodes.forEach(node => {
            this.addLanguage(languages, node.classifier);
            node.properties.forEach( p => this.addLanguage(languages, p.property) );
            node.containments.forEach( c => this.addLanguage(languages, c.containment) );
            node.references.forEach( r => this.addLanguage(languages, r.reference) );
        });
        const mapped = new Mapped();
        languages.forEach(mapped.map);
        return {
            serializationFormatVersion: "2023.1",
            languages: mapped.languages,
            nodes: nodes
        }
    }
    
    addLanguage(languages: Map<string, Set<string>>, metaPointer: LionWebJsonMetaPointer): void {
        let versions: Set<string> = languages.get(metaPointer.language) 
        if (versions === undefined) {
            versions = new Set<string>();
            languages.set(metaPointer.language, versions)
        }
        versions.add(metaPointer.version)
    }
}

class Mapped {
    languages: LwJsonUsedLanguage[] = []
    map = (value: Set<string>, key: string, map: Map<string, Set<string>>): void => {
        value.forEach(v => this.languages.push( {key: key, version: v}));
    }
    
}

export const LIONWEB_BULKAPI_WORKER = new LionWebBulkApiWorker();
