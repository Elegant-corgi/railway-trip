# Rail Travel - 高铁余票地图

一个用于周末/短途出行规划的高铁余票地图工具。用户选择出发城市和日期后，可以在地图上查看附近城市的直达车次和余票情况。

## 本 fork 的修复

- 修复 Docker 部署后前端资源路径错误导致白屏的问题。
- 修复前端请求 `/rail/api/trains` 导致查票接口打错的问题。
- 将常用城市默认映射到高铁主站，例如杭州东、上海虹桥、北京南、南京南。
- 运行时注入高德地图 Key，避免把个人 Key 写入 Git。
- 补充 `.gitignore`、`.env.example` 和源码级 Docker 构建文件。

## Docker 部署

```bash
docker build -t rail-travel:fixed .

docker run -d \
  --name rail-travel \
  -p 8080:3001 \
  -e VITE_AMAP_KEY=<your_amap_key> \
  -e QWEATHER_KEY=<your_qweather_key> \
  rail-travel:fixed
```

打开：

```text
http://localhost:8080
```

## 本地开发

```bash
npm install
cp .env.example .env
npm start
```

默认端口是 `3001`，可通过 `PORT` 环境变量覆盖。

## 环境变量

| 变量 | 必需 | 说明 |
| --- | --- | --- |
| `VITE_AMAP_KEY` | 是 | 高德地图 Web 端 JS API Key |
| `QWEATHER_KEY` | 否 | 和风天气 API Key |
| `QWEATHER_HOST` | 否 | 和风天气 API 地址，默认 `https://devapi.qweather.com` |
| `PORT` | 否 | 服务端口，默认 `3001` |

## 已知限制

- 当前只查询直达车，不支持中转方案。
- 12306 接口可能受网络、Cookie 和风控影响，结果仅供规划参考。
- 前端是从镜像导出的已构建产物，后续如果要深度开发，建议补全原始 React 源码。
