export class InitializedMapToArray<KEY, VALUE> {
    /**
     * Use the stringified version of the KEY, so two objects with the same contents are identical.
     */
    private map: Map<string, VALUE[]> = new Map<string, VALUE[]>()

    constructor() {}

    get(key: KEY): VALUE[] {
        const keyString = JSON.stringify(key)
        let existingValue = this.map.get(keyString)
        if (existingValue === undefined) {
            existingValue = []
            this.map.set(keyString, existingValue)
        }
        return existingValue
    }

    add(key: KEY, value: VALUE) {
        this.get(key).push(value)
    }

    values(): VALUE[][] {
        return Array.from(this.map.values()) as VALUE[][]
    }

    entries(): [KEY, VALUE[]][] {
        return Array.from(this.map.entries()) as [KEY, VALUE[]][]
    }
}
