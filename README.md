# expressmocks

A small utility to write unit tests for Express.js request handlers in a more readable and shorter fashion, based on [Sinon.JS](https://sinonjs.org/) and promises.

## Installation

To install:
```
npm install -D expressmocks
```

## Usage examples

```typescript

```
To support easier and better readable unit tests for Express.js endpoints, there exists `ExpressMocks.ts`.

For more examples, please see link:src/express/ExpressMocksSpec.ts[ExpressMocksSpec]

## First steps

Start by creating a `.kibconfig` file in a new empty directory. You'll probably

## Configuration

You can create a `.kibconfig` file in any upstream directory to contain the configuration:

```json
{
    "url": "http://localhost:9200",
    "datadir": "kibana",
    "verbose": true
}
```

Config attributes correspond to the parameters that are shown via `kibconfig --help`.

You can also maintain different profiles, for example to maintain different stages:

```json
{
    "profiles": {
        "preprod": {
            "url": "http://my-pre-production-server:9200",
            "datadir": "preprod",
            "verbose": true
        },
        "production": {
            "url": "http://my-production-server:9200",
            "datadir": "production",
            "verbose": true
        }
    }
}
```

## Build yourself

Run ES6 code directly:

`babel-node src/kibconfig.js`

Compile es6 code for publish:

`yarn run compile`

Re-Install it locally after local updates:

```bash
# Don't forget to unlink first
yarn unlink
yarn build
yarn link
```
