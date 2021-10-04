# QQ图像分发

基于QQ机器人的面向手游辅助脚本的推送服务。

- 前期准备：用户在辅助界面中输入用户QQ，用户点击按钮添加QQ机器人为好友。
- 运行流程：辅助运行结束后截屏 -> 辅助发送图像与用户QQ给服务端 -> 服务端QQ机器人发送图像给用户QQ


## 安装服务端

```sh
npm i -g qqimagedeliver
qqimagedeliver --help
qqimagedeliver --username 789012 --password 5e6147aa5f # QQ机器人的帐号与密码（md5加密结果）
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
captureqqimagedeliver("剩余理智27", 2367739198)
```

## 其它推送方式

- 邮件：用户难以查看历史推送，难以设置免打扰。
- 微信公众号（喵提醒）：用户每两天需要向公众号发消息。
