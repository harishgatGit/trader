import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../navigation/AppNavigator';
import { Colors } from '../theme/colors';
import useAuthStore from '../store/authStore';
import { UserRole } from '../types';

type RegisterScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Register'>;

interface RegisterScreenProps {
  navigation: RegisterScreenNavigationProp;
}

const ROLES: UserRole[] = ['BASIC', 'PRO', 'MAX', 'ADMIN', 'SUPERUSER'];

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('BASIC');
  const { register, isLoading, error, clearError } = useAuthStore();

  const handleRegister = async () => {
    if (!username || !password) return;
    try {
      await register(username.trim().toLowerCase(), password, role);
    } catch (err) {
      // Handled by store
    }
  };

  const navigateToLogin = () => {
    clearError();
    navigation.navigate('Login');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.formCard}>
        <Image
          source={require('../../assets/logo_dark_600x160.png')}
          style={styles.logoBanner}
          resizeMode="contain"
        />
        <Text style={styles.subtitle}>Create Account & Choose Subscription Level</Text>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={(txt) => {
              clearError();
              setUsername(txt);
            }}
            placeholder="Enter a username"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={(txt) => {
              clearError();
              setPassword(txt);
            }}
            placeholder="At least 6 characters"
            placeholderTextColor={Colors.textMuted}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        {/* Role Selector */}
        <View style={styles.roleContainer}>
          <Text style={styles.label}>Subscription / Role Level</Text>
          <View style={styles.roleGrid}>
            {ROLES.map((r) => {
              const isSelected = role === r;
              return (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.roleChip,
                    isSelected ? styles.roleChipActive : null,
                  ]}
                  onPress={() => setRole(r)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.roleChipText,
                      isSelected ? styles.roleChipTextActive : null,
                    ]}
                  >
                    {r}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.roleHelper}>
            {role === 'BASIC' && 'Access core search, indicators, and read limited reports.'}
            {role === 'PRO' && 'Standard subscription with full dashboard analysis and technical views.'}
            {role === 'MAX' && 'Full access to deep models, news catalog, and unlimited scans.'}
            {role === 'ADMIN' && 'Research Administrator view with log monitoring.'}
            {role === 'SUPERUSER' && 'Developer override level with full workspace access.'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.registerButton}
          onPress={handleRegister}
          disabled={isLoading || !username || password.length < 6}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.registerButtonText}>Sign Up & Log In</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={navigateToLogin}>
            <Text style={styles.loginLink}>Log In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  formCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  logoBanner: {
    width: '90%',
    height: 60,
    alignSelf: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 24,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    color: Colors.sell,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.cardElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
  },
  roleContainer: {
    marginBottom: 20,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  roleChip: {
    backgroundColor: Colors.cardElevated,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  roleChipActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
  },
  roleChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  roleChipTextActive: {
    color: Colors.primary,
  },
  roleHelper: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 8,
    lineHeight: 14,
  },
  registerButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  registerButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  loginLink: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    marginLeft: 6,
  },
});
export default RegisterScreen;
