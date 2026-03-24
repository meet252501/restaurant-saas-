// @ts-nocheck
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import LoginScreen from '../login';
import { renderWithWrapper, mockRouter } from './test-utils';

jest.useFakeTimers();

describe('Login Screen Component Tests', () => {

  it('renders login components correctly', () => {
    const { getByText } = renderWithWrapper(<LoginScreen />);
    
    // Check main elements
    expect(getByText('Green Apple Restaurant')).toBeTruthy();
    expect(getByText('Staff Security')).toBeTruthy();
    expect(getByText('C')).toBeTruthy(); // Clear button present
    expect(getByText('1')).toBeTruthy(); // Numpad present
  });

  it('navigates to dashboard on perfect PIN entry', () => {
    const { getByText } = renderWithWrapper(<LoginScreen />);
    
    // Press the designated dummy PIN (1234)
    fireEvent.press(getByText('1'));
    fireEvent.press(getByText('2'));
    fireEvent.press(getByText('3'));
    fireEvent.press(getByText('4'));

    // Should push to the root tabs directory
    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
  });

  it('clears pin when C is pressed', () => {
    const { getByText } = renderWithWrapper(<LoginScreen />);
    
    // Press '1'
    fireEvent.press(getByText('1'));
    // Clear pin
    fireEvent.press(getByText('C'));
    
    // If it was cleared, pressing 1,2,3 won't trigger access
    fireEvent.press(getByText('1'));
    fireEvent.press(getByText('2'));
    fireEvent.press(getByText('3'));
    
    expect(mockRouter.replace).not.toHaveBeenCalledTimes(2); // Should only have been called in the previous test hook
  });

});
