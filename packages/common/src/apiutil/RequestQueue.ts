import { requestLogger } from "./logging.js";

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
    add(job: Job): void {
        if (this.baseQueue.isEmpty() && !this.running) {
            this.baseQueue.enqueue(job)
            this.run()
        } else {
            this.baseQueue.enqueue(job)
        }
    }

    /**
     * Start executing requests that are on the queue.
     */
    async run() {
        // requestLogger.info("RequestQueue.run start")
        this.running = true
        try {
            while (!this.baseQueue.isEmpty()) {
                const job = this.baseQueue.dequeue()
                if (job !== undefined) {
                    // requestLogger.info("RequestQueue.run job: " + job.name)
                    // run it
                    await job.requestFunction()
                }
            }
        } finally {
            // TODO At this point the add() function can run and think this is still running.
            this.running = false
        }
    }
    running: boolean = false

}

/**
 * A Job is a request function + name that is put on the request queue.
 */
export class Job {
    name: string
    requestFunction: () => Promise<void>
    
    constructor(name: string,   request: () => Promise<void>) {
        this.requestFunction = request
        this.name = name
    }
}

/**
 * Standard queue class.
 */
class BaseQueue<T> {
    private items: T[] = [];

    enqueue(item: T): void {
        this.items.push(item);
    }

    dequeue(): T | undefined {
        return this.items.shift();
    }

    peek(): T | undefined {
        return this.items[0];
    }

    isEmpty(): boolean {
        return this.items.length === 0;
    }

    size(): number {
        return this.items.length;
    }
}

/**
 * The actual request queue used by the server.
 */
export const requestQueue = new RequestQueue("requestQueue")
