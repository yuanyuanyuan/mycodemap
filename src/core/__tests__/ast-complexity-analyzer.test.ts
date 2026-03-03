// ============================================
// AST Complexity Analyzer Unit Tests
// ============================================

import { describe, it, expect } from 'vitest';
import { analyzeFileComplexity, analyzeMultipleFiles } from '../ast-complexity-analyzer.js';

describe('AST Complexity Analyzer', () => {
  describe('analyzeFileComplexity', () => {
    it('should analyze a simple file with no control flow', () => {
      const code = `function hello() {
  console.log('hello');
}
export default hello;`;

      // Create a temporary file
      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      const tempFile = path.join(os.tmpdir(), `test_${Date.now()}.ts`);

      try {
        fs.writeFileSync(tempFile, code, 'utf-8');
        const result = analyzeFileComplexity(tempFile);

        expect(result.cyclomatic).toBe(1); // Only function entry point
        expect(result.functions).toBe(1);
        expect(result.functionDetails).toHaveLength(1);
        expect(result.functionDetails[0].cyclomatic).toBe(1);
        expect(result.functionDetails[0].name).toBe('hello');
      } finally {
        fs.unlinkSync(tempFile);
      }
    });

    it('should correctly count if statements', () => {
      const code = `function test(a) {
  if (a > 0) {
    return 1;
  } else {
    return 0;
  }
}`;

      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      const tempFile = path.join(os.tmpdir(), `test_${Date.now()}.ts`);

      try {
        fs.writeFileSync(tempFile, code, 'utf-8');
        const result = analyzeFileComplexity(tempFile);

        // Base 1 + 1 for if = 2
        expect(result.cyclomatic).toBe(2);
        expect(result.functionDetails[0].cyclomatic).toBe(2);
      } finally {
        fs.unlinkSync(tempFile);
      }
    });

    it('should correctly count for loops', () => {
      const code = `function sum(arr) {
  let total = 0;
  for (let i = 0; i < arr.length; i++) {
    total += arr[i];
  }
  return total;
}`;

      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      const tempFile = path.join(os.tmpdir(), `test_${Date.now()}.ts`);

      try {
        fs.writeFileSync(tempFile, code, 'utf-8');
        const result = analyzeFileComplexity(tempFile);

        // Base 1 + 1 for for = 2
        expect(result.cyclomatic).toBe(2);
      } finally {
        fs.unlinkSync(tempFile);
      }
    });

    it('should correctly count while loops', () => {
      const code = `function countDown(n) {
  while (n > 0) {
    n--;
  }
  return n;
}`;

      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      const tempFile = path.join(os.tmpdir(), `test_${Date.now()}.ts`);

      try {
        fs.writeFileSync(tempFile, code, 'utf-8');
        const result = analyzeFileComplexity(tempFile);

        // Base 1 + 1 for while = 2
        expect(result.cyclomatic).toBe(2);
      } finally {
        fs.unlinkSync(tempFile);
      }
    });

    it('should correctly count switch case statements', () => {
      const code = `function getDayType(day) {
  switch (day) {
    case 0:
    case 6:
      return 'weekend';
    default:
      return 'weekday';
  }
}`;

      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      const tempFile = path.join(os.tmpdir(), `test_${Date.now()}.ts`);

      try {
        fs.writeFileSync(tempFile, code, 'utf-8');
        const result = analyzeFileComplexity(tempFile);

        // Base 1 + 2 for switch (2 non-default cases) = 3
        expect(result.cyclomatic).toBe(3);
      } finally {
        fs.unlinkSync(tempFile);
      }
    });

    it('should correctly count try-catch statements', () => {
      const code = `function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}`;

      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      const tempFile = path.join(os.tmpdir(), `test_${Date.now()}.ts`);

      try {
        fs.writeFileSync(tempFile, code, 'utf-8');
        const result = analyzeFileComplexity(tempFile);

        // Base 1 + 1 for try-catch = 2
        expect(result.cyclomatic).toBe(2);
      } finally {
        fs.unlinkSync(tempFile);
      }
    });

    it('should correctly count && and || operators', () => {
      const code = `function validate(user) {
  return user.name && user.email && user.age > 18;
}`;

      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      const tempFile = path.join(os.tmpdir(), `test_${Date.now()}.ts`);

      try {
        fs.writeFileSync(tempFile, code, 'utf-8');
        const result = analyzeFileComplexity(tempFile);

        // Base 1 + 2 for two && = 3
        expect(result.cyclomatic).toBe(3);
      } finally {
        fs.unlinkSync(tempFile);
      }
    });

    it('should count multiple functions correctly', () => {
      const code = `function add(a, b) {
  return a + b;
}

function subtract(a, b) {
  return a - b;
}

function multiply(a, b) {
  return a * b;
}`;

      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      const tempFile = path.join(os.tmpdir(), `test_${Date.now()}.ts`);

      try {
        fs.writeFileSync(tempFile, code, 'utf-8');
        const result = analyzeFileComplexity(tempFile);

        expect(result.functions).toBe(3);
        expect(result.functionDetails).toHaveLength(3);
      } finally {
        fs.unlinkSync(tempFile);
      }
    });

    it('should detect high complexity functions', () => {
      const code = `function complex(a, b, c) {
  if (a > 0) {
    if (b > 0) {
      if (c > 0) {
        return 1;
      }
    }
  }
  return 0;
}`;

      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      const tempFile = path.join(os.tmpdir(), `test_${Date.now()}.ts`);

      try {
        fs.writeFileSync(tempFile, code, 'utf-8');
        const result = analyzeFileComplexity(tempFile);

        // Base 1 + 3 for ifs = 4
        expect(result.cyclomatic).toBe(4);
        expect(result.functionDetails[0].isHighComplexity).toBe(false); // Below threshold 10
      } finally {
        fs.unlinkSync(tempFile);
      }
    });

    it('should count classes', () => {
      const code = `class Foo {
  constructor() {}
  method() {}
}

class Bar {
  method() {}
}`;

      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      const tempFile = path.join(os.tmpdir(), `test_${Date.now()}.ts`);

      try {
        fs.writeFileSync(tempFile, code, 'utf-8');
        const result = analyzeFileComplexity(tempFile);

        expect(result.classes).toBe(2);
      } finally {
        fs.unlinkSync(tempFile);
      }
    });
  });

  describe('analyzeMultipleFiles', () => {
    it('should analyze multiple files and calculate summary', () => {
      const fs = require('fs');
      const path = require('path');
      const os = require('os');

      const code1 = `function simple() { return 1; }`;
      const code2 = `function complex(x) { if (x > 0) { return 1; } return 0; }`;

      const tempDir = os.tmpdir();
      const file1 = path.join(tempDir, `test1_${Date.now()}.ts`);
      const file2 = path.join(tempDir, `test2_${Date.now()}.ts`);

      try {
        fs.writeFileSync(file1, code1, 'utf-8');
        fs.writeFileSync(file2, code2, 'utf-8');

        const result = analyzeMultipleFiles([file1, file2]);

        expect(result.files).toHaveLength(2);
        expect(result.summary.totalFiles).toBe(2);
        expect(result.summary.averageCyclomatic).toBeGreaterThan(0);
      } finally {
        fs.unlinkSync(file1);
        fs.unlinkSync(file2);
      }
    });

    it('should handle non-existent files gracefully', () => {
      const result = analyzeMultipleFiles(['/non/existent/file.ts']);

      expect(result.files).toHaveLength(0);
      expect(result.summary.totalFiles).toBe(0);
    });
  });

  describe('maintainability index', () => {
    it('should calculate maintainability based on complexity and LOC', () => {
      const code = `function test() { return 1; }`;

      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      const tempFile = path.join(os.tmpdir(), `test_${Date.now()}.ts`);

      try {
        fs.writeFileSync(tempFile, code, 'utf-8');
        const result = analyzeFileComplexity(tempFile);

        // Low complexity and low LOC should result in high maintainability
        expect(result.maintainability).toBeGreaterThan(50);
      } finally {
        fs.unlinkSync(tempFile);
      }
    });
  });
});
