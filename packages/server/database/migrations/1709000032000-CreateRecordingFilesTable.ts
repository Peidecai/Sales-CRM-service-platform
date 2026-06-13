import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class CreateRecordingFilesTable1709000032000 implements MigrationInterface {
  name = 'CreateRecordingFilesTable1709000032000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'recording_files',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'call_record_id',
            type: 'int',
            isNullable: false,
            comment: '通话记录ID',
          },
          {
            name: 'file_name',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'oss_key',
            type: 'varchar',
            length: '500',
            isNullable: false,
            comment: 'OSS 对象键',
          },
          {
            name: 'oss_bucket',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'file_size',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'duration_seconds',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'mime_type',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
          },
        ],
      }),
      true,
    )

    await queryRunner.createIndex(
      'recording_files',
      new TableIndex({ name: 'IDX_recording_files_call_record_id', columnNames: ['call_record_id'] }),
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('recording_files', 'IDX_recording_files_call_record_id')
    await queryRunner.dropTable('recording_files')
  }
}
