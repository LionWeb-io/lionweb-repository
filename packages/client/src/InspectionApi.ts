import { RepositoryClient } from "./RepositoryClient.js";

export class InspectionApi {
    client: RepositoryClient
    
    constructor(client: RepositoryClient) {
        this.client = client
    }
    
    async nodesByLanguage() {
        this.client.log(`InspectionApi.nodesByLanguage`)
        return await this.client.getWithTimeout(`inspection/nodesByLanguage`, { body: {}, params: `` })
    }

    async nodesByClassifier() {
        this.client.log(`InspectionApi.nodesByClassifier`)
        return await this.client.getWithTimeout(`inspection/nodesByClassifier`, { body: {}, params: `` })
    }
}

