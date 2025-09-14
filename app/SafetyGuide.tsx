import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Ionicons, MaterialIcons as Icon } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import { useNavigation } from "expo-router";
import { navigate } from "expo-router/build/global-state/routing";
import * as WebBrowser from "expo-web-browser";
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  FlatList,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Guideline = {
  id: string;
  title: string;
  description: string;
  file?: string;
  icon: keyof typeof Icon.glyphMap;
  color: string;
  type: string;
  contentKey?: string;
  content?: any[];
};

// Static data that does not change with language
// Static data that does not change with language
const staticGuidelines = [
  // Item with a PDF that changes based on language
  {
    id: "1",
    type: "pdf",
    contentKey: "flood_pdf", // Key for i18n to find the file name
    icon: "flood",
    color: "#3498db",
  },
  // Item with multiple static images
  {
    id: "2",
    type: "images",
    content: [
      require("@/assets/guidelines/images/heatwave/01.png"),
      require("@/assets/guidelines/images/heatwave/02.png"),
      require("@/assets/guidelines/images/heatwave/03.png"),
    ],
    icon: "wb-sunny",
    color: "#f39c12",
  },
  // Item with multiple static images
  {
    id: "3",
    type: "images",
    content: [
      require("@/assets/guidelines/images/thunderstorm/01.png"),
      require("@/assets/guidelines/images/thunderstorm/02.png"),
    ],
    icon: "thunderstorm",
    color: "#8e44ad",
  },
  // Item with a single, non-changing PDF
  {
    id: "4",
    type: "pdf",
    contentKey: "earthquake_pdf",
    icon: "vibration",
    color: "#e74c3c",
  },
  // NEW: Winter Smog Guideline
  {
    id: "5",
    type: "pdf",
    contentKey: "smog_pdf",
    icon: "cloud",
    color: "#7f8c8d", // Gray color for smog
  },
];

export default function SafetyGuidelinesScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
    const navigation = useNavigation(); // Initialize the hook

  const colors = {
    background: colorScheme === 'dark' ? '#121212' : '#f0f2f5',
    card: colorScheme === 'dark' ? '#1e1e1e' : '#ffffff',
    text: colorScheme === 'dark' ? '#ffffff' : '#000000',
    subtext: colorScheme === 'dark' ? '#aaaaaa' : '#666666',
    icon: colorScheme === 'dark' ? '#aaaaaa' : '#888888',
  };

  // Combine static data with translated text using useMemo
 const guidelines = useMemo(() => {
    // ... (logic to combine static data with translations is the same)
    // IMPORTANT: Make sure to add the file path from i18n to the object
    const translatedGuides = t("guidelines", { returnObjects: true });
    return staticGuidelines.map((guide) => {
      const translated = translatedGuides[guide.id] || {};
      const finalContent = guide.type === 'pdf'
        ? FileSystem.documentDirectory + translated.file // Get file name from JSON
        : guide.content;

      return {
        ...guide,
        title: translated.title,
        description: translated.description,
        content: finalContent, // Set the final content path or image array
      };
    });
  }, [t]);
  
  // The navigation handler
    // ...
    const handlePressGuideline = (item: Guideline) => {
        navigation.navigate('GuidelineDetailScreen', { guideline: item });
    };
  


    const renderItem = ({ item }: { item: Guideline }) => (
    <TouchableOpacity
      onPress={() => handlePressGuideline(item)}
      style={[styles.card, { backgroundColor: colors.card }]}
    >
      <ThemedView style={styles.cardLeft}>
        <ThemedView
          style={[
            styles.iconCircle,
            { backgroundColor: `${item.color}20` }, // Soft background color
          ]}
        >
          <Icon name={item.icon} size={24} color={item.color} />
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.cardContent}>
        <ThemedText type="subtitle" style={[styles.cardTitle, { color: colors.text }]}>
          {item.title}
        </ThemedText>
        <ThemedText style={[styles.cardDescription, { color: colors.subtext }]}>
          {item.description}
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.cardRight}>
        <Ionicons name="chevron-forward" size={22} color={colors.icon} />
      </ThemedView>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <ThemedView style={{ position: 'absolute', left: 30, top: 50, zIndex: 15 }}>
                  <TouchableOpacity onPress={() => { if (typeof navigation !== 'undefined' && navigation.goBack) { navigation.goBack(); } }}>
                    <Ionicons name="arrow-back" size={24} color="#aaa" />
                  </TouchableOpacity>
                </ThemedView>
      <ThemedView style={[styles.header, { backgroundColor: colors.background }]}>
        <Icon name="health-and-safety" size={28} color="#e74c3c" />
        <ThemedText type="title" style={[styles.title, { color: colors.text }]}>
          {t("safetyScreen.title")}
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: colors.subtext }]}>
          {t("safetyScreen.subtitle")}
        </ThemedText>
      </ThemedView>
      <FlatList
        data={guidelines}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  title: {
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 4,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  cardLeft: {
    marginRight: 16,
    backgroundColor: 'transparent',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: 13,
  },
  cardRight: {
    marginLeft: 12,
    backgroundColor: 'transparent',
  },
});