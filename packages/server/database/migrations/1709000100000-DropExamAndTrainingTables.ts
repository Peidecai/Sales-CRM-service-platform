import { MigrationInterface, QueryRunner } from 'typeorm'

export class DropExamAndTrainingTables1709000100000 implements MigrationInterface {
  name = 'DropExamAndTrainingTables1709000100000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop exam tables (order respects foreign keys)
    await queryRunner.query(`DROP TABLE IF EXISTS exam_sessions`)
    await queryRunner.query(`DROP TABLE IF EXISTS exam_paper_questions`)
    await queryRunner.query(`DROP TABLE IF EXISTS exam_papers`)
    await queryRunner.query(`DROP TABLE IF EXISTS exam_questions`)
    await queryRunner.query(`DROP TABLE IF EXISTS exam_question_categories`)

    // Drop training tables (order respects foreign keys)
    await queryRunner.query(`DROP TABLE IF EXISTS training_task_assignees`)
    await queryRunner.query(`DROP TABLE IF EXISTS training_tasks`)
    await queryRunner.query(`DROP TABLE IF EXISTS video_bookmarks`)
    await queryRunner.query(`DROP TABLE IF EXISTS video_progress`)
    await queryRunner.query(`DROP TABLE IF EXISTS video_chapters`)
    await queryRunner.query(`DROP TABLE IF EXISTS training_videos`)
    await queryRunner.query(`DROP TABLE IF EXISTS training_categories`)
  }

  public async down(): Promise<void> {
    // Intentionally empty — these modules have been permanently removed
  }
}
