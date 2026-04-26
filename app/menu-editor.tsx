import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { trpc } from '../lib/trpc';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInUp, Layout, FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Modal } from 'react-native';

const CATEGORIES = ["starters", "mains", "breads", "rice", "desserts", "drinks", "combos"];

export default function MenuEditorScreen() {
  const router = useRouter();
  const [selectedCat, setSelectedCat] = useState("mains");
  const [isAddModalVisible, setAddModalVisible] = useState(false);
  
  // Form State
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemType, setNewItemType] = useState<"veg" | "non-veg" | "vegan">("veg");
  const [isSpecial, setIsSpecial] = useState(false);
  
  const { data: menuItems, isLoading, refetch } = trpc.menu.getAll.useQuery();
  const toggleAvailability = trpc.menu.toggleAvailability.useMutation({ onSuccess: () => refetch() });
  const removeItem = trpc.menu.removeItem.useMutation({ onSuccess: () => refetch() });
  const addItem = trpc.menu.addItem.useMutation({ 
    onSuccess: () => {
      refetch();
      setAddModalVisible(false);
      resetForm();
    }
  });

  const resetForm = () => {
    setNewItemName("");
    setNewItemPrice("");
    setNewItemDesc("");
    setNewItemType("veg");
    setIsSpecial(false);
  };

  const handleAddItem = () => {
    if (!newItemName || !newItemPrice) return;
    addItem.mutate({
      category: selectedCat as any,
      name: newItemName,
      description: newItemDesc,
      price: parseInt(newItemPrice),
      foodType: newItemType,
      isSpecial,
    });
  };

  if (isLoading) return <View className="flex-1 bg-white items-center justify-center"><Text>Loading Menu...</Text></View>;

  const filteredItems = menuItems?.filter((m: any) => m.category === selectedCat) || [];

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="px-4 py-4 flex-row items-center justify-between border-b border-gray-50">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">Digital Menu</Text>
        </View>
        <TouchableOpacity 
          onPress={() => setAddModalVisible(true)}
          className="bg-primary-600 px-4 py-2 rounded-2xl flex-row items-center"
        >
          <Feather name="plus" size={16} color="white" />
          <Text className="text-white font-bold ml-1 text-xs">Add Item</Text>
        </TouchableOpacity>
      </View>

      {/* Category Tabs */}
      <View className="mt-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4">
          {CATEGORIES.map(cat => (
            <TouchableOpacity 
              key={cat} 
              onPress={() => setSelectedCat(cat)}
              className={`mr-3 px-6 py-3 rounded-full border ${selectedCat === cat ? 'bg-gray-900 border-gray-900' : 'bg-white border-gray-100'}`}
            >
              <Text className={`font-bold capitalize text-xs ${selectedCat === cat ? 'text-white' : 'text-gray-400'}`}>{cat}</Text>
            </TouchableOpacity>
          ))}
          <View className="w-8" />
        </ScrollView>
      </View>

      <ScrollView className="flex-1 px-4 mt-6">
        <Animated.View layout={Layout.springify()}>
          {filteredItems.map((item: any, index: any) => (
            <Animated.View 
              key={item.id} 
              entering={FadeInUp.delay(index * 50)}
              className="bg-gray-50 rounded-[32px] p-5 mb-4 flex-row justify-between items-center"
            >
              <View className="flex-1 mr-4">
                <View className="flex-row items-center mb-1">
                  <View className={`w-2 h-2 rounded-full mr-2 ${item.foodType === 'veg' ? 'bg-primary-500' : 'bg-red-500'}`} />
                  <Text className="text-gray-900 font-bold text-base">{item.name}</Text>
                </View>
                <Text className="text-gray-400 text-xs mb-2" numberOfLines={1}>{item.description}</Text>
                <Text className="text-primary-700 font-black">₹{item.price}</Text>
              </View>

              <View className="items-end">
                <Switch 
                  value={!!item.isAvailable} 
                  onValueChange={() => toggleAvailability.mutate({ itemId: item.id })}
                  trackColor={{ false: '#e5e7eb', true: '#10b981' }}
                />
                <Text className="text-[10px] text-gray-400 font-bold mt-1 uppercase">
                  {item.isAvailable ? 'Available' : 'Sold Out'}
                </Text>
              </View>
            </Animated.View>
          ))}
        </Animated.View>

        {filteredItems.length === 0 && (
          <View className="py-20 items-center">
            <Text className="text-gray-300 font-medium italic">No items in this category yet</Text>
          </View>
        )}
        <View className="h-20" />
      </ScrollView>

      {/* Add Item Modal */}
      <Modal
        visible={isAddModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <Animated.View 
            entering={FadeInUp}
            className="bg-white rounded-t-[48px] p-8 pb-12"
          >
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-black text-gray-900">New {selectedCat}</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Ionicons name="close-circle" size={32} color="#f3f4f6" />
              </TouchableOpacity>
            </View>

            <View className="space-y-6">
              <View>
                <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Item Name</Text>
                <TextInput 
                  value={newItemName}
                  onChangeText={setNewItemName}
                  placeholder="e.g. Special Paneer Tikka"
                  className="bg-gray-50 p-5 rounded-[24px] font-bold text-gray-900"
                />
              </View>

              <View className="flex-row space-x-4">
                <View className="flex-1">
                  <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Price (₹)</Text>
                  <TextInput 
                    value={newItemPrice}
                    onChangeText={setNewItemPrice}
                    placeholder="250"
                    keyboardType="numeric"
                    className="bg-gray-50 p-5 rounded-[24px] font-bold text-primary-700"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Type</Text>
                  <View className="flex-row bg-gray-50 rounded-[24px] p-2">
                    <TouchableOpacity 
                      onPress={() => setNewItemType("veg")}
                      className={`flex-1 py-3 rounded-[18px] items-center ${newItemType === 'veg' ? 'bg-primary-500' : ''}`}
                    >
                      <View className={`w-2 h-2 rounded-full ${newItemType === 'veg' ? 'bg-white' : 'bg-primary-500'}`} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => setNewItemType("non-veg")}
                      className={`flex-1 py-3 rounded-[18px] items-center ${newItemType === 'non-veg' ? 'bg-red-500' : ''}`}
                    >
                      <View className={`w-2 h-2 rounded-full ${newItemType === 'non-veg' ? 'bg-white' : 'bg-red-500'}`} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View>
                <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Description</Text>
                <TextInput 
                  value={newItemDesc}
                  onChangeText={setNewItemDesc}
                  placeholder="Tell customers about this dish..."
                  multiline
                  numberOfLines={2}
                  className="bg-gray-50 p-5 rounded-[24px] font-medium text-gray-600 h-24 text-top"
                />
              </View>

              <View className="flex-row items-center justify-between bg-primary-50 p-6 rounded-[32px]">
                <View className="flex-row items-center">
                  <MaterialCommunityIcons name="star-outline" size={20} color="#059669" />
                  <Text className="ml-2 font-bold text-primary-800">Chef&apos;s Special?</Text>
                </View>
                <Switch 
                  value={isSpecial}
                  onValueChange={setIsSpecial}
                  trackColor={{ false: '#d1d5db', true: '#10b981' }}
                />
              </View>

              <TouchableOpacity 
                onPress={handleAddItem}
                disabled={addItem.isPending}
                className="bg-gray-900 py-6 rounded-[32px] items-center shadow-xl shadow-black/20"
              >
                {addItem.isPending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-black text-lg">Save Item</Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
