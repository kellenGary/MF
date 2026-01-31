import { FeedPost } from "@/services/feedApi";
import React from "react";
import DefaultPost from "./DefaultPost";
import ListeningSessionPost from "./ListeningSessionPost";
import SharedAlbumPost from "./SharedAlbumPost";
import SharedArtistPost from "./SharedArtistPost";
import SharedPlaylistPost from "./SharedPlaylistPost";
import SharedTrackPost from "./SharedTrackPost";

interface FeedItemRouterProps {
  item: FeedPost;
}

export default function FeedItemRouter({ item }: FeedItemRouterProps) {
  switch (item.type) {
    case "SharedTrack":
      return <SharedTrackPost item={item} />;
    case "SharedPlaylist":
      return <SharedPlaylistPost item={item} />;
    case "SharedAlbum":
      return <SharedAlbumPost item={item} />;
    case "SharedArtist":
      return <SharedArtistPost item={item} />;
    case "ListeningSession":
      return <ListeningSessionPost item={item} />;
    default:
      return <DefaultPost item={item} />;
  }
}
