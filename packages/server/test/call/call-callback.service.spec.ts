import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Logger } from '@nestjs/common'
import { CallCallbackService } from '../../src/modules/call/call-callback.service'
import { CallRecord } from '../../src/modules/call-record/call-record.entity'
import { CallStatus } from '@crm/shared'
import { createMockRepository, fixtures } from '../test-utils'
import type { MockRepository } from '../test-utils'

describe('CallCallbackService', () => {
  let service: CallCallbackService
  let repo: MockRepository<CallRecord>
  let warnSpy: jest.SpyInstance

  beforeEach(async () => {
    repo = createMockRepository<CallRecord>()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CallCallbackService,
        { provide: getRepositoryToken(CallRecord), useValue: repo },
      ],
    }).compile()

    service = module.get<CallCallbackService>(CallCallbackService)
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {})
  })

  afterEach(() => jest.restoreAllMocks())

  /* ====== CALL_STATUS_ORDER — monotonic ordering ====== */

  describe('CALL_STATUS_ORDER forward-only transitions', () => {
    it('should allow RINGING → CONNECTED (forward)', async () => {
      const record = fixtures.callRecord({
        providerCallId: 'call-1',
        status: CallStatus.RINGING,
      })
      repo.findOne.mockResolvedValue(record)
      repo.update.mockResolvedValue({ affected: 1 })

      await service.handleCallback({
        event: 'call_answered',
        callId: 'call-1',
      })

      expect(repo.update).toHaveBeenCalledWith(
        { providerCallId: 'call-1', status: CallStatus.RINGING },
        expect.objectContaining({ status: CallStatus.CONNECTED }),
      )
    })

    it('should allow CONNECTED → ENDED (forward)', async () => {
      const record = fixtures.callRecord({
        providerCallId: 'call-2',
        status: CallStatus.CONNECTED,
      })
      repo.findOne.mockResolvedValue(record)
      repo.update.mockResolvedValue({ affected: 1 })

      await service.handleCallback({
        event: 'call_end',
        callId: 'call-2',
        duration: 120,
        end_reason: 'normal',
      })

      expect(repo.update).toHaveBeenCalledWith(
        { providerCallId: 'call-2', status: CallStatus.CONNECTED },
        expect.objectContaining({
          status: CallStatus.ENDED,
          endReason: 'normal',
          duration: 120,
        }),
      )
    })

    it('should reject ENDED → CONNECTED (backward transition)', async () => {
      const record = fixtures.callRecord({
        providerCallId: 'call-3',
        status: CallStatus.ENDED,
      })
      repo.findOne.mockResolvedValue(record)

      await service.handleCallback({
        event: 'call_answered',
        callId: 'call-3',
      })

      expect(repo.update).not.toHaveBeenCalled()
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('not a forward transition'),
      )
    })

    it('should reject duplicate transition (same status)', async () => {
      const record = fixtures.callRecord({
        providerCallId: 'call-4',
        status: CallStatus.CONNECTED,
      })
      repo.findOne.mockResolvedValue(record)

      await service.handleCallback({
        event: 'call_connected',
        callId: 'call-4',
      })

      expect(repo.update).not.toHaveBeenCalled()
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('not a forward transition'),
      )
    })

    it('should allow RINGING → ENDED (skipping intermediate states)', async () => {
      const record = fixtures.callRecord({
        providerCallId: 'call-5',
        status: CallStatus.RINGING,
      })
      repo.findOne.mockResolvedValue(record)
      repo.update.mockResolvedValue({ affected: 1 })

      await service.handleCallback({
        event: 'call_end',
        callId: 'call-5',
        duration: 0,
      })

      expect(repo.update).toHaveBeenCalledWith(
        { providerCallId: 'call-5', status: CallStatus.RINGING },
        expect.objectContaining({ status: CallStatus.ENDED }),
      )
    })
  })

  /* ====== handleCallback — event routing ====== */

  describe('handleCallback event routing', () => {
    it('should return early when no providerCallId in body', async () => {
      await service.handleCallback({ event: 'call_answered' })

      expect(repo.findOne).not.toHaveBeenCalled()
    })

    it('should accept body.call_id as fallback for providerCallId', async () => {
      const record = fixtures.callRecord({
        providerCallId: 'alt-id',
        status: CallStatus.RINGING,
      })
      repo.findOne.mockResolvedValue(record)
      repo.update.mockResolvedValue({ affected: 1 })

      await service.handleCallback({
        event: 'call_answered',
        call_id: 'alt-id',
      })

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { providerCallId: 'alt-id' },
      })
    })

    it('should accept body.provider_call_id as fallback', async () => {
      const record = fixtures.callRecord({
        providerCallId: 'prov-id',
        status: CallStatus.RINGING,
      })
      repo.findOne.mockResolvedValue(record)
      repo.update.mockResolvedValue({ affected: 1 })

      await service.handleCallback({
        event: 'call_connected',
        provider_call_id: 'prov-id',
      })

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { providerCallId: 'prov-id' },
      })
    })

    it('should handle call_answered event → CONNECTED with answeredAt', async () => {
      const record = fixtures.callRecord({
        providerCallId: 'call-a',
        status: CallStatus.RINGING,
      })
      repo.findOne.mockResolvedValue(record)
      repo.update.mockResolvedValue({ affected: 1 })

      await service.handleCallback({
        event: 'call_answered',
        callId: 'call-a',
      })

      expect(repo.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: CallStatus.CONNECTED,
          answeredAt: expect.any(Date),
        }),
      )
    })

    it('should handle call_connected event (alias)', async () => {
      const record = fixtures.callRecord({
        providerCallId: 'call-b',
        status: CallStatus.RINGING,
      })
      repo.findOne.mockResolvedValue(record)
      repo.update.mockResolvedValue({ affected: 1 })

      await service.handleCallback({
        event: 'call_connected',
        callId: 'call-b',
      })

      expect(repo.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ status: CallStatus.CONNECTED }),
      )
    })

    it('should handle call_end event with duration and end_reason', async () => {
      const record = fixtures.callRecord({
        providerCallId: 'call-c',
        status: CallStatus.CONNECTED,
      })
      repo.findOne.mockResolvedValue(record)
      repo.update.mockResolvedValue({ affected: 1 })

      await service.handleCallback({
        event: 'call_end',
        callId: 'call-c',
        duration: 45,
        end_reason: 'caller_hangup',
      })

      expect(repo.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: CallStatus.ENDED,
          duration: 45,
          endReason: 'caller_hangup',
        }),
      )
    })

    it('should handle call_ended event (alias)', async () => {
      const record = fixtures.callRecord({
        providerCallId: 'call-d',
        status: CallStatus.CONNECTED,
      })
      repo.findOne.mockResolvedValue(record)
      repo.update.mockResolvedValue({ affected: 1 })

      await service.handleCallback({
        event: 'call_ended',
        callId: 'call-d',
        duration_seconds: 90,
        reason: 'timeout',
      })

      expect(repo.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: CallStatus.ENDED,
          duration: 90,
          endReason: 'timeout',
        }),
      )
    })

    it('should NOT set duration when duration is 0', async () => {
      const record = fixtures.callRecord({
        providerCallId: 'call-e',
        status: CallStatus.CONNECTED,
      })
      repo.findOne.mockResolvedValue(record)
      repo.update.mockResolvedValue({ affected: 1 })

      await service.handleCallback({
        event: 'call_end',
        callId: 'call-e',
        duration: 0,
      })

      const updateArgs = repo.update.mock.calls[0][1] as Record<string, unknown>
      expect(updateArgs.duration).toBeUndefined()
    })

    it('should set endReason to null when not provided', async () => {
      const record = fixtures.callRecord({
        providerCallId: 'call-f',
        status: CallStatus.CONNECTED,
      })
      repo.findOne.mockResolvedValue(record)
      repo.update.mockResolvedValue({ affected: 1 })

      await service.handleCallback({
        event: 'call_end',
        callId: 'call-f',
      })

      expect(repo.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ endReason: null }),
      )
    })
  })

  /* ====== safeTransition — optimistic lock ====== */

  describe('safeTransition optimistic locking', () => {
    it('should warn when record not found for providerCallId', async () => {
      repo.findOne.mockResolvedValue(null)

      await service.handleCallback({
        event: 'call_answered',
        callId: 'no-exist',
      })

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('no record for providerCallId=no-exist'),
      )
      expect(repo.update).not.toHaveBeenCalled()
    })

    it('should warn on concurrent conflict (affected === 0)', async () => {
      const record = fixtures.callRecord({
        providerCallId: 'call-race',
        status: CallStatus.RINGING,
      })
      repo.findOne.mockResolvedValue(record)
      repo.update.mockResolvedValue({ affected: 0 })

      await service.handleCallback({
        event: 'call_answered',
        callId: 'call-race',
      })

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('concurrent conflict'),
      )
    })

    it('should include current status in WHERE clause for optimistic lock', async () => {
      const record = fixtures.callRecord({
        providerCallId: 'call-lock',
        status: CallStatus.RINGING,
      })
      repo.findOne.mockResolvedValue(record)
      repo.update.mockResolvedValue({ affected: 1 })

      await service.handleCallback({
        event: 'call_answered',
        callId: 'call-lock',
      })

      expect(repo.update).toHaveBeenCalledWith(
        { providerCallId: 'call-lock', status: CallStatus.RINGING },
        expect.objectContaining({ status: CallStatus.CONNECTED }),
      )
    })
  })

  /* ====== edge: unknown status in record ====== */

  describe('edge cases', () => {
    it('should handle unknown current status (defaults to order 0)', async () => {
      const record = fixtures.callRecord({
        providerCallId: 'call-unk',
        status: 'UNKNOWN_STATUS' as CallStatus,
      })
      repo.findOne.mockResolvedValue(record)
      repo.update.mockResolvedValue({ affected: 1 })

      await service.handleCallback({
        event: 'call_answered',
        callId: 'call-unk',
      })

      // CONNECTED order (2) > unknown order (0), so should proceed
      expect(repo.update).toHaveBeenCalled()
    })

    it('should ignore unrecognised events (no matching branch)', async () => {
      await service.handleCallback({
        event: 'call_ringing',
        callId: 'call-x',
      })

      // call_ringing doesn't match any event branch → no DB lookup needed
      expect(repo.findOne).not.toHaveBeenCalled()
      expect(repo.update).not.toHaveBeenCalled()
    })
  })
})
