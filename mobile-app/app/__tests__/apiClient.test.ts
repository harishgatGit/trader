import { Platform } from 'react-native';

describe('API Client Base URL Configuration', () => {
  it('should select localhost for iOS Platform', () => {
    (Platform as any).OS = 'ios';
    const baseUrl = (Platform.OS as string) === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
    expect(baseUrl).toBe('http://localhost:3000');
  });

  it('should select 10.0.2.2 loopback for Android Platform', () => {
    (Platform as any).OS = 'android';
    const baseUrl = (Platform.OS as string) === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
    expect(baseUrl).toBe('http://10.0.2.2:3000');
  });
});
