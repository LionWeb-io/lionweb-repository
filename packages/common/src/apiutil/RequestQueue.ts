/**
 * The RequestQueue keeps a queue of all requests done to the server and
 * executes them one by one in the order they are put into the queue (FIFO).
 */
export class RequestQueue {
    name: string
    baseQueue: BaseQueue<Job> = new BaseQueue<Job>()

    constructor(name: string) {
        this.name = name
    }

    /**
     * Add _job_ to the queue.
     * @param job
     */
    async add(job: Job): Promise<void> {
        if (job === null || job === undefined) {
            return
        }
        if (this.baseQueue.isEmpty()) {
            this.baseQueue.enqueue(job)
            try {
                while (!this.baseQueue.isEmpty()) {
                    const job = this.baseQueue.peek()
                    await job.requestFunction()
                    // Dequeue only after the job has been done, so new calls to add(...)
                    // Will see that the queue is still being worked upon.
                    if (this.baseQueue.size() === 1) {
                        this.baseQueue.dequeue()
                        break
                    } else {
                        // > 1, so more than one job is waiting
                        this.baseQueue.dequeue()
                    }
                }
            } finally {
                // Nothing to do here
            }
        } else {
            this.baseQueue.enqueue(job)
        }
    }
}

/**
 * A Job is a request function + name that is put on the request queue.
 */
export class Job {
    name: string
    requestFunction: () => Promise<void>

    constructor(name: string, request: () => Promise<void>) {
        this.requestFunction = request
        this.name = name
    }
}

/**
 * Standard queue class.
 */
class BaseQueue<T> {
    private items: T[] = []

    enqueue(item: T): void {
        this.items.push(item)
    }

    dequeue(): T | undefined {
        return this.items.shift()
    }

    peek(): T | undefined {
        return this.items[0]
    }

    isEmpty(): boolean {
        return this.items.length === 0
    }

    size(): number {
        return this.items.length
    }
}

/**
 * The actual request queue used by the server.
 */
export const requestQueue = new RequestQueue("requestQueue")
