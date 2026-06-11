import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../navigation/AppNavigator';
import { Colors } from '../theme/colors';
import useAuthStore from '../store/authStore';

type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;

interface LoginScreenProps {
  navigation: LoginScreenNavigationProp;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAuthStore();

  const handleLogin = async () => {
    if (!username || !password) return;
    try {
      await login(username.trim().toLowerCase(), password);
    } catch (err) {
      // Handled by store
    }
  };

  const navigateToRegister = () => {
    clearError();
    navigation.navigate('Register');
  };

  return (
    <View style={styles.container}>
      <View style={styles.formCard}>
        <Image
          source={require('../../assets/logo_dark_600x160.png')}
          style={styles.logoBanner}
          resizeMode="contain"
        />
        <Text style={styles.subtitle}>AI Stock Analyst & Research Reader</Text>

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
            placeholder="Enter your username"
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
            placeholder="Enter your password"
            placeholderTextColor={Colors.textMuted}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleLogin}
          disabled={isLoading || !username || !password}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.loginButtonText}>Log In</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>New to InvestingAtti?</Text>
          <TouchableOpacity onPress={navigateToRegister}>
            <Text style={styles.registerLink}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
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
  loginButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
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
  registerLink: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    marginLeft: 6,
  },
});
export default LoginScreen;
