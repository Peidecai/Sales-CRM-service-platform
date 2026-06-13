import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm'

export class CreateMiniappUsersTable1709000054000 implements MigrationInterface {
  name = 'CreateMiniappUsersTable1709000054000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'miniapp_users',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'user_id', type: 'int', isNullable: true, comment: '关联系统用户ID' },
          { name: 'openid', type: 'varchar', length: '64', isNullable: false, comment: '微信 openid' },
          { name: 'union_id', type: 'varchar', length: '64', isNullable: true, comment: '微信 unionId' },
          { name: 'session_key', type: 'varchar', length: '128', isNullable: true, comment: '微信 session_key' },
          { name: 'phone', type: 'varchar', length: '20', isNullable: true, comment: '绑定手机号' },
          { name: 'nickname', type: 'varchar', length: '64', isNullable: true, comment: '微信昵称' },
          { name: 'avatar_url', type: 'varchar', length: '255', isNullable: true, comment: '微信头像' },
          { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
          { name: 'deleted', type: 'boolean', default: false },
        ],
      }),
      true,
    )

    // Unique index on openid
    await queryRunner.createIndex(
      'miniapp_users',
      new TableIndex({ name: 'IDX_miniapp_users_openid', columnNames: ['openid'], isUnique: true }),
    )

    // Index on user_id
    await queryRunner.createIndex(
      'miniapp_users',
      new TableIndex({ name: 'IDX_miniapp_users_user_id', columnNames: ['user_id'] }),
    )

    // Foreign key to users table
    await queryRunner.createForeignKey(
      'miniapp_users',
      new TableForeignKey({
        name: 'FK_miniapp_users_user_id',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('miniapp_users', true, true, true)
  }
}
