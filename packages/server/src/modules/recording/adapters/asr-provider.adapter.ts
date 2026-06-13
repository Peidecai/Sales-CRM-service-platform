/**
 * ASR 厂商适配器接口。
 */
export interface AsrProviderAdapter {
  /** 提交转写任务，返回 external_task_id */
  submitTask(recordingUrlOrOssKey: string): Promise<{ externalTaskId: string }>

  /** 轮询或接收回调，获取转写结果（分段文本+时间戳+说话人） */
  pollOrWebhookResult(taskId: string): Promise<
    Array<{
      segmentIndex: number
      startTimeMs: number
      endTimeMs: number
      speaker: 'agent' | 'customer' | 'unknown'
      text: string
    }>
  >
}
