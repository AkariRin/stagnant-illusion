/**
 * 图像合成选项接口
 */
export interface CompositionOptions {
  'pos-x': number;
  'pos-y': number;
  scale: number;
  opacity: number;
  brightness: number;
  useCover: boolean;
  coverOpacity: number;
}

/**
 * 图像合成 API 请求体接口
 */
export interface ComposeImageRequest {
  baseImage: string;
  overlayImage: string;
  coverImage?: string;
  options: CompositionOptions;
}

/**
 * 图像合成结果数据
 */
export interface CompositionResult {
  image: string;
  processingTime: number;
}

/**
 * 成功的 API 响应
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  message: string;
  data?: T;
}

/**
 * 错误信息
 */
export interface ErrorInfo {
  code: string;
  message: string;
}

/**
 * 失败的 API 响应
 */
export interface ErrorResponse {
  success: false;
  message: string;
  error: ErrorInfo;
}

/**
 * 图像合成 API 响应
 */
export type ComposeImageResponse =
  | SuccessResponse<CompositionResult>
  | ErrorResponse;

/**
 * 将 base64 字符串转换为 Uint8Array
 */
function base64ToUint8Array(base64String: string): Uint8Array {
  const cleanBase64 = base64String.replace(/^data:image\/\w+;base64,/, '');
  const binaryString = atob(cleanBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * 将 Uint8Array 转换为 base64 字符串
 */
function uint8ArrayToBase64(uint8Array: Uint8Array, mimeType: string = 'image/png'): string {
  let binaryString = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binaryString += String.fromCharCode(uint8Array[i]);
  }
  return `data:${mimeType};base64,${btoa(binaryString)}`;
}

/**
 * 图像处理引擎 - 使用 Web Canvas API（Cloudflare 兼容）
 */
class ImageProcessor {
  private baseImage: HTMLImageElement | null = null;
  private overlayImage: HTMLImageElement | null = null;
  private coverImage: HTMLImageElement | null = null;
  private baseScale: number = 1;

  /**
   * 从 Uint8Array 加载图像
   */
  private async loadImageFromBuffer(imageBuffer: Uint8Array): Promise<HTMLImageElement> {
    const base64String = uint8ArrayToBase64(imageBuffer);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = base64String;
    });
  }

  /**
   * 设置基础图像（底图）
   */
  async setBaseImage(imageBuffer: Uint8Array): Promise<void> {
    this.baseImage = await this.loadImageFromBuffer(imageBuffer);
  }

  /**
   * 设置覆盖层图像
   */
  async setOverlayImage(imageBuffer: Uint8Array): Promise<void> {
    this.overlayImage = await this.loadImageFromBuffer(imageBuffer);
    this.calculateBaseScale();
  }

  /**
   * 设置封面图像（黄色源石）
   */
  async setCoverImage(imageBuffer: Uint8Array): Promise<void> {
    this.coverImage = await this.loadImageFromBuffer(imageBuffer);
  }

  /**
   * 计算基础缩放比例
   */
  private calculateBaseScale(): void {
    if (!this.baseImage || !this.overlayImage) {
      this.baseScale = 1;
      return;
    }
    const widthRatio = this.baseImage.width / this.overlayImage.width;
    const heightRatio = this.baseImage.height / this.overlayImage.height;
    this.baseScale = Math.min(widthRatio, heightRatio) * 1.5;
  }

  /**
   * 合成图像并返回 Uint8Array
   */
  async compose(options: CompositionOptions): Promise<Uint8Array> {
    if (!this.baseImage) {
      throw new Error('Base image not loaded');
    }
    if (!this.overlayImage) {
      throw new Error('Overlay image not loaded');
    }

    // 创建主画布
    const canvas = new OffscreenCanvas(this.baseImage.width, this.baseImage.height);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to create canvas context');
    }

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制基础图像（带亮度调整）
    ctx.globalAlpha = 1;
    this.applyBrightness(ctx, options.brightness);
    ctx.drawImage(this.baseImage, 0, 0, canvas.width, canvas.height);

    // 创建中间画布用于处理覆盖层效果
    const intermediateCanvas = new OffscreenCanvas(canvas.width, canvas.height);
    const iCtx = intermediateCanvas.getContext('2d');

    if (!iCtx) {
      throw new Error('Failed to create intermediate canvas context');
    }

    // 绘制半透明黑色背景
    iCtx.fillStyle = 'rgba(0, 0, 0, 0.77)';
    iCtx.fillRect(0, 0, intermediateCanvas.width, intermediateCanvas.height);

    // 计算覆盖层图像的位置和大小
    const scaleFactor = this.baseScale * options.scale;
    const posXValue = Math.floor(options['pos-x'] * canvas.width);
    const posYValue = Math.floor(options['pos-y'] * canvas.height);

    const imgWidth = this.overlayImage.width * scaleFactor;
    const imgHeight = this.overlayImage.height * scaleFactor;
    const centerX = (canvas.width - imgWidth) / 2 + posXValue;
    const centerY = (canvas.height - imgHeight) / 2 + posYValue;

    // 使用混合模式创建镂空效果
    iCtx.globalCompositeOperation = 'destination-out';
    iCtx.drawImage(this.overlayImage, centerX, centerY, imgWidth, imgHeight);
    iCtx.globalCompositeOperation = 'source-over';
    iCtx.drawImage(this.overlayImage, centerX, centerY, imgWidth, imgHeight);

    // 将中间画布合成到主画布
    ctx.globalAlpha = options.opacity;
    ctx.drawImage(intermediateCanvas as unknown as CanvasImageSource, 0, 0);

    // 如果需要，绘制封面图像
    if (options.useCover && this.coverImage) {
      ctx.globalAlpha = options.coverOpacity;
      ctx.drawImage(this.coverImage, 0, 0, canvas.width, canvas.height);
    }

    // 重置全局透明度
    ctx.globalAlpha = 1;

    // 转换为 PNG Uint8Array
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    return new Uint8Array(await blob.arrayBuffer());
  }

  /**
   * 应用亮度效果到画布上下文
   */
  private applyBrightness(_ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, brightness: number): void {
    if (brightness === 100) {
      return;
    }

    // Canvas filter 属性支持情况因实现而异
    // 该方法预留用于将来的增强
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

  // 验证所有字段的类型和范围
  return (
    typeof opt['pos-x'] === 'number' && opt['pos-x'] >= -1 && opt['pos-x'] <= 1 &&
    typeof opt['pos-y'] === 'number' && opt['pos-y'] >= -1 && opt['pos-y'] <= 1 &&
    typeof opt.scale === 'number' && opt.scale >= 0.1 && opt.scale <= 3 &&
    typeof opt.opacity === 'number' && opt.opacity >= 0 && opt.opacity <= 1 &&
    typeof opt.brightness === 'number' && opt.brightness >= 0 && opt.brightness <= 200 &&
    typeof opt.useCover === 'boolean' &&
    typeof opt.coverOpacity === 'number' && opt.coverOpacity >= 0 && opt.coverOpacity <= 1
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
    if (!requestData.baseImage || !requestData.overlayImage || !requestData.options) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Missing required fields',
          error: {
            code: 'INVALID_REQUEST',
            message:
              'Request must include: baseImage, overlayImage, and options',
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
    if (!validateCompositionOptions(requestData.options)) {
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
      const baseImageBuffer = base64ToUint8Array(requestData.baseImage);
      const overlayImageBuffer = base64ToUint8Array(requestData.overlayImage);

      await processor.setBaseImage(baseImageBuffer);
      await processor.setOverlayImage(overlayImageBuffer);

      // 如果提供了封面图像，加载它
      if (requestData.coverImage) {
        const coverImageBuffer = base64ToUint8Array(requestData.coverImage);
        await processor.setCoverImage(coverImageBuffer);
      }

      // 执行图像合成
      const resultBuffer = await processor.compose(requestData.options);
      const processingTime = Date.now() - startTime;

      const response: ComposeImageResponse = {
        success: true,
        message: 'Image composition successful',
        data: {
          image: uint8ArrayToBase64(resultBuffer, 'image/png'),
          processingTime,
        },
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
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
