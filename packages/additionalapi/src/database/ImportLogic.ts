import {LionWebJsonNode} from "@lionweb/validation";
import {Duplex} from "stream";
import {PoolClient} from "pg";
import {from as copyFrom} from "pg-copy-streams";
import {FBBulkImport} from "../serialization";
import {
    makeQueryToAttachNodeForFlatBuffers,
    makeQueryToCheckHowManyDoNotExist,
    makeQueryToCheckHowManyExist
} from "./QueryNode.js";
import {DbConnection, RepositoryData} from "@lionweb/repository-common";
import {HttpClientErrors, HttpSuccessCodes} from "@lionweb/repository-client";

function prepareInputStreamNodes(nodes: LionWebJsonNode[]) : Duplex {
    const separator = "\t";
    const read_stream_string = new Duplex();
    nodes.forEach(node => {
        read_stream_string.push(node.id);
        read_stream_string.push(separator);
        read_stream_string.push(node.classifier.language);
        read_stream_string.push(separator);
        read_stream_string.push(node.classifier.version);
        read_stream_string.push(separator);
        read_stream_string.push(node.classifier.key);
        read_stream_string.push(separator);
        read_stream_string.push("{}");
        read_stream_string.push(separator);
        read_stream_string.push(node.parent);
        read_stream_string.push("\n");
    })
    read_stream_string.push(null);
    return read_stream_string;
}

function prepareInputStreamProperties(nodes: LionWebJsonNode[]) : Duplex {
    const separator = "\t";
    const read_stream_string = new Duplex();
    nodes.forEach(node => {
        node.properties.forEach(prop => {
            try {
                read_stream_string.push(prop.property.language);
                read_stream_string.push(separator);
                read_stream_string.push(prop.property.version);
                read_stream_string.push(separator);
                read_stream_string.push(prop.property.key);
                read_stream_string.push(separator);
                if (prop.value == null) {
                    read_stream_string.push("\\N");
                } else {
                    read_stream_string.push(prop.value
                        .replaceAll('\n', '\\n')
                        .replaceAll('\r', '\\r')
                        .replaceAll('\t', '\\t'));
                    //read_stream_string.push(JSON.stringify(prop.value));
                }
                read_stream_string.push(separator);
                read_stream_string.push(node.id);
                read_stream_string.push("\n");
            } catch (e) {
                throw Error(`ERROR WHEN POPULATING PROPERTIES STREAM ${e}`)
            }
        });
    })
    try {
        read_stream_string.push(null);
    }catch (e) {
        throw Error(`ERROR WHEN Setting the null ${e}`)
    }
    return read_stream_string;
}

function prepareInputStreamReferences(nodes: LionWebJsonNode[]) : Duplex {
    const separator = "\t";
    const read_stream_string = new Duplex();
    nodes.forEach(node => {
        node.references.forEach(ref => {
            try {
                read_stream_string.push(ref.reference.language);
                read_stream_string.push(separator);
                read_stream_string.push(ref.reference.version);
                read_stream_string.push(separator);
                read_stream_string.push(ref.reference.key);
                read_stream_string.push(separator);

                const refValueStr = "{" + ref.targets.map(t => {
                    let refStr = "null";
                    if (t.reference != null) {
                        refStr = `\\\\"${t.reference}\\\\"`
                    }

                    return `"{\\\\"reference\\\\": ${refStr}, \\\\"resolveInfo\\\\": \\\\"${t.resolveInfo}\\\\"}"`
                }).join(",") + "}";
                read_stream_string.push(refValueStr);
                read_stream_string.push(separator);
                read_stream_string.push(node.id);
                read_stream_string.push("\n");
            } catch (e) {
                throw Error(`ERROR WHEN POPULATING REFERENCES STREAM ${e}`)
            }
        });
    })
    try {
        read_stream_string.push(null);
    }catch (e) {
        throw Error(`ERROR WHEN Setting the null ${e}`)
    }
    return read_stream_string;
}

function prepareInputStreamContainments(nodes: LionWebJsonNode[]) : Duplex {
    const separator = "\t";
    const read_stream_string = new Duplex();
    nodes.forEach(node => {
        node.containments.forEach(containment => {
            try {
                read_stream_string.push(containment.containment.language);
                read_stream_string.push(separator);
                read_stream_string.push(containment.containment.version);
                read_stream_string.push(separator);
                read_stream_string.push(containment.containment.key);
                read_stream_string.push(separator);
                read_stream_string.push("{" + containment.children.join(",") + "}");
                read_stream_string.push(separator);
                read_stream_string.push(node.id);
                read_stream_string.push("\n");
            } catch (e) {
                throw Error(`ERROR WHEN POPULATING PROPERTIES STREAM ${e}`)
            }
        });
    })
    try {
        read_stream_string.push(null);
    }catch (e) {
        throw Error(`ERROR WHEN Setting the null ${e}`)
    }
    return read_stream_string;
}

function prepareInputStreamNodesFlatBuffers(bulkImport: FBBulkImport) : Duplex {
    const separator = "\t";
    const read_stream_string = new Duplex();
    for (let i = 0; i < bulkImport.nodesLength(); i++) {
        const node = bulkImport.nodes(i);
        const classifier = node.classifier();
        read_stream_string.push(node.id());
        read_stream_string.push(separator);
        read_stream_string.push(classifier.language());
        read_stream_string.push(separator);
        read_stream_string.push(classifier.version());
        read_stream_string.push(separator);
        read_stream_string.push(classifier.key());
        read_stream_string.push(separator);
        read_stream_string.push("{}");
        read_stream_string.push(separator);
        read_stream_string.push(node.parent());
        read_stream_string.push("\n");
    }
    read_stream_string.push(null);
    return read_stream_string;
}

function prepareInputStreamPropertiesFlatBuffers(bulkImport: FBBulkImport) : Duplex {
    const separator = "\t";
    const read_stream_string = new Duplex();
    for (let i = 0; i < bulkImport.nodesLength(); i++) {
        const node = bulkImport.nodes(i);
        for (let j = 0; j < node.propertiesLength(); j++) {
            const prop = node.properties(j);
            const metaPointer = prop.metaPointer();
            try {
                read_stream_string.push(metaPointer.language());
                read_stream_string.push(separator);
                read_stream_string.push(metaPointer.version());
                read_stream_string.push(separator);
                read_stream_string.push(metaPointer.key());
                read_stream_string.push(separator);
                const value = prop.value();
                if (value == null) {
                    read_stream_string.push("\\N");
                } else {
                    read_stream_string.push(value
                        .replaceAll('\n', '\\n')
                        .replaceAll('\r', '\\r')
                        .replaceAll('\t', '\\t'));
                    //read_stream_string.push(JSON.stringify(prop.value));
                }
                read_stream_string.push(separator);
                read_stream_string.push(node.id());
                read_stream_string.push("\n");
            } catch (e) {
                throw Error(`ERROR WHEN POPULATING PROPERTIES STREAM ${e}`)
            }
        }
    }
    try {
        read_stream_string.push(null);
    }catch (e) {
        throw Error(`ERROR WHEN Setting the null ${e}`)
    }
    return read_stream_string;
}

function prepareInputStreamReferencesFlatBuffers(bulkImport: FBBulkImport) : Duplex {
    const separator = "\t";
    const read_stream_string = new Duplex();
    for (let i = 0; i < bulkImport.nodesLength(); i++) {
        const node = bulkImport.nodes(i);
        for (let j = 0; j < node.referencesLength(); j++) {
            const ref = node.references(j);
            const metaPointer = ref.metaPointer();
            try {
                read_stream_string.push(metaPointer.language());
                read_stream_string.push(separator);
                read_stream_string.push(metaPointer.version());
                read_stream_string.push(separator);
                read_stream_string.push(metaPointer.key());
                read_stream_string.push(separator);

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
                read_stream_string.push(separator);
                read_stream_string.push(node.id());
                read_stream_string.push("\n");
            } catch (e) {
                throw Error(`ERROR WHEN POPULATING REFERENCES STREAM ${e}`)
            }
        }
    }
    try {
        read_stream_string.push(null);
    }catch (e) {
        throw Error(`ERROR WHEN Setting the null ${e}`)
    }
    return read_stream_string;
}

function prepareInputStreamContainmentsFlatBuffers(bulkImport: FBBulkImport) : Duplex {
    const separator = "\t";
    const read_stream_string = new Duplex();
    for (let i = 0; i < bulkImport.nodesLength(); i++) {
        const node = bulkImport.nodes(i);
        for (let j = 0; j < node.containmentsLength(); j++) {
            const containment = node.containments(j);
            const metaPointer = containment.metaPointer();
            try {
                read_stream_string.push(metaPointer.language());
                read_stream_string.push(separator);
                read_stream_string.push(metaPointer.version());
                read_stream_string.push(separator);
                read_stream_string.push(metaPointer.key());
                read_stream_string.push(separator);
                const children : string[] = new Array<string>(containment.childrenLength());
                for (let k = 0; k < containment.childrenLength(); k++) {
                    children[k] = containment.children(k);
                }
                read_stream_string.push("{" + children.join(",") + "}");
                read_stream_string.push(separator);
                read_stream_string.push(node.id());
                read_stream_string.push("\n");
            } catch (e) {
                throw Error(`ERROR WHEN POPULATING PROPERTIES STREAM ${e}`)
            }
        }
    }
    try {
        read_stream_string.push(null);
    }catch (e) {
        throw Error(`ERROR WHEN Setting the null ${e}`)
    }
    return read_stream_string;
}

export async function storeNodes(client: PoolClient, nodes: LionWebJsonNode[]) : Promise<void> {
    await new Promise<void>((resolve, reject) => {
        try {
            const queryStream = client.query(copyFrom('COPY "repository:default".lionweb_nodes FROM STDIN'))
            const inputStream = prepareInputStreamNodes(nodes);

            inputStream.on('error', (err: Error) => {
                console.error(`FAILURE 3 ${err}`)
                reject(`Input stream error storeNodes : ${err}`)
            });

            queryStream.on('error', (err: Error) => {
                console.error(`FAILURE 2 ${err}`)
                reject(`Query stream error storeNodes: ${err}`)

            });

            queryStream.on('end', () => {
                // TODO, figure out which one to keep
                resolve();
            });

            inputStream.on('end', () => {
                // TODO, figure out which one to keep
                resolve();
            });

            inputStream.pipe(queryStream);
        } catch (e) {
            console.error(`FAILURE 1 ${e}`)
            reject(`Error storeNodes error storeNodes: ${e}`)
        }
    });
    await new Promise<void>((resolve, reject) => {
        const queryStream = client.query(copyFrom('COPY "repository:default".lionweb_containments(containment_language,containment_version,containment_key,children,node_id) FROM STDIN'))
        const inputStream = prepareInputStreamContainments(nodes);

        inputStream.on('error', (err: Error) => {
            reject(`Input stream error storeNodes : ${err}`)
        });

        queryStream.on('error', (err: Error) => {
            reject(`Query stream error containments: ${err}`)

        });

        queryStream.on('end', () => {
            // TODO, figure out which one to keep
            resolve();
        });

        inputStream.on('end', () => {
            // TODO, figure out which one to keep
            resolve();
        });

        inputStream.pipe(queryStream);
    });
    await new Promise<void>((resolve, reject) => {
        const queryStream = client.query(copyFrom('COPY "repository:default".lionweb_references(reference_language,reference_version,reference_key,targets,node_id) FROM STDIN'))
        const inputStream = prepareInputStreamReferences(nodes);

        inputStream.on('error', (err: Error) => {
            reject(`Input stream error references : ${err}`)
        });

        queryStream.on('error', (err: Error) => {
            reject(`Query stream error references: ${err}`)

        });

        queryStream.on('end', () => {
            // TODO, figure out which one to keep
            resolve();
        });

        inputStream.on('end', () => {
            // TODO, figure out which one to keep
            resolve();
        });

        inputStream.pipe(queryStream);
    });
    await new Promise<void>((resolve, reject) => {
        const queryStream = client.query(copyFrom('COPY "repository:default".lionweb_properties(property_language,property_version,property_key,value,node_id) FROM STDIN'))
        const inputStream = prepareInputStreamProperties(nodes);

        inputStream.on('error', (err: Error) => {
            reject(`Input stream error  utStreamProperties: ${err}`)
        });

        queryStream.on('error', (err: Error) => {
            reject(`Query stream error prepareInputStreamProperties: ${err}`)

        });

        queryStream.on('end', () => {
            // TODO, figure out which one to keep
            console.log("END OF STORE NODES")
            resolve();
        });

        inputStream.on('end', () => {
            // TODO, figure out which one to keep
            console.log("END2 OF STORE NODES")
            resolve();
        });

        inputStream.pipe(queryStream);
    });

}

async function storeNodesThroughFlatBuffers(client: PoolClient, bulkImport: FBBulkImport) : Promise<void> {
    await new Promise<void>((resolve, reject) => {
        try {
            const queryStream = client.query(copyFrom('COPY "repository:default".lionweb_nodes FROM STDIN'))
            const inputStream = prepareInputStreamNodesFlatBuffers(bulkImport);

            inputStream.on('error', (err: Error) => {
                console.error(`FAILURE 3 ${err}`)
                reject(`Input stream error storeNodes : ${err}`)
            });

            queryStream.on('error', (err: Error) => {
                console.error(`FAILURE 2 ${err}`)
                reject(`Query stream error storeNodes: ${err}`)

            });

            queryStream.on('end', () => {
                // TODO, figure out which one to keep
                resolve();
            });

            inputStream.on('end', () => {
                // TODO, figure out which one to keep
                resolve();
            });

            inputStream.pipe(queryStream);
        } catch (e) {
            console.error(`FAILURE 1 ${e}`)
            reject(`Error storeNodes error storeNodes: ${e}`)
        }
    });
    await new Promise<void>((resolve, reject) => {
        const queryStream = client.query(copyFrom('COPY "repository:default".lionweb_containments(containment_language,containment_version,containment_key,children,node_id) FROM STDIN'))
        const inputStream = prepareInputStreamContainmentsFlatBuffers(bulkImport);

        inputStream.on('error', (err: Error) => {
            reject(`Input stream error storeNodes : ${err}`)
        });

        queryStream.on('error', (err: Error) => {
            reject(`Query stream error containments: ${err}`)

        });

        queryStream.on('end', () => {
            // TODO, figure out which one to keep
            resolve();
        });

        inputStream.on('end', () => {
            // TODO, figure out which one to keep
            resolve();
        });

        inputStream.pipe(queryStream);
    });
    await new Promise<void>((resolve, reject) => {
        const queryStream = client.query(copyFrom('COPY "repository:default".lionweb_references(reference_language,reference_version,reference_key,targets,node_id) FROM STDIN'))
        const inputStream = prepareInputStreamReferencesFlatBuffers(bulkImport);

        inputStream.on('error', (err: Error) => {
            reject(`Input stream error references : ${err}`)
        });

        queryStream.on('error', (err: Error) => {
            reject(`Query stream error references: ${err}`)

        });

        queryStream.on('end', () => {
            // TODO, figure out which one to keep
            resolve();
        });

        inputStream.on('end', () => {
            // TODO, figure out which one to keep
            resolve();
        });

        inputStream.pipe(queryStream);
    });
    await new Promise<void>((resolve, reject) => {
        const queryStream = client.query(copyFrom('COPY "repository:default".lionweb_properties(property_language,property_version,property_key,value,node_id) FROM STDIN'))
        const inputStream = prepareInputStreamPropertiesFlatBuffers(bulkImport);

        inputStream.on('error', (err: Error) => {
            reject(`Input stream error  utStreamProperties: ${err}`)
        });

        queryStream.on('error', (err: Error) => {
            reject(`Query stream error prepareInputStreamProperties: ${err}`)

        });

        queryStream.on('end', () => {
            // TODO, figure out which one to keep
            console.log("END OF STORE NODES")
            resolve();
        });

        inputStream.on('end', () => {
            // TODO, figure out which one to keep
            console.log("END2 OF STORE NODES")
            resolve();
        });

        inputStream.pipe(queryStream);
    });

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
    console.log("NODES LENGTH", bulkImport.nodesLength());

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
    await storeNodesThroughFlatBuffers(client, bulkImport)

    // Attach the root of the new nodes to existing containers
    for (let i = 0; i < bulkImport.attachPointsLength(); i++) {
        const fbAttachPoint = bulkImport.attachPoints(i);
        await dbConnection.query(repositoryData, makeQueryToAttachNodeForFlatBuffers(fbAttachPoint))
    }

    return { status: HttpSuccessCodes.Ok, success: true}
}


