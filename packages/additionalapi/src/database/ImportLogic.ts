import {LionWebJsonNode} from "@lionweb/validation";
import {Duplex} from "stream";
import {PoolClient} from "pg";
import {from as copyFrom} from "pg-copy-streams";
import {FBBulkImport, FBMetaPointer} from "../io/lionweb/serialization/flatbuffers/index.js";
import {
    makeQueryToAttachNodeForFlatBuffers,
    makeQueryToCheckHowManyDoNotExist,
    makeQueryToCheckHowManyExist
} from "./QueryNode.js";
import {
    DbConnection,
    HttpClientErrors,
    HttpSuccessCodes, RepositoryData,
} from "@lionweb/repository-common";
import {BulkImportResultType} from "./AdditionalQueries.js";
import {BulkImport} from "./AdditionalQueries.js";
import {MetaPointersCollector, MetaPointersTracker} from "@lionweb/repository-dbadmin";

const SEPARATOR = "\t";

function prepareInputStreamNodes(nodes: LionWebJsonNode[], metaPointersTracker:MetaPointersTracker) : Duplex {
    const read_stream_string = new Duplex();
    nodes.forEach(node => {
        read_stream_string.push(node.id);
        read_stream_string.push(SEPARATOR);
        read_stream_string.push(metaPointersTracker.forMetaPointer(node.classifier).toString());
        read_stream_string.push(SEPARATOR);
        read_stream_string.push("{" + node.annotations.join(",") + "}");
        read_stream_string.push(SEPARATOR);
        read_stream_string.push(node.parent);
        read_stream_string.push("\n");
    })
    read_stream_string.push(null);
    return read_stream_string;
}

function prepareInputStreamProperties(nodes: LionWebJsonNode[], metaPointersTracker:MetaPointersTracker) : Duplex {
    const read_stream_string = new Duplex();
    nodes.forEach(node => {
        node.properties.forEach(prop => {
                read_stream_string.push(metaPointersTracker.forMetaPointer(prop.property).toString());
                read_stream_string.push(SEPARATOR);
                if (prop.value == null) {
                    read_stream_string.push("\\N");
                } else {
                    read_stream_string.push(prop.value
                        .replaceAll('\n', '\\n')
                        .replaceAll('\r', '\\r')
                        .replaceAll('\t', '\\t'));
                }
                read_stream_string.push(SEPARATOR);
                read_stream_string.push(node.id);
                read_stream_string.push("\n");
        });
    })
    read_stream_string.push(null);
    return read_stream_string;
}

function prepareInputStreamReferences(nodes: LionWebJsonNode[], metaPointersTracker:MetaPointersTracker) : Duplex {
    const read_stream_string = new Duplex();
    nodes.forEach(node => {
        node.references.forEach(ref => {
                read_stream_string.push(metaPointersTracker.forMetaPointer(ref.reference).toString());
                read_stream_string.push(SEPARATOR);

                const refValueStr = "{" + ref.targets.map(t => {
                    let refStr = "null";
                    if (t.reference != null) {
                        refStr = `\\\\"${t.reference}\\\\"`
                    }

                    return `"{\\\\"reference\\\\": ${refStr}, \\\\"resolveInfo\\\\": \\\\"${t.resolveInfo}\\\\"}"`
                }).join(",") + "}";
                read_stream_string.push(refValueStr);
                read_stream_string.push(SEPARATOR);
                read_stream_string.push(node.id);
                read_stream_string.push("\n");
        });
    })
        read_stream_string.push(null);
    return read_stream_string;
}

function prepareInputStreamContainments(nodes: LionWebJsonNode[], metaPointersTracker:MetaPointersTracker) : Duplex {
    const read_stream_string = new Duplex();
    nodes.forEach(node => {
        node.containments.forEach(containment => {
            read_stream_string.push(metaPointersTracker.forMetaPointer(containment.containment).toString());
                read_stream_string.push(SEPARATOR);
                read_stream_string.push("{" + containment.children.join(",") + "}");
                read_stream_string.push(SEPARATOR);
                read_stream_string.push(node.id);
                read_stream_string.push("\n");
        });
    })
        read_stream_string.push(null);
    return read_stream_string;
}

function prepareInputStreamNodesFlatBuffers(bulkImport: FBBulkImport, metaPointersTracker: MetaPointersTracker) : Duplex {
    const read_stream_string = new Duplex();
    for (let i = 0; i < bulkImport.nodesLength(); i++) {
        const node = bulkImport.nodes(i);
        const classifier = node.classifier();
        read_stream_string.push(node.id());
        read_stream_string.push(SEPARATOR);
        read_stream_string.push(forFBMetapointer(metaPointersTracker, classifier).toString());
        read_stream_string.push(SEPARATOR);
        const annotations : string[] = new Array<string>(node.annotationsLength());
        for (let k = 0; k < node.annotationsLength(); k++) {
            annotations[k] = node.annotations(k);
        }
        read_stream_string.push("{" + annotations.join(",") + "}");
        read_stream_string.push(SEPARATOR);
        read_stream_string.push(node.parent());
        read_stream_string.push("\n");
    }
    read_stream_string.push(null);
    return read_stream_string;
}

function prepareInputStreamPropertiesFlatBuffers(bulkImport: FBBulkImport, metaPointersTracker: MetaPointersTracker) : Duplex {
    const read_stream_string = new Duplex();
    for (let i = 0; i < bulkImport.nodesLength(); i++) {
        const node = bulkImport.nodes(i);
        for (let j = 0; j < node.propertiesLength(); j++) {
            const prop = node.properties(j);
            const metaPointer = prop.metaPointer();
            read_stream_string.push(forFBMetapointer(metaPointersTracker, metaPointer).toString());
            read_stream_string.push(SEPARATOR);
            const value = prop.value();
            if (value == null) {
                read_stream_string.push("\\N");
            } else {
                read_stream_string.push(value
                    .replaceAll('\n', '\\n')
                    .replaceAll('\r', '\\r')
                    .replaceAll('\t', '\\t'));
            }
            read_stream_string.push(SEPARATOR);
            read_stream_string.push(node.id());
            read_stream_string.push("\n");
        }
    }
        read_stream_string.push(null);
    return read_stream_string;
}

function prepareInputStreamReferencesFlatBuffers(bulkImport: FBBulkImport, metaPointersTracker: MetaPointersTracker) : Duplex {
    const read_stream_string = new Duplex();
    for (let i = 0; i < bulkImport.nodesLength(); i++) {
        const node = bulkImport.nodes(i);
        for (let j = 0; j < node.referencesLength(); j++) {
            const ref = node.references(j);
            const metaPointer = ref.metaPointer();
            read_stream_string.push(forFBMetapointer(metaPointersTracker, metaPointer).toString());
            read_stream_string.push(SEPARATOR);

            const parts : string[] = new Array<string>(ref.valuesLength());
            for (let k = 0; k < ref.valuesLength(); k++) {
                const value = ref.values(k);
                let refStr = "null";
                const referred = value.referred();
                if (referred != null) {
                    refStr = `\\\\"${referred}\\\\"`
                }
                parts[k] = `"{\\\\"reference\\\\": ${refStr}, \\\\"resolveInfo\\\\": \\\\"${value.resolveInfo()}\\\\"}"`;
            }

            const refValueStr = "{" + parts.join(",") + "}";
            read_stream_string.push(refValueStr);
            read_stream_string.push(SEPARATOR);
            read_stream_string.push(node.id());
            read_stream_string.push("\n");
        }
    }
        read_stream_string.push(null);
    return read_stream_string;
}

function prepareInputStreamContainmentsFlatBuffers(bulkImport: FBBulkImport, metaPointersTracker: MetaPointersTracker) : Duplex {
    const read_stream_string = new Duplex();
    for (let i = 0; i < bulkImport.nodesLength(); i++) {
        const node = bulkImport.nodes(i);
        for (let j = 0; j < node.containmentsLength(); j++) {
            const containment = node.containments(j);
            const metaPointer = containment.metaPointer();
            read_stream_string.push(forFBMetapointer(metaPointersTracker, metaPointer).toString());
            read_stream_string.push(SEPARATOR);
            const children : string[] = new Array<string>(containment.childrenLength());
            for (let k = 0; k < containment.childrenLength(); k++) {
                children[k] = containment.children(k);
            }
            read_stream_string.push("{" + children.join(",") + "}");
            read_stream_string.push(SEPARATOR);
            read_stream_string.push(node.id());
            read_stream_string.push("\n");
        }
    }
        read_stream_string.push(null);
    return read_stream_string;
}

async function pipeInputIntoQueryStream(client: PoolClient, query: string, inputStream: Duplex, opDesc: string) : Promise<void> {
    await new Promise<void>((resolve, reject) => {
        try {
            const queryStream = client.query(copyFrom(query))

            inputStream.on('error', (err: Error) => {
                reject(`Input stream error on ${opDesc}: ${err}`)
            });

            queryStream.on('error', (err: Error) => {
                reject(`Query stream error on ${opDesc}: ${err}`)

            });

            inputStream.on('end', () => {
                resolve();
            });

            inputStream.pipe(queryStream);
        } catch (e) {
            reject(`Error on ${opDesc}: ${e}`)
        }
    });
}



export async function storeNodes(client: PoolClient, repositoryData: RepositoryData,
                                 bulkImport: BulkImport, metaPointersTracker: MetaPointersTracker) : Promise<void> {
    try {
        const repositoryName = repositoryData.repository;

        const nodes = bulkImport.nodes;

        await pipeInputIntoQueryStream(client, `COPY "${repositoryName}".lionweb_nodes(id,classifier,annotations,parent) FROM STDIN`,
            prepareInputStreamNodes(nodes, metaPointersTracker), "nodes insertion");
        await pipeInputIntoQueryStream(client, `COPY "${repositoryName}".lionweb_containments(containment,children,node_id) FROM STDIN`,
            prepareInputStreamContainments(nodes, metaPointersTracker), "containments insertion");
        await pipeInputIntoQueryStream(client, `COPY "${repositoryName}".lionweb_references(reference,targets,node_id) FROM STDIN`,
            prepareInputStreamReferences(nodes, metaPointersTracker), "references ${repositoryName}");
        await pipeInputIntoQueryStream(client, `COPY "${repositoryName}".lionweb_properties(property,value,node_id) FROM STDIN`,
            prepareInputStreamProperties(nodes, metaPointersTracker), "properties ${repositoryName}");
    } finally {
        client.release(false)
    }
}

async function storeNodesThroughFlatBuffers(client: PoolClient, repositoryData: RepositoryData, dbConnection: DbConnection, bulkImport: FBBulkImport)
    : Promise<MetaPointersTracker> {
    // We obtain all the indexes for all the MetaPointers we need. We will then use such indexes in successive calls
    // to pipeInputIntoQueryStream, etc.
    const metaPointersTracker = new MetaPointersTracker(repositoryData);
    await populateThroughFlatBuffers(metaPointersTracker, bulkImport, repositoryData, dbConnection);

    const repositoryName = repositoryData.repository.repository_name
    await pipeInputIntoQueryStream(client,`COPY "${repositoryName}".lionweb_nodes(id,classifier,annotations,parent) FROM STDIN`,
        prepareInputStreamNodesFlatBuffers(bulkImport, metaPointersTracker), "nodes insertion");
    await pipeInputIntoQueryStream(client,`COPY "${repositoryName}".lionweb_containments(containment,children,node_id) FROM STDIN`,
        prepareInputStreamContainmentsFlatBuffers(bulkImport, metaPointersTracker), "containments insertion");
    await pipeInputIntoQueryStream(client,`COPY "${repositoryName}".lionweb_references(reference,targets,node_id) FROM STDIN`,
        prepareInputStreamReferencesFlatBuffers(bulkImport, metaPointersTracker), "references ${repositoryName}");
    await pipeInputIntoQueryStream(client,`COPY "${repositoryName}".lionweb_properties(property,value,node_id) FROM STDIN`,
        prepareInputStreamPropertiesFlatBuffers(bulkImport, metaPointersTracker), "properties ${repositoryName}");
    return metaPointersTracker
}

/**
 * This is a variant of bulkImport that operates directly on Flatbuffers data structures, instead of converting them
 * to the "neutral" format and invoke bulkImport. This choice has been made for performance reasons.
 */
export async function performImportFromFlatBuffers(client: PoolClient, dbConnection: DbConnection, bulkImport: FBBulkImport, repositoryData: RepositoryData) : Promise<BulkImportResultType> {
    try {

        // Check - We verify there are no duplicate IDs in the new nodes
        const newNodesSet = new Set<string>()
        const parentsSet: Set<string> = new Set<string>()
        for (let i = 0; i < bulkImport.nodesLength(); i++) {
            const fbNode = bulkImport.nodes(i);
            const fbNodeID = fbNode.id();
            if (newNodesSet.has(fbNodeID)) {
                return {
                    status: HttpClientErrors.BadRequest,
                    success: false,
                    description: `Node with ID ${fbNodeID} is being inserted twice`
                }
            }
            newNodesSet.add(fbNodeID)
            parentsSet.add(fbNode.parent())
        }

        // Check - We verify all the parent nodes are either other new nodes or the attach points containers
        // Check - verify the root of the attach points are among the new nodes
        const attachPointContainers: Set<string> = new Set<string>()
        for (let i = 0; i < bulkImport.attachPointsLength(); i++) {
            const fbAttachPoint = bulkImport.attachPoints(i);
            const fbAttachPointRoot = fbAttachPoint.root();
            if (!newNodesSet.has(fbAttachPointRoot)) {
                return {
                    status: HttpClientErrors.BadRequest,
                    success: false,
                    description: `Attach point root ${fbAttachPointRoot} does not appear among the new nodes`
                }
            }
            attachPointContainers.add(fbAttachPoint.container())
        }
        parentsSet.forEach(parent => {
            if (!newNodesSet.has(parent) && !attachPointContainers.has(parent)) {
                return {
                    status: HttpClientErrors.BadRequest,
                    success: false,
                    description: `Invalid parent specified: ${parent}. It is not one of the new nodes being added or one of the attach points`
                }
            }
        });

        // Check - verify all the given new nodes are effectively new
        const allNewNodesResult = await dbConnection.query(repositoryData, makeQueryToCheckHowManyExist(newNodesSet));
        if (allNewNodesResult > 0) {
            return {
                status: HttpClientErrors.BadRequest,
                success: false,
                description: `Some of the given nodes already exist`
            }
        }

        // Check - verify the containers from the attach points are existing nodes
        const allExistingNodesResult = await dbConnection.query(repositoryData, makeQueryToCheckHowManyDoNotExist(attachPointContainers));
        if (allExistingNodesResult > 0) {
            return {
                status: HttpClientErrors.BadRequest,
                success: false,
                description: `Some of the attach point containers do not exist`
            }
        }

        // Add all the new nodes
        const metaPointersTracker = await storeNodesThroughFlatBuffers(client, repositoryData, dbConnection, bulkImport)

        // Attach the root of the new nodes to existing containers
        for (let i = 0; i < bulkImport.attachPointsLength(); i++) {
            const fbAttachPoint = bulkImport.attachPoints(i);
            await dbConnection.query(repositoryData, makeQueryToAttachNodeForFlatBuffers(fbAttachPoint, metaPointersTracker))
        }

        return {status: HttpSuccessCodes.Ok, success: true}
    } finally {
        client.release(false)
    }
}

async function populateThroughFlatBuffers(metaPointersTracker: MetaPointersTracker, bulkImport: FBBulkImport, repositoryData: RepositoryData, dbConnection: DbConnection): Promise<void> {
    await metaPointersTracker.populate((collector: MetaPointersCollector)=>{
        function considerAddingFBMetaPointer(metaPointer: FBMetaPointer) {
            collector.considerAddingMetaPointer({
                key: metaPointer.key(),
                version: metaPointer.version(),
                language: metaPointer.language()
            })
        }

        for (let i = 0; i < bulkImport.nodesLength(); i++) {
            const fbNode = bulkImport.nodes(i);
            const metaPointer = fbNode.classifier();
            considerAddingFBMetaPointer(metaPointer);
            for (let j = 0; j <fbNode.containmentsLength(); j++) {
                const metaPointer = fbNode.containments(j).metaPointer();
                considerAddingFBMetaPointer(metaPointer);
            }
            for (let j = 0; j <fbNode.referencesLength(); j++) {
                const metaPointer = fbNode.references(j).metaPointer();
                considerAddingFBMetaPointer(metaPointer);
            }
            for (let j = 0; j <fbNode.propertiesLength(); j++) {
                const metaPointer = fbNode.properties(j).metaPointer();
                considerAddingFBMetaPointer(metaPointer);
            }
        }
        for (let i = 0; i <bulkImport.attachPointsLength(); i++) {
            const attachPoint = bulkImport.attachPoints(i);
            const metaPointer = attachPoint.containment();
            considerAddingFBMetaPointer(metaPointer);
        }
    }, dbConnection)
}

export function forFBMetapointer(metaPointersTracker: MetaPointersTracker, metaPointer: FBMetaPointer) : number {
    return metaPointersTracker.forMetaPointer({
        key: metaPointer.key(),
        language: metaPointer.language(),
        version: metaPointer.version()
    })
}

export async function populateFromBulkImport(metaPointersTracker: MetaPointersTracker, bulkImport: BulkImport, repositoryData: RepositoryData, dbConnection: DbConnection) {
    await metaPointersTracker.populate((collector: MetaPointersCollector)=>{
        const nodes = bulkImport.nodes;
        nodes.forEach((node: LionWebJsonNode) => collector.considerNode(node))
        bulkImport.attachPoints.forEach(ap => collector.considerAddingMetaPointer(ap.containment));
    }, dbConnection)
}
