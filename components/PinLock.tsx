import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

interface PinLockProps {
  isVisible: boolean;
  correctPin: string;
  onSuccess: () => void;
  onClose: () => void;
}

export const PinLock: React.FC<PinLockProps> = ({ isVisible, correctPin, onSuccess, onClose }) => {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 360;
  const numpadWidth = Math.min(width * 0.85, 400);
  const buttonSize = isSmallScreen ? 60 : 75;

  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (pin.length === 4) {
      if (pin === correctPin) {
        onSuccess();
        setPin("");
      } else {
        setError(true);
        setPin("");
        setTimeout(() => setError(false), 500);
      }
    }
  }, [pin]);

  const handlePress = (num: string) => {
    if (pin.length < 4) setPin(prev => prev + num);
  };

  return (
    <Modal visible={isVisible} animationType="fade" transparent={true}>
      <View className="flex-1 bg-gray-900/95 justify-center items-center px-4">
        <Animated.View entering={FadeIn} className="items-center mb-8">
          <View 
            style={{ width: isSmallScreen ? 60 : 80, height: isSmallScreen ? 60 : 80 }}
            className="bg-primary-500 rounded-full items-center justify-center mb-4"
          >
            <Ionicons name="lock-closed" size={isSmallScreen ? 30 : 40} color="white" />
          </View>
          <Text className="text-white text-2xl font-black">Staff Security</Text>
          <Text className="text-gray-400 mt-2 text-center">Enter PIN to access Owner tools</Text>
        </Animated.View>

        <View className="flex-row justify-center space-x-6 mb-10">
          {[1, 2, 3, 4].map((i) => (
            <View 
              key={i} 
              className={`w-4 h-4 rounded-full border-2 ${pin.length >= i ? 'bg-primary-500 border-primary-500' : 'border-gray-600'} ${error ? 'bg-red-500 border-red-500' : ''}`}
            />
          ))}
        </View>

        <View style={{ width: numpadWidth }} className="flex-row flex-wrap justify-between">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "X", "0", "C"].map((btn) => (
            <TouchableOpacity 
              key={btn}
              onPress={() => {
                if (btn === "C") setPin("");
                else if (btn === "X") onClose();
                else handlePress(btn);
              }}
              style={{ width: buttonSize, height: buttonSize }}
              className="items-center justify-center mb-4 rounded-full bg-white/10"
            >
              <Text className="text-white text-2xl font-bold">{btn}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
};
