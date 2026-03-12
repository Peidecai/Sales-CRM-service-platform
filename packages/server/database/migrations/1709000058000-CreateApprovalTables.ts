import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class CreateApprovalTables1709000058000 implements MigrationInterface {
  name = 'CreateApprovalTables1709000058000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. approval_flows — 审批流程定义表
    await queryRunner.createTable(
      new Table({
        name: 'approval_flows',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'flow_code', type: 'varchar', length: '50', isNullable: false, isUnique: true },
          { name: 'flow_name', type: 'varchar', length: '100', isNullable: false },
          {
            name: 'biz_type',
            type: 'enum',
            enum: ['quotation', 'contract', 'discount', 'payment', 'refund'],
            isNullable: false,
          },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'condition_rules', type: 'json', isNullable: true },
          { name: 'nodes', type: 'json', isNullable: false },
          { name: 'is_enabled', type: 'tinyint', width: 1, default: 1, isNullable: false },
          { name: 'version', type: 'int', default: 1, isNullable: false },
          { name: 'created_by', type: 'int', isNullable: true },
          { name: 'deleted', type: 'tinyint', width: 1, default: 0, isNullable: false },
          { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          {
            name: 'updated_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    )

    await queryRunner.createIndex(
      'approval_flows',
      new TableIndex({ name: 'IDX_approval_flows_biz_type', columnNames: ['biz_type'] }),
    )

    await queryRunner.createIndex(
      'approval_flows',
      new TableIndex({ name: 'IDX_approval_flows_is_enabled', columnNames: ['is_enabled'] }),
    )

    // 2. approval_instances — 审批实例表
    await queryRunner.createTable(
      new Table({
        name: 'approval_instances',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'flow_definition_id', type: 'int', isNullable: false },
          {
            name: 'biz_type',
            type: 'enum',
            enum: ['quotation', 'contract', 'discount', 'payment', 'refund'],
            isNullable: false,
          },
          { name: 'biz_id', type: 'int', isNullable: false },
          { name: 'biz_no', type: 'varchar', length: '50', isNullable: true },
          { name: 'title', type: 'varchar', length: '200', isNullable: false },
          { name: 'applicant_id', type: 'int', isNullable: false },
          { name: 'current_node_id', type: 'varchar', length: '50', isNullable: true },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'approved', 'rejected', 'cancelled', 'withdrawn'],
            default: "'pending'",
            isNullable: false,
          },
          { name: 'result_remark', type: 'text', isNullable: true },
          { name: 'completed_at', type: 'datetime', isNullable: true },
          { name: 'deleted', type: 'tinyint', width: 1, default: 0, isNullable: false },
          { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          {
            name: 'updated_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    )

    await queryRunner.createIndex(
      'approval_instances',
      new TableIndex({ name: 'IDX_approval_instances_status', columnNames: ['status'] }),
    )

    await queryRunner.createIndex(
      'approval_instances',
      new TableIndex({ name: 'IDX_approval_instances_biz_type', columnNames: ['biz_type'] }),
    )

    await queryRunner.createIndex(
      'approval_instances',
      new TableIndex({
        name: 'IDX_approval_instances_biz_id',
        columnNames: ['biz_type', 'biz_id'],
      }),
    )

    await queryRunner.createIndex(
      'approval_instances',
      new TableIndex({
        name: 'IDX_approval_instances_applicant_id',
        columnNames: ['applicant_id'],
      }),
    )

    await queryRunner.createIndex(
      'approval_instances',
      new TableIndex({
        name: 'IDX_approval_instances_flow_definition_id',
        columnNames: ['flow_definition_id'],
      }),
    )

    // 3. approval_records — 审批操作记录表
    await queryRunner.createTable(
      new Table({
        name: 'approval_records',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'instance_id', type: 'int', isNullable: false },
          { name: 'node_id', type: 'varchar', length: '50', isNullable: false },
          { name: 'node_name', type: 'varchar', length: '100', isNullable: false },
          { name: 'approver_id', type: 'int', isNullable: false },
          {
            name: 'action',
            type: 'enum',
            enum: ['approve', 'reject', 'delegate'],
            isNullable: false,
          },
          { name: 'opinion', type: 'text', isNullable: true },
          { name: 'attachments', type: 'json', isNullable: true },
          { name: 'duration_minutes', type: 'int', isNullable: true },
          { name: 'deleted', type: 'tinyint', width: 1, default: 0, isNullable: false },
          { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          {
            name: 'updated_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    )

    await queryRunner.createIndex(
      'approval_records',
      new TableIndex({
        name: 'IDX_approval_records_instance_id',
        columnNames: ['instance_id'],
      }),
    )

    await queryRunner.createIndex(
      'approval_records',
      new TableIndex({ name: 'IDX_approval_records_approver_id', columnNames: ['approver_id'] }),
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('approval_records', true, true, true)
    await queryRunner.dropTable('approval_instances', true, true, true)
    await queryRunner.dropTable('approval_flows', true, true, true)
  }
}
