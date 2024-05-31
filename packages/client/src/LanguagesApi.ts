import { RepositoryClient } from "./RepositoryClient.js";

export class LanguagesApi {
    client: RepositoryClient
    
    constructor(client: RepositoryClient) {
        this.client = client
    }

}

