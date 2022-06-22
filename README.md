# QQ图像分发

[明日方舟速通](https://github.com/tkkcc/arknights)

## 服务端安装

需要nodejs环境，安卓平台可在termux内安装。

```sh
# 安装
npm i -g qqimagedeliver
qqimagedeliver --help
qqimagedeliver --username 12345 # 扫码登录
qqimagedeliver --username 12345 --password 67890 # 密码登录（明文或md5加密结果）

# 多个QQ号分流，按随机顺序检索是否存在目标好友或群，然后发送
# 使用前应先确保每个号的登录过程无需校验
qqimagedeliver --username '12345 23451 34512' --password '67890 78906 89067' --maxtry=2 --loglevel=warn

# 用pm2管理
npm i -g pm2
pm2 start qqimagedeliver -- --username 12345 --password 67890
pm2 log
```

## 客户端

post数据格式
```js
{
  image, // base64编码图片
  to, // 接收QQ号或群号
  info, // 文字信息
} 
```

curl
```sh
curl -d "info=好的&to=12345" http://123.456.789.100:49875
```

python
```python
requests.post(
    "http://123.456.789.100:49875",
    data={"to": to, "info": info, "image": image}
)
```

懒人精灵
```lua
local param = "image=" .. encodeUrl(image) .. "&info=" .. encodeUrl(info)
                "&to=" .. encodeUrl(to)
asynHttpPost(function(res, code)
  print(code)
end, "http://123.456.789.100:49875", param)
```

节点精灵
```lua
local req = {
  url = "http://123.456.789.100:49875",
  param = {image = base64(img), info = info, to = to},
  timeout = 30,
}
httpPost(req)
```

## 常见问题

- 账号冻结：少加群加好友、少发长数字串、多号分流。
- 有字没图：每日私聊发图量有上限，用群号。
- [异地登录后几天内自动下线](https://github.com/takayama-lily/oicq/issues/212)：pm2自动重启。

## 其它推送方式

- 邮件：用户难以查看历史推送，图片消息是折叠的。
- 喵提醒：用户需定期向公众号发消息，图片消息是折叠的。
- pushplus：需要另找图床，公众号图片消息是折叠的。
- QQ频道：官方机器人主动消息数量上限极低。
- [wecomchan](https://github.com/easychen/wecomchan)：非企业认证群人数上限200，个人使用不错。
