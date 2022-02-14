#!/usr/bin/env node
const { createClient, segment } = require('oicq')
const path = require('path')
const http = require('http')
const qs = require('querystring')

const default_opt = {
  port: 49875,
  maxsize: 10000000, // 10M
  maxretry: 2,
  platform: 1,
}
const opt = require('minimist')(process.argv.slice(2))
if (opt.help || !opt.username || !opt.password) {
  const exe = 'qqimagedeliver'
  console.log(`${exe} [--username ''] [--password ''] [--platform ${default_opt.platform}] [--host ''] [--port ${default_opt.port}] [--maxsize ${default_opt.maxsize}] [--maxretry ${default_opt.maxretry}]
${exe} --username 789012 --password 5e6147aa5f # crypto your password by 'echo -n realpassword|md5sum'`)
  process.exit(1)
}
opt.port = parseInt(opt.port || default_opt.port)
opt.maxsize = parseInt(opt.maxsize || default_opt.maxsize)
opt.maxretry = parseInt(opt.maxretry || default_opt.maxretry)
opt.platform = parseInt(opt.platform || default_opt.platform)

const newbot = () => {
  const bot = createClient(opt['username'], { platform: opt.platform })
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

const serve = (bot) => {
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
      if (body['to']<5 || (!body['info'] && !body['image'])) return
      const message = []
      if (body['info']) {
        message.push(body['info'])
      }
      if (body['image']) {
        message.push(segment.image('base64://' + body['image']))
      }
      for (let i = 0; i < opt['maxretry']; ++i) {
        try {
          await online(bot)
          if ((await bot.sendPrivateMsg(body['to'], message)).retcode === 0)
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
