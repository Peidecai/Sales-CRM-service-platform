import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class CreatePkTables1709000095000 implements MigrationInterface {
  name = 'CreatePkTables1709000095000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. pk_challenges
    await queryRunner.createTable(
      new Table({
        name: 'pk_challenges',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'title', type: 'varchar', length: '200' },
          { name: 'type', type: 'varchar', length: '20', default: "'one_on_one'" },
          { name: 'status', type: 'varchar', length: '20', default: "'pending'" },
          { name: 'metric', type: 'varchar', length: '30' },
          { name: 'start_date', type: 'datetime' },
          { name: 'end_date', type: 'datetime' },
          { name: 'stake', type: 'text', isNullable: true },
          { name: 'result', type: 'varchar', length: '20', isNullable: true },
          { name: 'created_by_id', type: 'int' },
          { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
          { name: 'deleted_at', type: 'datetime', isNullable: true },
        ],
      }),
      true,
    )

    await queryRunner.createIndex('pk_challenges', new TableIndex({ name: 'IDX_pk_challenges_status', columnNames: ['status'] }))
    await queryRunner.createIndex('pk_challenges', new TableIndex({ name: 'IDX_pk_challenges_created_by', columnNames: ['created_by_id'] }))

    // 2. pk_teams
    await queryRunner.createTable(
      new Table({
        name: 'pk_teams',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'pk_id', type: 'int' },
          { name: 'name', type: 'varchar', length: '100' },
          { name: 'side', type: 'varchar', length: '1' },
          { name: 'score', type: 'decimal', precision: 15, scale: 2, default: '0' },
          { name: 'is_winner', type: 'boolean', default: false },
          { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
          { name: 'deleted_at', type: 'datetime', isNullable: true },
        ],
      }),
      true,
    )

    await queryRunner.createIndex('pk_teams', new TableIndex({ name: 'IDX_pk_teams_pk_id', columnNames: ['pk_id'] }))

    // 3. pk_members
    await queryRunner.createTable(
      new Table({
        name: 'pk_members',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'team_id', type: 'int' },
          { name: 'pk_id', type: 'int' },
          { name: 'user_id', type: 'int' },
          { name: 'contribution', type: 'decimal', precision: 15, scale: 2, default: '0' },
          { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
          { name: 'deleted_at', type: 'datetime', isNullable: true },
        ],
      }),
      true,
    )

    await queryRunner.createIndex('pk_members', new TableIndex({ name: 'IDX_pk_members_team_id', columnNames: ['team_id'] }))
    await queryRunner.createIndex('pk_members', new TableIndex({ name: 'IDX_pk_members_pk_id', columnNames: ['pk_id'] }))
    await queryRunner.createIndex('pk_members', new TableIndex({ name: 'UQ_pk_members_pk_user', columnNames: ['pk_id', 'user_id'], isUnique: true }))

    // 4. pk_badges
    await queryRunner.createTable(
      new Table({
        name: 'pk_badges',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'user_id', type: 'int' },
          { name: 'type', type: 'varchar', length: '50' },
          { name: 'pk_id', type: 'int', isNullable: true },
          { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
          { name: 'deleted_at', type: 'datetime', isNullable: true },
        ],
      }),
      true,
    )

    await queryRunner.createIndex('pk_badges', new TableIndex({ name: 'IDX_pk_badges_user_id', columnNames: ['user_id'] }))
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('pk_badges', true)
    await queryRunner.dropTable('pk_members', true)
    await queryRunner.dropTable('pk_teams', true)
    await queryRunner.dropTable('pk_challenges', true)
  }
}
