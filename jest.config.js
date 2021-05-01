module.exports = {
  transform: {'^.+\\.tsx?$': 'ts-jest'},
  moduleNameMapper: {"^@/(.*)$": "<rootDir>/src/$1"},
  globals: {
    "ts-jest": {
      isolatedModules: true,
    },
  },
};

