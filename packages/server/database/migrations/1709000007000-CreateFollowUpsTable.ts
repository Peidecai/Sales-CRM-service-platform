import { MigrationInterface, QueryRunner, Table } from 'typeorm'

export class CreateFollowUpsTable1709000007000 implements MigrationInterface {
  name = 'CreateFollowUpsTable1709000007000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'follow_ups',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'customer_id',
            type: 'int',
            isNullable: false,
            comment: '关联客户 ID',
          },
          {
            name: 'user_id',
            type: 'int',
            isNullable: false,
            comment: '跟进销售员 ID',
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['call', 'visit', 'email', 'wechat', 'other'],
            default: "'call'",
            comment: '跟进方式',
          },
          {
            name: 'content',
            type: 'text',
            isNullable: false,
            comment: '跟进内容',
          },
          {
            name: 'next_follow_up_date',
            type: 'date',
            isNullable: true,
            comment: '下次跟进日期',
          },
          {
            name: 'next_follow_up_note',
            type: 'varchar',
            length: '500',
            isNullable: true,
            comment: '下次跟进备注',
          },
          {
            name: 'deleted',
            type: 'tinyint',
            default: 0,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          { columnNames: ['customer_id'] },
          { columnNames: ['user_id'] },
          { columnNames: ['next_follow_up_date'] },
        ],
      }),
      true,
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('follow_ups')
  }
}
