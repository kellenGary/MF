import { View, Text, ScrollView } from "react-native";
import { FeedListeningSessionPost } from "@/services/feedApi";

export default function SessionPost({
  post,
}: {
  post: FeedListeningSessionPost;
}) {
  return (
    <View>
      <Text style={{ color: "white" }}>
        {post.user.displayName} listened to {post.tracks.length} tracks
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {post.tracks.map((track, index) => (
          <View key={index} style={{ marginRight: 8 }}>
            <Text style={{ color: "white" }}>{track.name}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
