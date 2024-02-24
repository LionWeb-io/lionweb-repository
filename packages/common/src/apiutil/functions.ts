import { Request, Response } from "express"

export function runWithTry( func: (req: Request, res: Response) => void): (req: Request, res: Response) => void {
    return async function(req: Request, res: Response): Promise<void> {
        try {
            await func(req, res)
        } catch(e) {
            console.log(`Exception while serving request for ${req.url}: ${e.message}`)
            res.status(500)
            res.send(`Exception while serving request for ${req.url}: ${e.message}`)
        }
    }
}
