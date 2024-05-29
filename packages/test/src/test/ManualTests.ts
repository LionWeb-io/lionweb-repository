import { RepositoryClient } from "@lionweb/repository-client";
import { LionWebJsonChunk } from "@lionweb/validation"
import { readModel } from "./utils.js"

const test = new RepositoryClient("Manual")

console.log("Testing: " + process.argv[2])
switch (process.argv[2]) {
    case "store":
        test.bulk.store(readModel("./src/test/data/Disk_1.json") as LionWebJsonChunk)
        break
    case "partitions": {
        const partitions = test.bulk.listPartitions()
        console.log("Partitions: " + JSON.stringify(partitions, null, 2))
        break
    }
    case "retrieve": {
        const chunk = test.bulk.retrieve(["ID-2"])
        console.log("Retrieved: " + JSON.stringify(chunk, null, 2))
        break
    }
    case "nodetree":
        test.additional.getNodeTree(["ID-2"])
        break
    default:
        console.log("Unknown test")
        break
}
