import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { trpc } from '../../lib/trpc';
import { useSaaSStore } from '../../lib/saas-store';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInUp, FadeInRight } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const CATEGORIES = ["starters", "mains", "breads", "rice", "desserts", "drinks", "combos"];

export default function DigitalMenuPublic() {
  const { tableId } = useLocalSearchParams();
  const [selectedCat, setSelectedCat] = useState('Starter');
  const appName = useSaaSStore(s => s.appName);

  const { data: menuItems, isLoading } = trpc.menu.getByRestaurant.useQuery({ restaurantId: "res_default" });

  if (isLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        {/* Logo/Header */}
        <View className="px-6 py-4 flex-row justify-between items-center z-10">
          <Text className="text-primary-600 font-bold italic text-lg tracking-widest">{appName.toUpperCase()}</Text>
          <TouchableOpacity className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm">
            <Feather name="bell" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const filteredItems = menuItems?.filter(m => m.category === selectedCat && m.isAvailable) || [];

  return (
    <View className="flex-1 bg-white">
      {/* Premium Hero Header */}
      <View className="h-72 bg-primary-900 relative">
        <Image 
          source={{ uri: 'https://images.unsplash.com/photo-1517248135467-4c7ed9d42177?q=80&w=1000&auto=format&fit=crop' }}
          className="absolute inset-0 opacity-40"
        />
        <SafeAreaView className="flex-1 justify-end p-6">
          <Animated.View entering={FadeInUp}>
            <View className="flex-row items-center mb-2">
              <View className="bg-primary-500 px-3 py-1 rounded-full mr-2">
                <Text className="text-white font-black text-[10px] uppercase">Table {tableId}</Text>
              </View>
              <Text className="text-white/80 font-medium text-xs tracking-widest uppercase">Welcome</Text>
            </View>
            <Text className="text-4xl font-black text-white leading-tight">{appName.toUpperCase()}</Text>
            <Text className="text-primary-100 mt-1">Authentic Flavors</Text>
            <View className="flex-row items-center mt-4">
              <View className="flex-row items-center bg-white/10 px-3 py-1.5 rounded-2xl mr-3">
                <Ionicons name="star" size={14} color="#fbbf24" />
                <Text className="text-white font-bold ml-1 text-xs">4.6</Text>
              </View>
              <View className="flex-row items-center bg-white/10 px-3 py-1.5 rounded-2xl">
                <Ionicons name="leaf" size={12} color="#10b981" />
                <Text className="text-white font-bold ml-1 text-xs tracking-tight">Pure Veg</Text>
              </View>
            </View>
          </Animated.View>
        </SafeAreaView>
      </View>

      {/* Modern Category Selector */}
      <View className="z-10 -mt-8">
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          className="px-4 py-4 bg-white rounded-t-[40px] shadow-2xl"
          contentContainerStyle={{ paddingRight: 40 }}
        >
          {CATEGORIES.map(cat => (
            <TouchableOpacity 
              key={cat} 
              onPress={() => setSelectedCat(cat)}
              className={`mr-3 px-6 py-4 rounded-[28px] ${selectedCat === cat ? 'bg-primary-600 shadow-primary-200' : 'bg-gray-50'}`}
              style={selectedCat === cat ? { shadowColor: '#10b981', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 } : {}}
            >
              <Text className={`font-bold capitalize text-xs tracking-wide ${selectedCat === cat ? 'text-white' : 'text-gray-400'}`}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView className="flex-1 px-4 mt-2">
        <View className="py-4">
          <Text className="text-xl font-bold text-gray-900 mb-6 capitalize">{selectedCat}</Text>
          
          {filteredItems.map((item, index) => (
            <Animated.View 
              key={item.id}
              entering={FadeInRight.delay(index * 100)}
              className="flex-row items-center mb-8"
            >
              <View className="flex-1 pr-6">
                <View className="flex-row items-center mb-1">
                  <View className="w-3 h-3 rounded-full border border-primary-500 items-center justify-center mr-2">
                    <View className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                  </View>
                  {item.isSpecial && (
                    <View className="bg-amber-100 px-2 py-0.5 rounded-md mr-2">
                      <Text className="text-amber-700 text-[10px] font-black uppercase">Special</Text>
                    </View>
                  )}
                  <Text className="text-lg font-bold text-gray-900 flex-1">{item.name}</Text>
                </View>
                <Text className="text-gray-500 text-sm leading-5 mb-3">{item.description}</Text>
                <Text className="text-primary-700 font-black text-lg">₹{item.price}</Text>
              </View>
              
              <View className="w-24 h-24 rounded-[28px] bg-gray-100 items-center justify-center overflow-hidden border border-gray-50">
                <MaterialCommunityIcons name="food-variant" size={32} color="#d1d5db" />
              </View>
            </Animated.View>
          ))}

          {filteredItems.length === 0 && (
            <View className="py-20 items-center">
              <Feather name="coffee" size={48} color="#f9fafb" />
              <Text className="text-gray-300 font-medium italic mt-2">No items currently available</Text>
            </View>
          )}
        </View>
        <View className="h-24" />
      </ScrollView>

      {/* Floating Action Bar (Simulation of Order Basket) */}
      <View className="absolute bottom-10 left-6 right-6 h-16 rounded-[32px] overflow-hidden border border-white/20 shadow-2xl bg-primary-600/95">
        <TouchableOpacity className="flex-1 flex-row items-center justify-between px-6">
          <View>
            <Text className="text-white/70 text-[10px] uppercase font-black tracking-tighter">Powered by TableBook</Text>
            <Text className="text-white font-bold text-sm">Call Waiter</Text>
          </View>
          <Feather name="bell" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
