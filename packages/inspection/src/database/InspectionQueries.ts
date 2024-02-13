/**
 * Database functions.
 */
export class InspectionQueries {
    constructor() {
    }

    nodesByClassifier(): string {
        return "select classifier_language, classifier_key, string_agg(id, ',') AS ids " +
            "from lionweb_nodes group by classifier_language, classifier_key;"
    }

    nodesByLanguage(): string {
        return "select classifier_language, string_agg(id, ',') AS ids " +
            "from lionweb_nodes group by classifier_language;"
    }
}
