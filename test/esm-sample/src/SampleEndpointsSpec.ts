import { ExpressMocks } from 'expressmocks'
import { helloWorld } from './SampleEndpoints.js'

describe('SampleEndpoints', () => {
    describe('helloWorld', () => {
        it('should say hello to Carsten', () => {
            return ExpressMocks.create({ params: { name: 'Carsten' } })
                .test(helloWorld)
                .expectStatus(200)
                .expectSend('Hello Carsten')
        })

        it('should return with 404 for others', () => {
            return ExpressMocks.create({ params: { name: 'Simon' } })
                .test(helloWorld)
                .expectStatus(404)
                .expectSend()
        })

        it('should fail via next() on validation error', () => {
            return ExpressMocks.create().test(helloWorld).expectNext(Error, 'validation failed')
        })
    })
})
