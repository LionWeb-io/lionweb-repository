import { LionWebJsonChunk, LionWebJsonNode } from "@lionweb/validation";
import {assert} from "chai"
import { before } from "mocha";
import { LionWebJsonDiff } from "./diff/LionWebJsonDiff.js";
import { TestClient } from "./TestClient.js";
const {deepEqual} = assert

describe("Library test model", () => {

    const t = new TestClient();
    let jsonModel: LionWebJsonChunk;

    before(function (done) {
        jsonModel = t.readModel("./src/test/data/Disk_1.json") as LionWebJsonChunk;
        t.testStore();
        done();
    });

    it("store and retrieve nodes", async () => {
        const retrieve = await t.testRetrieve() as LionWebJsonChunk;
        const diff = new LionWebJsonDiff();
        diff.diffLwChunk(jsonModel, retrieve);
        deepEqual(diff.errors, [])
    })

    it("retrieve partitions", async () => {
        const model = structuredClone(jsonModel);
        model.nodes = model.nodes.filter(node => node.parent === null);
        const partitions = await t.testPartitions();
        const diff = new LionWebJsonDiff();
        diff.diffLwChunk(model, partitions);
        deepEqual(diff.errors, [])
    })
    
})

