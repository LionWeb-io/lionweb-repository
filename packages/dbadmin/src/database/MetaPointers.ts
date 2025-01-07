import { LionWebJsonMetaPointer, LionWebJsonNode } from "@lionweb/validation"
import { DbConnection, LionWebTask, RepositoryData } from "@lionweb/repository-common"

export type MetaPointersMap = Map<string, number>

// This is private and global. Metapointers never change and their index can be shared
// We expect their number to be limited so we can have a cache that cannot be emptied
const globalMetaPointersMap: Map<string, MetaPointersMap> = new Map<string, Map<string, number>>()

function insertInGlobalMetaPointersMap(repositoryName: string, key: string, metaPointerIndex: number) {
    if (!globalMetaPointersMap.has(repositoryName)) {
        globalMetaPointersMap.set(repositoryName, new Map<string, number>())
    }
    globalMetaPointersMap.get(repositoryName).set(key, metaPointerIndex)
}

function hasInGlobalMetaPointersMap(repositoryName: string, key: string): boolean {
    const map = globalMetaPointersMap.get(repositoryName)
    if (map !== undefined) {
        return map.has(key)
    } else {
        return false
    }
}

function getFromGlobalMetaPointersMap(repositoryName: string, key: string): number {
    const map = globalMetaPointersMap.get(repositoryName)
    if (map !== undefined && map.has(key)) {
        return map.get(key)
    } else {
        throw new Error()
    }
}

export function cleanGlobalPointersMap(repositoryName: string) {
    globalMetaPointersMap.delete(repositoryName)
}

/**
 * This class is used to collect the MetaPointers to then collect at once.
 */
export class MetaPointersCollector {
    // Given the set of LionWebJsonMetaPointers would not recognize duplicate, we store also
    // keys for each metapointer, in order to catch duplicates
    private keysOfMetaPointers: Set<string> = new Set<string>()
    private metaPointers = new Set<LionWebJsonMetaPointer>()

    constructor(private repositoryData: RepositoryData) {}

    considerNode(node: LionWebJsonNode) {
        this.considerAddingMetaPointer(node.classifier)
        node.properties.forEach(p => this.considerAddingMetaPointer(p.property))
        node.references.forEach(r => this.considerAddingMetaPointer(r.reference))
        node.containments.forEach(c => this.considerAddingMetaPointer(c.containment))
    }

    considerAddingMetaPointer(metaPointer: LionWebJsonMetaPointer) {
        const key = `${metaPointer.language}@${metaPointer.version}@${metaPointer.key}`
        if (hasInGlobalMetaPointersMap(this.repositoryData.repository.repository_name, key) || this.keysOfMetaPointers.has(key)) {
            return
        } else {
            this.keysOfMetaPointers.add(key)
            this.metaPointers.add(metaPointer)
        }
    }

    async obtainIndexes(task: LionWebTask | DbConnection): Promise<void> {
        if (this.metaPointers.size == 0) {
            return
        }
        const metaPointersList = Array.from(this.metaPointers)
        const ls = `array[${metaPointersList.map(el => `'${el.language}'`).join(",")}]`
        const vs = `array[${metaPointersList.map(el => `'${el.version}'`).join(",")}]`
        const ks = `array[${metaPointersList.map(el => `'${el.key}'`).join(",")}]`
        const raw_res: { tometapointerids: string }[] = await task.query(this.repositoryData, `SELECT toMetaPointerIDs(${ls},${vs},${ks});`)
        raw_res.forEach(el => {
            const value = el.tometapointerids
            const parts = value.substring(1, value.length - 1).split(",")
            insertInGlobalMetaPointersMap(
                this.repositoryData.repository.repository_name,
                `${parts[1]}@${parts[2]}@${parts[3]}`,
                Number(parts[0])
            )
        })
    }
}

/**
 * This class permits to track the MetaPointers we need to store in the MetaPointers Table and then store
 * exclusively the ones that we do not know already.
 */
export class MetaPointersTracker {
    constructor(private repositoryData: RepositoryData) {}

    async populateFromNodes(nodes: LionWebJsonNode[], task: LionWebTask) {
        await this.populate(collector => {
            nodes.forEach((node: LionWebJsonNode) => collector.considerNode(node))
        }, task)
    }

    async populate(populationLogic: (collector: MetaPointersCollector) => void, dbConnection: DbConnection | LionWebTask): Promise<void> {
        const collector = new MetaPointersCollector(this.repositoryData)
        populationLogic(collector)
        await collector.obtainIndexes(dbConnection)
    }

    forMetaPointer(metaPointer: LionWebJsonMetaPointer): number {
        const key = `${metaPointer.language}@${metaPointer.version}@${metaPointer.key}`
        if (!hasInGlobalMetaPointersMap(this.repositoryData.repository.repository_name, key)) {
            throw new Error(`MetaPointer not found: ${JSON.stringify(metaPointer)}`)
        }
        return getFromGlobalMetaPointersMap(this.repositoryData.repository.repository_name, key)
    }
}
