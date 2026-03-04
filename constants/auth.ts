import { Platform } from "react-native";

// Allow overriding the API host for real devices via EXPO_PUBLIC_API_URL.
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (__DEV__
    ? Platform.OS === "ios"
      ? "http://localhost:5164"
      : "http://10.0.2.2:5164"
    : "https://petal.up.railway.app");
export const CLIENT_ID = "5f758f2be85d4ae3b816ac89b17e3448";
export const REDIRECT_URI = "petal://callback";
export const BACKEND_REDIRECT_URI = "petal://callback";

export const SCOPES = [
  "user-read-private",
  "user-read-email",
  "user-read-recently-played",
  "user-library-read",
  "user-library-modify",
  "user-top-read",
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-public",
  "playlist-modify-private",
  "user-modify-playback-state",
  "user-read-playback-state",
  "user-read-currently-playing",
  "user-follow-read",
  "user-follow-modify",
].join(" ");
