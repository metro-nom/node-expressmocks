import { Request, Response, NextFunction } from 'express'
import HttpStatus from 'http-status-codes'
import { expect } from 'chai'
import { ExpressMocks, Mocks, TestResult } from './ExpressMocks'
import VError from 'verror'
import sinon from 'sinon'
import data_driven from 'data-driven'

const serviceMethod = (value: string) => new Promise((resolve) => setTimeout(() => resolve({ test: value === 'ok' }), 1))

const asyncServiceRouter = (req: Request, res: Response, next: NextFunction): void => {
    serviceMethod(req.query.value as string)
        .then(res.json)
        .catch(next)
}

class SomeError extends VError {}
class OtherError extends VError {}

describe('ExpressMocks', () => {
    let mocks: Mocks

    beforeEach(() => {
        mocks = ExpressMocks.create()
    })

    it('should call router methods with mocks', () => {
        let called = false

        return mocks
            .test((req, res, next) => {
                called = true
                expect(req).to.equal(mocks.req)
                expect(res).to.equal(mocks.res)
                expect(next).to.equal(mocks.next)

                next()
            })
            .then(() => {
                expect(called).to.be.true
            })
    })

    it('should call test router methods with mocks and error', () => {
        const error = new Error('fail')

        let called = false

        return mocks
            .testError((err, req, res, next) => {
                called = true
                expect(err).to.equal(error)
                expect(req).to.equal(mocks.req)
                expect(res).to.equal(mocks.res)
                expect(next).to.equal(mocks.next)

                next()
            }, error)
            .then(() => {
                expect(called).to.be.true
            })
    })

    it('should allow modification of request and response', () => {
        return ExpressMocks.create(
            {
                myProp: true,
            },
            {
                done: false,
            },
        )
            .test((req: any, res: any, next) => {
                try {
                    expect(req.myProp).to.be.true
                    expect(res.done).to.be.false
                    next()
                } catch (err) {
                    next(err)
                }
            })
            .expectNext()
    })

    it('should allow checking for json response', () => {
        return mocks.test(asyncServiceRouter).expectJson({ test: false })
    })

    it('should be able to handle replaced response mock functions', () => {
        return mocks
            .test((_, res) => {
                const origJson = res.json
                res.json = (body?: any) => {
                    return origJson.call(res, body)
                }
                res.json({ test: true })
            })
            .expectJson({ test: true })
    })

    it('should allow passing modified requests', () => {
        mocks.req.query.value = 'ok'
        return mocks.test(asyncServiceRouter).expectJson({ test: true })
    })

    it('should resolve after sendFile', () => {
        return mocks
            .test((_, res) => {
                res.sendFile('/path/to/file', { root: '..' })
            })
            .expectSendFile('/path/to/file')
    })

    it('should resolve after download', () => {
        return mocks
            .test((_, res) => {
                res.download('/path/to/file', 'file.name')
            })
            .expectDownload('/path/to/file', 'file.name')
    })

    it('should resolve after render', () => {
        return mocks
            .test((_, res) => {
                res.render('myview')
            })
            .expectRender('myview')
    })

    it('should resolve after jsonp', () => {
        return mocks
            .test((_, res) => {
                res.jsonp({ test: true })
            })
            .expectJsonp({ test: true })
    })

    it('should resolve after end', () => {
        return mocks
            .test((_, res) => {
                res.end()
            })
            .expectEnd()
    })

    it('should pass checking redirect', () => {
        return mocks
            .test((_, res) => {
                res.redirect('/other/url')
            })
            .expectRedirect('/other/url')
    })

    it('should fail checking redirect', () => {
        return mocks
            .test((_, res) => {
                res.redirect('/wrong/url')
            })
            .expectRedirect('/other/url').should.be.rejected
    })

    it('should allow testing of sync handlers with same api (making them async)', () => {
        return mocks
            .test((_, res) => {
                res.sendStatus(HttpStatus.NOT_FOUND)
            })
            .expectSendStatus(HttpStatus.NOT_FOUND)
    })

    it('should allow checking for status changes', () => {
        return mocks
            .test((_, res) => {
                res.sendStatus(HttpStatus.NOT_FOUND)
            })
            .expectSendStatus(HttpStatus.NOT_FOUND)
    })

    it('should allow for request handler which returns a promise to allow post-response action checks', () => {
        let flag = false
        return mocks
            .test((_, res) => {
                return new Promise<void>((resolve) => {
                    res.sendStatus(HttpStatus.NOT_FOUND)
                    setTimeout(() => {
                        flag = true
                        resolve()
                    }, 10)
                })
            })
            .then(() => {
                expect(flag).to.be.true
            })
    })

    it('should act like a promise to allow arbritrary tests', () => {
        return mocks.test(asyncServiceRouter).then(() => {
            sinon.assert.called(mocks.res.json)
        })
    })

    it('should resolve mocks in promise', () => {
        return mocks.test(asyncServiceRouter).then((mocksArg) => {
            expect(mocksArg).to.equal(mocks)
        })
    })

    it('should even resolve mocks in promise after expect', () => {
        return mocks
            .test(asyncServiceRouter)
            .expectJson({ test: false })
            .then((mocksArg) => {
                expect(mocksArg).to.equal(mocks)
            })
    })

    it('should return testResults again to allow expectation chaining', () => {
        return mocks
            .test((_, res) => {
                res.status(HttpStatus.NOT_FOUND).send('Not found')
            })
            .expectStatus(HttpStatus.NOT_FOUND)
            .expectSend('Not found')
            .then(() => {
                sinon.assert.notCalled(mocks.res.json)
            })
    })

    it('should allow testing send for empty args', () => {
        return mocks
            .test((_, res) => {
                res.status(HttpStatus.NOT_FOUND).send()
            })
            .expectStatus(HttpStatus.NOT_FOUND)
            .expectSend()
    })

    it('should allow testing type', () => {
        return mocks
            .test((_, res) => {
                res.type('text/html').send()
            })
            .expectType('text/html')
            .expectSend()
    })

    describe('next', () => {
        it('should allow checking for nextCall', () => {
            return mocks
                .test((_1, _2, next) => {
                    next()
                })
                .expectNext()
        })

        it('should accept "next" with explicit undefined', () => {
            return mocks
                .test((_1, _2, next) => {
                    next(undefined)
                })
                .expectNext(undefined)
        })

        it('should fail when expecting success and tell about error passed to next()', async () => {
            const err = await mocks
                .test((_1, _2, next) => {
                    next(new Error('fail'))
                })
                .expectNext().should.be.rejected

            expect(err.message).to.contain('expected call to next() without arguments, but got "Error: fail"')
        })

        it('should fail when next() has not been called at promise end', async () => {
            const err = await mocks
                .test(async (_1, _2, _3) => {
                    // don't call next()
                })
                .expectNext().should.be.rejected

            expect(err.message).to.contain('next() not called as expected')
        })

        it('should handle replaced stub functions gracefully by ignoring call counts', async () => {
            return mocks
                .test(async (_1, res, next) => {
                    const origJson = res.json
                    res.json = (body?: any) => {
                        return origJson.call(res, body)
                    }
                    next()
                })
                .expectNext()
        })

        it('should allow checking for next with error type', () => {
            return mocks
                .test((_1, _2, next) => {
                    next(new SomeError('Bla'))
                })
                .expectNext(SomeError)
                .expectNext(SomeError, 'Bla')
        })

        it('should allow checking for next with string parameter', () => {
            return mocks
                .test((_1, _2, next) => {
                    next('route')
                })
                .expectNext('route')
        })

        it('should allow checking for next with Error via string parameter', () => {
            return mocks
                .test((_1, _2, next) => {
                    next(new Error('failed'))
                })
                .expectNext('failed')
        })

        it('should allow checking for next with error instance', () => {
            const error = new SomeError('Bla')

            return mocks
                .test((_1, _2, next) => {
                    next(error)
                })
                .expectNext(error)
        })

        it('should allow checking for wrong message regexp for next ', () => {
            return mocks
                .test((_1, _2, next) => {
                    next(new SomeError('Bla'))
                })
                .expectNext(SomeError, /Bl/)
        })

        it('should allow checking for next argument via anonymous function', () => {
            return mocks
                .test((_1, _2, next) => {
                    next(new SomeError('fail'))
                })
                .expectNext(SomeError, (err: SomeError) => {
                    expect(err.message).to.equal('fail')
                })
        })

        it('should fail on wrong type for next with error', () => {
            return mocks
                .test((_1, _2, next) => {
                    next(new SomeError('Bla'))
                })
                .expectNext(OtherError)
                .should.be.rejectedWith('expected next to have been called with instance of OtherError')
        })

        it('should fail on missing parameter', () => {
            return mocks
                .test((_1, _2, next) => {
                    next()
                })
                .expectNext(Error)
                .should.be.rejectedWith('expected next to have been called with any argument, but was called without')
        })

        it('should fail on wrong message regexp for next with error', () => {
            return mocks
                .test((_1, _2, next) => {
                    next(new SomeError('Bla'))
                })
                .expectNext(SomeError, /Blubb/)
                .should.be.rejectedWith('expected error message to match /Blubb/, but got "Bla"')
        })

        it('should fail on wrong message for next with error', () => {
            return mocks
                .test((_1, _2, next) => {
                    next(new SomeError('Bla'))
                })
                .expectNext(SomeError, 'Blubb')
                .should.be.rejectedWith('expected error message to include "Blubb", but got "Bla"')
        })
    })

    data_driven(
        [
            {
                scenario: 'next() twice',
                first: (_1: Request, _2: Response, next: NextFunction) => next(),
                then: (_1: Request, _2: Response, next: NextFunction) => next(),
                test: (result: TestResult) => result.expectNext().should.be.rejectedWith('next() called more than once'),
            },
            {
                scenario: 'next() then redirect()',
                first: (_1: Request, _2: Response, next: NextFunction) => next(),
                then: (_1: Request, res: Response) => res.redirect('/bla'),
                test: (result: TestResult) => result.expectNext().should.be.rejectedWith('next() call was expected, but (also?) redirect() was called'),
            },
            {
                scenario: 'render() then sendFile()',
                first: (_1: Request, res: Response) => res.render('myview'),
                then: (_1: Request, res: Response) => res.sendFile('/bla/file.txt'),
                test: (result: TestResult) =>
                    result.expectRender('myview').should.be.rejectedWith('render() call was expected, but (also?) sendFile() was called'),
            },
        ],
        () => {
            it('should fail on promise middleware that calls {scenario}', (ctx: any) => {
                const promise = mocks.test(async (req, res, next) => {
                    ctx.first(req, res, next)
                    ctx.then(req, res, next)
                })
                return ctx.test(promise)
            })
        },
    )

    it('should harmonize with async/await', async () => {
        await mocks
            .test((_, res) => {
                res.status(HttpStatus.NOT_FOUND).send('Not found')
                return Promise.resolve()
            })
            .expectSend('Not found')

        sinon.assert.calledWith(mocks.res.status, HttpStatus.NOT_FOUND)
    })

    it('should finish asynchronously, even without RequestHandler that returns a promise', () => {
        return mocks
            .test((_, res) => {
                setTimeout(() => {
                    res.send('done')
                }, 10)
            })
            .expectSend('done')
    })

    describe('header checks', () => {
        it('should allow checking for a header value via set', () => {
            return mocks
                .test((_, res, next) => {
                    res.set('X-My-Header', 'myValue')
                    next()
                })
                .expectHeader('X-My-Header', 'myValue')
                .expectNext()
        })
        it('should allow checking for a header value via setHeader', () => {
            return mocks
                .test((_, res, next) => {
                    res.setHeader('X-My-Header', 'myValue')
                    next()
                })
                .expectHeader('X-My-Header', 'myValue')
                .expectNext()
        })
        it('should fail if header has not been set', () => {
            return mocks
                .test((_, res, next) => {
                    next()
                })
                .expectHeader('X-My-Header', 'myValue')
                .should.be.rejectedWith("Expected header 'X-My-Header' to have been set to 'myValue'")
        })
    })
})
