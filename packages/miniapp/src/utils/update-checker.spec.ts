import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkUpdate, promptUpdate, applyWgtUpdate } from './update-checker'

vi.mock('@/api/request', () => ({
  request: vi.fn(),
}))

import { request } from '@/api/request'

const mockRequest = vi.mocked(request)

describe('checkUpdate', () => {
  it('returns result when server reports hasUpdate=true', async () => {
    const serverResult = {
      hasUpdate: true,
      version: '2.0.0',
      buildNumber: 10,
      downloadUrl: 'https://cdn.example.com/app.wgt',
      description: 'Bug fixes',
      forceUpdate: false,
    }
    mockRequest.mockResolvedValue({ code: 0, message: 'success', data: serverResult })

    const result = await checkUpdate()

    expect(mockRequest).toHaveBeenCalledWith({
      url: '/app/version/check',
      method: 'GET',
      data: expect.objectContaining({ platform: expect.any(String), currentVersion: expect.any(String) }),
    })
    expect(result).toEqual(serverResult)
  })

  it('returns {hasUpdate:false} when server reports no update', async () => {
    mockRequest.mockResolvedValue({ code: 0, message: 'success', data: { hasUpdate: false } })

    const result = await checkUpdate()

    expect(result).toEqual({ hasUpdate: false })
  })

  it('returns {hasUpdate:false} when request throws', async () => {
    mockRequest.mockRejectedValue(new Error('Network error'))

    const result = await checkUpdate()

    expect(result).toEqual({ hasUpdate: false })
  })
})

describe('promptUpdate', () => {
  it('does nothing when hasUpdate is false', () => {
    promptUpdate({ hasUpdate: false, downloadUrl: 'https://cdn.example.com/app.wgt' })

    expect(uni.showModal).not.toHaveBeenCalled()
  })

  it('does nothing when downloadUrl is missing', () => {
    promptUpdate({ hasUpdate: true, version: '2.0.0' })

    expect(uni.showModal).not.toHaveBeenCalled()
  })

  it('shows non-cancelable modal when forceUpdate is true', () => {
    promptUpdate({
      hasUpdate: true,
      version: '2.0.0',
      downloadUrl: 'https://cdn.example.com/app.wgt',
      forceUpdate: true,
      description: 'Critical fix',
    })

    expect(uni.showModal).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '发现新版本（必须更新）',
        content: 'Critical fix',
        showCancel: false,
        confirmText: '立即更新',
      }),
    )
  })

  it('shows cancelable modal when forceUpdate is false', () => {
    promptUpdate({
      hasUpdate: true,
      version: '2.0.0',
      downloadUrl: 'https://cdn.example.com/app.wgt',
      forceUpdate: false,
    })

    expect(uni.showModal).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '发现新版本',
        confirmText: '立即更新',
        cancelText: '稍后再说',
      }),
    )
    // showCancel should NOT be false (default is true)
    const callArgs = vi.mocked(uni.showModal).mock.calls[0][0] as Record<string, unknown>
    expect(callArgs.showCancel).not.toBe(false)
  })
})

describe('applyWgtUpdate', () => {
  it('calls showLoading then downloadFile', () => {
    applyWgtUpdate('https://cdn.example.com/app.wgt')

    expect(uni.showLoading).toHaveBeenCalledWith({ title: '正在下载更新...' })
    expect(uni.downloadFile).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://cdn.example.com/app.wgt' }),
    )
  })
})
