import { RepositoryClient } from "./RepositoryClient.js";

export class InspectionApi {
    client: RepositoryClient
    
    constructor(client: RepositoryClient) {
        this.client = client
    }
    
    async nodesByLanguage() {
        console.log(`InspectionApi.nodesByLanguage`)
        const result = await this.client.getWithTimeout(`inspection/nodesByLanguage`, { body: {}, params: `` })
        return result
    }

    async nodesByClassifier() {
        console.log(`InspectionApi.nodesByClassifier`)
        const result = await this.client.getWithTimeout(`inspection/nodesByClassifier`, { body: {}, params: `` })
        return result
    }
}

