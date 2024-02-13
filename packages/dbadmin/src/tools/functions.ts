import { Request, Response } from "express"

export function runWithTry( func: (req: Request, res: Response) => void): (req: Request, res: Response) => void {
    return async function(req: Request, res: Response): Promise<void> {
        try {
            await func(req, res)
        } catch(e) {
            console.log("Exception " + e.message)
        }
    }
}
