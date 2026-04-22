// @ts-nocheck
import '@testing-library/jest-native/extend-expect';

jest.spyOn(console, 'error').mockImplementation((...args) => {
  const errorMsg = args[0] || '';
  if (typeof errorMsg === 'string' && errorMsg.includes('Warning: ReactDOM.render is no longer supported')) return;
  if (typeof errorMsg === 'string' && errorMsg.includes('Objects are not valid as a React child')) return;
  // Let other errors pass through
});
// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
