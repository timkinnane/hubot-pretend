export default robot => {
  robot.on('some-event', (some, data) =>
    robot.messageRoom('hub', `got event with ${some} ${data}`)
  )
  robot.respond(/send event$/i, res =>
    robot.emit('response-event', { content: 'hello' })
  )
}
