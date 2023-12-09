import { LionWebJsonNode } from "@lionweb/validation";
import {assert} from "chai"
import { LwDiff } from "./LwDiff.js";
import { TestClient } from "./TestClient.js";
const {deepEqual} = assert

describe("Library test model", () => {

    it("[de-]serialize example library", async () => {
        const t = new TestClient();
        const jsonModel = t.readModel("./src/test/data/Disk_1.json");
        await t.testStore();
        const retrieve = await t.testRetrieve() as LionWebJsonNode[];
        console.log("Retrieved: " + JSON.stringify(retrieve));

        const diff = new LwDiff();
        diff.diffLwChunk(jsonModel, { 
            "serializationFormatVersion": "2023.1",
            "languages": [],
            "nodes": retrieve
        });
        // No errors expected
        deepEqual(diff.errors, [])
    })
    
})

