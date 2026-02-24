import * as BackgroundFetch from "expo-background-fetch";
import * as SecureStore from "expo-secure-store";
import * as TaskManager from "expo-task-manager";
import api from "./api";
import spotifyApi from "./spotifyApi";

const BACKGROUND_FETCH_TASK = "background-spotify-refresh";

// 1. Define the task by name
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    console.log(`[BackgroundFetch] Starting background fetch task`);

    // 2. Retrieve the JWT token from SecureStore
    const token = await SecureStore.getItemAsync("jwt_token");

    if (!token) {
      console.log(`[BackgroundFetch] No token found, skipping refresh`);
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // 3. Set the token on the API client
    api.setAuthToken(token);

    // 4. Make a request to the backend to trigger token validation/refresh
    // We use getRecentlyPlayed as a lightweight-ish authenticated call that hits the Spotify Service on backend
    // causing it to check and refresh the token if needed.
    // Alternatively, we could just call a specific "ping" endpoint if one existed, but this works.
    await spotifyApi.getRecentlyPlayed();

    console.log(`[BackgroundFetch] specific token refresh check completed`);
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error(`[BackgroundFetch] Task failed:`, error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// 5. Register the task at some point in your app (e.g., App.tsx)
export async function registerBackgroundFetchAsync() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_FETCH_TASK,
    );

    if (isRegistered) {
      console.log(`[BackgroundFetch] Task already registered`);
      return;
    }

    await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: 60 * 15, // 15 minutes
      stopOnTerminate: false, // android only,
      startOnBoot: true, // android only
    });

    console.log(`[BackgroundFetch] Task registered`);
  } catch (err) {
    console.log(`[BackgroundFetch] Task Register failed:`, err);
  }
}

export async function unregisterBackgroundFetchAsync() {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(
    BACKGROUND_FETCH_TASK,
  );
  if (isRegistered) {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
  }
}
