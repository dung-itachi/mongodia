/** @type {import('jest').Config} */
const config = {
  // Test environment
  testEnvironment: "node",
  
  // Root directory
  rootDir: ".",
  
  // Test match patterns
  testMatch: [
    "**/src/tests/**/*.test.ts",
    "**/src/**/*.test.ts",
  ],
  
  // Transform files
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {
      // Use tsconfig for test configuration
      tsconfig: {
        "target": "ES2017",
        "module": "commonjs",
        "moduleResolution": "node",
        "esModuleInterop": true,
        "allowSyntheticDefaultImports": true,
        "strict": true,
        "skipLibCheck": true,
        "resolveJsonModule": true,
        "isolatedModules": true,
        "jsx": "react-jsx",
        "paths": {
          "@/*": ["./src/*"]
        },
        "baseUrl": "."
      },
      useESM: false,
    }],
  },
  
  // Setup files - load environment variables
  setupFiles: ["<rootDir>/jest.setup.js"],
  
  // Module name mapper for path aliases
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  
  // Handle module resolution
  moduleDirectories: ["node_modules", "src"],
  
  // Extensions to parse
  extensionsToTreatAsEsm: [],
  
  // Collect coverage (optional)
  collectCoverage: false,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Test timeout
  testTimeout: 60000,
  
  // Verbose output
  verbose: true,
  
  // Force exit after tests complete
  forceExit: true,
  
  // Detect open handles
  detectOpenHandles: true,
  
  // Glob patterns to ignore
  testPathIgnorePatterns: [
    "/node_modules/",
    "/.next/",
    "/dist/",
  ],
};

module.exports = config;
