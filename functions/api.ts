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
  useCover: boolean;
  coverOpacity: number;
  image: string;
}

/**
 * 图像合成选项接口（与 ComposeImageRequest 保持一致）
 */
export type CompositionOptions = Omit<ComposeImageRequest, 'image'>;

function base64ToBuffer(base64String: string): Uint8Array {
  // 移除 data: URI scheme 和 mime type
  const cleanBase64 = base64String.split(',')[1] || base64String;
  const binaryString = atob(cleanBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * 加载资源图片（使用 base64 编码）
 */
function loadAssetImage(filename: string): Uint8Array {
  let base64Data: string;

  if (filename === 'stagnant-illusion.png') {
    base64Data = STAGNANT_ILLUSION_BASE64;
  } else if (filename === 'yellow.png') {
    base64Data = YELLOW_BASE64;
  } else {
    throw new Error(`Unsupported asset file: ${filename}`);
  }

  if (!base64Data) {
    throw new Error(`Base64 data for ${filename} is not configured`);
  }

  return base64ToBuffer(base64Data);
}

/**
 * 图像处理引擎 - 使用 jimp 进行像素级操作
 */
class ImageProcessor {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private baseImage: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private overlayImage: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private coverImage: any = null;

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
    const resultImage = this.baseImage.clone();

    // 应用亮度调整
    if (options.brightness !== 100) {
      const brightnessFactor = options.brightness / 100;
      resultImage.brightness(brightnessFactor - 1);
    }

    // 确定要使用的覆盖图像
    let overlayToUse = this.overlayImage;
    let overlayOpacity = options.opacity;

    if (options.useCover && this.coverImage) {
      overlayToUse = this.coverImage;
      overlayOpacity = options.coverOpacity;
    }

    if (!overlayToUse) {
      throw new Error('Overlay image not loaded');
    }

    // 克隆覆盖图像用于叠加
    let compositeImage = overlayToUse.clone();

    // 计算缩放后的尺寸
    const baseWidth = resultImage.bitmap.width;
    const baseHeight = resultImage.bitmap.height;
    const overlayWidth = compositeImage.bitmap.width;
    const overlayHeight = compositeImage.bitmap.height;

    // 验证所有尺寸都是有效的正整数
    if (!Number.isFinite(baseWidth) || !Number.isFinite(baseHeight) || baseWidth <= 0 || baseHeight <= 0) {
      throw new Error(`Invalid base image dimensions: width=${baseWidth}, height=${baseHeight}. Dimensions must be positive finite numbers.`);
    }

    if (!Number.isFinite(overlayWidth) || !Number.isFinite(overlayHeight) || overlayWidth <= 0 || overlayHeight <= 0) {
      throw new Error(`Invalid overlay image dimensions: width=${overlayWidth}, height=${overlayHeight}. Dimensions must be positive finite numbers.`);
    }

    const scaledWidth = Math.round(baseWidth * options.scale);
    const scaledHeight = Math.round((overlayHeight / overlayWidth) * scaledWidth);

    // 缩放覆盖图像
    compositeImage = compositeImage.resize({
      w: scaledWidth,
      h: scaledHeight,
    });

    // 计算位置（pos-x 和 pos-y 范围是 [-1, 1]，转换为实际像素位置）
    const posX = Math.round(((options['pos-x'] + 1) / 2) * baseWidth - scaledWidth / 2);
    const posY = Math.round(((options['pos-y'] + 1) / 2) * baseHeight - scaledHeight / 2);

    // 验证位置值必须是有效的数字
    if (!Number.isFinite(posX) || !Number.isFinite(posY)) {
      throw new Error(`Invalid position coordinates: x=${posX}, y=${posY}. Ensure image dimensions are valid numbers.`);
    }

    // 应用透明度
    compositeImage.opacity(overlayOpacity);

    // 将覆盖图像合成到基础图像上
    resultImage.composite(compositeImage, {
      x: posX,
      y: posY,
    });

    // 将结果转换为 PNG Buffer
    const result = await resultImage.png().toBuffer();
    // 确保返回 Uint8Array 格式以兼容 Workers 环境
    if (result instanceof Uint8Array) {
      return result;
    }
    return new Uint8Array(result);
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
  const requiredFields = ['pos-x', 'pos-y', 'scale', 'opacity', 'brightness', 'useCover', 'coverOpacity'];

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
    typeof opt.useCover === 'boolean' &&
    typeof opt.coverOpacity === 'number' && Number.isFinite(opt.coverOpacity) && opt.coverOpacity >= 0 && opt.coverOpacity <= 1
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
              'Options parameters do not meet requirements. Check: pos-x [-1,1], pos-y [-1,1], scale [0.1,3], opacity [0,1], brightness [0,200], useCover (boolean), coverOpacity [0,1]',
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
      if (requestData.useCover) {
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
