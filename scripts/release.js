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
  console.info("Checking npm authentication...");
  
  try {
    // First, try to get current user
    const whoami = execSync("npm whoami --registry https://registry.npmjs.org/", {
      encoding: "utf-8",
      stdio: "pipe",
    }).trim();
    
    if (whoami) {
      console.info(`✓ Logged in to npm as: ${whoami}`);
      return true;
    }
    
    throw new Error("No user returned from npm whoami");
  } catch (error) {
    console.error("✗ npm authentication failed!");
    console.error("");
    console.error("Please follow these steps to fix authentication:");
    console.error("");
    console.error("1. Clear expired token:");
    console.error("   - Delete token from: %USERPROFILE%\\.npmrc");
    console.error("   - Or manually edit the file and remove the _authToken line");
    console.error("");
    console.error("2. Re-login to npm:");
    console.error("   npm login");
    console.error("");
    console.error("3. Verify login:");
    console.error("   npm whoami");
    console.error("");
    console.error("4. Then retry the release command.");
    console.error("");
    
    return false;
  }
};

const publishPackages = (tag, version) => {
  // Force check npm authentication before publishing
  if (!checkNpmAuth()) {
    console.error("");
    console.error("Cannot proceed without valid npm authentication.");
    console.error("Please fix authentication issues and try again.");
    process.exit(1);
  }

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
      const errorMessage = error.message || error.toString();
      const errorOutput = error.stderr?.toString() || error.stdout?.toString() || "";
      
      console.error(
        `Failed to publish "${PACKAGE_SCOPE}/${packageName}": ${errorMessage}`,
      );
      
      // Check for specific error types
      if (errorMessage.includes("403") || errorOutput.includes("403")) {
        if (
          errorMessage.includes("Two-factor authentication") ||
          errorOutput.includes("Two-factor authentication") ||
          errorMessage.includes("granular access token") ||
          errorOutput.includes("granular access token")
        ) {
          console.error("");
          console.error("⚠️  Two-Factor Authentication (2FA) Required!");
          console.error("");
          console.error("npm now requires 2FA or a granular access token to publish packages.");
          console.error("");
          console.error("To fix this:");
          console.error("");
          console.error("Option 1: Enable 2FA on your npm account");
          console.error("  1. Go to: https://www.npmjs.com/settings/YOUR_USERNAME/security");
          console.error("  2. Enable 'Two-Factor Authentication'");
          console.error("  3. When publishing, npm will prompt for the 2FA code");
          console.error("  4. Or set it via: npm config set otp YOUR_2FA_CODE");
          console.error("");
          console.error("Option 2: Use a Granular Access Token (for CI/CD)");
          console.error("  1. Go to: https://www.npmjs.com/settings/YOUR_USERNAME/access-tokens");
          console.error("  2. Create a new 'Granular Access Token'");
          console.error("  3. Enable 'Bypass 2FA' permission");
          console.error("  4. Set the token: npm config set //registry.npmjs.org/:_authToken YOUR_TOKEN");
          console.error("");
          console.error("For more info: https://docs.npmjs.com/about-two-factor-authentication");
          console.error("");
        } else {
          console.error("");
          console.error("⚠️  403 Forbidden - Permission denied");
          console.error("");
          console.error("Possible reasons:");
          console.error("  - You don't have permission to publish to @excalidraw-modify scope");
          console.error("  - The package name is already taken by another user");
          console.error("  - Your account doesn't have publish access");
          console.error("");
        }
      } else if (errorMessage.includes("401") || errorOutput.includes("401")) {
        console.error("");
        console.error("⚠️  401 Unauthorized - Authentication failed");
        console.error("");
        console.error("Please run: npm login");
        console.error("Then verify with: npm whoami");
        console.error("");
      } else {
        console.error("");
        console.error(
          `Please ensure you are logged in to npm and have permission to publish to ${PACKAGE_SCOPE} scope.`,
        );
        console.error("Run 'npm login' or check your NPM_TOKEN environment variable.");
        console.error("");
      }
      
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
