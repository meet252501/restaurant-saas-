import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Shadows, Radius } from '../../lib/theme';
import { localAI } from '../../lib/LocalAIService';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';

export default function AIDownloadScreen() {
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState(localAI.getStatus());

  const startDownload = async () => {
    setDownloading(true);
    const success = await localAI.downloadModel((p) => setProgress(p));
    if (success) {
      setStatus('ready');
      alert("AI Assistant is now available offline! 🍏");
    }
    setDownloading(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6">
        <View className="py-8">
          <TouchableOpacity onPress={() => router.back()} className="mb-6">
            <Ionicons name="arrow-back" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>

          <Animated.View entering={FadeInDown} className="items-center mb-10">
            <View className="w-24 h-24 bg-primary-50 rounded-full items-center justify-center mb-6 border border-primary-100">
              <MaterialCommunityIcons name="brain" size={48} color={Colors.accent} />
            </View>
            <Text className="text-3xl font-bold text-gray-900 text-center">Offline AI</Text>
            <Text className="text-gray-500 text-center mt-2 px-4">
              Download the intelligence layer to use TableBook AI without internet or API costs.
            </Text>
          </Animated.View>

          <View className="bg-gray-50 rounded-3xl p-6 border border-gray-100 mb-8">
            <View className="flex-row items-center mb-4">
              <View className="w-10 h-10 bg-primary-100 rounded-xl items-center justify-center mr-4">
                <Ionicons name="cloud-download-outline" size={22} color={Colors.accent} />
              </View>
              <View className="flex-1">
                <Text className="font-bold text-gray-900">Qwen-2 1.5B Model</Text>
                <Text className="text-xs text-gray-500">Size: ~980MB | Optimal for 4GB+ RAM</Text>
              </View>
            </View>

            {status === 'ready' ? (
              <View className="bg-primary-500 py-4 rounded-2xl flex-row items-center justify-center">
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <Text className="text-white font-bold ml-2">Ready to Use</Text>
              </View>
            ) : (
              <>
                {downloading ? (
                  <View className="mt-2">
                    <View className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                      <View 
                        className="h-full bg-primary-500" 
                        style={{ width: `${progress}%` }} 
                      />
                    </View>
                    <Text className="text-center text-primary-600 font-bold mt-2">{progress}% Downloaded</Text>
                  </View>
                ) : (
                  <TouchableOpacity 
                    className="bg-primary-600 py-4 rounded-2xl items-center"
                    onPress={startDownload}
                  >
                    <Text className="text-white font-bold text-lg">Download Now</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

          <View className="space-y-4">
            <Text className="text-lg font-bold text-gray-900 px-1 mb-2">Why Offline AI?</Text>
            <FeatureItem 
              icon="infinite" 
              title="Unlimited Usage" 
              desc="No monthly API limits or costs from Google Gemini." 
            />
            <FeatureItem 
              icon="shield-checkmark" 
              title="Private & Secure" 
              desc="Your restaurant business data never leaves the tablet." 
            />
            <FeatureItem 
              icon="airplane" 
              title="Works Everywhere" 
              desc="Use AI even in basements or areas with poor WiFi." 
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureItem({ icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <View className="flex-row p-4 bg-gray-50 rounded-2xl border border-gray-100 mb-4">
      <Ionicons name={icon} size={24} color={Colors.accent} />
      <View className="ml-4 flex-1">
        <Text className="font-bold text-gray-900">{title}</Text>
        <Text className="text-sm text-gray-500 leading-relaxed">{desc}</Text>
      </View>
    </View>
  );
}
