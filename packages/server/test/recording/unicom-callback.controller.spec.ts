import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { UnicomCallbackController } from '../../src/modules/recording/unicom-callback.controller'
import { UnicomCallCallbackService } from '../../src/modules/recording/unicom-call-callback.service'
import { CloudTranscriptionCallbackService } from '../../src/modules/recording/cloud-transcription-callback.service'

describe('UnicomCallbackController HTTP routes', () => {
  let app: INestApplication
  let baseUrl: string
  let callCallbackService: { handleCallback: jest.Mock }
  let transcriptionCallbackService: { handleCallback: jest.Mock }

  beforeEach(async () => {
    callCallbackService = {
      handleCallback: jest.fn().mockResolvedValue({
        message: 'success',
        success: true,
        code: 1,
        data: true,
      }),
    }
    transcriptionCallbackService = {
      handleCallback: jest.fn().mockResolvedValue({
        message: 'success',
        success: true,
        code: 1,
        data: true,
      }),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UnicomCallbackController],
      providers: [
        { provide: UnicomCallCallbackService, useValue: callCallbackService },
        { provide: CloudTranscriptionCallbackService, useValue: transcriptionCallbackService },
      ],
    }).compile()

    app = module.createNestApplication()
    app.setGlobalPrefix('api/v1')
    await app.init()
    await app.listen(0)

    const server = app.getHttpServer() as { address: () => { port: number } | string | null }
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Test server did not bind a port')
    baseUrl = `http://127.0.0.1:${address.port}`
  })

  afterEach(async () => {
    await app.close()
  })

  it('should receive Unicom call detail/recording POST messages', async () => {
    const payload = {
      accountName: '测试企业',
      accountId: 'account-1',
      callSid: 'call-sid-1',
      appName: '测试应用',
      appId: 'app-1',
      callerNo: '13800138000',
      calledNo: '13900139000',
      callType: '呼出',
      startTime: '2026-05-06 10:00:05',
      endTime: '2026-05-06 10:01:40',
      duration: 95,
      types: 0,
    }

    const response = await postJson(
      `${baseUrl}/api/v1/unicom/13800138000/records?token=unicom-token&timestamp=1700000000000&sign=signature`,
      payload,
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      message: 'success',
      success: true,
      code: 1,
      data: true,
    })
    expect(callCallbackService.handleCallback).toHaveBeenCalledWith(
      '13800138000',
      { token: 'unicom-token', timestamp: '1700000000000', sign: 'signature' },
      payload,
    )
  })

  it('should receive account-level Unicom call detail/recording POST messages', async () => {
    const payload = {
      accountName: '测试企业',
      accountId: 'account-1',
      callSid: 'call-sid-1',
      appName: '测试应用',
      appId: 'app-1',
      callerNo: '13800138000',
      calledNo: '13900139000',
      callType: '呼出',
      startTime: '2026-05-06 10:00:05',
      endTime: '2026-05-06 10:01:40',
      duration: 95,
      types: 0,
    }

    const response = await postJson(
      `${baseUrl}/api/v1/unicom/records?token=unicom-token&timestamp=1700000000000&sign=signature`,
      payload,
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      message: 'success',
      success: true,
      code: 1,
      data: true,
    })
    expect(callCallbackService.handleCallback).toHaveBeenCalledWith(
      undefined,
      { token: 'unicom-token', timestamp: '1700000000000', sign: 'signature' },
      payload,
    )
  })

  it('should receive Unicom transcription POST messages', async () => {
    const payload = {
      taskId: 'task-1',
      callSid: 'call-sid-1',
      statusCode: 21050000,
      statusText: 'SUCCESS',
      bizDuration: 11072,
      requestTime: 1714440000000,
      solveTime: 1714440003000,
      enableCallback: true,
      result: [
        {
          beginTime: 0,
          endTime: 1000,
          channelId: 0,
          text: '您好',
          emotionValue: 6,
          silenceDuration: 0,
          speechRate: 120,
        },
      ],
    }

    const response = await postJson(
      `${baseUrl}/api/v1/unicom/13800138000/transcriptions?token=unicom-token&timestamp=1700000000000&sign=signature`,
      payload,
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      message: 'success',
      success: true,
      code: 1,
      data: true,
    })
    expect(transcriptionCallbackService.handleCallback).toHaveBeenCalledWith(
      { token: 'unicom-token', timestamp: '1700000000000', sign: 'signature' },
      payload,
      '13800138000',
      'unicom',
      undefined,
    )
  })

  it('should receive account-level Unicom transcription POST messages', async () => {
    const payload = {
      taskId: 'task-1',
      callSid: 'call-sid-1',
      statusCode: 21050000,
      statusText: 'SUCCESS',
      bizDuration: 11072,
      requestTime: 1714440000000,
      solveTime: 1714440003000,
      enableCallback: true,
      result: [
        {
          beginTime: 0,
          endTime: 1000,
          channelId: 0,
          text: '您好',
          emotionValue: 6,
          silenceDuration: 0,
          speechRate: 120,
        },
      ],
    }

    const response = await postJson(
      `${baseUrl}/api/v1/unicom/transcriptions?token=unicom-token&timestamp=1700000000000&sign=signature`,
      payload,
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      message: 'success',
      success: true,
      code: 1,
      data: true,
    })
    expect(transcriptionCallbackService.handleCallback).toHaveBeenCalledWith(
      { token: 'unicom-token', timestamp: '1700000000000', sign: 'signature' },
      payload,
      undefined,
      'unicom',
      undefined,
    )
  })

  async function postJson(url: string, body: Record<string, unknown>): Promise<Response> {
    return fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  }
})
