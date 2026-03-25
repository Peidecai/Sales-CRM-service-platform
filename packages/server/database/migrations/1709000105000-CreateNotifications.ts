import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class CreateNotifications1709000105000 implements MigrationInterface {
  name = 'CreateNotifications1709000105000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'notifications',
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
            isNullable: false,
          },
          {
            name: 'type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '200',
            isNullable: false,
          },
          {
            name: 'content',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'is_read',
            type: 'tinyint',
            default: 0,
            isNullable: false,
          },
          {
            name: 'related_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'related_type',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            isNullable: false,
          },
        ],
      }),
      true,
    )

    await queryRunner.createIndex(
      'notifications',
      new TableIndex({ name: 'idx_notifications_user_read', columnNames: ['user_id', 'is_read'] }),
    )
    await queryRunner.createIndex(
      'notifications',
      new TableIndex({ name: 'idx_notifications_type', columnNames: ['type'] }),
    )
    await queryRunner.createIndex(
      'notifications',
      new TableIndex({ name: 'idx_notifications_created_at', columnNames: ['created_at'] }),
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('notifications')
  }
}
