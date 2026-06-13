import { readdir } from "fs/promises";
import { join } from "path";

export interface PackageJsonLocation {
  path: string;
  depth: number;
}

export async function findAllPackageJsons(
  rootPath: string,
  maxDepth: number = 3,
  currentDepth: number = 0,
  results: PackageJsonLocation[] = []
): Promise<PackageJsonLocation[]> {
  if (currentDepth > maxDepth) {
    return results;
  }

  try {
    const entries = await readdir(rootPath, { withFileTypes: true });

    for (const entry of entries) {
      // Skip node_modules, .git, and other common folders
      if (
        entry.name.startsWith(".") ||
        entry.name === "node_modules" ||
        entry.name === "dist" ||
        entry.name === "build" ||
        entry.name === "coverage"
      ) {
        continue;
      }

      const fullPath = join(rootPath, entry.name);

      if (entry.isFile() && entry.name === "package.json") {
        results.push({
          path: rootPath,
          depth: currentDepth,
        });
      } else if (entry.isDirectory()) {
        await findAllPackageJsons(fullPath, maxDepth, currentDepth + 1, results);
      }
    }
  } catch {
    // Permission denied or other errors - skip
  }

  return results;
}
