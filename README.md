# QQ图像分发

面向手游辅助脚本的QQ机器人推送服务

- 前期准备：用户在辅助界面中输入用户QQ，用户点击按钮添加QQ机器人为好友。
- 运行流程：辅助运行结束后截屏 -> 辅助发送图像与用户QQ给服务端 -> 服务端QQ机器人发送图像给用户QQ

https://user-images.githubusercontent.com/17373509/135971168-62f45b77-c83c-4e85-a8d3-bc9e0804d530.mp4

[明日方舟速通](https://github.com/tkkcc/arknights)

## 安装服务端

```sh
npm i -g qqimagedeliver
qqimagedeliver --help
qqimagedeliver --username 789012 --password 5e6147aa5f # QQ机器人的帐号与密码（明文或md5加密结果）

# 下线重登
npm i -g pm2
pm2 start qqimagedeliver -- --username 789012 --password 5e6147aa5f
pm2 log
```

## 辅助发送图像与用户QQ给服务端

以节点精灵为例

```lua
captureqqimagedeliver = function(info, to)
  io.open(getDir() .. '/.nomedia', 'w')
  local img = getDir() .. "/tmp.jpg"
  capture(img, 30)
  local req = {
    url = "http://a1.bilabila.tk:49875",
    param = {image = base64(img), info = tostring(info), to = tostring(to)},
    timeout = 20,
  }
  httpPost(req)
end
captureqqimagedeliver("剩余理智27", 123456)
```

以懒人精灵为例
```lua
captureqqimagedeliver = function(info, to)
  if not to then return end
  io.open(getWorkPath() .. '/.nomedia', 'w')
  local img = getWorkPath() .. "/tmp.jpg"
  snapShot(img)
  notifyqq(base64(img), tostring(info), tostring(to))
end
notifyqq = function(image, info, to, sync)
  image = image or ''
  info = info or ''
  to = to or ''
  local param = "image=" .. encodeUrl(image) .. "&info=" .. encodeUrl(info) ..
                  "&to=" .. encodeUrl(to)
  log('notify qq', info, to)
  if #to < 5 then return end

  local id = lock:add()
  asynHttpPost(function(res, code)
    -- log("notifyqq response", res, code)
    lock:remove(id)
  end, "http://82.156.198.12:49875", param)
  if sync then wait(function() return not lock:exist(id) end, 30) end
end
```

## 问题

- 发图失败：每日发图有上限，让用户创建群聊并邀请机器人进群，脚本上填群号。
- [异地登录后几天内自动下线](https://github.com/takayama-lily/oicq/issues/212)，需配合pm2等工具使用。

## 其它推送方式

- 邮件：用户难以查看历史推送，难以设置免打扰。
- 微信公众号（喵提醒）：用户需定时向公众号发消息。
- [wecomchan](https://github.com/easychen/wecomchan)：未企业认证群人数上限200。

