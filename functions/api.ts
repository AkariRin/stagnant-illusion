import { Jimp } from 'jimp';
import { STAGNANT_ILLUSION_BASE64, YELLOW_BASE64 } from './base64';

/**
 * 图像合成 API 请求体接口
 */
export interface ComposeImageRequest {
  // 图像合成选项
  'pos-x': number;
  'pos-y': number;
  scale: number;
  opacity: number;
  brightness: number;
  yellow: boolean;
  yellowOpacity: number;
  image: string;
}

/**
 * 图像合成选项接口（与 ComposeImageRequest 保持一致）
 */
export type CompositionOptions = Omit<ComposeImageRequest, 'image'>;

function base64ToBuffer(base64String: string): Uint8Array {
  if (!base64String || typeof base64String !== 'string') {
    throw new Error('Invalid base64 string: input must be a non-empty string');
  }

  // 移除 data: URI scheme 和 mime type
  const cleanBase64 = base64String.includes(',') ? base64String.split(',')[1] : base64String;

  if (!cleanBase64 || cleanBase64.length === 0) {
    throw new Error('Invalid base64 string: no data found after removing URI scheme');
  }

  // 尝试解码，捕获可能的 base64 解码错误
  let binaryString: string;
  try {
    binaryString = atob(cleanBase64.trim());
  } catch (error) {
    throw new Error(`Failed to decode base64 string: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  if (!binaryString || binaryString.length === 0) {
    throw new Error('Failed to decode base64 string: decoded data is empty');
  }

  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * 图像处理引擎 - 使用 jimp 进行像素级操作
 */
class ImageProcessor {
  private baseImage: Awaited<ReturnType<typeof Jimp.read>> | null = null;
  private overlayImage: Awaited<ReturnType<typeof Jimp.read>> | null = null;
  private coverImage: Awaited<ReturnType<typeof Jimp.read>> | null = null;

  /**
   * 加载基础图像（底图）
   */
  async setBaseImage(imageBuffer: Uint8Array): Promise<void> {
    this.baseImage = await Jimp.read(imageBuffer.buffer as ArrayBuffer);
  }

  /**
   * 加载覆盖层图像
   */
  async setOverlayImage(imageBuffer: Uint8Array): Promise<void> {
    this.overlayImage = await Jimp.read(imageBuffer.buffer as ArrayBuffer);
  }

  /**
   * 加载封面图像（黄色源石）
   */
  async setCoverImage(imageBuffer: Uint8Array): Promise<void> {
    this.coverImage = await Jimp.read(imageBuffer.buffer as ArrayBuffer);
  }

  /**
   * 图像合成 - 使用 jimp 实现完整的像素级合成
   */
  async compose(options: CompositionOptions): Promise<Uint8Array> {
    if (!this.baseImage) {
      throw new Error('Base image not loaded');
    }
    if (!this.overlayImage) {
      throw new Error('Overlay image not loaded');
    }

    // 克隆基础图像，避免修改原始数据
    let resultImage = this.baseImage.clone();

    // 应用亮度调整
    if (options.brightness !== 100) {
      const brightnessFactor = (options.brightness / 100) - 1;
      resultImage.brightness(brightnessFactor);
    }

    // 第一步：应用 stagnant illusion 覆盖层
    resultImage = await this.applyOverlay(resultImage, this.overlayImage, options.opacity, options['pos-x'], options['pos-y'], options.scale);

    // 第二步：如果 yellow 为 true，再应用 yellow 覆盖层
    if (options.yellow && this.coverImage) {
      resultImage = await this.applyOverlay(resultImage, this.coverImage, options.yellowOpacity, options['pos-x'], options['pos-y'], options.scale);
    }

    // 将结果转换为 PNG Buffer
    try {
      // 使用 Jimp 的 getBuffer 方法导出 PNG
      const pngBuffer = await resultImage.getBuffer('image/png');

      // 确保返回 Uint8Array 格式以兼容 Workers 环境
      if (pngBuffer instanceof Uint8Array) {
        return pngBuffer;
      }
      // 将 ArrayBuffer 或其他格式转换为 Uint8Array
      // 如果是 ArrayBuffer，直接创建 Uint8Array
      return new Uint8Array(pngBuffer as ArrayBufferLike);
    } catch (pngError: unknown) {
      const errorMsg = pngError instanceof Error ? pngError.message : String(pngError);
      throw new Error(`Failed to encode PNG: ${errorMsg}`);
    }
  }

  /**
   * 应用单个覆盖层到图像上
   */
  private async applyOverlay(
    baseImage: Awaited<ReturnType<typeof Jimp.read>>,
    overlayImage: Awaited<ReturnType<typeof Jimp.read>>,
    opacity: number,
    posX: number,
    posY: number,
    scale: number
  ): Promise<Awaited<ReturnType<typeof Jimp.read>>> {
    // 克隆覆盖图像用于叠加
    const compositeImage = overlayImage.clone();

    // 计算缩放后的尺寸
    const baseWidth = baseImage.bitmap.width;
    const baseHeight = baseImage.bitmap.height;
    const overlayWidth = compositeImage.bitmap.width;
    const overlayHeight = compositeImage.bitmap.height;

    // 验证所有尺寸都是有效的正整数
    if (!Number.isInteger(baseWidth) || !Number.isInteger(baseHeight) || baseWidth <= 0 || baseHeight <= 0) {
      throw new Error(`Invalid base image dimensions: width=${baseWidth}, height=${baseHeight}. Dimensions must be positive integers.`);
    }

    if (!Number.isInteger(overlayWidth) || !Number.isInteger(overlayHeight) || overlayWidth <= 0 || overlayHeight <= 0) {
      throw new Error(`Invalid overlay image dimensions: width=${overlayWidth}, height=${overlayHeight}. Dimensions must be positive integers.`);
    }

    const scaledWidth = Math.round(baseWidth * scale);
    const scaledHeight = Math.round((overlayHeight / overlayWidth) * scaledWidth);

    // 验证缩放尺寸
    if (!Number.isInteger(scaledWidth) || !Number.isInteger(scaledHeight) || scaledWidth <= 0 || scaledHeight <= 0) {
      throw new Error(`Invalid scaled dimensions: width=${scaledWidth}, height=${scaledHeight}. Dimensions must be positive integers.`);
    }

    // 缩放覆盖图像 - 使用 Jimp v1.6.0 的 resize 方法
    compositeImage.resize({ w: scaledWidth, h: scaledHeight });

    // 计算位置（pos-x 和 pos-y 范围是 [-1, 1]，转换为实际像素位置）
    const posXRaw = ((posX + 1) / 2) * baseWidth - scaledWidth / 2;
    const posYRaw = ((posY + 1) / 2) * baseHeight - scaledHeight / 2;

    // 强制转换为整数
    const finalPosX = Math.round(posXRaw);
    const finalPosY = Math.round(posYRaw);

    // 详细的坐标验证信息
    if (!Number.isInteger(finalPosX) || !Number.isInteger(finalPosY)) {
      throw new Error(
        `Invalid position coordinates: x=${finalPosX} (raw: ${posXRaw}), y=${finalPosY} (raw: ${posYRaw}). ` +
        `Base dimensions: ${baseWidth}x${baseHeight}, Scaled dimensions: ${scaledWidth}x${scaledHeight}, ` +
        `Options: pos-x=${posX}, pos-y=${posY}`
      );
    }

    // 验证类型和范围
    if (!Number.isFinite(finalPosX) || !Number.isFinite(finalPosY)) {
      throw new Error(
        `Final position coordinates are not finite: x=${finalPosX}, y=${finalPosY}`
      );
    }

    // 应用透明度处理 - 通过调整透明度通道
    if (opacity < 1) {
      compositeImage.opacity(opacity);
    }

    // 将覆盖图像合成到基础图像上
    if (!baseImage || !compositeImage) {
      throw new Error('Image objects are not properly initialized before composite');
    }

    console.log(`[Composite] Position: x=${finalPosX}, y=${finalPosY}`);
    console.log(`[Composite] Base size: ${baseImage.bitmap.width}x${baseImage.bitmap.height}`);
    console.log(`[Composite] Overlay size: ${compositeImage.bitmap.width}x${compositeImage.bitmap.height}`);

    try {
      // 使用手动像素操作进行合成
      const baseData = baseImage.bitmap.data;
      const overlayData = compositeImage.bitmap.data;

      const baseWidth = baseImage.bitmap.width;
      const baseHeight = baseImage.bitmap.height;
      const overlayWidth = compositeImage.bitmap.width;
      const overlayHeight = compositeImage.bitmap.height;

      // 遍历覆盖层的每一个像素
      for (let y = 0; y < overlayHeight; y++) {
        for (let x = 0; x < overlayWidth; x++) {
          // 计算覆盖层在基础图像中的位置
          const baseX = finalPosX + x;
          const baseY = finalPosY + y;

          // 检查是否在基础图像范围内
          if (baseX >= 0 && baseX < baseWidth && baseY >= 0 && baseY < baseHeight) {
            // 计算像素索引
            const overlayIdx = (y * overlayWidth + x) * 4;
            const baseIdx = (baseY * baseWidth + baseX) * 4;

            // 获取覆盖层像素的 RGBA 值
            const oR = overlayData[overlayIdx];
            const oG = overlayData[overlayIdx + 1];
            const oB = overlayData[overlayIdx + 2];
            const oA = overlayData[overlayIdx + 3] / 255;

            // 获取基础层像素的 RGBA 值
            const bR = baseData[baseIdx];
            const bG = baseData[baseIdx + 1];
            const bB = baseData[baseIdx + 2];
            const bA = baseData[baseIdx + 3] / 255;

            // Alpha 合成
            const outA = oA + bA * (1 - oA);

            if (outA > 0) {
              baseData[baseIdx] = Math.round((oR * oA + bR * bA * (1 - oA)) / outA);
              baseData[baseIdx + 1] = Math.round((oG * oA + bG * bA * (1 - oA)) / outA);
              baseData[baseIdx + 2] = Math.round((oB * oA + bB * bA * (1 - oA)) / outA);
              baseData[baseIdx + 3] = Math.round(outA * 255);
            }
          }
        }
      }

    } catch (compositeError: unknown) {
      const errorMsg = compositeError instanceof Error ? compositeError.message : String(compositeError);
      console.error(`[Composite Error] ${errorMsg}`);

      throw new Error(
        `Image composite operation failed: ${errorMsg}. ` +
        `Position: x=${finalPosX}, y=${finalPosY}`
      );
    }

    return baseImage;
  }
}

/**
 * 验证组合参数
 */
function validateCompositionOptions(options: unknown): options is CompositionOptions {
  if (typeof options !== 'object' || options === null) {
    return false;
  }

  const opt = options as Record<string, unknown>;
  const requiredFields = ['pos-x', 'pos-y', 'scale', 'opacity', 'brightness', 'yellow', 'yellowOpacity'];

  // 检查所有必需字段是否存在
  for (const field of requiredFields) {
    if (!(field in opt)) {
      return false;
    }
  }

  // 验证所有字段的类型和范围，并检查NaN/Infinity
  return (
    typeof opt['pos-x'] === 'number' && Number.isFinite(opt['pos-x']) && opt['pos-x'] >= -1 && opt['pos-x'] <= 1 &&
    typeof opt['pos-y'] === 'number' && Number.isFinite(opt['pos-y']) && opt['pos-y'] >= -1 && opt['pos-y'] <= 1 &&
    typeof opt.scale === 'number' && Number.isFinite(opt.scale) && opt.scale >= 0.1 && opt.scale <= 3 &&
    typeof opt.opacity === 'number' && Number.isFinite(opt.opacity) && opt.opacity >= 0 && opt.opacity <= 1 &&
    typeof opt.brightness === 'number' && Number.isFinite(opt.brightness) && opt.brightness >= 0 && opt.brightness <= 200 &&
    typeof opt.yellow === 'boolean' &&
    typeof opt.yellowOpacity === 'number' && Number.isFinite(opt.yellowOpacity) && opt.yellowOpacity >= 0 && opt.yellowOpacity <= 1
  );
}


/**
 * 图像合成 API 端点
 * 注意：这是导出给 Cloudflare Pages 作为 API 处理器使用的
 */
// @ts-expect-error - onRequest is used by Cloudflare Pages runtime
export const onRequest: PagesFunction = async (context: PagesContext): Promise<Response> => {
  // 仅接受 POST 请求
  if (context.request.method !== 'POST') {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Method not allowed',
        error: {
          code: 'METHOD_NOT_ALLOWED',
          message: 'Only POST requests are supported',
        },
      }),
      {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  try {
    // 解析请求体
    const contentType = context.request.headers.get('content-type') || '';

    if (!contentType.includes('application/json')) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Invalid content type',
          error: {
            code: 'INVALID_CONTENT_TYPE',
            message: 'Content-Type must be application/json',
          },
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const requestData = await context.request.json() as ComposeImageRequest;

    // 验证必需字段
    if (!requestData.image) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Missing required fields',
          error: {
            code: 'INVALID_REQUEST',
            message:
              'Request must include: image',
          },
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // 验证选项参数
    if (!validateCompositionOptions(requestData)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Invalid composition options',
          error: {
            code: 'INVALID_OPTIONS',
            message:
              'Options parameters do not meet requirements. Check: pos-x [-1,1], pos-y [-1,1], scale [0.1,3], opacity [0,1], brightness [0,200], yellow (boolean), yellowOpacity [0,1]',
          },
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const startTime = Date.now();
    const processor = new ImageProcessor();

    try {
      // 加载图像
      const baseImageBuffer = base64ToBuffer(requestData.image);
      // 从头部导入的 base64 加载 overlay 图像
      const overlayImageBuffer = base64ToBuffer(STAGNANT_ILLUSION_BASE64);

      await processor.setBaseImage(baseImageBuffer);
      await processor.setOverlayImage(overlayImageBuffer);

      // 如果需要 cover，从头部导入的 base64 加载
      if (requestData.yellow) {
        const coverImageBuffer = base64ToBuffer(YELLOW_BASE64);
        await processor.setCoverImage(coverImageBuffer);
      }

      // 执行图像合成
      const resultBuffer = await processor.compose(requestData);
      const processingTime = Date.now() - startTime;

      return new Response(resultBuffer.buffer as ArrayBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Access-Control-Allow-Origin': '*',
          'X-Processing-Time': processingTime.toString(),
        },
      });
    } catch (processingError: unknown) {
      const errorMessage = processingError instanceof Error
        ? processingError.message
        : 'An error occurred during image processing';
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Image processing failed',
          error: {
            code: 'PROCESSING_ERROR',
            message: errorMessage,
          },
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error
      ? error.message
      : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Server error',
        error: {
          code: 'SERVER_ERROR',
          message: errorMessage,
        },
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
};
