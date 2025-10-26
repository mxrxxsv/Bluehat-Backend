# Backend Testing with Jest

This directory contains automated tests for the backend API using Jest and Supertest.

## 📁 Test Structure

```
backend/__tests__/
├── setup.js              # Test environment setup
├── health.test.js        # Health check and basic endpoint tests
├── auth.test.js          # Authentication tests (login, logout, check-auth)
├── education.test.js     # Education CRUD tests
├── skills.test.js        # Skills API tests
├── profile.test.js       # Profile API tests
└── helpers/
    ├── testData.js       # Mock data for tests
    └── testHelpers.js    # Helper functions for tests
```

## 🚀 Running Tests

### Run all tests:

```bash
npm test
```

### Run tests in watch mode (auto-rerun on changes):

```bash
npm run test:watch
```

### Run tests with coverage report:

```bash
npm run test:coverage
```

### Run tests with verbose output:

```bash
npm run test:verbose
```

### Run specific test file:

```bash
npm test -- education.test.js
```

### Run specific test suite:

```bash
npm test -- --testNamePattern="Education CRUD"
```

## 📊 Test Coverage

After running `npm run test:coverage`, you'll see a coverage report:

```
---------------------------|---------|----------|---------|---------|
File                       | % Stmts | % Branch | % Funcs | % Lines |
---------------------------|---------|----------|---------|---------|
All files                  |   85.23 |    78.45 |   90.12 |   84.67 |
 controllers/              |   88.45 |    82.13 |   92.45 |   87.89 |
  profile.controller.js    |   90.12 |    85.67 |   95.23 |   89.45 |
  auth.controller.js       |   87.89 |    80.45 |   91.23 |   86.78 |
---------------------------|---------|----------|---------|---------|
```

## 🧪 What's Tested

### ✅ Health & Basic Endpoints

- Health check endpoint
- 404 error handling
- Public endpoints accessibility

### ✅ Authentication

- Worker login (valid/invalid credentials)
- Client login
- Logout
- Check authentication status
- Missing fields validation

### ✅ Education CRUD

- Add education (worker & client)
- Update education
- Delete education
- Multiple education entries
- Validation errors
- Authentication requirements

### ✅ Skills API

- Get all skill categories
- Data structure validation
- Empty state handling
- Public accessibility

### ✅ Profile API

- Get worker profile
- Get client profile
- Profile with education
- Worker-specific fields
- Client-specific fields
- Authentication requirements

## 🔧 Test Configuration

### Test Database

Tests use **mongodb-memory-server** which creates an in-memory MongoDB instance:

- ✅ No need for separate test database
- ✅ Fast execution
- ✅ Automatic cleanup after tests
- ✅ No data pollution

### Test Environment

Set in `package.json`:

```json
{
  "jest": {
    "testEnvironment": "node",
    "coveragePathIgnorePatterns": ["/node_modules/"],
    "testMatch": ["**/__tests__/**/*.test.js"],
    "setupFilesAfterEnv": ["<rootDir>/backend/__tests__/setup.js"]
  }
}
```

## 📝 Writing New Tests

### Example Test Structure:

```javascript
const request = require("supertest");
const app = require("../index");
const Model = require("../models/Model");

describe("Feature Name", () => {
  beforeAll(async () => {
    // Setup before all tests
  });

  beforeEach(async () => {
    // Setup before each test
  });

  afterEach(async () => {
    // Cleanup after each test
  });

  describe("POST /endpoint", () => {
    it("should do something successfully", async () => {
      const response = await request(app)
        .post("/endpoint")
        .set("Cookie", authCookies)
        .send(testData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });

    it("should fail with invalid data", async () => {
      const response = await request(app).post("/endpoint").send(invalidData);

      expect(response.status).toBe(400);
    });
  });
});
```

## 🎯 Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Use `beforeEach` and `afterEach` to clean up test data
3. **Descriptive Names**: Use clear test descriptions
4. **Assertions**: Test both success and failure cases
5. **Coverage**: Aim for >80% code coverage
6. **Fast**: Keep tests fast (< 30s total runtime)

## 🐛 Debugging Tests

### Run single test with verbose output:

```bash
npm test -- --verbose education.test.js
```

### Add console.log in tests:

```javascript
it("should do something", async () => {
  const response = await request(app).get("/endpoint");
  console.log("Response:", response.body);
  expect(response.status).toBe(200);
});
```

### Check test database state:

```javascript
it("should create record", async () => {
  await createRecord();
  const records = await Model.find({});
  console.log("Records in DB:", records);
  expect(records).toHaveLength(1);
});
```

## 📚 Dependencies

- **jest**: Testing framework
- **supertest**: HTTP assertions
- **@jest/globals**: Jest global functions
- **mongodb-memory-server**: In-memory MongoDB for testing

## 🚨 Common Issues

### Issue: Port already in use

**Solution**: Tests run in NODE_ENV=test, which prevents server from starting

### Issue: Tests hang

**Solution**: Use `--detectOpenHandles --forceExit` flags

### Issue: Database connection errors

**Solution**: Check mongodb-memory-server installation

### Issue: Authentication fails in tests

**Solution**: Verify mock credentials match actual validation rules

## 📈 CI/CD Integration

Add to your CI pipeline (.github/workflows/test.yml):

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: "18"
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

## 🎉 Success Metrics

✅ All tests passing  
✅ Coverage > 80%  
✅ Tests run < 30 seconds  
✅ No memory leaks  
✅ CI/CD integrated

---

**Happy Testing! 🧪**
