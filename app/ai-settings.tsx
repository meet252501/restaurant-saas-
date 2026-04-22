import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '../lib/theme';
import { useSaaSStore } from '../lib/saas-store';
import { useDynamicTheme } from '../lib/useDynamicTheme';
import { trpc } from '../lib/trpc';

const RECOMMENDED_MODELS = [
  {
    id: 'qwen2.5:0.5b',
    name: 'Qwen 2.5 (0.5B)',
    size: '397 MB',
    description: 'Ultra-lightweight, extremely fast. Recommended for basic offline use.',
    icon: 'flash-outline' as const
  },
  {
    id: 'llama3.2:1b',
    name: 'Llama 3.2 (1B)',
    size: '1.3 GB',
    description: 'Good balance of reasoning and speed. Best for general use.',
    icon: 'cube-outline' as const
  },
  {
    id: 'gemma2:2b',
    name: 'Gemma 2 (2B)',
    size: '1.6 GB',
    description: 'Highly capable model by Google. Requires more RAM.',
    icon: 'sparkles-outline' as const
  }
];

export default function AISettingsScreen() {
  const router = useRouter();
  const theme = useDynamicTheme();
  const activeModel = useSaaSStore(s => s.activeModel);
  const setActiveModel = useSaaSStore(s => s.setActiveModel);
  
  const [downloadingModel, setDownloadingModel] = useState<string | null>(null);

  const { data: localModelsData, refetch: refetchModels, isLoading } = trpc.ai.listModels.useQuery();
  const pullModelMutation = trpc.ai.pullModel.useMutation();

  const localModels = localModelsData?.success && Array.isArray(localModelsData.models) 
    ? localModelsData.models.map(m => m.name) 
    : [];

  const handleDownload = async (modelId: string) => {
    if (downloadingModel) return;
    setDownloadingModel(modelId);
    try {
      const res = await pullModelMutation.mutateAsync({ model: modelId });
      if (res.success) {
        Alert.alert('Download Complete', `${modelId} has been successfully downloaded via Ollama!`);
        setActiveModel(modelId);
        refetchModels();
      } else {
        Alert.alert('Download Failed', res.error || 'Unknown error');
      }
    } catch (e: any) {
      Alert.alert('Download Error', e.message);
    } finally {
      setDownloadingModel(null);
    }
  };

  const isModelDownloaded = (modelId: string) => localModels.includes(modelId) || localModels.includes(modelId + ':latest');

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: Colors.surfaceBorder }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Engine Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ padding: Spacing.xl }}>
        
        <View style={styles.statusBanner}>
          <Ionicons name="server-outline" size={24} color={theme.primary} />
          <View style={{ marginLeft: Spacing.md, flex: 1 }}>
            <Text style={styles.bannerTitle}>Ollama Local Backend</Text>
            <Text style={styles.bannerSubtitle}>
              Ensure the Ollama desktop app is running in the background.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Recommended Models</Text>

        {RECOMMENDED_MODELS.map(model => {
          const downloaded = isModelDownloaded(model.id);
          const isActive = activeModel === model.id;
          const isDownloading = downloadingModel === model.id;

          return (
            <TouchableOpacity 
              key={model.id}
              style={[
                styles.modelCard, 
                isActive && { borderColor: theme.primary, backgroundColor: theme.primaryDim }
              ]}
              onPress={() => downloaded && setActiveModel(model.id)}
              activeOpacity={0.7}
            >
              <View style={styles.modelHeader}>
                <Ionicons name={model.icon} size={24} color={isActive ? theme.primary : Colors.textSecondary} />
                <View style={styles.modelTitleContainer}>
                  <Text style={styles.modelName}>{model.name}</Text>
                  <Text style={styles.modelSize}>{model.size}</Text>
                </View>
                {isActive && (
                  <View style={[styles.activeBadge, { backgroundColor: theme.primary }]}>
                    <Text style={styles.activeBadgeText}>ACTIVE</Text>
                  </View>
                )}
              </View>

              <Text style={styles.modelDesc}>{model.description}</Text>

              {!downloaded ? (
                <TouchableOpacity 
                  style={[styles.downloadBtn, { backgroundColor: theme.primary }]}
                  onPress={() => handleDownload(model.id)}
                  disabled={!!downloadingModel}
                >
                  {isDownloading ? (
                    <ActivityIndicator color="#000" size="small" />
                  ) : (
                    <>
                      <Ionicons name="cloud-download-outline" size={16} color="#000" />
                      <Text style={styles.downloadBtnText}>Download via Ollama</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <View style={styles.downloadedStatus}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.available} />
                  <Text style={styles.downloadedText}>Available Offline</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        <View style={styles.footerInfo}>
          <Text style={styles.footerText}>
            Downloading models requires an active internet connection. Once downloaded, the AI assistant works 100% offline, ensuring maximum privacy for your restaurant data.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: 50,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.heading,
    color: Colors.textPrimary,
  },
  content: {
    flex: 1,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.xl,
  },
  bannerTitle: {
    ...Typography.subheading,
    color: Colors.textPrimary,
  },
  bannerSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  sectionTitle: {
    ...Typography.heading,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  modelCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  modelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modelTitleContainer: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  modelName: {
    ...Typography.subheading,
    color: Colors.textPrimary,
  },
  modelSize: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  activeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
    letterSpacing: 1,
  },
  modelDesc: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  downloadBtnText: {
    ...Typography.body,
    fontWeight: '700',
    color: '#000',
    marginLeft: Spacing.sm,
  },
  downloadedStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  downloadedText: {
    ...Typography.body,
    color: Colors.available,
    marginLeft: Spacing.sm,
    fontWeight: '600',
  },
  footerInfo: {
    marginTop: Spacing.xl,
    padding: Spacing.lg,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
  },
  footerText: {
    ...Typography.caption,
    color: Colors.textTertiary,
    lineHeight: 18,
    textAlign: 'center',
  }
});
