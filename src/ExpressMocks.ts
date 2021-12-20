import * as sinon from 'sinon'
import { ErrorRequestHandler, RequestHandler } from 'express'
import * as assert from 'assert'
import { SinonStub } from 'sinon'
export type ErrorCheck = (err: any) => void

type FinalizingMethod = 'send' | 'json' | 'jsonp' | 'end' | 'sendStatus' | 'sendFile' | 'download' | 'render' | 'redirect' | 'next'

function isSinonStub(stub: any): stub is SinonStub {
    // eslint-disable-next-line no-prototype-builtins
    return stub?.hasOwnProperty?.('callCount')
}

export class Mocks {
    private initialResponse: any

    constructor(
        requestOptions = {},
        responseOptions = {},
        public req = ExpressMocks.mockRequest(requestOptions),
        public res = ExpressMocks.mockResponse(responseOptions),
        public next = sinon.stub(),
    ) {
        this.initialResponse = { ...res }
    }

    public test(router: RequestHandler<any, any, any, any>): TestResult {
        return this.execute(router)
    }

    public testError(router: ErrorRequestHandler<any, any, any, any>, err: unknown): TestResult {
        return this.execute((req, res, next) => {
            return router(err, req, res, next)
        })
    }

    private execute(callback: (req: any, res: any, next: any) => any) {
        const promise = new Promise((resolve, reject) => {
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
            this.res.download.callsFake(resolveOnCallback)
            this.res.end.callsFake(resolveOnCallback)
            this.res.render.callsFake(resolveOnCallback)
            this.next.callsFake(resolveOnCallback)

            const returnedPromise = callback(this.req, this.res, this.next as any)
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
            checkForResponse(expectedCall, 'redirect', this.initialResponse.redirect)
            checkForResponse(expectedCall, 'send', this.initialResponse.send)
            checkForResponse(expectedCall, 'sendStatus', this.initialResponse.sendStatus)
            checkForResponse(expectedCall, 'sendFile', this.initialResponse.sendFile)
            checkForResponse(expectedCall, 'download', this.initialResponse.download)
            checkForResponse(expectedCall, 'render', this.initialResponse.render)
            checkForResponse(expectedCall, 'end', this.initialResponse.end)
            checkForResponse(expectedCall, 'json', this.initialResponse.json)
            checkForResponse(expectedCall, 'jsonp', this.initialResponse.jsonp)
            checkForResponse(expectedCall, 'next', this.next)
        }
        const expectJson = (expectedJson: any): TestResult =>
            this.createTestResult(
                promise.then((mocks) => {
                    checkForOtherResponses('json')
                    sinon.assert.calledWith(this.initialResponse.json, expectedJson)
                    return mocks
                }),
            )
        const expectJsonp = (expectedJson: any): TestResult =>
            this.createTestResult(
                promise.then((mocks) => {
                    checkForOtherResponses('jsonp')
                    sinon.assert.calledWith(this.initialResponse.jsonp, expectedJson)
                    return mocks
                }),
            )
        const expectSend = (...args: any[]): TestResult =>
            this.createTestResult(
                promise.then((mocks) => {
                    checkForOtherResponses('send')
                    sinon.assert.calledWithExactly(this.initialResponse.send, ...args)
                    return mocks
                }),
            )
        const expectEnd = (...args: any[]): TestResult =>
            this.createTestResult(
                promise.then((mocks) => {
                    checkForOtherResponses('end')
                    sinon.assert.calledWithExactly(this.initialResponse.end, ...args)
                    return mocks
                }),
            )
        const expectSendFile = (...args: any[]): TestResult =>
            this.createTestResult(
                promise.then((mocks) => {
                    checkForOtherResponses('sendFile')
                    sinon.assert.calledWith(this.initialResponse.sendFile, ...args)
                    return mocks
                }),
            )
        const expectDownload = (...args: any[]): TestResult =>
            this.createTestResult(
                promise.then((mocks) => {
                    checkForOtherResponses('download')
                    sinon.assert.calledWith(this.initialResponse.download, ...args)
                    return mocks
                }),
            )
        const expectRedirect = (...args: any[]): TestResult =>
            this.createTestResult(
                promise.then((mocks) => {
                    checkForOtherResponses('redirect')
                    sinon.assert.calledWithExactly(this.initialResponse.redirect, ...args)
                    return mocks
                }),
            )
        const expectRender = (...args: any[]): TestResult =>
            this.createTestResult(
                promise.then((mocks) => {
                    checkForOtherResponses('render')
                    sinon.assert.calledWith(this.initialResponse.render, ...args)
                    return mocks
                }),
            )
        const expectType = (expectedType: string): TestResult =>
            this.createTestResult(
                promise.then((mocks) => {
                    sinon.assert.calledWith(this.initialResponse.type, expectedType)
                    return mocks
                }),
            )
        const expectStatus = (expectedStatus: number): TestResult =>
            this.createTestResult(
                promise.then((mocks) => {
                    sinon.assert.calledWith(this.initialResponse.status, expectedStatus)
                    return mocks
                }),
            )
        const expectSendStatus = (expectedStatus: number): TestResult =>
            this.createTestResult(
                promise.then((mocks) => {
                    checkForOtherResponses('sendStatus')
                    sinon.assert.calledWith(this.initialResponse.sendStatus, expectedStatus)
                    return mocks
                }),
            )

        const validateArgumentOfNext = (arg: any, expected: any, messageOrCheck: string | RegExp | ((err: any) => void) | undefined) => {
            const errorMessage = arg?.message ?? arg?.toString()

            if (arg === undefined) {
                throw new Error('expected next to have been called with any argument, but was called without')
            } else if (expected instanceof Error) {
                assert.strictEqual(arg, expected)
            } else if (typeof expected === 'string') {
                assert.strictEqual(errorMessage, expected)
            } else {
                assert.ok(arg instanceof expected, `expected next to have been called with instance of ${expected.name ?? 'unnamed constructor'}`)
            }

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
                    } else {
                        validateArgumentOfNext(args[0], expected, messageOrCheck)
                    }
                    return mocks
                }),
            )
        const expectHeader = (name: string, value: string): TestResult =>
            this.createTestResult(
                promise.then((mocks) => {
                    try {
                        sinon.assert.calledWithExactly(this.initialResponse.set, name, value)
                        return mocks
                    } catch (e) {
                        try {
                            sinon.assert.calledWithExactly(this.initialResponse.setHeader, name, value)
                            return mocks
                        } catch (e2) {
                            throw new Error(`Expected header '${name}' to have been set to '${value}'`)
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
            expectDownload,
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
    expectDownload(...args: any[]): TestResult
    expectType(expectedType: string): TestResult
    expectStatus(expectedStatus: number): TestResult
    expectNext(expected?: any, message?: string | RegExp | ErrorCheck): TestResult
    expectHeader(name: string, value: string): TestResult
}

// parts of code from https://github.com/danawoodman/sinon-express-mock/blob/master/src/index.js
export class ExpressMocks {
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
                // inherited from Node ServerResponse
                // some props:
                headersSent: false,
                finished: false,
                writableEnded: false,
                writableFinished: false,
                // some methods:
                cork: sinon.stub(),
                flushHeaders: sinon.stub(),
                getHeader: sinon.stub(),
                getHeaderNames: sinon.stub(),
                getHeaders: sinon.stub(),
                hasHeader: sinon.stub(),
                removeHeader: sinon.stub(),
                setTimeout: sinon.stub().returns(ret),
                uncork: sinon.stub(),
                write: sinon.stub(),
                writeContinue: sinon.stub(),
                writeHead: sinon.stub().returns(ret),
                writeProcessing: sinon.stub(),

                // Express Response
                // props:
                locals: {},
                // methods:
                append: sinon.stub().returns(ret),
                attachment: sinon.stub().returns(ret),
                cookie: sinon.stub().returns(ret),
                clearCookie: sinon.stub().returns(ret),
                download: sinon.stub().returns(ret),
                end: sinon.stub().returns(ret),
                format: sinon.stub().returns(ret),
                get: sinon.stub(),
                json: sinon.stub().returns(ret),
                jsonp: sinon.stub().returns(ret),
                links: sinon.stub().returns(ret),
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
