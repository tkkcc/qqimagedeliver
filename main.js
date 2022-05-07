#!/usr/bin/env node
const { createClient, segment } = require('oicq')
const path = require('path')
const http = require('http')
const qs = require('querystring')

const default_opt = {
  port: 49875,
  maxsize: 10000000, // 10M
  maxtry: 1,
  platform: 1,
  loglevel: 'info',
  send_msg_timeout: 10000,
  send_msg_interval: 10000,
}
const opt = require('minimist')(process.argv.slice(2))
if (opt.help | opt.h) {
  const exe = 'qqimagedeliver'
  console.log(`${exe} [--username ''] [--password ''] \
[--platform ${default_opt.platform}] [--loglevel ${default_opt.loglevel}] \
[--host ''] [--port ${default_opt.port}] [--maxsize ${default_opt.maxsize}] \
[--maxtry ${default_opt.maxtry}] [--send-msg-timeout ${default_opt.send_msg_timeout}] \
[--send-msg-interval ${default_opt.send_msg_interval}]
${exe} --username 12345 --password abcde`)
  process.exit(1)
}
opt.port = parseInt(opt.port || default_opt.port)
opt.maxsize = parseInt(opt.maxsize || default_opt.maxsize)
opt.maxtry = parseInt(opt.maxtry || default_opt.maxtry)
opt.platform = parseInt(opt.platform || default_opt.platform)
opt.loglevel = opt.loglevel || default_opt.loglevel
opt.send_msg_timeout = parseInt(opt['send-msg-timeout'] || default_opt.send_msg_timeout)
opt.send_msg_interval = parseInt(opt['send-msg-interval'] || default_opt.send_msg_interval)

const randomChoice = (choice) =>
  choice[Math.floor(Math.random() * choice.length)]

const shuffleArray = (array) => {
  array = [...array]
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

const newbot = (username, password) => {
  // console.log('username', username)
  // console.log('password', password)
  const bot = createClient(username, {
    platform: opt.platform,
    log_level: opt.loglevel,
  })
  bot.on('request', (e) => {
    e.approve()
  })
  bot.on('system.login.slider', () => {
    process.stdin.once('data', (input) => {
      bot.sliderLogin(input)
    })
  })
  bot.on('system.login.device', () => {
    bot.logger.info('验证完成后敲击Enter继续..')
    process.stdin.once('data', () => {
      bot.login()
    })
  })
  bot.on('system.login.qrcode', function (e) {
    bot.logger.info('验证完成后敲击Enter继续..')
    process.stdin.once('data', () => {
      this.login()
    })
  })
  bot.on('system.login.error', async (e) => {
    console.log(username, 'system.login.error', e)
    if (e.message.includes('冻结') && !bot.isFrozened) {
      bot.isFrozened = true
      console.log(username, '冻结，8小时后重试')
      // 每8小时重试登录
      await new Promise((r) => setTimeout(r, 8 * 3600 * 1000))
      bot.isFrozened = false
    }
    // bot.login(opt['password'])
  })
  bot.on('system.offline', (e) => {
    console.log(e)
    bot.online()
  })
  // bot.on('notice', (e) => {
  //   console.log(e)
  // })
  bot.online = async () => {
    if (bot.isFrozened || bot.isOnline()) return bot
    bot.login(password)
    return new Promise((resolve) => {
      bot.on('system.online', () => resolve(bot))
      bot.on('system.login.error', () => resolve(bot))
    })
  }
  bot.isFrozened = false
  return bot
}

const serve = async (bots) => {
  // for (let bot of bots) {
  //   await bot.online()
  // }
  await Promise.all(bots.map(async (bot) => await bot.online()))
  console.log('login finish')
  // console.log('bots[0]', bots[0].uin)

  const PQueue = (await import('p-queue')).default
  const bot2queue = {}
  console.log("send_msg_interval", opt.send_msg_interval)
  console.log("send_msg_timeout", opt.send_msg_timeout)

  bots.forEach((bot) => {
    bot2queue[bot.uin] = new PQueue({
      concurrency: 1,
      timeout: opt.send_msg_timeout,
      interval: opt.send_msg_interval,
      intervalCap: 1,
    })
  })

  // const bot2queue = bots.reduce(
  //   (all, bot) =>
  //     (all[bot.uin] = new PQueue({
  //       concurrency: 1,
  //       timeout: 30,
  //       interval: 10,
  //     })),
  //   {}
  // )

  const server = http.createServer(async (req, res) => {
    res.end()
    if (req.method != 'POST') return
    let body = ''
    req.on('data', (data) => {
      body += data
      if (body.length > opt['maxsize']) {
        console.log('reach body length limit', opt['maxsize'])
        req.connection.destroy()
      }
    })
    req.on('end', async () => {
      body = qs.parse(body)
      // console.log('body', body)
      if (
        body['to'] < 5 ||
        !parseInt(body['to']) ||
        (!body['info'] && !body['image'])
      )
        return
      const message = []
      if (body['info']) {
        message.push(body['info'])
      }
      if (body['image']) {
        message.push(segment.image('base64://' + body['image']))
      }
      console.log('receive', body['to'], body['info'])

      for (let i = 0; i < opt['maxtry']; ++i) {
        try {
          let success = false
          for (let bot of shuffleArray(bots)) {
            if (bot.isFrozened || !bot.isOnline()) continue
            if (bot.gl.has(parseInt(body['to']))) {
              await bot2queue[bot.uin].add(async () => {
                bot.pickGroup(body['to']).sendMsg(message)
                console.log('send', body['to'], body['info'])
              })
              success = true
            } else if (bot.fl.has(parseInt(body['to']))) {
              await bot2queue[bot.uin].add(() => {
                bot.pickFriend(body['to']).sendMsg(message)
                console.log('send', body['to'], body['info'])
              })
              success = true
            }
            if (success) break
          }
          if (success) break
        } catch (e) {
          console.log('retry fail', i, body['to'], e)
        }
        await new Promise((r) => setTimeout(r, 60 * 1000))
      }
    })
  })
  server.listen({ port: opt['port'], host: opt['host'] })
}
const usernames = (opt.username || '').toString().split(/[\s]+/)
const passwords = (opt.password || '').toString().split(/[\s]+/)
if (usernames.length != passwords.length) {
  console.log('length of username is not equal with password')
  process.exit(1)
}
const zip = (a, b) => a.map((k, i) => [k, b[i]])
const bots = zip(usernames, passwords).map(([u, p]) => newbot(u, p))
serve(bots)
