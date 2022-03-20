#!/usr/bin/env node
const { createClient, segment } = require('oicq')
const path = require('path')
const http = require('http')
const qs = require('querystring')
const sharp = require('sharp')

const default_opt = {
  port: 49875,
  maxsize: 10000000, // 10M
  maxtry: 1,
  platform: 1,
  resizeh: 0,
}
const opt = require('minimist')(process.argv.slice(2))
if (opt.help || !opt.username || !opt.password) {
  const exe = 'qqimagedeliver'
  console.log(`${exe} [--username ''] [--password ''] [--platform ${default_opt.platform}] \
[--host ''] [--port ${default_opt.port}] [--maxsize ${default_opt.maxsize}] \
[--maxtry ${default_opt.maxtry}] [--resizeh ${default_opt.resizeh}]
${exe} --username 789012 --password 5e6147aa5f # crypto your password by 'echo -n realpassword|md5sum'`)
  process.exit(1)
}
opt.port = parseInt(opt.port || default_opt.port)
opt.maxsize = parseInt(opt.maxsize || default_opt.maxsize)
opt.maxtry = parseInt(opt.maxtry || default_opt.maxtry)
opt.platform = parseInt(opt.platform || default_opt.platform)
opt.resizeh = parseInt(opt.resizeh || default_opt.resizeh)

const resize = async (image) => {
  if (!image) return image
  if (!opt.resizeh) return image
  try {
    image = await sharp(Buffer.from(image, 'base64'))
      .resize(opt.resizeh)
      .jpeg({ mozjpeg: true })
      .toBuffer()
    image = image.toString('base64')
    return image
  } catch (e) {
    console.log(e)
  }
}

const newbot = () => {
  const bot = createClient(opt['username'], { platform: opt.platform })
  bot.on('request.friend', (e) => {
    e.approve()
  })
  bot.on('request.friend.add', (e) => {
    e.approve()
  })
  bot.on('request.friend.single', (e) => {
    e.approve()
  })
  bot.on('request.group.add', (e) => {
    e.approve()
  })
  bot.on('request.group.invite', (e) => {
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
  bot
    .on('system.login.qrcode', function (e) {
      bot.logger.info('验证完成后敲击Enter继续..')
      process.stdin.once('data', () => {
        this.login()
      })
    })
    .login()
  bot.on('system.offline', () => {
    // bot.login(opt['password'])
  })
  return bot
}
const online = async (bot) => {
  if (bot.isOnline()) return bot
  bot.login(opt['password'])
  return new Promise((resolve) => {
    bot.on('system.online', () => resolve(bot))
  })
}

const serve = async (bot) => {
  await online(bot)
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
      if (body['to'] < 5 || !parseInt(body['to']) || (!body['info'] && !body['image'])) return
      const message = []
      if (body['info']) {
        message.push(body['info'])
      }
      if (body['image']) {
        body['image'] = (await resize(body['image'])) || ''
        message.push(segment.image('base64://' + body['image']))
      }
      for (let i = 0; i < opt['maxtry']; ++i) {
        try {
          await online(bot)
          if (bot.gl.has(parseInt(body['to']))) {
            await bot.pickGroup(body['to']).sendMsg(message)
          } else {
            await bot.pickUser(body['to']).sendMsg(message)
          }
          // await bot.sendPrivateMsg(body['to'], message)
          break
        } catch (e) {
          console.log(e, body['to'])
        }
        await new Promise((r) => setTimeout(r, 10000))
      }
    })
  })
  server.listen({ port: opt['port'], host: opt['host'] })
}

serve(newbot())
