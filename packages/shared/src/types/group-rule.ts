export interface GroupRule {
  logic?: "AND" | "OR";
  field: string;
  operator:
    | "eq"
    | "neq"
    | "in"
    | "not_in"
    | "gt"
    | "lt"
    | "gte"
    | "lte"
    | "contains"
    | "before"
    | "after"
    | "days_ago_gt"
    | "days_ago_lt";
  value: string | number | string[];
}
