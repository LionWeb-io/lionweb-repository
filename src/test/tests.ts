import { LionWebJsonChunk, LionWebJsonNode } from "@lionweb/validation";
import {assert} from "chai"
import { before } from "mocha";
import { LionWebJsonDiff } from "./diff/LionWebJsonDiff.js";
import { TestClient } from "./TestClient.js";
const {deepEqual} = assert
import sm from "source-map-support"
sm.install();

describe("Library test model", () => {

    const t = new TestClient();
    let jsonModel: LionWebJsonChunk;

    before("a",async function () {
        jsonModel = t.readModel("./src/test/data/Disk_1.json") as LionWebJsonChunk;
        await t.testStore(jsonModel);
    });

    it("retrieve nodes", async () => {
        const retrieve = await t.testRetrieve() as LionWebJsonChunk;
        console.log("REtrieved: " + JSON.stringify(retrieve))
        const diff = new LionWebJsonDiff();
        diff.diffLwChunk(jsonModel, retrieve);
        deepEqual(diff.errors, [])
    })

    it.skip("retrieve partitions", async () => {
        const model = structuredClone(jsonModel);
        model.nodes = model.nodes.filter(node => node.parent === null);
        const partitions = await t.testPartitions();
        const diff = new LionWebJsonDiff();
        diff.diffLwChunk(model, partitions);
        deepEqual(diff.errors, [])
    })
    
    it.skip ("tes update", async () => {
        const jsonModel2 = t.readModel("./src/test/data/Disk_2.json") as LionWebJsonChunk;
        const diff = new LionWebJsonDiff();
        diff.diffLwChunk(jsonModel, jsonModel2);
        // deepEqual(diff.errors.length, 4);
        
        const result = await t.testStore(jsonModel2);
        console.log("R: " + result);
    })
    
})



