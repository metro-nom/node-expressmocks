import * as sinon from 'sinon'
import { ErrorRequestHandler, RequestHandler } from 'express'
import * as assert from 'assert'
import { SinonStub } from 'sinon'
export type ErrorCheck = (err: any) => void

type FinalizingMethod = 'send' | 'json' | 'jsonp' | 'end' | 'sendStatus' | 'sendFile' | 'render' | 'redirect' | 'next'

function isSinonStub(stub: any): stub is SinonStub {
    return stub?.hasOwnProperty?.('callCount')
}

export class Mocks {
    constructor(
        requestOptions = {},
        responseOptions = {},
        public req = ExpressMocks.mockRequest(requestOptions),
        public res = ExpressMocks.mockResponse(responseOptions),
        public next = sinon.stub(),
    ) {}

    public test(router: RequestHandler): TestResult {
        return this.execute(router)
    }

    public testError(router: ErrorRequestHandler, err: any): TestResult {
        return this.execute((req, res, next) => {
            return router(err, req, res, next)
        })
    }

    private execute(callback: (req: any, res: any, next: any) => any) {
        const promise = new Promise((resolve, reject) => {
            let returnedPromise: any = undefined
            let didReturnPromise = false
            let asynchronous = false
            let finishedSynchronously = false

            const resolveOnCallback = () => {
                if (!asynchronous) {
                    finishedSynchronously = true
                } else if (!didReturnPromise) {
                    resolve(this)
                }
            }
            this.res.redirect.callsFake(resolveOnCallback)
            this.res.sendStatus.callsFake(resolveOnCallback)
            this.res.json.callsFake(resolveOnCallback)
            this.res.jsonp.callsFake(resolveOnCallback)
            this.res.send.callsFake(resolveOnCallback)
            this.res.sendFile.callsFake(resolveOnCallback)
            this.res.end.callsFake(resolveOnCallback)
            this.res.render.callsFake(resolveOnCallback)
            this.next.callsFake(resolveOnCallback)

            returnedPromise = callback(this.req, this.res, this.next as any)
            didReturnPromise = !!returnedPromise && returnedPromise.then
            asynchronous = true

            if (didReturnPromise) {
                returnedPromise.then(() => resolve(this), reject)
            } else if (finishedSynchronously) {
                resolve(this)
            }
        })
        return this.createTestResult(promise.then(() => this))
    }

    private createTestResult<T>(promise: Promise<Mocks>): TestResult {
        const checkForResponse = (expectedMethodName: FinalizingMethod, actualMethodName: FinalizingMethod, actualStub: sinon.SinonStub) => {
            if (isSinonStub(actualStub)) {
                if (expectedMethodName === actualMethodName) {
                    assert.ok(actualStub.callCount <= 1, `${expectedMethodName}() called more than once`)
                    assert.strictEqual(actualStub.callCount, 1, `${expectedMethodName}() not called as expected`)
                } else {
                    assert.strictEqual(actualStub.callCount, 0, `${expectedMethodName}() call was expected, but (also?) ${actualMethodName}() was called`)
                }
            }
        }
        const checkForOtherResponses = (expectedCall: FinalizingMethod) => {
            checkForResponse(expectedCall, 'redirect', this.res.redirect)
            checkForResponse(expectedCall, 'send', this.res.send)
            checkForResponse(expectedCall, 'sendStatus', this.res.sendStatus)
            checkForResponse(expectedCall, 'sendFile', this.res.sendFile)
            checkForResponse(expectedCall, 'render', this.res.render)
            checkForResponse(expectedCall, 'end', this.res.end)
            checkForResponse(expectedCall, 'json', this.res.json)
            checkForResponse(expectedCall, 'jsonp', this.res.jsonp)
            checkForResponse(expectedCall, 'next', this.next)
        }
        const expectJson = (expectedJson: any): TestResult =>
            this.createTestResult(
                promise.then((mocks) => {
                    checkForOtherResponses('json')
                    sinon.assert.calledWith(this.res.json, expectedJson)
                    return mocks
                }),
            )
        const expectJsonp = (expectedJson: any): TestResult =>
            this.createTestResult(
                promise.then((mocks) => {
                    checkForOtherResponses('jsonp')
                    sinon.assert.calledWith(this.res.jsonp, expectedJson)
                    return mocks
                }),
            )
        const expectSend = (...args: any[]): TestResult =>
            this.createTestResult(
                promise.then((mocks) => {
                    checkForOtherResponses('send')
                    sinon.assert.calledWithExactly(this.res.send, ...args)
                    return mocks
                }),
            )
        const expectEnd = (...args: any[]): TestResult =>
            this.createTestResult(
                promise.then((mocks) => {
                    checkForOtherResponses('end')
                    sinon.assert.calledWithExactly(this.res.send, ...args)
                    return mocks
                }),
            )
        const expectSendFile = (...args: any[]): TestResult =>
            this.createTestResult(
                promise.then((mocks) => {
                    checkForOtherResponses('sendFile')
                    sinon.assert.calledWith(this.res.sendFile, ...args)
                    return mocks
                }),
            )
        const expectRedirect = (...args: any[]): TestResult =>
            this.createTestResult(
                promise.then((mocks) => {
                    checkForOtherResponses('redirect')
                    sinon.assert.calledWithExactly(this.res.redirect, ...args)
                    return mocks
                }),
            )
        const expectRender = (...args: any[]): TestResult =>
            this.createTestResult(
                promise.then((mocks) => {
                    checkForOtherResponses('render')
                    sinon.assert.calledWith(this.res.render, ...args)
                    return mocks
                }),
            )
        const expectType = (expectedType: string): TestResult =>
            this.createTestResult(
                promise.then((mocks) => {
                    sinon.assert.calledWith(this.res.type, expectedType)
                    return mocks
                }),
            )
        const expectStatus = (expectedStatus: number): TestResult =>
            this.createTestResult(
                promise.then((mocks) => {
                    sinon.assert.calledWith(this.res.status, expectedStatus)
                    return mocks
                }),
            )
        const expectSendStatus = (expectedStatus: number): TestResult =>
            this.createTestResult(
                promise.then((mocks) => {
                    checkForOtherResponses('sendStatus')
                    sinon.assert.calledWith(this.res.sendStatus, expectedStatus)
                    return mocks
                }),
            )

        const validateErrorOfNext = (arg: any, expected: any, messageOrCheck: string | RegExp | ((err: any) => void) | undefined) => {
            sinon.assert.calledWithMatch(this.next, sinon.match.any)

            if (expected instanceof Error) {
                assert.strictEqual(arg, expected)
            } else {
                assert.ok(arg instanceof expected, `expected next to have been called with instance of ${expected.name ?? 'unnamed constructor'}`)
            }

            const errorMessage = arg?.message ?? arg?.toString()
            if (typeof messageOrCheck === 'string') {
                assert.ok(errorMessage?.indexOf?.(messageOrCheck) !== -1, `expected error message to include "${messageOrCheck}", but got "${errorMessage}"`)
            } else if (messageOrCheck instanceof RegExp) {
                assert.ok(messageOrCheck.test(errorMessage), `expected error message to match ${messageOrCheck}, but got "${errorMessage}"`)
            } else if (typeof messageOrCheck === 'function') {
                messageOrCheck(arg)
            }
        }

        const expectNext = (expected?: any, messageOrCheck?: string | RegExp | ErrorCheck): TestResult =>
            this.createTestResult(
                promise.then((mocks) => {
                    checkForOtherResponses('next')
                    sinon.assert.called(this.next)
                    const args = this.next.firstCall.args
                    if (!expected) {
                        assert.ok(!args || args.length === 0 || !args[0], `expected call to next() without arguments, but got "${args[0]}"`)
                    } else if (expected) {
                        validateErrorOfNext(args[0], expected, messageOrCheck)
                    }
                    return mocks
                }),
            )
        const expectHeader = (name: string, value: string): TestResult =>
            this.createTestResult(
                promise.then((mocks) => {
                    try {
                        sinon.assert.calledWithExactly(this.res.set, name, value)
                        return mocks
                    } catch (e) {
                        try {
                            sinon.assert.calledWithExactly(this.res.setHeader, name, value)
                            return mocks
                        } catch (e2) {
                            e.message += `\n${e2.message}`
                            throw e
                        }
                    }
                }),
            )
        return Object.assign(promise, {
            expectJson,
            expectJsonp,
            expectSend,
            expectEnd,
            expectSendFile,
            expectRedirect,
            expectRender,
            expectType,
            expectStatus,
            expectSendStatus,
            expectNext,
            expectHeader,
        })
    }
}

export interface TestResult extends Promise<Mocks> {
    expectJson(expectedJson: any): TestResult
    expectJsonp(expectedJson: any): TestResult
    expectSend(...args: any[]): TestResult
    expectEnd(...args: any[]): TestResult
    expectRender(...args: any[]): TestResult
    expectRedirect(...args: any[]): TestResult
    expectSendStatus(expectedStatus: number): TestResult
    expectSendFile(...args: any[]): TestResult
    expectType(expectedType: string): TestResult
    expectStatus(expectedStatus: number): TestResult
    expectNext(expected?: any, message?: string | RegExp | ErrorCheck): TestResult
    expectHeader(name: string, value: string): TestResult
}

// parts of code from https://github.com/danawoodman/sinon-express-mock/blob/master/src/index.js
export default class ExpressMocks {
    public static mockRequest = (options = {}): any => {
        const ret = {}
        return Object.assign(
            ret,
            {
                accepts: sinon.stub(),
                acceptsCharsets: sinon.stub(),
                acceptsEncodings: sinon.stub(),
                acceptsLanguages: sinon.stub(),
                fflip: {
                    has: sinon.stub(),
                },
                body: {},
                get: sinon.stub(),
                header: sinon.stub(),
                is: sinon.stub(),
                params: {},
                query: {},
                session: {},
                cookies: [],
            },
            options,
        )
    }

    public static mockResponse = (options = {}): any => {
        const ret = {}
        return Object.assign(
            ret,
            {
                append: sinon.stub().returns(ret),
                attachement: sinon.stub().returns(ret),
                clearCookie: sinon.stub().returns(ret),
                cookie: sinon.stub().returns(ret),
                download: sinon.stub().returns(ret),
                end: sinon.stub().returns(ret),
                format: {},
                get: sinon.stub(),
                headersSent: sinon.stub().returns(ret),
                json: sinon.stub().returns(ret),
                jsonp: sinon.stub().returns(ret),
                links: sinon.stub().returns(ret),
                locals: {},
                location: sinon.stub().returns(ret),
                redirect: sinon.stub().returns(ret),
                render: sinon.stub().returns(ret),
                send: sinon.stub().returns(ret),
                sendFile: sinon.stub().returns(ret),
                sendStatus: sinon.stub().returns(ret),
                set: sinon.stub().returns(ret),
                setHeader: sinon.stub().returns(ret),
                header: sinon.stub().returns(ret),
                status: sinon.stub().returns(ret),
                type: sinon.stub().returns(ret),
                vary: sinon.stub().returns(ret),
            },
            options,
        )
    }

    public static create = (requestOptions = {}, responseOptions = {}): Mocks => new Mocks(requestOptions, responseOptions)
}
