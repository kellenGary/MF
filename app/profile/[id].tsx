import UserProfile from "@/components/user-profile";
import { useLocalSearchParams } from "expo-router";

export default function ProfileScreen() {
  const { id } = useLocalSearchParams();
  const userId = id ? parseInt(id as string, 10) : undefined;
  
  return (
    <UserProfile userId={userId} />
  );
}