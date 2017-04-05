co = require 'co'
chai = require 'chai'
chai.should()

Pretend = require '../src/index'
pretend = new Pretend './scripts/mock-response.coffee'

class NewResponse extends pretend.Response
  random: (items) -> 3

describe 'Mock Response', ->

  context 'user says "give me a random" number to hubot', ->

  beforeEach ->
    pretend.Response = NewResponse
    pretend.startup()
    co =>
      yield pretend.user('alice').send '@hubot give me a random number'
      yield pretend.user('bob').send '@hubot give me a random number'

  it 'replies to user with a random number', ->
    pretend.messages.should.eql [
      ['alice', '@hubot give me a random number']
      ['hubot', '@alice 3']
      ['bob',   '@hubot give me a random number']
      ['hubot', '@bob 3']
    ]
