import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class CreateReminderSettings1709000068000 implements MigrationInterface {
  name = 'CreateReminderSettings1709000068000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'reminder_settings',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'user_id',
            type: 'int',
            comment: '用户ID，0表示全局默认',
          },
          {
            name: 'default_reminder_time',
            type: 'varchar',
            length: '5',
            default: "'09:00'",
            comment: '默认提醒时间 HH:mm',
          },
          {
            name: 'reminder_enabled',
            type: 'boolean',
            default: true,
            comment: '是否启用跟进提醒',
          },
          {
            name: 'ai_reminder_enabled',
            type: 'boolean',
            default: true,
            comment: '是否启用AI智能提醒',
          },
          {
            name: 'inactive_days_threshold',
            type: 'int',
            default: 3,
            comment: 'AI提醒：多少天未联系视为需要提醒',
          },
          {
            name: 'created_at',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'updated_at',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            onUpdate: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'deleted_at',
            type: 'datetime',
            precision: 6,
            isNullable: true,
          },
        ],
      }),
      true,
    )

    await queryRunner.createIndex(
      'reminder_settings',
      new TableIndex({
        name: 'IDX_reminder_settings_user_id',
        columnNames: ['user_id'],
        isUnique: true,
      }),
    )

    // Insert global default setting
    await queryRunner.query(`
      INSERT IGNORE INTO reminder_settings (user_id, default_reminder_time, reminder_enabled, ai_reminder_enabled, inactive_days_threshold)
      VALUES (0, '09:00', 1, 1, 3)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('reminder_settings', true)
  }
}
