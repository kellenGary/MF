using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PetalAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddDatabaseViews : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            if (migrationBuilder.ActiveProvider == "Microsoft.EntityFrameworkCore.Sqlite")
            {
                migrationBuilder.Sql("""
-- Create view for listening history with all track, album, and artist details
DROP VIEW IF EXISTS "ListeningHistoryEnriched";
CREATE VIEW "ListeningHistoryEnriched" AS
SELECT 
    lh."Id",
    lh."UserId",
    lh."PlayedAt",
    lh."MsPlayed",
    lh."ContextUri",
    lh."DeviceType",
    lh."Source",
    t."Id" as "TrackId",
    t."SpotifyId" as "TrackSpotifyId",
    t."Name" as "TrackName",
    t."DurationMs",
    t."Explicit",
    a."Id" as "AlbumId",
    a."SpotifyId" as "AlbumSpotifyId",
    a."Name" as "AlbumName",
    a."ImageUrl" as "AlbumImageUrl",
    a."ReleaseDate" as "AlbumReleaseDate"
FROM "ListeningHistory" lh
INNER JOIN "Tracks" t ON lh."TrackId" = t."Id"
LEFT JOIN "Albums" a ON t."AlbumId" = a."Id";

-- Create view for track details with artist information
DROP VIEW IF EXISTS "TrackDetailsWithArtists";
CREATE VIEW "TrackDetailsWithArtists" AS
SELECT 
    t."Id" as "TrackId",
    t."SpotifyId" as "TrackSpotifyId",
    t."Name" as "TrackName",
    t."DurationMs",
    t."Explicit",
    a."Id" as "AlbumId",
    a."SpotifyId" as "AlbumSpotifyId",
    a."Name" as "AlbumName",
    a."ImageUrl" as "AlbumImageUrl",
    a."ReleaseDate" as "AlbumReleaseDate",
    ar."Id" as "ArtistId",
    ar."SpotifyId" as "ArtistSpotifyId",
    ar."Name" as "ArtistName",
    ta."ArtistOrder"
FROM "Tracks" t
LEFT JOIN "Albums" a ON t."AlbumId" = a."Id"
LEFT JOIN "TrackArtists" ta ON t."Id" = ta."TrackId"
LEFT JOIN "Artists" ar ON ta."ArtistId" = ar."Id";

-- Create view for user's recently played with all details
DROP VIEW IF EXISTS "UserRecentlyPlayedEnriched";
CREATE VIEW "UserRecentlyPlayedEnriched" AS
SELECT 
    lh."UserId",
    lh."PlayedAt",
    t."Id" as "TrackId",
    t."SpotifyId" as "TrackSpotifyId",
    t."Name" as "TrackName",
    t."DurationMs",
    t."Explicit",
    a."Id" as "AlbumId",
    a."SpotifyId" as "AlbumSpotifyId",
    a."Name" as "AlbumName",
    a."ImageUrl" as "AlbumImageUrl",
    a."ReleaseDate" as "AlbumReleaseDate",
    ar."Id" as "ArtistId",
    ar."SpotifyId" as "ArtistSpotifyId",
    ar."Name" as "ArtistName",
    ta."ArtistOrder"
FROM "ListeningHistory" lh
INNER JOIN "Tracks" t ON lh."TrackId" = t."Id"
LEFT JOIN "Albums" a ON t."AlbumId" = a."Id"
LEFT JOIN "TrackArtists" ta ON t."Id" = ta."TrackId"
LEFT JOIN "Artists" ar ON ta."ArtistId" = ar."Id"
ORDER BY lh."PlayedAt" DESC;

-- Create view for user profile stats
DROP VIEW IF EXISTS "UserProfileData";
CREATE VIEW "UserProfileData" AS
SELECT 
    u."Id" as "UserId",
    u."DisplayName",
    u."Handle",
    u."Bio",
    u."ProfileImageUrl",
    COUNT(DISTINCT lh."TrackId") as "TotalUniqueTracks",
    COUNT(DISTINCT lh."Id") as "TotalPlaybacks",
    COUNT(DISTINCT CASE WHEN lh."PlayedAt" >= datetime('now', '-7 days') THEN lh."Id" END) as "RecentPlaysLast7Days",
    COUNT(DISTINCT ta."ArtistId") as "TotalArtistsHeard",
    COUNT(DISTINCT t."AlbumId") as "TotalAlbumsHeard",
    COUNT(DISTINCT f2."FollowerUserId") as "TotalFollowers",
    COUNT(DISTINCT f."FolloweeUserId") as "TotalFollowing",
    MAX(lh."PlayedAt") as "LastPlayedAt"
FROM "Users" u
LEFT JOIN "ListeningHistory" lh ON u."Id" = lh."UserId"
LEFT JOIN "Tracks" t ON lh."TrackId" = t."Id"
LEFT JOIN "TrackArtists" ta ON t."Id" = ta."TrackId"
LEFT JOIN "Follows" f ON u."Id" = f."FollowerUserId"
LEFT JOIN "Follows" f2 ON u."Id" = f2."FolloweeUserId"
GROUP BY u."Id", u."DisplayName", u."Handle", u."Bio", u."ProfileImageUrl";

-- Create view for user's liked tracks with all track, album, and artist details
DROP VIEW IF EXISTS "UserLikedTracksEnriched";
CREATE VIEW "UserLikedTracksEnriched" AS
SELECT 
    ult."UserId",
    ult."LikedAt",
    t."Id" as "TrackId",
    t."SpotifyId" as "TrackSpotifyId",
    t."Name" as "TrackName",
    t."DurationMs",
    t."Explicit",
    t."Isrc",
    a."Id" as "AlbumId",
    a."SpotifyId" as "AlbumSpotifyId",
    a."Name" as "AlbumName",
    a."ImageUrl" as "AlbumImageUrl",
    a."ReleaseDate" as "AlbumReleaseDate",
    a."AlbumType",
    ar."Id" as "ArtistId",
    ar."SpotifyId" as "ArtistSpotifyId",
    ar."Name" as "ArtistName",
    ta."ArtistOrder"
FROM "UserLikedTracks" ult
INNER JOIN "Tracks" t ON ult."TrackId" = t."Id"
LEFT JOIN "Albums" a ON t."AlbumId" = a."Id"
LEFT JOIN "TrackArtists" ta ON t."Id" = ta."TrackId"
LEFT JOIN "Artists" ar ON ta."ArtistId" = ar."Id";

-- Create view for user's playlists with details
DROP VIEW IF EXISTS "UserPlaylistsEnriched";
CREATE VIEW "UserPlaylistsEnriched" AS
SELECT 
    up."UserId",
    up."Relation",
    up."FollowedAt",
    p."Id" as "PlaylistId",
    p."SpotifyId" as "PlaylistSpotifyId",
    p."Name" as "PlaylistName",
    p."Description" as "PlaylistDescription",
    p."OwnerSpotifyId",
    p."OwnerUserId",
    p."Public",
    p."Collaborative",
    p."SnapshotId",
    p."ImageUrl" as "PlaylistImageUrl",
    (SELECT COUNT(*) FROM "PlaylistTracks" pt WHERE pt."PlaylistId" = p."Id") as "TrackCount"
FROM "UserPlaylists" up
INNER JOIN "Playlists" p ON up."PlaylistId" = p."Id";
""");
            }
            else
            {
                // PostgreSQL
                migrationBuilder.Sql("""
-- Create view for listening history with all track, album, and artist details
DROP VIEW IF EXISTS "ListeningHistoryEnriched";
CREATE VIEW "ListeningHistoryEnriched" AS
SELECT 
    lh."Id",
    lh."UserId",
    lh."PlayedAt",
    lh."MsPlayed",
    lh."ContextUri",
    lh."DeviceType",
    lh."Source",
    t."Id" as "TrackId",
    t."SpotifyId" as "TrackSpotifyId",
    t."Name" as "TrackName",
    t."DurationMs",
    t."Explicit",
    a."Id" as "AlbumId",
    a."SpotifyId" as "AlbumSpotifyId",
    a."Name" as "AlbumName",
    a."ImageUrl" as "AlbumImageUrl",
    a."ReleaseDate" as "AlbumReleaseDate"
FROM "ListeningHistory" lh
INNER JOIN "Tracks" t ON lh."TrackId" = t."Id"
LEFT JOIN "Albums" a ON t."AlbumId" = a."Id";

-- Create view for track details with artist information
DROP VIEW IF EXISTS "TrackDetailsWithArtists";
CREATE VIEW "TrackDetailsWithArtists" AS
SELECT 
    t."Id" as "TrackId",
    t."SpotifyId" as "TrackSpotifyId",
    t."Name" as "TrackName",
    t."DurationMs",
    t."Explicit",
    a."Id" as "AlbumId",
    a."SpotifyId" as "AlbumSpotifyId",
    a."Name" as "AlbumName",
    a."ImageUrl" as "AlbumImageUrl",
    a."ReleaseDate" as "AlbumReleaseDate",
    ar."Id" as "ArtistId",
    ar."SpotifyId" as "ArtistSpotifyId",
    ar."Name" as "ArtistName",
    ta."ArtistOrder"
FROM "Tracks" t
LEFT JOIN "Albums" a ON t."AlbumId" = a."Id"
LEFT JOIN "TrackArtists" ta ON t."Id" = ta."TrackId"
LEFT JOIN "Artists" ar ON ta."ArtistId" = ar."Id";

-- Create view for user's recently played with all details
DROP VIEW IF EXISTS "UserRecentlyPlayedEnriched";
CREATE VIEW "UserRecentlyPlayedEnriched" AS
SELECT 
    lh."UserId",
    lh."PlayedAt",
    t."Id" as "TrackId",
    t."SpotifyId" as "TrackSpotifyId",
    t."Name" as "TrackName",
    t."DurationMs",
    t."Explicit",
    a."Id" as "AlbumId",
    a."SpotifyId" as "AlbumSpotifyId",
    a."Name" as "AlbumName",
    a."ImageUrl" as "AlbumImageUrl",
    a."ReleaseDate" as "AlbumReleaseDate",
    ar."Id" as "ArtistId",
    ar."SpotifyId" as "ArtistSpotifyId",
    ar."Name" as "ArtistName",
    ta."ArtistOrder"
FROM "ListeningHistory" lh
INNER JOIN "Tracks" t ON lh."TrackId" = t."Id"
LEFT JOIN "Albums" a ON t."AlbumId" = a."Id"
LEFT JOIN "TrackArtists" ta ON t."Id" = ta."TrackId"
LEFT JOIN "Artists" ar ON ta."ArtistId" = ar."Id"
ORDER BY lh."PlayedAt" DESC;

-- Create view for user profile stats
DROP VIEW IF EXISTS "UserProfileData";
CREATE VIEW "UserProfileData" AS
SELECT 
    u."Id" as "UserId",
    u."DisplayName",
    u."Handle",
    u."Bio",
    u."ProfileImageUrl",
    COUNT(DISTINCT lh."TrackId") as "TotalUniqueTracks",
    COUNT(DISTINCT lh."Id") as "TotalPlaybacks",
    COUNT(DISTINCT CASE WHEN lh."PlayedAt" >= NOW() - INTERVAL '7 days' THEN lh."Id" END) as "RecentPlaysLast7Days",
    COUNT(DISTINCT ta."ArtistId") as "TotalArtistsHeard",
    COUNT(DISTINCT t."AlbumId") as "TotalAlbumsHeard",
    COUNT(DISTINCT f2."FollowerUserId") as "TotalFollowers",
    COUNT(DISTINCT f."FolloweeUserId") as "TotalFollowing",
    MAX(lh."PlayedAt") as "LastPlayedAt"
FROM "Users" u
LEFT JOIN "ListeningHistory" lh ON u."Id" = lh."UserId"
LEFT JOIN "Tracks" t ON lh."TrackId" = t."Id"
LEFT JOIN "TrackArtists" ta ON t."Id" = ta."TrackId"
LEFT JOIN "Follows" f ON u."Id" = f."FollowerUserId"
LEFT JOIN "Follows" f2 ON u."Id" = f2."FolloweeUserId"
GROUP BY u."Id", u."DisplayName", u."Handle", u."Bio", u."ProfileImageUrl";

-- Create view for user's liked tracks with all track, album, and artist details
DROP VIEW IF EXISTS "UserLikedTracksEnriched";
CREATE VIEW "UserLikedTracksEnriched" AS
SELECT 
    ult."UserId",
    ult."LikedAt",
    t."Id" as "TrackId",
    t."SpotifyId" as "TrackSpotifyId",
    t."Name" as "TrackName",
    t."DurationMs",
    t."Explicit",
    t."Isrc",
    a."Id" as "AlbumId",
    a."SpotifyId" as "AlbumSpotifyId",
    a."Name" as "AlbumName",
    a."ImageUrl" as "AlbumImageUrl",
    a."ReleaseDate" as "AlbumReleaseDate",
    a."AlbumType",
    ar."Id" as "ArtistId",
    ar."SpotifyId" as "ArtistSpotifyId",
    ar."Name" as "ArtistName",
    ta."ArtistOrder"
FROM "UserLikedTracks" ult
INNER JOIN "Tracks" t ON ult."TrackId" = t."Id"
LEFT JOIN "Albums" a ON t."AlbumId" = a."Id"
LEFT JOIN "TrackArtists" ta ON t."Id" = ta."TrackId"
LEFT JOIN "Artists" ar ON ta."ArtistId" = ar."Id";

-- Create view for user's playlists with details
DROP VIEW IF EXISTS "UserPlaylistsEnriched";
CREATE VIEW "UserPlaylistsEnriched" AS
SELECT 
    up."UserId",
    up."Relation",
    up."FollowedAt",
    p."Id" as "PlaylistId",
    p."SpotifyId" as "PlaylistSpotifyId",
    p."Name" as "PlaylistName",
    p."Description" as "PlaylistDescription",
    p."OwnerSpotifyId",
    p."OwnerUserId",
    p."Public",
    p."Collaborative",
    p."SnapshotId",
    p."ImageUrl" as "PlaylistImageUrl",
    (SELECT COUNT(*) FROM "PlaylistTracks" pt WHERE pt."PlaylistId" = p."Id") as "TrackCount"
FROM "UserPlaylists" up
INNER JOIN "Playlists" p ON up."PlaylistId" = p."Id";
""");
            }
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
DROP VIEW IF EXISTS "ListeningHistoryEnriched";
DROP VIEW IF EXISTS "TrackDetailsWithArtists";
DROP VIEW IF EXISTS "UserRecentlyPlayedEnriched";
DROP VIEW IF EXISTS "UserProfileData";
DROP VIEW IF EXISTS "UserLikedTracksEnriched";
DROP VIEW IF EXISTS "UserPlaylistsEnriched";
""");
        }
    }
}
