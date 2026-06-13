# Language Standards

## TypeScript

- Use TypeScript strict mode conventions.
- Avoid `any`; prefer explicit types or `unknown` plus narrowing.
- Keep async error handling intentional.
- Preserve existing module import aliases.
- Prefer typed DTOs, interfaces, and shared enums over stringly typed contracts.

## Naming

- File names: follow existing local package convention, usually kebab-case.
- Classes and decorators: PascalCase.
- Variables and functions: camelCase.
- Database table and column names: snake_case at the database boundary.
- TypeORM query builder should generally reference entity property paths unless
  a raw SQL fragment is intentionally required.

## Comments

Use comments sparingly. Add comments for non-obvious business rules, security
constraints, or migration caveats. Do not add comments that merely repeat the
code.

## Documentation

Docs must distinguish:

- verified facts
- stale or lower-authority docs
- unknowns
- planned but not implemented work
