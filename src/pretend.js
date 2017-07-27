'use strict'

import fs from 'fs'
import path from 'path'
import _ from 'lodash'
import { EnterMessage, LeaveMessage } from 'hubot-async/es2015'
import Robot from './modules/robot'
import User from './modules/user'
import Room from './modules/room'

// prevent issues with default port in use
if (!(process.env.PORT || process.env.EXPRESS_PORT)) process.env.PORT = '3000'

// init vars
let robot = null
let users = {}
let rooms = {}
let scripts = []

// option fallbacks
const defaults = {
  httpd: false,
  name: 'hubot',
  alias: false,
  rooms: null,
  users: null
}

function reset () {
  // console.log('reset')
  // robot = null
  // users = {}
  // rooms = {}
  // scripts = []
}

/**
 * Start (or restart) collections and create pretend robot
 * @param  {Object} [options={}] Config object, optional attributes:
 *                               - httpd: enable server (default: false)
 *                               - name: robot name
 *                               - alias: robot alias
 *                               - rooms: array of room names to start with
 *                               - users: array of user names to start with
 * @return {[type]}              [description]
 */
function start (options = {}) {
  let config = Object.assign({}, defaults, options)

  // reset test user/room collections
  users = {}
  rooms = {}

  // create robot
  // TODO: update to options object when that happens in hubot core
  robot = new Robot(config.httpd, config.name, config.alias)

  // create users and rooms as per config options
  if (config.rooms != null) config.rooms.map(r => room(r))
  if (config.users != null) config.users.map(u => user(u))

  // tell robot to load scripts
  load()

  return this // for chaining
}

/**
 * Read in scripts from path/s, will overwrite any previous reads
 * @param  {Array|String} scriptPaths Paths to read for loading into hubot
 * @return {Int}                      Number of scripts found
 */
function read (scriptPaths) {
  scripts = []
  if (!Array.isArray(scriptPaths)) scriptPaths = [scriptPaths]
  for (let scriptPath of scriptPaths) {
    // get scripts if file path given, or all from directory
    scriptPath = path.resolve(path.dirname(module.parent.filename), scriptPath)
    if (fs.statSync(scriptPath).isDirectory()) {
      for (let file of fs.readdirSync(scriptPath).sort()) {
        scripts.push({
          path: scriptPath,
          file: file
        })
      }
    } else {
      scripts.push({
        path: path.dirname(scriptPath),
        file: path.basename(scriptPath)
      })
    }
  }

  // robot, load scripts
  load()

  return this // for chaining
}

/**
 * Load any read-in scripts (if robot created)
 */
function load () {
  console.log('loading', robot.loadFile.callCount)
  if (robot === null) return
  scripts.map(s => robot.loadFile(s.path, s.file))
  console.log('done', robot.loadFile.callCount)

  return this // for chaining
}

/**
 * Send message from a given user (through adapter)
 * @param  {User} user       The user
 * @param  {Message} message Hubot message object
 * @return {Promise}         Promise resolving when receive middleware complete
 */
function userSend (user, message) {
  return robot.adapter.receive(user, message)
}

/**
 * Send an enter message to robot from user
 * @param  {User} user The user
 * @return {Promise}   Promise resolving when receive middleware complete
 */
function userEnter (user) {
  return robot.receive(new EnterMessage(user))
}

/**
 * Send a leave message to robot from user
 * @param  {User} user The user
 * @return {Promise}   Promise resolving when receive middleware complete
 */
function userLeave (user) {
  return robot.receive(new LeaveMessage(user))
}

/**
 * Get any private message entries in adapter assigned to username
 * @param  {User} user The user
 * @return {Array}     Private messages for user
 */
function userPrivates (user) {
  return robot.adapter.privateMessages[user.name]
}

/**
 * Get filtered array of given room's messages from adapter
 * @return {Array} Messages [user, message] sent to room
*/
function roomMessages (room) {
  let messages = _.filter(robot.adapter.messages, msg => msg[0] === room.name)
  return _.map(messages, _.drop) // truncates room column from messages
}

/**
 * Send message through adapter, coming from given room and user
 * @param  {Room} room       Source room
 * @param  {User} user       Source user
 * @param  {Message} message The message
 * @return {Promise}         Promise resolving when receive middleware complete
 */
function roomReceive (room, user, message) {
  return robot.adapter.receive(user.in(room), message)
}

/**
 * Send enter message for given user in given room
 * @param  {Room} room       Source room
 * @param  {User} user       Source user
 * @return {Promise}         Promise resolving when receive middleware complete
 */
function roomEnter (room, user) {
  return userEnter(user.in(room))
}

/**
 * Send leave message for given user in given room
 * @param  {Room} room       Source room
 * @param  {User} user       Source user
 * @return {Promise}         Promise resolving when receive middleware complete
 */
function roomLeave (room, user) {
  return userLeave(user.in(room))
}

/**
 * Create or get existing user, for entering/leaving and sending messages
 * Add methods routing to shortcuts with this user provided as argument
 * @param  {String} name         Name for the user
 * @param  {Object} [options={}] Optional attributes for user
 * @return {MockUser}            A new mock user
 */
function user (name, options = {}) {
  if (!_.keys(users).includes(name)) {
    options.name = name
    let user = new User(options)
    user.send = message => userSend(user, message)
    user.enter = () => userEnter(user)
    user.leave = () => userLeave(user)
    user.private = () => userPrivates(user)
    users[name] = user
  }
  return users[name]
}

/**
 * Create or get existing room, for entering/leaving and receiving messages
 * Add methods routing to shortcuts with this room provided as argument
 * @param  {String} name Name for the room
 * @return {MockRoom}    A new room
 */
function room (name) {
  if (!_.keys(rooms).includes(name)) {
    let room = new Room(robot.adapter, name)
    room.messages = () => roomMessages(room)
    room.receive = (user, message) => roomReceive(room, user, message)
    room.enter = (user) => roomEnter(room, user)
    room.leave = (user) => roomLeave(room, user)
    rooms[name] = (room)
  }
  return rooms[name]
}

/**
 * Shortcut to robot shutdown
 */
function shutdown () {
  robot.shutdown()
  reset()
}

/**
 * Revealed API, uses getters to return current state of collections
 * @type {Object} Containing exposed methods and propterties
 */
export default {
  start: start,
  read: read,
  shutdown: shutdown,
  get users () { return users },
  get rooms () { return rooms },
  get scripts () { return scripts },
  get robot () { return robot },
  get adapter () { return robot.adapter },
  get messages () { return robot.adapter.messages },
  get responses () { return robot.responses },
  get events () { return robot.eventLog },
  get logs () { return robot.logger.logs }
}
