import { DependencyMatch } from "../shared/types";

export class RepositoryParser {
  private cache: Map<string, DependencyMatch[]> = new Map();
  private cacheTTL = 30000; // 30 seconds

  async parseDependencies(repoPath: string): Promise<DependencyMatch[]> {
    // Check cache first
    const cached = this.cache.get(repoPath);
    if (cached) {
      return cached;
    }

    try {
      const packageJsonPath = `${repoPath}/package.json`;
      const file = Bun.file(packageJsonPath);
      const exists = await file.exists();

      if (!exists) {
        throw new Error(`package.json not found at ${packageJsonPath}`);
      }

      const content = await file.text();
      const packageJson = JSON.parse(content);

      const dependencies: DependencyMatch[] = [];

      // Parse direct dependencies
      if (packageJson.dependencies) {
        for (const [name, version] of Object.entries(packageJson.dependencies)) {
          const resolvedVersion = await this.resolveVersion(repoPath, name, version as string);
          if (resolvedVersion) {
            dependencies.push({ name, version: resolvedVersion });
          }
        }
      }

      // Also parse devDependencies for completeness
      if (packageJson.devDependencies) {
        for (const [name, version] of Object.entries(packageJson.devDependencies)) {
          const resolvedVersion = await this.resolveVersion(repoPath, name, version as string);
          if (resolvedVersion) {
            dependencies.push({ name, version: resolvedVersion });
          }
        }
      }

      // Cache the result
      this.cache.set(repoPath, dependencies);
      setTimeout(() => this.cache.delete(repoPath), this.cacheTTL);

      return dependencies;
    } catch (error) {
      throw new Error(`Failed to parse dependencies: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async resolveVersion(repoPath: string, packageName: string, specifier: string): Promise<string | null> {
    // Try to get exact version from package-lock.json
    try {
      const lockfilePath = `${repoPath}/package-lock.json`;
      const lockfile = Bun.file(lockfilePath);
      const exists = await lockfile.exists();

      if (exists) {
        const lockContent = await lockfile.text();
        const lockData = JSON.parse(lockContent);

        if (lockData.dependencies && lockData.dependencies[packageName]) {
          return lockData.dependencies[packageName].version || specifier;
        }
      }
    } catch {
      // Fallback if lockfile parsing fails
    }

    // Fallback: use the specifier directly (e.g., "^3.1.6" → "3.1.6")
    return this.stripVersionPrefix(specifier);
  }

  private stripVersionPrefix(version: string): string {
    // Remove npm version prefixes: ^, ~, >=, <=, >, <, =
    return version.replace(/^[\^~><=]*/, "");
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const createParser = () => new RepositoryParser();
