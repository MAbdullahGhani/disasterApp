import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Modal from 'react-native-modal';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface Button {
  text: string;
  onPress: () => void;
  style?: 'cancel' | 'destructive' | 'default';
}

interface CustomCallAlertProps {
  isVisible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  buttons: Button[];
}

export const CustomCallAlert = ({ isVisible, onClose, title, message, buttons }: CustomCallAlertProps) => {
  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      animationIn="zoomIn"
      animationOut="zoomOut"
      backdropOpacity={0.4}
    >
      <ThemedView style={styles.modalContent}>
        <Ionicons name="call-outline" size={32} color="#00BCD4" style={styles.icon} />
        <ThemedText type="subtitle" style={styles.title}>{title}</ThemedText>
        <ThemedText style={styles.message}>{message}</ThemedText>
        <View style={styles.buttonContainer}>
          {buttons.map((button, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.button,
                button.style === 'cancel' ? styles.cancelButton : styles.defaultButton,
              ]}
              onPress={() => {
                button.onPress();
                onClose(); // Automatically close the modal on button press
              }}
            >
              <ThemedText style={[
                styles.buttonText,
                button.style === 'cancel' ? styles.cancelButtonText : styles.defaultButtonText
              ]}>
                {button.text}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </ThemedView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
  },
  icon: {
    marginBottom: 15,
  },
  title: {
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
    color: '#666'
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  defaultButton: {
    backgroundColor: '#00BCD4',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  defaultButtonText: {
    color: '#FFFFFF',
  },
  cancelButtonText: {
    color: '#666',
  },
});