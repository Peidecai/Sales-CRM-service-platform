import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { TrainingCategory } from './entities/training-category.entity'
import { TrainingVideo } from './entities/training-video.entity'
import { VideoChapter } from './entities/video-chapter.entity'
import { VideoProgress } from './entities/video-progress.entity'
import { VideoBookmark } from './entities/video-bookmark.entity'
import { TrainingTask } from './entities/training-task.entity'
import { TrainingTaskAssignee } from './entities/training-task-assignee.entity'
import { TrainingController } from './training.controller'
import { TrainingCategoryService } from './training-category.service'
import { TrainingVideoService } from './training-video.service'
import { VideoProgressService } from './video-progress.service'
import { VideoBookmarkService } from './video-bookmark.service'
import { TrainingTaskService } from './training-task.service'
import { UserModule } from '../user/user.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TrainingCategory,
      TrainingVideo,
      VideoChapter,
      VideoProgress,
      VideoBookmark,
      TrainingTask,
      TrainingTaskAssignee,
    ]),
    UserModule,
  ],
  controllers: [TrainingController],
  providers: [
    TrainingCategoryService,
    TrainingVideoService,
    VideoProgressService,
    VideoBookmarkService,
    TrainingTaskService,
  ],
  exports: [TrainingVideoService, TypeOrmModule],
})
export class TrainingModule {}
