import { Colors } from '@/constants/theme';
import * as SecureStore from 'expo-secure-store';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useColorScheme as useNativeColorScheme } from 'react-native';

type ThemeType = 'light' | 'dark';
export type UserThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: ThemeType;
    userTheme: UserThemePreference;
    setTheme: (theme: UserThemePreference) => void;
    isDark: boolean;
    colors: typeof Colors.light;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'user_theme_preference';

export function ThemeProvider({ children }: { children: ReactNode }) {
    const systemColorScheme = useNativeColorScheme();
    const [userTheme, setUserTheme] = useState<UserThemePreference>('system');
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        loadThemePreference();
    }, []);

    const loadThemePreference = async () => {
        try {
            const savedTheme = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
            if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
                setUserTheme(savedTheme);
            }
        } catch (error) {
            console.error('Failed to load theme preference:', error);
        } finally {
            setIsLoaded(true);
        }
    };

    const setTheme = async (newTheme: UserThemePreference) => {
        try {
            setUserTheme(newTheme);
            await SecureStore.setItemAsync(THEME_STORAGE_KEY, newTheme);
        } catch (error) {
            console.error('Failed to save theme preference:', error);
        }
    };

    // Resolve the actual visual theme
    const theme: ThemeType =
        userTheme === 'system'
            ? (systemColorScheme === 'dark' ? 'dark' : 'light')
            : userTheme;

    const isDark = theme === 'dark';
    const colors = Colors[theme];

    if (!isLoaded) {
        return null; // or a splash screen if needed, but usually fast enough
    }

    return (
        <ThemeContext.Provider value={{ theme, userTheme, setTheme, isDark, colors }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useThemeContext() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useThemeContext must be used within a ThemeProvider');
    }
    return context;
}

export const useTheme = useThemeContext;
