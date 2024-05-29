import { LionWebJsonChunk, LionWebJsonChunkWrapper } from "@lionweb/validation";
import fs from "fs";

export function readModel(filename: string): LionWebJsonChunk | null {
    if (fs.existsSync(filename)) {
        const stats = fs.statSync(filename)
        if (stats.isFile()) {
            const chunk: LionWebJsonChunk = JSON.parse(fs.readFileSync(filename).toString())
            return chunk
        }
    }
    return null
}

export function printChunk(chunk: LionWebJsonChunk): void {
    const wrapper = new LionWebJsonChunkWrapper(chunk)
    console.log(wrapper.asString())
}
