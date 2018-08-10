import * as sinon from 'sinon'
import { expect } from 'chai'
import { ErrorRequestHandler, RequestHandler } from 'express'

export type ErrorCheck = (err: any) => void

export class Mocks {
    constructor(
        requestOptions = {},
        responseOptions = {},
        public req = ExpressMocks.mockRequest(requestOptions),
        public res = ExpressMocks.mockResponse(responseOptions),
        public next = sinon.spy()) {
    }

    public test(router: RequestHandler): TestResult {
        const maybePromise = router(this.req, this.res, this.next as any)
        if (maybePromise && maybePromise.then) {
            return this.createTestResult(maybePromise.then(() => this))
        }
        return this.createTestResult(Promise.resolve(this))
    }

    public testError(router: ErrorRequestHandler, err: any): TestResult {
        const maybePromise = router(err, this.req, this.res, this.next as any)
        if (maybePromise && maybePromise.then) {
            return this.createTestResult(maybePromise.then(() => this))
        }
        return this.createTestResult(Promise.resolve(this))
    }

    private createTestResult<T>(promise: Promise<T>): TestResult {
        return Object.assign(promise, {
            expectJson: (expectedJson: any): TestResult => this.createTestResult(promise.then(mocks => {
                expect(this.res.json).to.have.been.calledWith(expectedJson)
                return mocks
            })),
            expectSend: (...args: any[]): TestResult => this.createTestResult(promise.then(mocks => {
                expect(this.res.send).to.have.been.calledWithExactly(...args)
                return mocks
            })),
            expectRedirect: (...args: any[]): TestResult => this.createTestResult(promise.then(mocks => {
                expect(this.res.redirect).to.have.been.calledWithExactly(...args)
                return mocks
            })),
            expectStatus: (expectedStatus: number): TestResult => this.createTestResult(promise.then(mocks => {
                expect(this.res.status).to.have.been.calledWith(expectedStatus)
                return mocks
            })),
            expectSendStatus: (expectedStatus: number): TestResult => this.createTestResult(promise.then(mocks => {
                expect(this.res.sendStatus).to.have.been.calledWith(expectedStatus)
                return mocks
            })),
            expectNext: (expected?: any, messageOrCheck?: string | RegExp | ErrorCheck): TestResult => this.createTestResult(promise.then(mocks => {
                if (!expected) {
                    expect(this.next).to.have.been.calledWithExactly()
                } else if (expected) {
                    expect(this.next).to.have.been.calledWithMatch(sinon.match.any)

                    const arg = this.next.firstCall.args[0]
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
                    expect(this.res.set).to.have.been.calledWithExactly(name, value)
                    return mocks
                } catch (e) {
                    try {
                        expect(this.res.setHeader).to.have.been.calledWithExactly(name, value)
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

export interface TestResult extends Promise<any> {
    expectJson(expectedJson: any): TestResult
    expectSend(...args: any[]): TestResult
    expectRedirect(...args: any[]): TestResult
    expectSendStatus(expectedStatus: number): TestResult
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
