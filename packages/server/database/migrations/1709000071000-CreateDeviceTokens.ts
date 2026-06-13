import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class CreateDeviceTokens1709000071000 implements MigrationInterface {
  name = 'CreateDeviceTokens1709000071000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'device_tokens',
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
            comment: '关联用户',
          },
          {
            name: 'device_token',
            type: 'varchar',
            length: '512',
            comment: '设备推送 Token',
          },
          {
            name: 'platform',
            type: 'enum',
            enum: ['android', 'ios'],
            comment: '平台',
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
            comment: '是否有效',
          },
          {
            name: 'last_used_at',
            type: 'datetime',
            isNullable: true,
            comment: '最后使用时间',
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
      'device_tokens',
      new TableIndex({
        name: 'IDX_device_tokens_user_id',
        columnNames: ['user_id'],
      }),
    )

    await queryRunner.createIndex(
      'device_tokens',
      new TableIndex({
        name: 'IDX_device_tokens_device_token',
        columnNames: ['device_token'],
      }),
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('device_tokens', true)
  }
}
