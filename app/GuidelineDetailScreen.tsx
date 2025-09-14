import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as Sharing from 'expo-sharing'; // ✅ 1. Re-import expo-sharing
import {
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function GuidelineDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { guideline } = route.params as { guideline: any };
  const colorScheme = useColorScheme();

  const colors = {
    background: colorScheme === 'dark' ? '#000' : '#f0f2f5',
    card: colorScheme === 'dark' ? '#1e1e1e' : '#ffffff',
    text: colorScheme === 'dark' ? '#fff' : '#000',
    primary: '#0a7ea4',
  };

  // ✅ 2. Use Sharing.shareAsync to correctly handle file permissions
  const handleViewPdf = async () => {
    try {
      // shareAsync is the correct way to share a local file securely
      await Sharing.shareAsync(guideline.content, {
        dialogTitle: 'Open PDF with...', // Optional: Custom title for the dialog
        mimeType: 'application/pdf', // Explicitly set the MIME type
      });
    } catch (error) {
      console.error('Failed to open PDF:', error);
      Alert.alert(
        'Unable to Open File',
        'An error occurred while trying to open the document.'
      );
    }
  };

  // Defensive check to prevent crashes if guideline is missing
  if (!guideline) {
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ThemedView style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
                <ThemedText>Error: Guideline data not found.</ThemedText>
            </ThemedView>
        </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemedView style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>{guideline.title}</ThemedText>
      </ThemedView>

      <ScrollView contentContainerStyle={styles.contentContainer}>
        {guideline.type === 'pdf' ? (
          <ThemedView style={[styles.pdfContainer, { backgroundColor: colors.card }]}>
            <ThemedText style={styles.description}>{guideline.description}</ThemedText>
            <TouchableOpacity style={[styles.button, { backgroundColor: guideline.color }]} onPress={handleViewPdf}>
              <ThemedText style={styles.buttonText}>View PDF Guide</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        ) : (
          guideline.content.map((imageUri: any, index: number) => (
            <Image
              key={index}
              source={imageUri}
              style={styles.image}
              resizeMode='contain'
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ... your styles remain the same
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
  },
  title: {
    marginLeft: 16,
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  pdfContainer: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  description: {
    textAlign: 'center',
    marginBottom: 24,
    fontSize: 16,
    lineHeight: 22,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  image: {
    width: '100%',
    height: undefined,
    aspectRatio: 0.6,
    marginBottom: 16,
    borderRadius: 12,
  },
});