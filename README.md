# expressmocks

A small utility to write unit tests for [Express](https://expressjs.com) request handlers in a more readable and shorter fashion, based on [Sinon.JS](https://sinonjs.org/) and promises.

While this libary is written with Mocha, Sinon and Chai in mind, it should also work with other testing frameworks.

It's written in TypeScript and provides declaration files, but should also work with Babel or plain ES6+.

## Installation

Prerequisites:
```
npm install -D sinon
```

To install:
```
npm install -D expressmocks
```

## Usage examples

Let's say you have the following `SampleEndpoints` implementation:
```typescript
import { RequestHandler } from 'express'

const helloWorld: RequestHandler = (req, res, next) => {
    const { name } = req.params

    if (name === 'Carsten') {
        res.status(200).send(`Hello ${name}`)
    } else if (name) {
        res.status(404).send()
    } else {
        next(new Error('validation failed'))
    }
}
```

Some simple tests look like this:
```typescript
import ExpressMocks from 'expressmocks'
import { helloWorld } from './SampleEndpoints'

describe('helloWorld', () => {
    it('should say hello to Carsten', () => {
        return ExpressMocks.create({ params: { name: 'Carsten' } }).test(helloWorld)
            .expectStatus(200)
            .expectSend('Hello Carsten')
    })

    it('should return with 404 for others', () => {
        return ExpressMocks.create({ params: { name: 'Simon' } }).test(helloWorld)
            .expectStatus(404)
            .expectSend()
    })

    it('should fail via next() on validation error', () => {
        return ExpressMocks.create().test(helloWorld)
            .expectNext(Error, 'validation failed')
    })
})
```

`ExpressMocks` creates stubs for the `request`, `response` and `next` parameters and provides a simple API to test against the most often used method calls.

The functions of the request and response objects are [SinonJS stubs](https://sinonjs.org/releases/latest/stubs/), which can be checked via regular Sinon API. 
You may also add your own custom stubs if you are using some more esoteric functionality:

```typescript
    it('should allow testing on missing `cork()` method', () => {
        return ExpressMocks.create({}, { cork: sinon.stub() })
            .test((req, res, next) => {
                res.cork()
                // ...
            })
            .expectEnd()
            .then(({ res }) => {
                // using chai & sinon-chai
                expect(res.writeHead).to.have.been.called
                expect(res.cork).to.have.been.called
            })
    })
```

For more examples, please see the [sample project](./test/sample) and the [ExpressMocksSpec](./src/ExpressMocksSpec.ts)

## Build yourself

Checkout the project and run...
 
```bash
npm install
npm run build
```
