# Rail Travel - 高铁余票地图

Interactive map showing train ticket availability and flight price comparisons across China.

## Docker Deployment

### Quick Start

```bash
docker run -d \
  --name rail-travel \
  -p 8080:3001 \
  -e VITE_AMAP_KEY=<your_amap_key> \
  -e QWEATHER_KEY=<your_qweather_key> \
  outstandingmom/rail-travel:latest
```

Open http://localhost:8080

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_AMAP_KEY` | Yes | AMap (高德地图) JS API Key |
| `QWEATHER_KEY` | Yes | QWeather (和风天气) API Key |
| `QWEATHER_HOST` | No | QWeather API host (default: `https://devapi.qweather.com`) |
| `VITE_API_BASE_URL` | No | Override API base URL (defaults to same origin) |
| `PORT` | No | Server port inside container (default: 3001) |

