import {LionWebJsonNode} from "@lionweb/validation";
import {Duplex} from "stream";
import {PoolClient} from "pg";
import {from as copyFrom} from "pg-copy-streams";
import {FBBulkImport} from "../serialization/index.js";
import {
    makeQueryToAttachNodeForFlatBuffers,
    makeQueryToCheckHowManyDoNotExist,
    makeQueryToCheckHowManyExist
} from "./QueryNode.js";
import {DbConnection, HttpClientErrors, HttpSuccessCodes, RepositoryData} from "@lionweb/repository-common";

const SEPARATOR = "\t";

function prepareInputStreamNodes(nodes: LionWebJsonNode[]) : Duplex {
    const read_stream_string = new Duplex();
    nodes.forEach(node => {
        read_stream_string.push(node.id);
        read_stream_string.push(SEPARATOR);
        read_stream_string.push(node.classifier.language);
        read_stream_string.push(SEPARATOR);
        read_stream_string.push(node.classifier.version);
        read_stream_string.push(SEPARATOR);
        read_stream_string.push(node.classifier.key);
        read_stream_string.push(SEPARATOR);
        read_stream_string.push("{" + node.annotations.join(",") + "}");
        read_stream_string.push(SEPARATOR);
        read_stream_string.push(node.parent);
        read_stream_string.push("\n");
    })
    read_stream_string.push(null);
    return read_stream_string;
}

function prepareInputStreamProperties(nodes: LionWebJsonNode[]) : Duplex {
    const read_stream_string = new Duplex();
    nodes.forEach(node => {
        node.properties.forEach(prop => {
                read_stream_string.push(prop.property.language);
                read_stream_string.push(SEPARATOR);
                read_stream_string.push(prop.property.version);
                read_stream_string.push(SEPARATOR);
                read_stream_string.push(prop.property.key);
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

function prepareInputStreamReferences(nodes: LionWebJsonNode[]) : Duplex {
    const read_stream_string = new Duplex();
    nodes.forEach(node => {
        node.references.forEach(ref => {
                read_stream_string.push(ref.reference.language);
                read_stream_string.push(SEPARATOR);
                read_stream_string.push(ref.reference.version);
                read_stream_string.push(SEPARATOR);
                read_stream_string.push(ref.reference.key);
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

function prepareInputStreamContainments(nodes: LionWebJsonNode[]) : Duplex {
    const read_stream_string = new Duplex();
    nodes.forEach(node => {
        node.containments.forEach(containment => {
                read_stream_string.push(containment.containment.language);
                read_stream_string.push(SEPARATOR);
                read_stream_string.push(containment.containment.version);
                read_stream_string.push(SEPARATOR);
                read_stream_string.push(containment.containment.key);
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

function prepareInputStreamNodesFlatBuffers(bulkImport: FBBulkImport) : Duplex {
    const read_stream_string = new Duplex();
    for (let i = 0; i < bulkImport.nodesLength(); i++) {
        const node = bulkImport.nodes(i);
        const classifier = node.classifier();
        read_stream_string.push(node.id());
        read_stream_string.push(SEPARATOR);
        read_stream_string.push(classifier.language());
        read_stream_string.push(SEPARATOR);
        read_stream_string.push(classifier.version());
        read_stream_string.push(SEPARATOR);
        read_stream_string.push(classifier.key());
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

function prepareInputStreamPropertiesFlatBuffers(bulkImport: FBBulkImport) : Duplex {
    const read_stream_string = new Duplex();
    for (let i = 0; i < bulkImport.nodesLength(); i++) {
        const node = bulkImport.nodes(i);
        for (let j = 0; j < node.propertiesLength(); j++) {
            const prop = node.properties(j);
            const metaPointer = prop.metaPointer();
                read_stream_string.push(metaPointer.language());
                read_stream_string.push(SEPARATOR);
                read_stream_string.push(metaPointer.version());
                read_stream_string.push(SEPARATOR);
                read_stream_string.push(metaPointer.key());
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

function prepareInputStreamReferencesFlatBuffers(bulkImport: FBBulkImport) : Duplex {
    const read_stream_string = new Duplex();
    for (let i = 0; i < bulkImport.nodesLength(); i++) {
        const node = bulkImport.nodes(i);
        for (let j = 0; j < node.referencesLength(); j++) {
            const ref = node.references(j);
            const metaPointer = ref.metaPointer();
                read_stream_string.push(metaPointer.language());
                read_stream_string.push(SEPARATOR);
                read_stream_string.push(metaPointer.version());
                read_stream_string.push(SEPARATOR);
                read_stream_string.push(metaPointer.key());
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

function prepareInputStreamContainmentsFlatBuffers(bulkImport: FBBulkImport) : Duplex {
    const read_stream_string = new Duplex();
    for (let i = 0; i < bulkImport.nodesLength(); i++) {
        const node = bulkImport.nodes(i);
        for (let j = 0; j < node.containmentsLength(); j++) {
            const containment = node.containments(j);
            const metaPointer = containment.metaPointer();
                read_stream_string.push(metaPointer.language());
                read_stream_string.push(SEPARATOR);
                read_stream_string.push(metaPointer.version());
                read_stream_string.push(SEPARATOR);
                read_stream_string.push(metaPointer.key());
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

async function pipeInputIntoQueryStream(client: PoolClient, query: string, inputStream: Duplex, opDesc: string) {
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

export async function storeNodes(client: PoolClient, nodes: LionWebJsonNode[], repositoryName: string) : Promise<void> {
    await pipeInputIntoQueryStream(client,`COPY "${repositoryName}".lionweb_nodes FROM STDIN`,
        prepareInputStreamNodes(nodes), "nodes insertion");
    await pipeInputIntoQueryStream(client,`COPY "${repositoryName}".lionweb_containments(containment_language,containment_version,containment_key,children,node_id) FROM STDIN`,
        prepareInputStreamContainments(nodes), "containments insertion");
    await pipeInputIntoQueryStream(client,`COPY "${repositoryName}".lionweb_references(reference_language,reference_version,reference_key,targets,node_id) FROM STDIN`,
        prepareInputStreamReferences(nodes), "references ${repositoryName}");
    await pipeInputIntoQueryStream(client,`COPY "${repositoryName}".lionweb_properties(property_language,property_version,property_key,value,node_id) FROM STDIN`,
        prepareInputStreamProperties(nodes), "properties ${repositoryName}");
}

async function storeNodesThroughFlatBuffers(client: PoolClient, bulkImport: FBBulkImport, repositoryName: string) : Promise<void> {
    await pipeInputIntoQueryStream(client,`COPY "${repositoryName}".lionweb_nodes FROM STDIN`,
        prepareInputStreamNodesFlatBuffers(bulkImport), "nodes insertion");
    await pipeInputIntoQueryStream(client,`COPY "${repositoryName}".lionweb_containments(containment_language,containment_version,containment_key,children,node_id) FROM STDIN`,
        prepareInputStreamContainmentsFlatBuffers(bulkImport), "containments insertion");
    await pipeInputIntoQueryStream(client,`COPY "${repositoryName}".lionweb_references(reference_language,reference_version,reference_key,targets,node_id) FROM STDIN`,
        prepareInputStreamReferencesFlatBuffers(bulkImport), "references ${repositoryName}");
    await pipeInputIntoQueryStream(client,`COPY "${repositoryName}".lionweb_properties(property_language,property_version,property_key,value,node_id) FROM STDIN`,
        prepareInputStreamPropertiesFlatBuffers(bulkImport), "properties ${repositoryName}");
}

/**
 * This is a variant of bulkImport that operates directly on Flatbuffers data structures, instead of converting them
 * to the "neutral" format and invoke bulkImport. This choice has been made for performance reasons.
 */
export async function performImportFromFlatBuffers(client: PoolClient, dbConnection: DbConnection, bulkImport: FBBulkImport, repositoryData: RepositoryData) : Promise<{
    success: boolean;
    description?: string;
    status: number
}> {
    // Check - We verify there are no duplicate IDs in the new nodes
    const newNodesSet = new Set<string>()
    const parentsSet : Set<string> = new Set<string>()
    for (let i = 0; i < bulkImport.nodesLength(); i++) {
        const fbNode = bulkImport.nodes(i);
        const fbNodeID = fbNode.id();
        if (newNodesSet.has(fbNodeID)) {
            return { status: HttpClientErrors.BadRequest, success: false, description: `Node with ID ${fbNodeID} is being inserted twice` }
        }
        newNodesSet.add(fbNodeID)
        parentsSet.add(fbNode.parent())
    }

    // Check - We verify all the parent nodes are either other new nodes or the attach points containers
    // Check - verify the root of the attach points are among the new nodes
    const attachPointContainers : Set<string> = new Set<string>()
    for (let i = 0; i < bulkImport.attachPointsLength(); i++) {
        const fbAttachPoint = bulkImport.attachPoints(i);
        const fbAttachPointRoot = fbAttachPoint.root();
        if (!newNodesSet.has(fbAttachPointRoot)) {
            return { status: HttpClientErrors.BadRequest, success: false, description: `Attach point root ${fbAttachPointRoot} does not appear among the new nodes` }
        }
        attachPointContainers.add(fbAttachPoint.container())
    }
    parentsSet.forEach(parent => {
        if (!newNodesSet.has(parent) && !attachPointContainers.has(parent)) {
            return { status: HttpClientErrors.BadRequest, success: false, description: `Invalid parent specified: ${parent}. It is not one of the new nodes being added or one of the attach points` }
        }
    });

    // Check - verify all the given new nodes are effectively new
    const allNewNodesResult = await dbConnection.query(repositoryData, makeQueryToCheckHowManyExist(newNodesSet));
    if (allNewNodesResult > 0) {
        return { status: HttpClientErrors.BadRequest, success: false, description: `Some of the given nodes already exist` }
    }

    // Check - verify the containers from the attach points are existing nodes
    const allExistingNodesResult = await dbConnection.query(repositoryData, makeQueryToCheckHowManyDoNotExist(attachPointContainers));
    if (allExistingNodesResult > 0) {
        return { status: HttpClientErrors.BadRequest, success: false, description: `Some of the attach point containers do not exist` }
    }

    // Add all the new nodes
    await storeNodesThroughFlatBuffers(client, bulkImport, repositoryData.repository)

    // Attach the root of the new nodes to existing containers
    for (let i = 0; i < bulkImport.attachPointsLength(); i++) {
        const fbAttachPoint = bulkImport.attachPoints(i);
        await dbConnection.query(repositoryData, makeQueryToAttachNodeForFlatBuffers(fbAttachPoint))
    }

    return { status: HttpSuccessCodes.Ok, success: true}
}


