const fs = require("fs");
const path = require("path");

const { execSync } = require("child_process");

const updateChangelog = require("./updateChangelog");

// skipping utils for now, as it has independent release process
const PACKAGES = ["common", "math", "element", "excalidraw"];
const PACKAGE_SCOPE = "@excalidraw-modify";
const PACKAGES_DIR = path.resolve(__dirname, "../packages");

/**
 * Returns the arguments for the release script.
 *
 * Usage examples:
 * - yarn release --help                          -> prints this help message
 * - yarn release                                 -> publishes `@excalidraw-modify` packages with "test" tag and "-[hash]" version suffix
 * - yarn release --tag=test                      -> same as above
 * - yarn release --tag=next                      -> publishes `@excalidraw-modify` packages with "next" tag and version "-[hash]" suffix
 * - yarn release --tag=next --non-interactive    -> skips interactive prompts (runs on CI/CD), otherwise same as above
 * - yarn release --tag=latest --version=0.19.0   -> publishes `@excalidraw-modify` packages with "latest" tag and version "0.19.0" & prepares changelog for the release
 *
 * @returns [tag, version, nonInteractive]
 */
const getArguments = () => {
  let tag = "test";
  let version = "";
  let nonInteractive = false;

  for (const argument of process.argv.slice(2)) {
    if (/--help/.test(argument)) {
      console.info(`Available arguments:
  --tag=<tag>                                    -> (optional) "test" (default), "next" for auto release, "latest" for stable release
  --version=<version>                            -> (optional) for "next" and "test", (required) for "latest" i.e. "0.19.0"
  --non-interactive                              -> (optional) disables interactive prompts`);

      console.info(`\nUsage examples:
  - yarn release                                 -> publishes \`${PACKAGE_SCOPE}\` packages with "test" tag and "-[hash]" version suffix
  - yarn release --tag=test                      -> same as above
  - yarn release --tag=next                      -> publishes \`${PACKAGE_SCOPE}\` packages with "next" tag and version "-[hash]" suffix
  - yarn release --tag=next --non-interactive    -> skips interactive prompts (runs on CI/CD), otherwise same as above
  - yarn release --tag=latest --version=0.19.0   -> publishes \`${PACKAGE_SCOPE}\` packages with "latest" tag and version "0.19.0" & prepares changelog for the release`);

      process.exit(0);
    }

    if (/--tag=/.test(argument)) {
      tag = argument.split("=")[1];
    }

    if (/--version=/.test(argument)) {
      version = argument.split("=")[1];
    }

    if (/--non-interactive/.test(argument)) {
      nonInteractive = true;
    }
  }

  if (tag !== "latest" && tag !== "next" && tag !== "test") {
    console.error(`Unsupported tag "${tag}", use "latest", "next" or "test".`);
    process.exit(1);
  }

  if (tag === "latest" && !version) {
    console.error("Pass the version to make the latest stable release!");
    process.exit(1);
  }

  if (!version) {
    // set the next version based on the excalidraw package version + commit hash
    const excalidrawPackageVersion = require(getPackageJsonPath(
      "excalidraw",
    )).version;

    const hash = getShortCommitHash();

    if (!excalidrawPackageVersion.includes(hash)) {
      version = `${excalidrawPackageVersion}-${hash}`;
    } else {
      // ensuring idempotency
      version = excalidrawPackageVersion;
    }
  }

  console.info(`Running with tag "${tag}" and version "${version}"...`);

  return [tag, version, nonInteractive];
};

const validatePackageName = (packageName) => {
  if (!PACKAGES.includes(packageName)) {
    console.error(`Package "${packageName}" not found!`);
    process.exit(1);
  }
};

const getPackageJsonPath = (packageName) => {
  validatePackageName(packageName);
  return path.resolve(PACKAGES_DIR, packageName, "package.json");
};

const updatePackageJsons = (nextVersion) => {
  const packageJsons = new Map();

  for (const packageName of PACKAGES) {
    const pkg = require(getPackageJsonPath(packageName));

    pkg.version = nextVersion;

    if (pkg.dependencies) {
      for (const dependencyName of PACKAGES) {
        if (!pkg.dependencies[`${PACKAGE_SCOPE}/${dependencyName}`]) {
          continue;
        }

        pkg.dependencies[`${PACKAGE_SCOPE}/${dependencyName}`] = nextVersion;
      }
    }

    packageJsons.set(packageName, `${JSON.stringify(pkg, null, 2)}\n`);
  }

  // modify once, to avoid inconsistent state
  for (const packageName of PACKAGES) {
    const content = packageJsons.get(packageName);
    fs.writeFileSync(getPackageJsonPath(packageName), content, "utf-8");
  }
};

const getShortCommitHash = () => {
  return execSync("git rev-parse --short HEAD").toString().trim();
};

const askToCommit = (tag, nextVersion) => {
  if (tag !== "latest") {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const rl = require("readline").createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(
      "Would you like to commit these changes to git? (Y/n): ",
      (answer) => {
        rl.close();

        if (answer.toLowerCase() === "y") {
          execSync(`git add -u`);
          execSync(
            `git commit -m "chore: release ${PACKAGE_SCOPE}/excalidraw@${nextVersion} 🎉"`,
          );
        } else {
          console.warn(
            "Skipping commit. Don't forget to commit manually later!",
          );
        }

        resolve();
      },
    );
  });
};

const buildPackages = () => {
  console.info("Running yarn install...");
  try {
    execSync(`yarn --frozen-lockfile`, { stdio: "inherit" });
  } catch (error) {
    console.warn("yarn install failed, but continuing with build...");
    console.warn("If you encounter build errors, please run 'yarn install' manually first.");
  }

  console.info("Removing existing build artifacts...");
  execSync(`yarn rm:build`, { stdio: "inherit" });

  for (const packageName of PACKAGES) {
    console.info(`Building "${PACKAGE_SCOPE}/${packageName}"...`);
    execSync(`yarn run build:esm`, {
      cwd: path.resolve(PACKAGES_DIR, packageName),
      stdio: "inherit",
    });
  }
};

const askToPublish = (tag, version) => {
  return new Promise((resolve) => {
    const rl = require("readline").createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(
      "Would you like to publish these changes to npm? (Y/n): ",
      (answer) => {
        rl.close();

        if (answer.toLowerCase() === "y") {
          publishPackages(tag, version);
        } else {
          console.info("Skipping publish.");
        }

        resolve();
      },
    );
  });
};

const checkNpmAuth = () => {
  try {
    const whoami = execSync("npm whoami", { encoding: "utf-8" }).trim();
    console.info(`Logged in to npm as: ${whoami}`);
    return true;
  } catch (error) {
    // whoami may fail even if token exists, so we just warn
    console.warn("Warning: Could not verify npm login status.");
    console.warn("If publish fails, please run 'npm login' first.");
    return false;
  }
};

const publishPackages = (tag, version) => {
  // Try to check npm authentication (non-blocking)
  checkNpmAuth();

  const npmRegistry = "https://registry.npmjs.org/";
  
  for (const packageName of PACKAGES) {
    const packagePath = path.resolve(PACKAGES_DIR, packageName);
    
    // Use npm publish with explicit registry to avoid yarn registry issues
    // Add --access public for scoped packages
    try {
      console.info(
        `Publishing "${PACKAGE_SCOPE}/${packageName}" to ${npmRegistry}...`,
      );
      
      execSync(
        `npm publish --tag ${tag} --access public --registry ${npmRegistry}`,
        {
          cwd: packagePath,
          stdio: "inherit",
        },
      );

      console.info(
        `Published "${PACKAGE_SCOPE}/${packageName}@${tag}" with version "${version}"! 🎉`,
      );
    } catch (error) {
      console.error(
        `Failed to publish "${PACKAGE_SCOPE}/${packageName}": ${error.message}`,
      );
      console.error(
        `Please ensure you are logged in to npm and have permission to publish to ${PACKAGE_SCOPE} scope.`,
      );
      console.error(
        `Run 'npm login' or check your NPM_TOKEN environment variable.`,
      );
      throw error;
    }
  }
};

/** main */
(async () => {
  const [tag, version, nonInteractive] = getArguments();

  buildPackages();

  if (tag === "latest") {
    await updateChangelog(version);
  }

  updatePackageJsons(version);

  if (nonInteractive) {
    publishPackages(tag, version);
  } else {
    await askToCommit(tag, version);
    await askToPublish(tag, version);
  }
})();
