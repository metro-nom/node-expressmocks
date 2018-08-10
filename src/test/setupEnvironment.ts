import chai = require('chai')
import sinonChai = require('sinon-chai')
import chaiAsPromised = require('chai-as-promised')

chai.should()

chai.use(sinonChai)
chai.use(chaiAsPromised)
