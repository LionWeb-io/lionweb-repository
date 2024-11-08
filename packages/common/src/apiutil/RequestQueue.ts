import { requestLogger } from "./logging.js";
import { Job, Queue, Worker } from "./Queue.js";

export type JobData = {requestFunction: () => void, requestId: string}

export const requestQueue = new Queue("request")

// const worker = new Worker("worker", requestQueue, async (job: Job<JobData, any>) => {
//     requestLogger.info("Worker running " + job.data.requestId)
//     await job.data.requestFunction();
// })
