import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Announcement } from './entities/announcement.entity'
import { AnnouncementRead } from './entities/announcement-read.entity'
import { AnnouncementService } from './announcement.service'
import { AnnouncementController } from './announcement.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Announcement, AnnouncementRead])],
  controllers: [AnnouncementController],
  providers: [AnnouncementService],
  exports: [AnnouncementService],
})
export class AnnouncementModule {}
