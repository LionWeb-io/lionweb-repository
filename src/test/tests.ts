import { LionWebJsonChunk, LionWebJsonNode } from "@lionweb/validation";
import {assert} from "chai"
import { LionWebJsonDiff } from "./diff/LionWebJsonDiff.js";
import { TestClient } from "./TestClient.js";
const {deepEqual} = assert

describe("Library test model", () => {

    it("[de-]serialize example library", async () => {
        const t = new TestClient();
        const jsonModel = t.readModel("./src/test/data/Disk_1.json") as LionWebJsonChunk;
        await t.testStore();
        const retrieve = await t.testRetrieve() as LionWebJsonChunk;
        // console.log("  ");
        // console.log("JsonModel: " + JSON.stringify(jsonModel));
        // console.log("  ");
        // console.log("Retrieved: " + JSON.stringify(retrieve));

        const diff = new LionWebJsonDiff();
        diff.diffLwChunk(jsonModel, retrieve);
        // No errors expected, just print
        // console.log("Errors " + JSON.stringify(diff.errors, null, 2))
        deepEqual(diff.errors, [])
        
        // Quick test whether thye root node is returned by "partitions" call
        jsonModel.nodes = jsonModel.nodes.filter(node => node.parent === null);
        const partitions = await t.testPartitions();
        diff.diffLwChunk(jsonModel, partitions);
        // No errors expected, just print
        console.log("Errors " + JSON.stringify(diff.errors, null, 2))
        deepEqual(diff.errors, [])
    })
    
})

