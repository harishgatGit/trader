import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '../../theme/colors';

const SECURE_STORE_KEY = 'disclaimer_acknowledged';

export const DisclaimerModal: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAcknowledgment();
  }, []);

  const checkAcknowledgment = async () => {
    try {
      const val = await SecureStore.getItemAsync(SECURE_STORE_KEY);
      if (val !== 'true') {
        setVisible(true);
      }
    } catch (e) {
      console.warn('Failed to read disclaimer acknowledgment state', e);
      // Fallback: show modal anyway to be safe
      setVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async () => {
    try {
      await SecureStore.setItemAsync(SECURE_STORE_KEY, 'true');
      setVisible(false);
    } catch (e) {
      console.error('Failed to save disclaimer acknowledgment', e);
      // Still close the modal so the user is not stuck
      setVisible(false);
    }
  };

  if (loading || !visible) {
    return null;
  }

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header Icon */}
          <View style={styles.iconContainer}>
            <Svg
              width={32}
              height={32}
              viewBox="0 0 24 24"
              fill="none"
              stroke={Colors.primary}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <Path d="M12 9v4" />
              <Path d="M12 17h.01" />
            </Svg>
          </View>

          <Text style={styles.modalTitle}>Risk & Research Disclosure</Text>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={true}>
            <Text style={styles.modalText}>
              This application is for educational and informational purposes only. All market data, trade setups, and technical evidence are aggregated and orchestrated from third-party sources; we do not guarantee its accuracy, completeness, or timeliness.
            </Text>
            <Text style={[styles.modalText, styles.spacing]}>
              <Text style={styles.highlight}>Important Data Disclosure:</Text> There could be delays in the data used for research and analysis. While we endeavor to provide real-time information, in some cases it may be near real-time or delayed.
            </Text>
            <Text style={[styles.modalText, styles.spacing]}>
              We are not registered financial advisors and do not provide investment, financial, or tax advice. Trading stocks involves substantial risk, and you are solely responsible for any financial decisions and losses incurred. Past performance is not indicative of future results.
            </Text>
          </ScrollView>

          <TouchableOpacity
            style={styles.modalAckBtn}
            onPress={handleAcknowledge}
            activeOpacity={0.8}
          >
            <Text style={styles.modalAckBtnText}>I Acknowledge & Agree</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 16, 0.9)', // Deep premium overlay matching dark slate theme
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(245, 158, 11, 0.1)', // Subtle primary amber/accent glow
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  modalScroll: {
    maxHeight: 280,
    width: '100%',
    marginBottom: 24,
    paddingRight: 4,
  },
  modalText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    textAlign: 'left',
  },
  spacing: {
    marginTop: 12,
  },
  highlight: {
    color: Colors.primary,
    fontWeight: '700',
  },
  modalAckBtn: {
    width: '100%',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  modalAckBtnText: {
    color: '#050810', // Dark text color for readability against bright button
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

export default DisclaimerModal;
