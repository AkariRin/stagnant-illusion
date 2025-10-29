/**
 * 静滞虚幻 - 图像合成逻辑
 */

export interface CompositionOptions {
  posX: number
  posY: number
  scale: number
  opacity: number
  brightness: number
  useCover: boolean
  coverOpacity: number
}

export class StagnantIllusion {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private currentBaseImg: HTMLImageElement | null = null
  private overlayImg: HTMLImageElement | null = null
  private coverImg: HTMLImageElement | null = null
  private baseScale = 1
  private imagesLoaded = false

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Failed to get 2D context')
    }
    this.ctx = context
  }

  /**
   * 加载覆盖层和封面图像
   */
  async loadAssets(prtsImageUrl: string, coverImageUrl: string): Promise<void> {
    this.overlayImg = new Image()
    this.overlayImg.crossOrigin = 'anonymous'

    this.coverImg = new Image()
    this.coverImg.crossOrigin = 'anonymous'

    await Promise.all([
      new Promise<void>((resolve, reject) => {
        if (this.overlayImg) {
          this.overlayImg.onload = () => {
            console.log('Overlay image loaded:', this.overlayImg?.width, this.overlayImg?.height)
            resolve()
          }
          this.overlayImg.onerror = (e) => {
            console.error('Failed to load overlay image:', e)
            reject(new Error('Failed to load overlay image'))
          }
          this.overlayImg.src = prtsImageUrl
        }
      }),
      new Promise<void>((resolve, reject) => {
        if (this.coverImg) {
          this.coverImg.onload = () => {
            console.log('Cover image loaded:', this.coverImg?.width, this.coverImg?.height)
            resolve()
          }
          this.coverImg.onerror = (e) => {
            console.error('Failed to load cover image:', e)
            reject(new Error('Failed to load cover image'))
          }
          this.coverImg.src = coverImageUrl
        }
      })
    ])

    this.imagesLoaded = true
    console.log('All images loaded successfully')
  }

  /**
   * 设置基础图像
   */
  async setBaseImage(file: File): Promise<void> {
    console.log('Loading base image...')

    this.currentBaseImg = await new Promise<HTMLImageElement>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          console.log('Base image loaded:', img.width, img.height)
          this.canvas.width = img.width
          this.canvas.height = img.height
          console.log('Canvas resized to:', img.width, img.height)
          resolve(img)
        }
        img.onerror = (err) => {
          console.error('Failed to load image:', err)
          reject(new Error('Failed to load image'))
        }
        img.src = e.target?.result as string
      }
      reader.onerror = (err) => {
        console.error('FileReader error:', err)
        reject(new Error('Failed to read file'))
      }
      reader.readAsDataURL(file)
    })

    // 等待覆盖层图像加载完成
    if (!this.imagesLoaded || !this.overlayImg || !this.overlayImg.complete) {
      console.log('Waiting for overlay images to load...')
      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (this.imagesLoaded && this.overlayImg && this.overlayImg.complete) {
            clearInterval(checkInterval)
            console.log('Overlay images ready')
            resolve()
          }
        }, 100)

        // 超时保护
        setTimeout(() => {
          clearInterval(checkInterval)
          console.warn('Timeout waiting for overlay images')
          resolve()
        }, 5000)
      })
    }

    this.baseScale = this.calculateBaseScale()
    console.log('Base scale calculated:', this.baseScale)
  }

  /**
   * 计算基础缩放比例
   */
  private calculateBaseScale(): number {
    if (!this.currentBaseImg || !this.overlayImg) return 1
    const widthRatio = this.currentBaseImg.width / this.overlayImg.width
    const heightRatio = this.currentBaseImg.height / this.overlayImg.height
    return Math.min(widthRatio, heightRatio) * 1.5
  }

  /**
   * 合成图像
   */
  compose(options: CompositionOptions): void {
    if (!this.currentBaseImg) {
      console.log('Cannot compose: No base image loaded')
      return
    }

    if (!this.overlayImg) {
      console.log('Cannot compose: No overlay image loaded')
      return
    }

    if (!this.overlayImg.complete) {
      console.log('Cannot compose: Overlay image not fully loaded yet')
      return
    }

    console.log('Starting composition with options:', options)

    // 清空画布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    // 绘制基础图像（带亮度调整）
    this.ctx.globalAlpha = 1
    this.ctx.filter = `brightness(${options.brightness}%)`
    this.ctx.drawImage(this.currentBaseImg, 0, 0)
    this.ctx.filter = 'brightness(100%)'

    // 创建中间画布用于处理覆盖层效果
    const intermediateCanvas = document.createElement('canvas')
    intermediateCanvas.width = this.canvas.width
    intermediateCanvas.height = this.canvas.height
    const iCtx = intermediateCanvas.getContext('2d')
    if (!iCtx) {
      console.error('Failed to create intermediate canvas context')
      return
    }

    // 绘制半透明黑色背景
    iCtx.fillStyle = 'rgba(0, 0, 0, 0.77)'
    iCtx.fillRect(0, 0, intermediateCanvas.width, intermediateCanvas.height)

    // 计算覆盖层图像的位置和大小
    const scaleFactor = this.baseScale * options.scale
    const posXValue = Math.floor(options.posX * this.canvas.width)
    const posYValue = Math.floor(options.posY * this.canvas.height)

    const imgWidth = this.overlayImg.width * scaleFactor
    const imgHeight = this.overlayImg.height * scaleFactor
    const centerX = (this.canvas.width - imgWidth) / 2 + posXValue
    const centerY = (this.canvas.height - imgHeight) / 2 + posYValue

    // 使用混合模式创建镂空效果
    iCtx.globalCompositeOperation = 'destination-out'
    iCtx.drawImage(this.overlayImg, centerX, centerY, imgWidth, imgHeight)
    iCtx.globalCompositeOperation = 'source-over'
    iCtx.drawImage(this.overlayImg, centerX, centerY, imgWidth, imgHeight)

    // 将中间画布合成到主画布
    this.ctx.globalAlpha = options.opacity
    this.ctx.drawImage(intermediateCanvas, 0, 0)

    // 如果需要，绘制封面图像
    if (options.useCover && this.coverImg && this.coverImg.complete) {
      this.ctx.globalAlpha = options.coverOpacity
      this.ctx.drawImage(this.coverImg, 0, 0, this.canvas.width, this.canvas.height)
    }

    // 重置全局透明度
    this.ctx.globalAlpha = 1

    console.log('Image composed successfully')
  }

  /**
   * 保存当前画布为图像
   */
  saveImage(filename = '下载.png'): void {
    if (!this.currentBaseImg) return
    const link = document.createElement('a')
    link.download = filename
    link.href = this.canvas.toDataURL('image/png')
    link.click()
  }

  /**
   * 检查是否已加载基础图像
   */
  hasBaseImage(): boolean {
    return this.currentBaseImg !== null
  }
}

