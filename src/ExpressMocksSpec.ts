import { Request, Response, NextFunction } from 'express'
import * as HttpStatus from 'http-status-codes'
import { expect } from 'chai'
import { default as ExpressMocks, Mocks, TestResult } from './ExpressMocks'
import * as VError from 'verror'
import * as sinon from 'sinon'
import data_driven = require('data-driven')

const serviceMethod = (value: string) => new Promise((resolve) => setTimeout(() => resolve({ test: value === 'ok' }), 1))

const asyncServiceRouter = (req: Request, res: Response, next: NextFunction): void => {
    serviceMethod(req.query.value).then(res.json).catch(next)
}

class SomeError extends VError {
}
class OtherError extends VError {
}

describe('ExpressMocks', () => {
    let mocks: Mocks

    beforeEach(() => {
        mocks = ExpressMocks.create()
    })

    it('should call router methods with mocks', () => {
        let called = false

        return mocks.test((req, res, next) => {
            called = true
            expect(req).to.equal(mocks.req)
            expect(res).to.equal(mocks.res)
            expect(next).to.equal(mocks.next)

            next()
        }).then(() => {
            expect(called).to.be.true
        })
    })

    it('should call test router methods with mocks and error', () => {
        const error = new Error('fail')

        let called = false

        return mocks.testError((err, req, res, next) => {
            called = true
            expect(err).to.equal(error)
            expect(req).to.equal(mocks.req)
            expect(res).to.equal(mocks.res)
            expect(next).to.equal(mocks.next)

            next()
        }, error).then(() => {
            expect(called).to.be.true
        })
    })

    it('should allow checking for json response', () => {
        return mocks.test(asyncServiceRouter).expectJson({ test: false })
    })

    it('should allow passing modified requests', () => {
        mocks.req.query.value = 'ok'
        return mocks.test(asyncServiceRouter).expectJson({ test: true })
    })

    it('should resolve after sendFile', () => {
        return mocks.test((_, res) => {
            res.sendFile('/path/to/file', { root: '..' })
        }).expectSendFile('/path/to/file')
    })

    it('should resolve after render', () => {
        return mocks.test((_, res) => {
            res.render('myview')
        }).expectRender('myview')
    })

    it('should resolve after jsonp', () => {
        return mocks.test((_, res) => {
            res.jsonp({ test: true })
        }).expectJsonp({ test: true })
    })

    it('should pass checking redirect', () => {
        return mocks.test((_, res) => {
            res.redirect('/other/url')
        }).expectRedirect('/other/url')
    })

    it('should fail checking redirect', () => {
        return mocks.test((_, res) => {
            res.redirect('/wrong/url')
        }).expectRedirect('/other/url').should.be.rejected
    })

    it('should allow testing of sync handlers with same api (making them async)', () => {
        return mocks.test((_, res) => {
            res.sendStatus(HttpStatus.NOT_FOUND)
        }).expectSendStatus(HttpStatus.NOT_FOUND)
    })

    it('should allow checking for status changes', () => {
        return mocks.test((_, res) => {
            res.sendStatus(HttpStatus.NOT_FOUND)
        }).expectSendStatus(HttpStatus.NOT_FOUND)
    })

    it('should allow for request handler which returns a promise to allow post-response action checks', () => {
        let flag = false
        return mocks.test((_, res) => {
            return new Promise(resolve => {
                res.sendStatus(HttpStatus.NOT_FOUND)
                setTimeout(()  => {
                    flag = true
                    resolve()
                } , 10)
            })
        }).then(() => {
            expect(flag).to.be.true
        })
    })

    it('should act like a promise to allow arbritrary tests', () => {
        return mocks.test(asyncServiceRouter)
            .then(() => {
                sinon.assert.called(mocks.res.json)
            })
    })

    it('should resolve mocks in promise', () => {
        return mocks.test(asyncServiceRouter)
            .then(mocksArg => {
                expect(mocksArg).to.equal(mocks)
            })
    })

    it('should even resolve mocks in promise after expect', () => {
        return mocks.test(asyncServiceRouter)
            .expectJson({ test: false })
            .then(mocksArg => {
                expect(mocksArg).to.equal(mocks)
            })
    })

    it('should return testResults again to allow expectation chaining', () => {
        return mocks.test((_, res) => {
                res.status(HttpStatus.NOT_FOUND).send('Not found')
            })
            .expectStatus(HttpStatus.NOT_FOUND)
            .expectSend('Not found')
            .then(() => {
                sinon.assert.notCalled(mocks.res.json)
            })
    })

    it('should allow testing send for empty args', () => {
        return mocks.test((_, res) => {
                res.status(HttpStatus.NOT_FOUND).send()
            })
            .expectStatus(HttpStatus.NOT_FOUND)
            .expectSend()
    })

    it('should allow testing type', () => {
        return mocks.test((_, res) => {
                res.type('text/html').send()
            })
            .expectType('text/html')
            .expectSend()
    })

    describe('next', () => {
        it('should allow checking for nextCall', () => {
            return mocks.test((_1, _2, next) => {
                    next()
                })
                .expectNext()
        })

        it('should accept "next" with explicit undefined', () => {
            return mocks.test((_1, _2, next) => {
                    next(undefined)
                })
                .expectNext(undefined)
        })

        it('should allow checking for next with error type', () => {
            return mocks.test((_1, _2, next) => {
                    next(new SomeError('Bla'))
                })
                .expectNext(SomeError)
                .expectNext(SomeError, 'Bla')
        })

        it('should allow checking for next with error instance', () => {
            const error = new SomeError('Bla')

            return mocks.test((_1, _2, next) => {
                    next(error)
                })
                .expectNext(error)
        })

        it('should allow checking for next argument via anonymous function', () => {
            return mocks.test((_1, _2, next) => {
                next(new SomeError('fail'))
            })
                .expectNext(SomeError, (err: SomeError) => {
                    expect(err.message).to.equal('fail')
                })
        })

        it('should fail on wrong type for next with error', () => {
            return mocks.test((_1, _2, next) => {
                    next(new SomeError('Bla'))
                })
                .expectNext(OtherError).should.be.rejected
        })

        it('should fail on wrong message for next with error', () => {
            return mocks.test((_1, _2, next) => {
                    next(new SomeError('Bla'))
                })
                .expectNext(SomeError, 'Blubb').should.be.rejected
        })
    })

    data_driven([
        {
            scenario: 'next() twice',
            first: (_1: Request, _2: Response, next: NextFunction) => next(),
            then: (_1: Request, _2: Response, next: NextFunction) => next(),
            test: (result: TestResult) => result.expectNext().should.be.rejectedWith('next() called more than once')
        },
        {
            scenario: 'next() then redirect()',
            first: (_1: Request, _2: Response, next: NextFunction) => next(),
            then: (_1: Request, res: Response) => res.redirect('/bla'),
            test: (result: TestResult) => result.expectNext().should.be.rejectedWith('both redirect() and next() were called')
        },
        {
            scenario: 'render() then sendFile()',
            first: (_1: Request, res: Response) => res.render('myview'),
            then: (_1: Request, res: Response) => res.sendFile('/bla/file.txt'),
            test: (result: TestResult) => result.expectRender('myview').should.be.rejectedWith('both sendFile() and render() were called')
        }
    ], () => {
        it('should fail on promise middleware that calls {scenario}', (ctx: any) => {
            const promise = mocks.test(async (req, res, next) => {
                ctx.first(req, res, next)
                ctx.then(req, res, next)
            })
            return ctx.test(promise)
        })
    })

    it('should harmonize with async/await (but we can only do "custom" checks)', async () => {
        await mocks.test((_, res) => {
            res.status(HttpStatus.NOT_FOUND).send('Not found')
            return Promise.resolve()
        })

        sinon.assert.calledWith(mocks.res.status, HttpStatus.NOT_FOUND)
        sinon.assert.calledWith(mocks.res.send, 'Not found')
        sinon.assert.notCalled(mocks.res.json)
    })
})
