import { RequestHandler } from 'express'

export const helloWorld: RequestHandler<any, any, any, { name: string }> = (req, res, next) => {
    const { name } = req.params

    if (name === 'Carsten') {
        res.status(200).send(`Hello ${name}`)
    } else if (name) {
        res.status(404).send()
    } else {
        next(new Error('validation failed'))
    }
}
