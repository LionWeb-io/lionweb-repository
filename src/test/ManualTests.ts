import { LionWebJsonChunk } from "@lionweb/validation"
import { TestClient } from "./TestClient.js"

const test = new TestClient()

console.log("Testing: " + process.argv[2])
switch (process.argv[2]) {
    case "store":
        test.testStore(test.readModel("./src/test/data/Disk_1.json") as LionWebJsonChunk)
        break
    case "partitions":
        const partitions = test.testPartitions()
        console.log("Partitions: " + JSON.stringify(partitions, null, 2))
        break
    case "node":
        test.testGetNode()
        break
    case "retrieve":
        const chunk = test.testRetrieve()
        console.log("Retrieved: " + JSON.stringify(chunk, null, 2))
        break
    case "nodetree":
        test.testGetNodeTree()
        break
    default:
        console.log("Unknown test")
        break
}
