<template>
  <v-app>
    <v-app-bar color="primary" prominent>
      <v-app-bar-title>静滞虚幻</v-app-bar-title>
      <v-spacer></v-spacer>
      <v-btn
        icon="mdi-github"
        href="https://github.com/AkariRin/stagnant-illusion"
        target="_blank"
        rel="noopener noreferrer"
      ></v-btn>
    </v-app-bar>
    <v-main>
      <div class="v-bg position-absolute top-0 right-0 left-0 bottom-0">
        <div aria-hidden="true" class="overflow-hidden opacity-20 w-100 h-100" />
      </div>
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

            <!-- Canvas -->
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
  </v-app>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { StagnantIllusion, type CompositionOptions } from './stagnant-illusion'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const baseImageFile = ref<File[]>([])
const loading = ref(false)

const posX = ref(0)
const posY = ref(0)
const scale = ref(1)
const opacity = ref(0.8)
const brightness = ref(100)
const useCover = ref(true)
const coverOpacity = ref(1)

let composer: StagnantIllusion | null = null

onMounted(async () => {
  if (!canvasRef.value) return

  // 初始化合成器
  composer = new StagnantIllusion(canvasRef.value)

  // 动态导入图像
  const [prtsModule, coverModule] = await Promise.all([
    import('@/assets/prts.png'),
    import('@/assets/cover.png')
  ])

  // 加载资源
  try {
    await composer.loadAssets(prtsModule.default, coverModule.default)
  } catch (error) {
    console.error('Failed to load assets:', error)
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
  if (!composer?.hasBaseImage()) return
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
  if (!composer) return
  composer.compose(getCompositionOptions())
}

async function handleImageUpload(files: File | File[] | null) {
  const file = Array.isArray(files) ? files[0] : files
  if (!file || !composer) {
    console.log('No file selected or composer not initialized', { file, composer })
    return
  }

  loading.value = true
  try {
    console.log('Starting image upload:', file.name)
    await composer.setBaseImage(file)
    console.log('Base image set successfully')

    // Reset to default values
    scale.value = 1
    posX.value = 0
    posY.value = 0
    opacity.value = 0.8
    brightness.value = 100
    useCover.value = true
    coverOpacity.value = 1

    // Wait for Vue to update the reactive state
    await nextTick()

    // Compose the image
    console.log('Composing image with default options')
    composeImages()
  } catch (error) {
    console.error('Failed to load base image:', error)
    alert('图片加载失败，请重试')
  } finally {
    loading.value = false
  }
}

function saveImage() {
  if (!composer?.hasBaseImage()) return
  composer.saveImage('下载.png')
}
</script>

<style scoped>
.v-bg {
  filter: blur(56px);
  pointer-events: none;
}

.v-bg > div {
  background: linear-gradient(
    to bottom right,
    rgb(var(--v-theme-primary, 0 0 0)),
    rgb(var(--v-theme-error, 0 0 0))
  );
  z-index: -10;
  clip-path: polygon(20% 50%, 27% 66%, 41% 66%, 50% 50%, 41% 34%, 27% 34%, 20% 50%, 55% 50%, 62% 66%, 76% 66%, 85% 50%, 76% 34%, 62% 34%, 55% 50%, 30% 50%, 37% 66%, 51% 66%, 60% 50%, 51% 34%, 37% 34%, 30% 50%);
}
</style>

