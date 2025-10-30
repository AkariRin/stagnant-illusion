<template>
  <v-app>
    <v-app-bar color="grey-darken-3" prominent>
      <img src="@/assets/stagnant-illusion-no-bg.png" alt="logo" style="height: 50px; margin-right: 12px;">
      <v-app-bar-title>静滞虚幻</v-app-bar-title>
      <v-spacer></v-spacer>
      <v-btn
        icon="mdi-github"
        href="https://github.com/AkariRin/stagnant-illusion"
        target="_blank"
        rel="noopener noreferrer"
      ></v-btn>
    </v-app-bar>
    <v-main class="glass-background">
      <v-container class="py-8">
        <v-card max-width="800" class="mx-auto elevation-2" style="background-color: rgba(255, 255, 255, 0.7);">
          <v-card-text>
            <v-file-input
              v-model="baseImageFile"
              label="选择底图"
              accept="image/*"
              prepend-icon="mdi-image"
              @update:model-value="handleImageUpload"
              variant="underlined"
              class="mb-4"
              :loading="loading"
              :disabled="loading"
            ></v-file-input>
            <v-divider class="my-4"></v-divider>
            <div class="mb-4">
              <v-row align="center">
                <v-col cols="3">
                  <span>水平偏移:</span>
                </v-col>
                <v-col cols="6">
                  <v-slider
                    v-model="posX"
                    :min="-1"
                    :max="1"
                    :step="0.01"
                    @update:model-value="composeImages"
                    hide-details
                  ></v-slider>
                </v-col>
                <v-col cols="3">
                  <v-text-field
                    v-model.number="posX"
                    type="number"
                    :min="-1"
                    :max="1"
                    :step="0.01"
                    @update:model-value="composeImages"
                    density="compact"
                    hide-details
                    variant="underlined"
                  ></v-text-field>
                </v-col>
              </v-row>
            </div>
            <div class="mb-4">
              <v-row align="center">
                <v-col cols="3">
                  <span>垂直偏移:</span>
                </v-col>
                <v-col cols="6">
                  <v-slider
                    v-model="posY"
                    :min="-1"
                    :max="1"
                    :step="0.01"
                    @update:model-value="composeImages"
                    hide-details
                  ></v-slider>
                </v-col>
                <v-col cols="3">
                  <v-text-field
                    v-model.number="posY"
                    type="number"
                    :min="-1"
                    :max="1"
                    :step="0.01"
                    @update:model-value="composeImages"
                    density="compact"
                    hide-details
                    variant="underlined"
                  ></v-text-field>
                </v-col>
              </v-row>
            </div>
            <div class="mb-4">
              <v-row align="center">
                <v-col cols="3">
                  <span>缩放大小:</span>
                </v-col>
                <v-col cols="6">
                  <v-slider
                    v-model="scale"
                    :min="0.1"
                    :max="3"
                    :step="0.01"
                    @update:model-value="composeImages"
                    hide-details
                  ></v-slider>
                </v-col>
                <v-col cols="3">
                  <v-text-field
                    v-model.number="scale"
                    type="number"
                    :min="0.1"
                    :max="3"
                    :step="0.01"
                    @update:model-value="composeImages"
                    density="compact"
                    hide-details
                    variant="underlined"
                  ></v-text-field>
                </v-col>
              </v-row>
            </div>
            <div class="mb-4">
              <v-row align="center">
                <v-col cols="3">
                  <span>透明程度:</span>
                </v-col>
                <v-col cols="6">
                  <v-slider
                    v-model="opacity"
                    :min="0"
                    :max="1"
                    :step="0.01"
                    @update:model-value="composeImages"
                    hide-details
                  ></v-slider>
                </v-col>
                <v-col cols="3">
                  <v-text-field
                    v-model.number="opacity"
                    type="number"
                    :min="0"
                    :max="1"
                    :step="0.01"
                    @update:model-value="composeImages"
                    density="compact"
                    hide-details
                    variant="underlined"
                  ></v-text-field>
                </v-col>
              </v-row>
            </div>
            <div class="mb-4">
              <v-row align="center">
                <v-col cols="3">
                  <span>底图亮度:</span>
                </v-col>
                <v-col cols="6">
                  <v-slider
                    v-model="brightness"
                    :min="0"
                    :max="200"
                    :step="0.01"
                    @update:model-value="composeImages"
                    hide-details
                  ></v-slider>
                </v-col>
                <v-col cols="3">
                  <v-text-field
                    v-model.number="brightness"
                    type="number"
                    :min="0"
                    :max="200"
                    :step="0.01"
                    @update:model-value="composeImages"
                    density="compact"
                    hide-details
                    variant="underlined"
                  ></v-text-field>
                </v-col>
              </v-row>
            </div>
            <div class="mb-4">
              <v-checkbox
                v-model="useCover"
                label="黄色源石"
                @update:model-value="composeImages"
                hide-details
              ></v-checkbox>
            </div>
            <div v-if="useCover" class="mb-4">
              <v-row align="center">
                <v-col cols="3">
                  <span>透明程度:</span>
                </v-col>
                <v-col cols="6">
                  <v-slider
                    v-model="coverOpacity"
                    :min="0"
                    :max="1"
                    :step="0.01"
                    @update:model-value="composeImages"
                    hide-details
                  ></v-slider>
                </v-col>
                <v-col cols="3">
                  <v-text-field
                    v-model.number="coverOpacity"
                    type="number"
                    :min="0"
                    :max="1"
                    :step="0.01"
                    @update:model-value="composeImages"
                    density="compact"
                    hide-details
                    variant="underlined"
                  ></v-text-field>
                </v-col>
              </v-row>
            </div>
            <v-divider class="my-4"></v-divider>
            <v-btn-group variant="flat" class="mb-4">
              <v-btn color="error" @click="restoreDefault">恢复默认</v-btn>
              <v-btn color="success" @click="saveImage">保存图片</v-btn>
            </v-btn-group>

            <!-- 画布 -->
            <div class="text-center position-relative">
              <canvas
                ref="canvasRef"
                style="max-width: 100%; border: 1px solid #ccc"
              ></canvas>
              <v-overlay
                :model-value="loading"
                contained
                class="align-center justify-center"
              >
                <v-progress-circular
                  indeterminate
                  size="64"
                  color="primary"
                ></v-progress-circular>
              </v-overlay>
            </div>
          </v-card-text>
        </v-card>
      </v-container>
    </v-main>
    <v-snackbar
      v-model="showSnackbar"
      :timeout="3000"
      color="error"
      location="bottom"
    >
      {{ snackbarMessage }}
    </v-snackbar>
  </v-app>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'

interface CompositionOptions {
  posX: number
  posY: number
  scale: number
  opacity: number
  brightness: number
  useCover: boolean
  coverOpacity: number
}

const canvasRef = ref<HTMLCanvasElement | null>(null)
const baseImageFile = ref<File[]>([])
const loading = ref(false)
const showSnackbar = ref(false)
const snackbarMessage = ref('')

const posX = ref(0)
const posY = ref(0)
const scale = ref(1)
const opacity = ref(0.8)
const brightness = ref(100)
const useCover = ref(true)
const coverOpacity = ref(1)

// 图像合成状态
let ctx: CanvasRenderingContext2D | null = null
let currentBaseImg: HTMLImageElement | null = null
let overlayImg: HTMLImageElement | null = null
let coverImg: HTMLImageElement | null = null
let baseScale = 1
let imagesLoaded = false
let baseImageFileName = ''

/**
 * 加载覆盖层和封面图像
 */
async function loadAssets(prtsImageUrl: string, coverImageUrl: string): Promise<void> {
  overlayImg = new Image()
  overlayImg.crossOrigin = 'anonymous'

  coverImg = new Image()
  coverImg.crossOrigin = 'anonymous'

  await Promise.all([
    new Promise<void>((resolve, reject) => {
      if (overlayImg) {
        overlayImg.onload = () => {
          console.log('覆盖层图像已加载:', overlayImg?.width, overlayImg?.height)
          resolve()
        }
        overlayImg.onerror = (e) => {
          console.error('覆盖层图像加载失败:', e)
          reject(new Error('覆盖层图像加载失败'))
        }
        overlayImg.src = prtsImageUrl
      }
    }),
    new Promise<void>((resolve, reject) => {
      if (coverImg) {
        coverImg.onload = () => {
          console.log('封面图像已加载:', coverImg?.width, coverImg?.height)
          resolve()
        }
        coverImg.onerror = (e) => {
          console.error('封面图像加载失败:', e)
          reject(new Error('封面图像加载失败'))
        }
        coverImg.src = coverImageUrl
      }
    })
  ])

  imagesLoaded = true
  console.log('所有图像加载成功')
}

/**
 * 计算基础缩放比例
 */
function calculateBaseScale(): number {
  if (!currentBaseImg || !overlayImg) return 1
  const widthRatio = currentBaseImg.width / overlayImg.width
  const heightRatio = currentBaseImg.height / overlayImg.height
  return Math.min(widthRatio, heightRatio) * 1.5
}

/**
 * 设置基础图像
 */
async function setBaseImage(file: File): Promise<void> {
  console.log('正在加载底图...')

  currentBaseImg = await new Promise<HTMLImageElement>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        console.log('底图已加载:', img.width, img.height)
        if (canvasRef.value) {
          canvasRef.value.width = img.width
          canvasRef.value.height = img.height
          console.log('画布尺寸已调整为:', img.width, img.height)
        }
        resolve(img)
      }
      img.onerror = (err) => {
        console.error('加载图像失败:', err)
        reject(new Error('图像加载失败'))
      }
      img.src = e.target?.result as string
    }
    reader.onerror = (err) => {
      console.error('文件读取出错:', err)
      reject(new Error('文件读取失败'))
    }
    reader.readAsDataURL(file)
  })

  // 等待覆盖层图像加载完成
  if (!imagesLoaded || !overlayImg || !overlayImg.complete) {
    console.log('正在等待覆盖层图像加载...')
    await new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (imagesLoaded && overlayImg && overlayImg.complete) {
          clearInterval(checkInterval)
          console.log('覆盖层图像已就绪')
          resolve()
        }
      }, 100)

      // 超时保护
      setTimeout(() => {
        clearInterval(checkInterval)
        console.warn('等待覆盖层图像超时')
        resolve()
      }, 5000)
    })
  }

  baseScale = calculateBaseScale()
  console.log('基础缩放比例已计算:', baseScale)
}

/**
 * 合成图像
 */
function compose(options: CompositionOptions): void {
  if (!currentBaseImg) {
    console.log('无法合成: 未加载底图')
    return
  }

  if (!overlayImg) {
    console.log('无法合成: 未加载覆盖层图像')
    return
  }

  if (!overlayImg.complete) {
    console.log('无法合成: 覆盖层图像加载未完成')
    return
  }

  if (!ctx || !canvasRef.value) {
    console.log('无法合成: 画布上下文未初始化')
    return
  }

  console.log('开始合成图像，选项:', options)

  // 清空画布
  ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)

  // 绘制基础图像（带亮度调整）
  ctx.globalAlpha = 1
  ctx.filter = `brightness(${options.brightness}%)`
  ctx.drawImage(currentBaseImg, 0, 0)
  ctx.filter = 'brightness(100%)'

  // 创建中间画布用于处理覆盖层效果
  const intermediateCanvas = document.createElement('canvas')
  intermediateCanvas.width = canvasRef.value.width
  intermediateCanvas.height = canvasRef.value.height
  const iCtx = intermediateCanvas.getContext('2d')
  if (!iCtx) {
    console.error('创建中间画布上下文失败')
    return
  }

  // 绘制半透明黑色背景
  iCtx.fillStyle = 'rgba(0, 0, 0, 0.77)'
  iCtx.fillRect(0, 0, intermediateCanvas.width, intermediateCanvas.height)

  // 计算覆盖层图像的位置和大小
  const scaleFactor = baseScale * options.scale
  const posXValue = Math.floor(options.posX * canvasRef.value.width)
  const posYValue = Math.floor(options.posY * canvasRef.value.height)

  const imgWidth = overlayImg.width * scaleFactor
  const imgHeight = overlayImg.height * scaleFactor
  const centerX = (canvasRef.value.width - imgWidth) / 2 + posXValue
  const centerY = (canvasRef.value.height - imgHeight) / 2 + posYValue

  // 使用混合模式创建镂空效果
  iCtx.globalCompositeOperation = 'destination-out'
  iCtx.drawImage(overlayImg, centerX, centerY, imgWidth, imgHeight)
  iCtx.globalCompositeOperation = 'source-over'
  iCtx.drawImage(overlayImg, centerX, centerY, imgWidth, imgHeight)

  // 将中间画布合成到主画布
  ctx.globalAlpha = options.opacity
  ctx.drawImage(intermediateCanvas, 0, 0)

  // 如果需要，绘制封面图像
  if (options.useCover && coverImg && coverImg.complete) {
    ctx.globalAlpha = options.coverOpacity
    ctx.drawImage(coverImg, 0, 0, canvasRef.value.width, canvasRef.value.height)
  }

  // 重置全局透明度
  ctx.globalAlpha = 1

  console.log('图像合成成功')
}

/**
 * 检查是否已加载基础图像
 */
function hasBaseImage(): boolean {
  return currentBaseImg !== null
}

/**
 * 保存当前画布为图像
 */
function saveImageToFile(filename = '下载.png'): void {
  if (!currentBaseImg || !canvasRef.value) return
  const link = document.createElement('a')
  link.download = filename
  link.href = canvasRef.value.toDataURL('image/png')
  link.click()
}

onMounted(async () => {
  if (!canvasRef.value) return

  // 获取2D上下文
  ctx = canvasRef.value.getContext('2d')
  if (!ctx) {
    console.error('获取2D上下文失败')
    return
  }

  // 动态导入图像
  const [prtsModule, coverModule] = await Promise.all([
    import('@/assets/stagnant-illusion.png'),
    import('@/assets/yellow.png')
  ])

  // 加载资源
  try {
    await loadAssets(prtsModule.default, coverModule.default)
  } catch (error) {
    console.error('资源加载失败:', error)
  }
})

function getCompositionOptions(): CompositionOptions {
  return {
    posX: posX.value,
    posY: posY.value,
    scale: scale.value,
    opacity: opacity.value,
    brightness: brightness.value,
    useCover: useCover.value,
    coverOpacity: coverOpacity.value
  }
}

function restoreDefault() {
  if (!hasBaseImage()) return
  scale.value = 1
  posX.value = 0
  posY.value = 0
  opacity.value = 0.8
  brightness.value = 100
  coverOpacity.value = 1
  useCover.value = true
  composeImages()
}

function composeImages() {
  compose(getCompositionOptions())
}

async function handleImageUpload(files: File | File[] | null) {
  const file = Array.isArray(files) ? files[0] : files
  if (!file) {
    console.log('未选择文件')
    return
  }

  loading.value = true
  try {
    console.log('开始上传图片:', file.name)
    baseImageFileName = file.name
    await setBaseImage(file)
    console.log('底图设置成功')

    // 重置为默认值
    scale.value = 1
    posX.value = 0
    posY.value = 0
    opacity.value = 0.8
    brightness.value = 100
    useCover.value = true
    coverOpacity.value = 1

    // 等待Vue更新反应状态
    await nextTick()

    // 合成图像
    console.log('使用默认选项合成图像')
    composeImages()
  } catch (error) {
    console.error('加载底图失败:', error)
   snackbarMessage.value = '图片加载失败，请重试'
    showSnackbar.value = true
  } finally {
    loading.value = false
  }
}

function saveImage() {
  if (!hasBaseImage()) return
  // 从原始文件名中提取名称部分（不包括扩展名）
  const nameWithoutExt = baseImageFileName.substring(0, baseImageFileName.lastIndexOf('.')) || baseImageFileName
  const filename = `${nameWithoutExt}-prts.png`
  saveImageToFile(filename)
}
</script>

<style scoped>
.glass-background {
  position: relative !important;
  min-height: 100vh;
  background: linear-gradient(
    135deg,
    rgba(55, 65, 81, 0.35) 0%,
    rgba(55, 65, 81, 0.3) 40%,
    rgba(220, 38, 38, 0.12) 70%,
    rgba(55, 65, 81, 0.28) 100%
  ) !important;
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
}

.glass-background::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(circle at 20% 50%, rgba(220, 38, 38, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(55, 65, 81, 0.25) 0%, transparent 50%),
    radial-gradient(circle at 40% 20%, rgba(255, 255, 255, 0.06) 0%, transparent 40%);
  pointer-events: none;
  z-index: 0;
}

.glass-background::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    45deg,
    rgba(55, 65, 81, 0.1) 0%,
    rgba(55, 65, 81, 0.08) 50%,
    rgba(220, 38, 38, 0.02) 100%
  );
  animation: shimmer 3s infinite;
  pointer-events: none;
  z-index: 0;
}

@keyframes shimmer {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}
</style>
