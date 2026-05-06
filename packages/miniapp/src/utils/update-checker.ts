import { request } from '@/api/request'

interface VersionCheckResult {
  hasUpdate: boolean
  version?: string
  buildNumber?: number
  downloadUrl?: string
  description?: string
  forceUpdate?: boolean
}

/** Get current app version from manifest */
function getCurrentVersion(): string {
  // #ifdef APP-PLUS
  return plus.runtime.version || '1.0.0'
  // #endif
  // #ifndef APP-PLUS
  return '1.0.0'
  // #endif
}

/** Get current platform */
function getPlatform(): string {
  const systemInfo = uni.getSystemInfoSync()
  return systemInfo.platform === 'ios' ? 'ios' : 'android'
}

/** Check for app updates from server */
export async function checkUpdate(): Promise<VersionCheckResult> {
  try {
    const currentVersion = getCurrentVersion()
    const platform = getPlatform()

    const res = await request<VersionCheckResult>({
      url: '/app/version/check',
      method: 'GET',
      data: { platform, currentVersion },
    })

    if (res?.data?.hasUpdate) {
      return res.data
    }

    return { hasUpdate: false }
  } catch {
    // 更新检查失败不阻塞启动，避免版本服务故障导致 App 无法进入。
    return { hasUpdate: false }
  }
}

/** Download and apply wgt hot-update package (APP-PLUS only) */
export function applyWgtUpdate(url: string): void {
  // #ifdef APP-PLUS
  uni.showLoading({ title: '正在下载更新...' })

  uni.downloadFile({
    url,
    success: (downloadResult) => {
      uni.hideLoading()
      if (downloadResult.statusCode === 200) {
        plus.runtime.install(
          downloadResult.tempFilePath,
          { force: true },
          () => {
            uni.showModal({
              title: '更新完成',
              content: '应用将重新启动以应用更新',
              showCancel: false,
              success: () => {
                plus.runtime.restart()
              },
            })
          },
          (err) => {
            uni.showToast({ title: '安装更新失败: ' + err.message, icon: 'none' })
          },
        )
      }
    },
    fail: () => {
      uni.hideLoading()
      uni.showToast({ title: '下载更新失败', icon: 'none' })
    },
  })
  // #endif
}

/** Show update dialog to user */
export function promptUpdate(result: VersionCheckResult): void {
  if (!result.hasUpdate || !result.downloadUrl) return

  const content = result.description || `发现新版本 ${result.version || ''}，是否立即更新？`

  if (result.forceUpdate) {
    // 强制更新不提供取消入口，适用于协议/接口不兼容版本。
    uni.showModal({
      title: '发现新版本（必须更新）',
      content,
      showCancel: false,
      confirmText: '立即更新',
      success: () => {
        applyWgtUpdate(result.downloadUrl!)
      },
    })
  } else {
    uni.showModal({
      title: '发现新版本',
      content,
      confirmText: '立即更新',
      cancelText: '稍后再说',
      success: (res) => {
        if (res.confirm) {
          applyWgtUpdate(result.downloadUrl!)
        }
      },
    })
  }
}

/** Auto-check on app launch */
export async function autoCheckUpdate(): Promise<void> {
  const result = await checkUpdate()
  if (result.hasUpdate) {
    promptUpdate(result)
  }
}
