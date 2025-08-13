#!/bin/bash

# Script to generate and view test coverage report

echo "🧪 Generating test coverage report..."

# Generate coverage
npm run test:cov

echo ""
echo "📊 Coverage Summary:"
echo "==================="
echo ""

# Extract coverage summary from the coverage file
if [ -f "coverage/lcov-report/index.html" ]; then
    echo "✅ Coverage report generated successfully!"
    echo ""
    echo "📁 Coverage files created:"
    echo "  • HTML Report: coverage/lcov-report/index.html"
    echo "  • LCOV Info: coverage/lcov.info"
    echo "  • JSON Report: coverage/coverage-final.json"
    echo "  • Clover XML: coverage/clover.xml"
    echo ""
    
    # Try to open the coverage report in browser
    if command -v open >/dev/null 2>&1; then
        echo "🌐 Opening coverage report in browser..."
        open coverage/lcov-report/index.html
    elif command -v xdg-open >/dev/null 2>&1; then
        echo "🌐 Opening coverage report in browser..."
        xdg-open coverage/lcov-report/index.html
    else
        echo "📖 To view the detailed coverage report, open:"
        echo "   coverage/lcov-report/index.html"
        echo "   in your web browser."
    fi
    
    echo ""
    echo "📋 Quick access commands:"
    echo "  View coverage:     open coverage/lcov-report/index.html"
    echo "  Re-run with coverage: npm run test:cov"
    echo "  Run specific test:    npm test -- src/path/to/test.spec.ts"
    
else
    echo "❌ Failed to generate coverage report"
    exit 1
fi