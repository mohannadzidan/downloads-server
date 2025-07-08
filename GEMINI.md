
## Building and running

Before submitting any changes, it is crucial to validate them by running the full preflight check. This command will build the repository, run all tests, check for type errors, and lint the code.

To run the full suite of checks, execute the following command:

```bash
pnpm preflight
```

This single command ensures that your changes meet all the quality gates of the project. While you can run the individual steps (`build`, `test`, `typecheck`, `lint`) separately, it is highly recommended to use `npm run preflight` to ensure a comprehensive validation.

## Prime Directives (Non-Negotiable)

- **STRICT Adherence to Existing Patterns:** Your code **MUST** seamlessly integrate with the existing architecture, style, and conventions. Analyze the codebase before writing a single line.
- **Propose, Don't Assume:** If you see a better way, you **MUST** propose it and await approval before implementing. Do not unilaterally make architectural changes.
- **DOCUMENTATION IS LAW:** All new features, architectural changes, or complex logic **MUST** be documented in the `/docs` directory. Keep existing docs up-to-date.

## Project Context

- **Project Name:** `downloads-server`
- **Description:** A local RESTful API for downloading content via direct links, torrents, or magnet URIs. It's designed for extensibility.

## Standard Operating Procedures (SOP)

1.  **Analyze:** Understand the request and the relevant code.
2.  **Plan:** Formulate a clear plan. If it involves significant changes, communicate it first.
3.  **Implement:** Write clean, high-quality code following the Single Responsibility Principle.
4.  **Test:** Write/update unit tests according to the "Writing Tests" section.
5.  **Verify:** Run `pnpm preflight`.
6.  **Document:** Create or update documentation as needed.

## Writing Tests

This project uses **Vitest**. When writing tests, aim to follow existing patterns. Key conventions include:

- **File Location**: Test files (`*.test.ts`) are co-located with the source files they test in a `__tests__` directory.
- **Imports**: **Always** import test functions (`describe`, `it`, `expect`, `vi`) directly from `vitest`.
- **Mocking (`vi` from Vitest)**:
  - **ES Modules**: Mock with `vi.mock('module-name', async (importOriginal) => { ... })`. Use `importOriginal` for selective mocking.
  - **Mocking Order**: For critical dependencies (e.g., `fs`, `winston`) that affect module-level constants, place `vi.mock` at the _very top_ of the test file, before other imports.
  - **Mock Functions**: Create with `vi.fn()`. Define behavior with `mockImplementation()`, `mockResolvedValue()`, or `mockRejectedValue()`.
  - **Spying**: Use `vi.spyOn(object, 'methodName')`. Restore spies with `vi.restoreAllMocks()` in an `afterEach` block.
- **Asynchronous Testing**:
  - Use `async/await`.
  - Test promise rejections with `await expect(promise).rejects.toThrow(...)`.

## TypeScript & Code Style

- **File naming convention**: you **MUST** use `kebab-case` for all file naming
- **ES Modules for Encapsulation**: Use `import`/`export` to define clear public APIs for modules. Unexported members are considered private. This enhances testability and reduces coupling. If you need to test an unexported function, consider extracting it into its own testable module.
- **Avoid `any` and Type Assertions**:
  - Do not use `any`. It disables type checking and masks underlying issues.
  - Prefer `unknown` when a type is truly unknown. It's a type-safe alternative that forces you to perform type-narrowing checks.
  - Use type assertions (`as Type`) sparingly. They bypass type safety and can lead to runtime errors. A need for assertions in tests often points to a "code smell" where implementation details are being tested instead of the public API.
- **Embrace Array Methods**: Use functional array methods like `.map()`, `.filter()`, and `.reduce()` to promote immutability and improve readability over traditional `for` loops.

## Critical Prohibitions

- **DO NOT** use `npm` or `yarn`. Only `pnpm` is permitted.
- **DO NOT** test logging implementations. Mock the logger (`winston`).
- **DO NOT** use vitest globals (`expect`, `describe`, etc.) without `import`ing them from `vitest`.
- **DO NOT** ask for manual runtime validation. Your only stability check is the verification command. For anything further, you must ask the user to perform the validation themselves.

## Comments Policy

Only write high-value comments if at all. Focus on the _why_, not the _what_. Avoid talking to the user through comments.
