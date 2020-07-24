import { RequestHandler, Request, Response, NextFunction } from 'express'

export const helloWorld: RequestHandler<{ name: string }, any, any, any> = (req: Request<any>, res: Response<any>, next: NextFunction) => {
    const { name } = req.params

    if (name === 'Carsten') {
        res.status(200).send(`Hello ${name}`)
    } else if (name) {
        res.status(404).send()
    } else {
        next(new Error('validation failed'))
    }
}
