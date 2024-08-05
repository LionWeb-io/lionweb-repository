import { RepositoryClient } from "./RepositoryClient.js";

export type NodesByClassifierType = {language: string, classifier: string, ids: [string], size: number};
export type NodesByLanguageType = {language: string, ids: [string], size: number};

export class InspectionApi {
    client: RepositoryClient
    
    constructor(client: RepositoryClient) {
        this.client = client
    }
    
    async nodesByLanguage(): Promise<NodesByLanguageType[]> {
        this.client.log(`InspectionApi.nodesByLanguage`)
        return await this.client.getWithTimeout(`inspection/nodesByLanguage`, { body: {}, params: `` })
    }

    async nodesByClassifier(): Promise<NodesByClassifierType[]> {
        this.client.log(`InspectionApi.nodesByClassifier`)
        return await this.client.getWithTimeout(`inspection/nodesByClassifier`, { body: {}, params: `` })
    }
}

