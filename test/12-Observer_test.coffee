co = require 'co'
sinon = require 'sinon'
chai = require 'chai'
chai.use require 'sinon-chai'
chai.should()

Pretend = require '../src/index'
pretend = new Pretend './scripts/random-messages.coffee'

describe 'Message Observer', ->

  beforeEach ->
    pretend.startup()

  afterEach ->
    pretend.shutdown()

  context 'Wait for the next message to appear', ->

    beforeEach (done) ->
      co =>
        yield pretend.user('test').send 'testing'
        pretend.observer.next().then (@msg) => done()
        yield pretend.user('test').send '1'
        yield pretend.user('test').send '2'
      return

    it 'resolves a promise with the next message after setup', ->
      @msg.should.eql ['test', '1']

    it 'did not continue with further messages', ->
      pretend.messages.pop().should.not.eql ['test', '2']

  context 'Loop until a specific message appears', ->

    beforeEach ->
      @player = pretend.user 'player'
      co =>
        yield @player.send 'hubot play'
        marcoPolo = pretend.observer.when ['hubot', '@player I got you!']
        yield @player.send 'polo' while marcoPolo.isPending()

    it 'resolved after at least one round', ->
      pretend.messages.length.should.be.gt 3

    it 'resolved in a probable number of rounds', ->
      pretend.messages.length.should.be.lt 60

  context 'Do something with each message sent', ->

    beforeEach ->
      @msgs = ''
      pretend.observer.all (msg) => @msgs += msg[1]
      co =>
        yield pretend.user('test').send i for i in [1..5]

    it 'observed the series of messages', ->
      @msgs.should.eql '12345'