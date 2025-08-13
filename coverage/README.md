# Test Coverage Report

## Overall Coverage Summary
- **Total Coverage**: 64.02%
- **Branch Coverage**: 39.74%
- **Function Coverage**: 55.75%
- **Line Coverage**: 65.21%

## Coverage by Module

### 🔐 Authentication Module - 79.03%
- ✅ **auth.controller.ts**: 100% (Fully covered)
- ✅ **auth.service.ts**: 100% (Fully covered)
- ⚠️ **auth.module.ts**: 0% (Module configuration - not executed in tests)
- ⚠️ **strategies/**: 0% (JWT/Local strategies - need integration tests)
- ✅ **guards/**: 73.91% (Good coverage, some edge cases missing)
- ✅ **decorators/**: 100% (Fully covered)
- ✅ **DTOs**: 100% (Fully covered)

### 👥 Users Module - 86.53%
- ✅ **users.controller.ts**: 100% (Fully covered)
- ✅ **users.service.ts**: 100% (Fully covered)
- ⚠️ **users.module.ts**: 0% (Module configuration)
- ✅ **DTOs**: 100% (Fully covered)

### 📄 Documents Module - 64.13%
- ✅ **documents.controller.ts**: 100% (Fully covered)
- ⚠️ **documents.service.ts**: 62.22% (Some business logic paths not covered)
- ⚠️ **documents.module.ts**: 0% (Module configuration)
- ✅ **DTOs**: 87.5% (Good coverage)

### 🔄 Ingestion Module - 39.13%
- ✅ **ingestion.controller.ts**: 100% (Fully covered)
- ⚠️ **ingestion.service.ts**: 27.55% (Complex business logic needs more tests)
- ⚠️ **mock-ingestion.service.ts**: 48.48% (Background processing logic)
- ⚠️ **ingestion.module.ts**: 0% (Module configuration)
- ✅ **DTOs**: 86.66% (Good coverage)

### 💬 Q&A Module - 76.47%
- ✅ **qna.controller.ts**: 100% (Fully covered)
- ✅ **qna.service.ts**: 73.84% (Good coverage with some edge cases missing)
- ⚠️ **qna.module.ts**: 0% (Module configuration)
- ✅ **DTOs**: 88.57% (Good coverage)

### 🗄️ Database Module - 45.45%
- ✅ **prisma.service.ts**: 83.33% (Good coverage)
- ⚠️ **prisma.module.ts**: 0% (Module configuration)

### ⚙️ Utilities - 100%
- ✅ **StringConst.ts**: 100% (Fully covered)

## 📊 Files to Improve Coverage

### High Priority (Business Logic)
1. **src/ingestion/ingestion.service.ts** - 27.55% coverage
   - Missing: Background job processing logic
   - Missing: Error handling scenarios
   - Missing: Status update workflows

2. **src/documents/documents.service.ts** - 62.22% coverage
   - Missing: File system operations
   - Missing: Permission validation edge cases
   - Missing: Bulk operations

### Medium Priority (Complex Logic)
3. **src/qna/qna.service.ts** - 73.84% coverage
   - Missing: AI response generation paths
   - Missing: Search and filtering logic

4. **src/auth/guards/roles.guard.ts** - 53.84% coverage
   - Missing: Role validation edge cases

### Low Priority (Infrastructure)
5. **Strategy files** - 0% coverage
   - These require integration tests rather than unit tests
   - Consider E2E tests for authentication flows

6. **Module files** - 0% coverage
   - These are configuration files, coverage not critical

## 🎯 Test Coverage Goals

- **Target Overall Coverage**: 85%
- **Critical Business Logic**: 95%
- **Controllers**: ✅ 100% (Achieved)
- **Services**: Target 90% (Currently varies)

## 📁 Coverage Report Files

- **HTML Report**: Open `coverage/lcov-report/index.html` in browser for detailed visual coverage
- **LCOV Info**: `coverage/lcov.info` for CI/CD integration
- **JSON Report**: `coverage/coverage-final.json` for programmatic access
- **Clover XML**: `coverage/clover.xml` for build tools

## 🚀 How to Generate Coverage

```bash
# Generate coverage report
npm run test:cov

# View coverage in browser
open coverage/lcov-report/index.html

# Run specific test file with coverage
npm test -- --coverage src/ingestion/ingestion.service.spec.ts
```

## 📈 Coverage Tracking

To maintain and improve coverage:

1. **Pre-commit hooks**: Ensure coverage doesn't drop below threshold
2. **CI/CD integration**: Fail builds if coverage drops significantly
3. **Regular reviews**: Weekly coverage reports to identify gaps
4. **Business logic priority**: Focus on critical business logic first

---
*Coverage report generated on: ${new Date().toLocaleString()}*