# Contributing to downloads-server

We welcome contributions to the `downloads-server` project! To ensure a smooth and effective collaboration, please follow these guidelines.

## How to Contribute

1.  **Fork the Repository:** Start by forking the `downloads-server` repository to your GitHub account.
2.  **Clone Your Fork:** Clone your forked repository to your local machine:
    ```bash
    git clone https://github.com/mohannadzidan/downloads-server.git
    cd downloads-server
    ```
3.  **Create a New Branch:** Create a new branch for your feature or bug fix. Use a descriptive name (e.g., `feature/add-torrent-support`, `bugfix/fix-volume-space-check`).
    ```bash
    git checkout -b your-branch-name
    ```
4.  **Install Dependencies:** This project uses `pnpm`. Install the dependencies:
    ```bash
    pnpm install
    ```
5.  **Make Your Changes:** Implement your feature or bug fix. Ensure your code adheres to the project's coding style and conventions.
6.  **Run Tests:** Before committing, run all tests to ensure everything is working as expected:
    ```bash
    pnpm test
    ```
7.  **Build the project:**
    ```bash
    pnpm tsc --noEmit
    ```
    Ensure there are no compilation errors.
8.  **Lint Your Code:** Ensure your code passes linting checks:
    ```bash
    pnpm lint
    ```
9.  **Commit Your Changes:** Write clear and concise commit messages. Follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification if possible.
    ```bash
    git commit -m "feat: add new feature"
    ```
10. **Push to Your Fork:** Push your changes to your forked repository:
    ```bash
    git push origin your-branch-name
    ```
11. **Create a Pull Request:** Open a pull request from your branch to the `main` branch of the original `downloads-server` repository. Provide a detailed description of your changes.

## API Versioning

All API endpoints are versioned. The current version is `v1`, and all API routes are prefixed with `/api/v1`. When making changes to the API, please consider whether the changes are backward-compatible. If they are not, a new API version may be required.

## Reporting Bugs

If you find a bug, please open an issue on the GitHub issue tracker. Provide as much detail as possible, including:

- A clear and concise description of the bug.
- Steps to reproduce the behavior.
- Expected behavior.
- Actual behavior.
- Screenshots or error messages (if applicable).
- Your operating system and Node.js version.

## Feature Requests

If you have an idea for a new feature, please open an issue on the GitHub issue tracker to discuss it. This allows for community feedback and helps us prioritize development.

## Questions

If you have any questions about the project or contributing, feel free to open an issue or reach out to the maintainers.
