import { FeedPost } from "@/services/feedApi";
import React from "react";
import ForYouCard from "./for-you-card";
import ListeningSessionPost from "./listening-session-post";
import SharedAlbumPost from "./shared-album-post";
import SharedArtistPost from "./shared-artist-post";
import SharedPlaylistPost from "./shared-playlist-post";
import SharedTrackPost from "./shared-track-post";

interface FeedItemRouterProps {
  item: FeedPost | { type: "ForYou" };
  onDelete?: (postId: number) => void;
}

export default function FeedItemRouter({ item, onDelete }: FeedItemRouterProps) {
  switch (item.type) {
    case "ForYou":
      return <ForYouCard />;
    case "SharedTrack":
      return <SharedTrackPost item={item as FeedPost} onDelete={onDelete} />;
    case "SharedPlaylist":
      return <SharedPlaylistPost item={item as FeedPost} onDelete={onDelete} />;
    case "SharedAlbum":
      return <SharedAlbumPost item={item as FeedPost} onDelete={onDelete} />;
    case "SharedArtist":
      return <SharedArtistPost item={item as FeedPost} onDelete={onDelete} />;
    case "ListeningSession":
      return <ListeningSessionPost item={item as FeedPost} onDelete={onDelete} />;
    default:
      return null;
  }
}
