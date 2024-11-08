import { requestLogger } from "./logging.js";

export class Queue<ITEM extends Job<any, any>> {
    name: string
    baseQueue: BaseQueue<ITEM> = new BaseQueue<ITEM>()
    private _worker: Worker
    
    constructor(name: string) {
        this.name = name
    }
    
    add(job: ITEM): void {
        if (this.baseQueue.isEmpty() && !this.running) {
            this.baseQueue.enqueue(job)
            requestLogger.info("queue.add start run")
            this.run()
        } else {
            requestLogger.info("queue.add already running")
            this.baseQueue.enqueue(job)
        }
    }
    
    set worker(w: Worker) {
        this._worker = w
        if (!this.running) {
            this.running = true
            this.run()
        }
    }

    async run() {
        requestLogger.info("Worker.run start")
        this.running = true
        try {
            while (!this.baseQueue.isEmpty()) {
                const job = this.baseQueue.dequeue()
                if (job !== undefined) {
                    requestLogger.info("Worker.run run job")
                    // run it
                    await job.data.requestFunction()
                }
            }
            this.running = false
        } finally {
            this.running = false
        }
    }
    running: boolean = false

}

export type Processor<T = any, R = any, N extends string = string> = (job: Job<T, R>, token?: string) => Promise<R>;

export class Job<DataType, ReturnType> {
    name: string
    data: DataType
    returns: ReturnType
    
    constructor(name: string,   data: DataType, returns: ReturnType) {
        this.data = data
        this.returns = returns
        this.name = name
    }
}

export class Worker {
    name: string
    queue: Queue<Job<any, any>>
    processor: Processor
    
    constructor(name: string, queue: Queue<Job<any, any>>, processor: Processor) {
        this.name = name
        this.queue = queue
        this.processor = processor
        this.queue.worker = this
    }
    
    async run() {
        requestLogger.info("Worker.run start")
        while (true) {
            const job = this.queue.baseQueue.dequeue()
            if (job !== undefined) {
                requestLogger.info("Worker.run run job")
                // run it
                await job.data.requestFunction()
            } else {
                // wat a moment 
                // requestLogger.info("Worker.run wait for  job")
                await new Promise(r => setTimeout(r, 50));
            }
        }
    }
}

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
