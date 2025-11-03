# 图像合成 API 文档

## 概述

这是一个基于 Node.js Canvas 的图像处理 API，用于将底图与覆盖层图像进行高级合成处理。该 API 兼容前端 App.vue 中的所有图像处理功能，支持参数化调整。

## 基础信息

- **端点**: `/api/compose`
- **请求方法**: `POST`
- **内容类型**: `application/json`
- **响应类型**: `application/json`

## 请求格式

### 请求体结构

```typescript
{
  baseImage: string;           // Base64 编码的底图（必需）
  overlayImage: string;        // Base64 编码的覆盖层图像（必需）
  coverImage?: string;         // Base64 编码的封面图像（可选）
  options: {
    posX: number;              // 水平偏移（范围: -1 到 1）
    posY: number;              // 垂直偏移（范围: -1 到 1）
    scale: number;             // 缩放大小（范围: 0.1 到 3）
    opacity: number;           // 覆盖层透明程度（范围: 0 到 1）
    brightness: number;        // 底图亮度（范围: 0 到 200，100 为正常）
    useCover: boolean;         // 是否使用封面图像
    coverOpacity: number;      // 封面图像透明程度（范围: 0 到 1）
  }
}
```

### 参数说明

#### 图像参数

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| baseImage | string | 是 | Base64 编码的底图。支持常见图像格式（PNG、JPG、GIF 等） |
| overlayImage | string | 是 | Base64 编码的覆盖层图像，用于创建镂空效果 |
| coverImage | string | 否 | Base64 编码的封面图像（通常是黄色源石），在最上层渲染 |

#### 合成选项参数

| 参数 | 类型 | 范围 | 说明 |
|------|------|------|------|
| posX | number | -1 到 1 | 水平偏移。负值向左，正值向右。0 为中心 |
| posY | number | -1 到 1 | 垂直偏移。负值向上，正值向下。0 为中心 |
| scale | number | 0.1 到 3 | 覆盖层的缩放倍数 |
| opacity | number | 0 到 1 | 覆盖层的透明度。0 为完全透明，1 为完全不透明 |
| brightness | number | 0 到 200 | 底图的亮度调整。100 为原始亮度，<100 变暗，>100 变亮 |
| useCover | boolean | true/false | 是否在最上层应用封面图像 |
| coverOpacity | number | 0 到 1 | 封面图像的透明度。仅当 useCover 为 true 时有效 |

## 请求示例

### 使用 cURL

```bash
curl -X POST http://localhost:8787/api/compose \
  -H "Content-Type: application/json" \
  -d '{
    "baseImage": "data:image/png;base64,iVBORw0KGgoAAAANS...",
    "overlayImage": "data:image/png;base64,iVBORw0KGgoAAAANS...",
    "coverImage": "data:image/png;base64,iVBORw0KGgoAAAANS...",
    "options": {
      "posX": 0,
      "posY": 0,
      "scale": 1,
      "opacity": 0.8,
      "brightness": 100,
      "useCover": true,
      "coverOpacity": 1
    }
  }'
```

### 使用 JavaScript/TypeScript

```typescript
const composeImage = async (
  baseImage: Blob,
  overlayImage: Blob,
  coverImage?: Blob,
  options?: Partial<CompositionOptions>
) => {
  // 将 Blob 转换为 Base64
  const toBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const baseImageB64 = await toBase64(baseImage);
  const overlayImageB64 = await toBase64(overlayImage);
  const coverImageB64 = coverImage ? await toBase64(coverImage) : undefined;

  const defaultOptions = {
    posX: 0,
    posY: 0,
    scale: 1,
    opacity: 0.8,
    brightness: 100,
    useCover: true,
    coverOpacity: 1,
  };

  const response = await fetch('/api/compose', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      baseImage: baseImageB64,
      overlayImage: overlayImageB64,
      coverImage: coverImageB64,
      options: { ...defaultOptions, ...options },
    }),
  });

  return response.json();
};
```

### 使用 Python

```python
import requests
import base64
import json

def compose_image(base_image_path, overlay_image_path, cover_image_path=None, options=None):
    # 读取并编码图像
    def image_to_base64(image_path):
        with open(image_path, 'rb') as f:
            return 'data:image/png;base64,' + base64.b64encode(f.read()).decode()
    
    base_image = image_to_base64(base_image_path)
    overlay_image = image_to_base64(overlay_image_path)
    cover_image = image_to_base64(cover_image_path) if cover_image_path else None
    
    default_options = {
        'posX': 0,
        'posY': 0,
        'scale': 1,
        'opacity': 0.8,
        'brightness': 100,
        'useCover': True,
        'coverOpacity': 1
    }
    
    if options:
        default_options.update(options)
    
    payload = {
        'baseImage': base_image,
        'overlayImage': overlay_image,
        'coverImage': cover_image,
        'options': default_options
    }
    
    response = requests.post('http://localhost:8787/api/compose', json=payload)
    return response.json()

# 使用示例
result = compose_image(
    'base.png',
    'overlay.png',
    'cover.png',
    {'posX': 0.1, 'scale': 1.5}
)
```

## 响应格式

### 成功响应 (200 OK)

```json
{
  "success": true,
  "message": "Image composition successful",
  "data": {
    "image": "data:image/png;base64,iVBORw0KGgoAAAANS...",
    "processingTime": 245
  }
}
```

### 错误响应

#### 参数验证错误 (400 Bad Request)

```json
{
  "success": false,
  "message": "Invalid composition options",
  "error": {
    "code": "INVALID_OPTIONS",
    "message": "Options parameters do not meet requirements. Check: posX [-1,1], posY [-1,1], scale [0.1,3], opacity [0,1], brightness [0,200], useCover (boolean), coverOpacity [0,1]"
  }
}
```

#### 缺少必需字段 (400 Bad Request)

```json
{
  "success": false,
  "message": "Missing required fields",
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Request must include: baseImage, overlayImage, and options"
  }
}
```

#### 处理失败 (500 Internal Server Error)

```json
{
  "success": false,
  "message": "Image processing failed",
  "error": {
    "code": "PROCESSING_ERROR",
    "message": "Base image not loaded"
  }
}
```

#### 不支持的请求方法 (405 Method Not Allowed)

```json
{
  "success": false,
  "message": "Method not allowed",
  "error": {
    "code": "METHOD_NOT_ALLOWED",
    "message": "Only POST requests are supported"
  }
}
```

## 响应参数说明

| 字段 | 类型 | 说明 |
|------|------|------|
| success | boolean | 请求是否成功 |
| message | string | 操作消息 |
| data | object | 成功时返回，包含结果图像和处理时间 |
| data.image | string | Base64 编码的结果图像 |
| data.processingTime | number | 服务器处理时间（毫秒） |
| error | object | 失败时返回的错误信息 |
| error.code | string | 错误代码 |
| error.message | string | 错误描述 |

## 注意事项

1. **Base64 编码大小**: 大型图像的 Base64 编码会产生较大的请求体，建议使用压缩或调整图像大小
2. **图像格式**: 虽然支持多种格式，但建议使用 PNG（无损）或 JPG（有损）
3. **透明度**: 覆盖层图像建议使用带 Alpha 通道的格式（如 PNG）以获得最佳效果
4. **性能优化**: 对于批量请求，建议使用流式处理或分批提交

## 支持的图像格式

- PNG
- JPEG
- GIF
- WebP
- BMP
