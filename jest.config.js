module.exports = {
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      isolatedModules: true,
    }]
  },
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
};

