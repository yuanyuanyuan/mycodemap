// [META] since:2026-03-06 | owner:cli-team | stable:false
// [WHY] 测试 sanitize 工具函数的正确性

import { describe, it, expect, vi } from 'vitest';
import {
  sanitize,
  sanitizeToString,
  createSanitizer,
  containsSensitiveData,
} from '../sanitize.js';

describe('sanitize', () => {
  describe('字符串脱敏', () => {
    it('应脱敏 API Key', () => {
      const input = 'api_key=abc123def456ghi789jkl';
      const result = sanitize(input) as string;
      expect(result).toBe('api_key=[REDACTED]');
    });

    it('应脱敏 Bearer Token', () => {
      const input = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const result = sanitize(input) as string;
      expect(result).toContain('[REDACTED]');
    });

    it('应脱敏 AWS Access Key', () => {
      const input = 'AKIAIOSFODNN7EXAMPLE';
      const result = sanitize(input) as string;
      expect(result).toBe('[AWS_KEY_REDACTED]');
    });

    it('应脱敏 GitHub Token', () => {
      const input = 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
      const result = sanitize(input) as string;
      expect(result).toBe('[GITHUB_TOKEN_REDACTED]');
    });

    it('应脱敏 JWT Token', () => {
      const input = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const result = sanitize(input) as string;
      expect(result).toBe('[JWT_REDACTED]');
    });

    it('应脱敏密码', () => {
      const input = 'password: mySecretPassword123';
      const result = sanitize(input) as string;
      expect(result).toBe('password: [REDACTED]');
    });

    it('应脱敏数据库连接字符串', () => {
      const input = 'mongodb://admin:secretpass@mongodb.example.com:27017/mydb';
      const result = sanitize(input) as string;
      expect(result).toContain('[DB_CREDENTIALS]');
      expect(result).not.toContain('admin:secretpass');
    });

    it('应脱敏环境变量中的密钥', () => {
      const input = 'MY_SECRET_KEY=super_secret_value_12345';
      const result = sanitize(input) as string;
      expect(result).toContain('[REDACTED]');
    });

    it('应保留非敏感字符串不变', () => {
      const input = 'Hello World, this is a normal string without sensitive data!';
      const result = sanitize(input) as string;
      expect(result).toBe(input);
    });
  });

  describe('对象脱敏', () => {
    it('应递归脱敏对象中的所有字符串', () => {
      const input = {
        name: 'test',
        apiKey: 'api_key=abc123def456ghi789jkl012mno',
        nested: {
          token: 'bearer abc123def456ghi789jkl012mno',
        },
      };
      const result = sanitize(input) as Record<string, unknown>;
      expect(result.name).toBe('test');
      expect(result.apiKey).toContain('[REDACTED]');
      expect((result.nested as Record<string, unknown>).token).toContain('[REDACTED]');
    });

    it('应递归脱敏数组中的对象', () => {
      const input = {
        users: [
          { name: 'Alice', password: 'password=MY_PASSWORD_123456789' },
          { name: 'Bob', password: 'password=ANOTHER_PASSWORD_123456789' },
        ],
      };
      const result = sanitize(input) as Record<string, unknown>;
      expect((result.users as unknown[])[0]).toEqual({ name: 'Alice', password: 'password=[REDACTED]' });
      expect((result.users as unknown[])[1]).toEqual({ name: 'Bob', password: 'password=[REDACTED]' });
    });
  });

  describe('长度限制', () => {
    it('应限制最大长度', () => {
      const longString = 'a'.repeat(2000);
      const result = sanitize(longString, { maxLength: 100 }) as string;
      expect(result.length).toBe(100);
    });

    it('应在超过限制时显示截断信息', () => {
      const longString = 'a'.repeat(2000);
      const result = sanitize(longString, { maxLength: 100, preserveLength: true }) as string;
      expect(result).toContain('[CONTENT_TRUNCATED');
    });
  });
});

describe('sanitizeToString', () => {
  it('应将对象转换为字符串并脱敏', () => {
    const input = { apiKey: 'secret12345678901234567890' };
    const result = sanitizeToString(input);
    expect(result).toContain('[REDACTED]');
  });

  it('应直接返回字符串输入', () => {
    const input = 'normal string';
    const result = sanitizeToString(input);
    expect(result).toBe(input);
  });
});

describe('createSanitizer', () => {
  it('应创建自定义脱敏器', () => {
    const customRules = [
      { pattern: /CUSTOM_SECRET/g, replacement: '[CUSTOM_REDACTED]' },
    ];
    const sanitizer = createSanitizer(customRules);
    const result = sanitizer('This contains CUSTOM_SECRET value');
    expect(result).toBe('This contains [CUSTOM_REDACTED] value');
  });
});

describe('containsSensitiveData', () => {
  it('应检测到敏感数据', () => {
    expect(containsSensitiveData('api_key=abc123def456ghi789jkl012')).toBe(true);
    expect(containsSensitiveData('password=mySecretPassword123')).toBe(true);
    expect(containsSensitiveData('bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')).toBe(true);
  });

  it('应返回 false 对于非敏感数据', () => {
    expect(containsSensitiveData('Hello World')).toBe(false);
    expect(containsSensitiveData('normal text without secrets')).toBe(false);
  });
});
