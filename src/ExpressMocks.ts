import * as sinon from 'sinon'
import { expect } from 'chai'
import { ErrorRequestHandler, RequestHandler } from 'express'

export type ErrorCheck = (err: any) => void

type FinalizingMethod = 'send' | 'json' | 'jsonp' | 'end' | 'sendStatus' | 'sendFile' | 'render' | 'redirect' | 'next'

export class Mocks {
    constructor(
        requestOptions = {},
        responseOptions = {},
        public req = ExpressMocks.mockRequest(requestOptions),
        public res = ExpressMocks.mockResponse(responseOptions),
        public next = sinon.stub()) {
    }

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
            let returnedPromise: any
            let didReturnPromise: boolean
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
            if (expectedMethodName === actualMethodName) {
                expect(actualStub.callCount, `${expectedMethodName}() called more than once`).to.equal(1)
            } else {
                expect(actualStub.callCount, `both ${actualMethodName}() and ${expectedMethodName}() were called`).to.equal(0)
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
        return Object.assign(promise, {
            expectJson: (expectedJson: any): TestResult => this.createTestResult(promise.then(mocks => {
                checkForOtherResponses('json')
                sinon.assert.calledWith(this.res.json, expectedJson)
                return mocks
            })),
            expectJsonp: (expectedJson: any): TestResult => this.createTestResult(promise.then(mocks => {
                checkForOtherResponses('jsonp')
                sinon.assert.calledWith(this.res.jsonp, expectedJson)
                return mocks
            })),
            expectSend: (...args: any[]): TestResult => this.createTestResult(promise.then(mocks => {
                checkForOtherResponses('send')
                sinon.assert.calledWithExactly(this.res.send, ...args)
                return mocks
            })),
            expectEnd: (...args: any[]): TestResult => this.createTestResult(promise.then(mocks => {
                checkForOtherResponses('end')
                sinon.assert.calledWithExactly(this.res.send, ...args)
                return mocks
            })),
            expectSendFile: (...args: any[]): TestResult => this.createTestResult(promise.then(mocks => {
                checkForOtherResponses('sendFile')
                sinon.assert.calledWith(this.res.sendFile, ...args)
                return mocks
            })),
            expectRedirect: (...args: any[]): TestResult => this.createTestResult(promise.then(mocks => {
                checkForOtherResponses('redirect')
                sinon.assert.calledWithExactly(this.res.redirect, ...args)
                return mocks
            })),
            expectRender: (...args: any[]): TestResult => this.createTestResult(promise.then(mocks => {
                checkForOtherResponses('render')
                sinon.assert.calledWith(this.res.render, ...args)
                return mocks
            })),
            expectType: (expectedType: string): TestResult => this.createTestResult(promise.then(mocks => {
                sinon.assert.calledWith(this.res.type, expectedType)
                return mocks
            })),
            expectStatus: (expectedStatus: number): TestResult => this.createTestResult(promise.then(mocks => {
                sinon.assert.calledWith(this.res.status, expectedStatus)
                return mocks
            })),
            expectSendStatus: (expectedStatus: number): TestResult => this.createTestResult(promise.then(mocks => {
                checkForOtherResponses('sendStatus')
                sinon.assert.calledWith(this.res.sendStatus, expectedStatus)
                return mocks
            })),
            expectNext: (expected?: any, messageOrCheck?: string | RegExp | ErrorCheck): TestResult => this.createTestResult(promise.then(mocks => {
                checkForOtherResponses('next')
                sinon.assert.called(this.next)
                const args = this.next.firstCall.args
                if (!expected) {
                    expect(!args || args.length === 0 || !args[0]).to.be.true
                } else if (expected) {
                    sinon.assert.calledWithMatch(this.next, sinon.match.any)

                    const arg = args[0]
                    if (expected instanceof Error) {
                        expect(arg).to.deep.equal(expected)
                    } else {
                        expect(arg).to.be.instanceof(expected)
                    }

                    if (typeof messageOrCheck === 'string') {
                        expect(arg.message).to.contain(messageOrCheck)
                    } else if (messageOrCheck instanceof RegExp) {
                        expect(arg.message).to.match(messageOrCheck)
                    } else if (typeof messageOrCheck === 'function') {
                        messageOrCheck(arg)
                    }
                }
                return mocks
            })),
            expectHeader: (name: string, value: string): TestResult => this.createTestResult(promise.then(mocks => {
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
            }))
        })
    }

    private isClass(func: any) {
        return typeof func === 'function'
            && /^class\s/.test(Function.prototype.toString.call(func))
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
        return Object.assign(ret, {
            accepts: sinon.stub(),
            acceptsCharsets: sinon.stub(),
            acceptsEncodings: sinon.stub(),
            acceptsLanguages: sinon.stub(),
            fflip: {
                has: sinon.stub()
            },
            body: {},
            get: sinon.stub(),
            header: sinon.stub(),
            is: sinon.stub(),
            params: {},
            query: {},
            session: {}
        }, options)
    }

    public static mockResponse = (options = {}): any => {
        const ret = {}
        return Object.assign(ret, {
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
            vary: sinon.stub().returns(ret)
        }, options)
    }

    public static create = (requestOptions = {}, responseOptions = {}): Mocks => new Mocks(requestOptions, responseOptions)
}
