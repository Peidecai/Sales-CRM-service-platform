import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm'

export class SnakeNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  tableName(className: string, customName: string | undefined): string {
    return customName ?? this.toSnakeCase(className)
  }

  columnName(
    propertyName: string,
    customName: string | undefined,
    _embeddedPrefixes: string[],
  ): string {
    return customName ?? this.toSnakeCase(propertyName)
  }

  relationName(propertyName: string): string {
    return this.toSnakeCase(propertyName)
  }

  joinColumnName(relationName: string, referencedColumnName: string): string {
    return this.toSnakeCase(relationName) + '_' + referencedColumnName
  }

  joinTableName(firstTableName: string, secondTableName: string): string {
    return firstTableName + '_' + secondTableName
  }

  joinTableColumnName(tableName: string, propertyName: string, columnName?: string): string {
    return tableName + '_' + (columnName ?? this.toSnakeCase(propertyName))
  }

  private toSnakeCase(str: string): string {
    return str.replace(
      /([A-Z])/g,
      (match, p1, offset) => (offset > 0 ? '_' : '') + p1.toLowerCase(),
    )
  }
}
