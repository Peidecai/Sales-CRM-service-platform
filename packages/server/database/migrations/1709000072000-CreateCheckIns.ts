import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class CreateCheckIns1709000072000 implements MigrationInterface {
  name = 'CreateCheckIns1709000072000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'check_ins',
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
            name: 'customer_id',
            type: 'int',
            isNullable: true,
            comment: '关联客户',
          },
          {
            name: 'latitude',
            type: 'decimal',
            precision: 10,
            scale: 7,
            comment: '纬度',
          },
          {
            name: 'longitude',
            type: 'decimal',
            precision: 10,
            scale: 7,
            comment: '经度',
          },
          {
            name: 'accuracy',
            type: 'int',
            comment: 'GPS 精度（米）',
          },
          {
            name: 'address',
            type: 'varchar',
            length: '500',
            isNullable: true,
            comment: '地址文本',
          },
          {
            name: 'photo_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
            comment: '签到照片',
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
            comment: '备注',
          },
          {
            name: 'check_in_time',
            type: 'datetime',
            comment: '签到时间',
          },
          {
            name: 'distance',
            type: 'int',
            isNullable: true,
            comment: '与客户地址距离（米）',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'approved', 'rejected'],
            default: "'pending'",
            comment: '审批状态',
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
      'check_ins',
      new TableIndex({
        name: 'IDX_check_ins_user_id',
        columnNames: ['user_id'],
      }),
    )

    await queryRunner.createIndex(
      'check_ins',
      new TableIndex({
        name: 'IDX_check_ins_customer_id',
        columnNames: ['customer_id'],
      }),
    )

    await queryRunner.createIndex(
      'check_ins',
      new TableIndex({
        name: 'IDX_check_ins_check_in_time',
        columnNames: ['check_in_time'],
      }),
    )

    await queryRunner.createIndex(
      'check_ins',
      new TableIndex({
        name: 'IDX_check_ins_status',
        columnNames: ['status'],
      }),
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('check_ins', true)
  }
}
