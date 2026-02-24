using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PetalAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddPetalShuffleFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Albums",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    SpotifyId = table.Column<string>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    ReleaseDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    AlbumType = table.Column<string>(type: "TEXT", nullable: true),
                    ImageUrl = table.Column<string>(type: "TEXT", nullable: true),
                    Label = table.Column<string>(type: "TEXT", nullable: true),
                    TotalTracks = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Albums", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Artists",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    SpotifyId = table.Column<string>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    GenresJson = table.Column<string>(type: "TEXT", nullable: true),
                    ImageUrl = table.Column<string>(type: "TEXT", nullable: true),
                    Popularity = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Artists", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    SpotifyId = table.Column<string>(type: "TEXT", nullable: false),
                    DisplayName = table.Column<string>(type: "TEXT", nullable: true),
                    Handle = table.Column<string>(type: "TEXT", nullable: true),
                    Bio = table.Column<string>(type: "TEXT", nullable: true),
                    Email = table.Column<string>(type: "TEXT", nullable: true),
                    ProfileImageUrl = table.Column<string>(type: "TEXT", nullable: true),
                    HasCompletedProfile = table.Column<bool>(type: "INTEGER", nullable: false),
                    IsSessionJoinable = table.Column<bool>(type: "INTEGER", nullable: false),
                    SpotifyAccessToken = table.Column<string>(type: "TEXT", nullable: false),
                    SpotifyRefreshToken = table.Column<string>(type: "TEXT", nullable: false),
                    TokenExpiresAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    TopArtistsJson = table.Column<string>(type: "TEXT", nullable: true),
                    TopArtistsUpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    IsPetalShuffleActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    OriginalContextUri = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Tracks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    SpotifyId = table.Column<string>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    DurationMs = table.Column<int>(type: "INTEGER", nullable: false),
                    Explicit = table.Column<bool>(type: "INTEGER", nullable: false),
                    Popularity = table.Column<int>(type: "INTEGER", nullable: true),
                    Isrc = table.Column<string>(type: "TEXT", nullable: true),
                    AlbumId = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tracks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Tracks_Albums_AlbumId",
                        column: x => x.AlbumId,
                        principalTable: "Albums",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Comments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Text = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: false),
                    AuthorId = table.Column<int>(type: "INTEGER", nullable: false),
                    EntityType = table.Column<int>(type: "INTEGER", nullable: false),
                    EntityId = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ParentCommentId = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Comments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Comments_Comments_ParentCommentId",
                        column: x => x.ParentCommentId,
                        principalTable: "Comments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Comments_Users_AuthorId",
                        column: x => x.AuthorId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Follows",
                columns: table => new
                {
                    FollowerUserId = table.Column<int>(type: "INTEGER", nullable: false),
                    FolloweeUserId = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Follows", x => new { x.FollowerUserId, x.FolloweeUserId });
                    table.ForeignKey(
                        name: "FK_Follows_Users_FolloweeUserId",
                        column: x => x.FolloweeUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Follows_Users_FollowerUserId",
                        column: x => x.FollowerUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ListeningSessions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    UserId = table.Column<int>(type: "INTEGER", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    EndedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    TotalDurationMs = table.Column<int>(type: "INTEGER", nullable: false),
                    TrackCount = table.Column<int>(type: "INTEGER", nullable: false),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ListeningSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ListeningSessions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Playlists",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    SpotifyId = table.Column<string>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: true),
                    OwnerSpotifyId = table.Column<string>(type: "TEXT", nullable: true),
                    OwnerUserId = table.Column<int>(type: "INTEGER", nullable: true),
                    Public = table.Column<bool>(type: "INTEGER", nullable: false),
                    Collaborative = table.Column<bool>(type: "INTEGER", nullable: false),
                    SnapshotId = table.Column<string>(type: "TEXT", nullable: true),
                    ImageUrl = table.Column<string>(type: "TEXT", nullable: true),
                    TrackCount = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Playlists", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Playlists_Users_OwnerUserId",
                        column: x => x.OwnerUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "SpotifySyncStates",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    UserId = table.Column<int>(type: "INTEGER", nullable: false),
                    RecentlyPlayedLastAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    LikedTracksLastAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    LikedAlbumsLastAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    FollowedArtistsLastAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    PlaylistsLastSnapshotId = table.Column<string>(type: "TEXT", nullable: true),
                    LastFullSyncAt = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SpotifySyncStates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SpotifySyncStates_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserFollowedArtists",
                columns: table => new
                {
                    UserId = table.Column<int>(type: "INTEGER", nullable: false),
                    ArtistId = table.Column<int>(type: "INTEGER", nullable: false),
                    FollowedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserFollowedArtists", x => new { x.UserId, x.ArtistId });
                    table.ForeignKey(
                        name: "FK_UserFollowedArtists_Artists_ArtistId",
                        column: x => x.ArtistId,
                        principalTable: "Artists",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_UserFollowedArtists_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserLikedAlbums",
                columns: table => new
                {
                    UserId = table.Column<int>(type: "INTEGER", nullable: false),
                    AlbumId = table.Column<int>(type: "INTEGER", nullable: false),
                    LikedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserLikedAlbums", x => new { x.UserId, x.AlbumId });
                    table.ForeignKey(
                        name: "FK_UserLikedAlbums_Albums_AlbumId",
                        column: x => x.AlbumId,
                        principalTable: "Albums",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_UserLikedAlbums_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AlbumTracks",
                columns: table => new
                {
                    AlbumId = table.Column<int>(type: "INTEGER", nullable: false),
                    Position = table.Column<int>(type: "INTEGER", nullable: false),
                    TrackId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AlbumTracks", x => new { x.AlbumId, x.Position });
                    table.ForeignKey(
                        name: "FK_AlbumTracks_Albums_AlbumId",
                        column: x => x.AlbumId,
                        principalTable: "Albums",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AlbumTracks_Tracks_TrackId",
                        column: x => x.TrackId,
                        principalTable: "Tracks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ListeningHistory",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    UserId = table.Column<int>(type: "INTEGER", nullable: false),
                    TrackId = table.Column<int>(type: "INTEGER", nullable: false),
                    PlayedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    MsPlayed = table.Column<int>(type: "INTEGER", nullable: false),
                    ContextUri = table.Column<string>(type: "TEXT", nullable: true),
                    DeviceType = table.Column<string>(type: "TEXT", nullable: true),
                    Source = table.Column<int>(type: "INTEGER", nullable: false),
                    DedupeKey = table.Column<string>(type: "TEXT", nullable: true),
                    Latitude = table.Column<double>(type: "REAL", nullable: true),
                    Longitude = table.Column<double>(type: "REAL", nullable: true),
                    LocationAccuracy = table.Column<double>(type: "REAL", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ListeningHistory", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ListeningHistory_Tracks_TrackId",
                        column: x => x.TrackId,
                        principalTable: "Tracks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ListeningHistory_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SongsOfTheDay",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    UserId = table.Column<int>(type: "INTEGER", nullable: false),
                    TrackId = table.Column<int>(type: "INTEGER", nullable: false),
                    Date = table.Column<DateOnly>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SongsOfTheDay", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SongsOfTheDay_Tracks_TrackId",
                        column: x => x.TrackId,
                        principalTable: "Tracks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SongsOfTheDay_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TrackArtists",
                columns: table => new
                {
                    TrackId = table.Column<int>(type: "INTEGER", nullable: false),
                    ArtistId = table.Column<int>(type: "INTEGER", nullable: false),
                    ArtistOrder = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TrackArtists", x => new { x.TrackId, x.ArtistId });
                    table.ForeignKey(
                        name: "FK_TrackArtists_Artists_ArtistId",
                        column: x => x.ArtistId,
                        principalTable: "Artists",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TrackArtists_Tracks_TrackId",
                        column: x => x.TrackId,
                        principalTable: "Tracks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserLikedTracks",
                columns: table => new
                {
                    UserId = table.Column<int>(type: "INTEGER", nullable: false),
                    TrackId = table.Column<int>(type: "INTEGER", nullable: false),
                    LikedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserLikedTracks", x => new { x.UserId, x.TrackId });
                    table.ForeignKey(
                        name: "FK_UserLikedTracks_Tracks_TrackId",
                        column: x => x.TrackId,
                        principalTable: "Tracks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_UserLikedTracks_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PlaylistTracks",
                columns: table => new
                {
                    PlaylistId = table.Column<int>(type: "INTEGER", nullable: false),
                    Position = table.Column<int>(type: "INTEGER", nullable: false),
                    TrackId = table.Column<int>(type: "INTEGER", nullable: false),
                    AddedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    AddedBySpotifyId = table.Column<string>(type: "TEXT", nullable: true),
                    AddedByUserId = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlaylistTracks", x => new { x.PlaylistId, x.Position });
                    table.ForeignKey(
                        name: "FK_PlaylistTracks_Playlists_PlaylistId",
                        column: x => x.PlaylistId,
                        principalTable: "Playlists",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PlaylistTracks_Tracks_TrackId",
                        column: x => x.TrackId,
                        principalTable: "Tracks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "UserPlaylists",
                columns: table => new
                {
                    UserId = table.Column<int>(type: "INTEGER", nullable: false),
                    PlaylistId = table.Column<int>(type: "INTEGER", nullable: false),
                    Relation = table.Column<int>(type: "INTEGER", nullable: false),
                    FollowedAt = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserPlaylists", x => new { x.UserId, x.PlaylistId });
                    table.ForeignKey(
                        name: "FK_UserPlaylists_Playlists_PlaylistId",
                        column: x => x.PlaylistId,
                        principalTable: "Playlists",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserPlaylists_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ListeningSessionTracks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ListeningSessionId = table.Column<int>(type: "INTEGER", nullable: false),
                    ListeningHistoryId = table.Column<int>(type: "INTEGER", nullable: false),
                    TrackId = table.Column<int>(type: "INTEGER", nullable: false),
                    PlayedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Position = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ListeningSessionTracks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ListeningSessionTracks_ListeningHistory_ListeningHistoryId",
                        column: x => x.ListeningHistoryId,
                        principalTable: "ListeningHistory",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ListeningSessionTracks_ListeningSessions_ListeningSessionId",
                        column: x => x.ListeningSessionId,
                        principalTable: "ListeningSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ListeningSessionTracks_Tracks_TrackId",
                        column: x => x.TrackId,
                        principalTable: "Tracks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Posts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    UserId = table.Column<int>(type: "INTEGER", nullable: false),
                    Type = table.Column<int>(type: "INTEGER", nullable: false),
                    TrackId = table.Column<int>(type: "INTEGER", nullable: true),
                    AlbumId = table.Column<int>(type: "INTEGER", nullable: true),
                    PlaylistId = table.Column<int>(type: "INTEGER", nullable: true),
                    ArtistId = table.Column<int>(type: "INTEGER", nullable: true),
                    SourceListeningHistoryId = table.Column<int>(type: "INTEGER", nullable: true),
                    ListeningSessionId = table.Column<int>(type: "INTEGER", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Visibility = table.Column<int>(type: "INTEGER", nullable: false),
                    MetadataJson = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Posts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Posts_Albums_AlbumId",
                        column: x => x.AlbumId,
                        principalTable: "Albums",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Posts_Artists_ArtistId",
                        column: x => x.ArtistId,
                        principalTable: "Artists",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Posts_ListeningHistory_SourceListeningHistoryId",
                        column: x => x.SourceListeningHistoryId,
                        principalTable: "ListeningHistory",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Posts_ListeningSessions_ListeningSessionId",
                        column: x => x.ListeningSessionId,
                        principalTable: "ListeningSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Posts_Playlists_PlaylistId",
                        column: x => x.PlaylistId,
                        principalTable: "Playlists",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Posts_Tracks_TrackId",
                        column: x => x.TrackId,
                        principalTable: "Tracks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Posts_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Albums_SpotifyId",
                table: "Albums",
                column: "SpotifyId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AlbumTracks_TrackId",
                table: "AlbumTracks",
                column: "TrackId");

            migrationBuilder.CreateIndex(
                name: "IX_Artists_SpotifyId",
                table: "Artists",
                column: "SpotifyId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Comments_AuthorId",
                table: "Comments",
                column: "AuthorId");

            migrationBuilder.CreateIndex(
                name: "IX_Comments_EntityType_EntityId_CreatedAt",
                table: "Comments",
                columns: new[] { "EntityType", "EntityId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Comments_ParentCommentId",
                table: "Comments",
                column: "ParentCommentId");

            migrationBuilder.CreateIndex(
                name: "IX_Follows_FolloweeUserId",
                table: "Follows",
                column: "FolloweeUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ListeningHistory_DedupeKey",
                table: "ListeningHistory",
                column: "DedupeKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ListeningHistory_TrackId",
                table: "ListeningHistory",
                column: "TrackId");

            migrationBuilder.CreateIndex(
                name: "IX_ListeningHistory_UserId_PlayedAt",
                table: "ListeningHistory",
                columns: new[] { "UserId", "PlayedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ListeningSessions_Status_EndedAt",
                table: "ListeningSessions",
                columns: new[] { "Status", "EndedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ListeningSessions_UserId_Status",
                table: "ListeningSessions",
                columns: new[] { "UserId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_ListeningSessionTracks_ListeningHistoryId",
                table: "ListeningSessionTracks",
                column: "ListeningHistoryId");

            migrationBuilder.CreateIndex(
                name: "IX_ListeningSessionTracks_ListeningSessionId",
                table: "ListeningSessionTracks",
                column: "ListeningSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_ListeningSessionTracks_ListeningSessionId_ListeningHistoryId",
                table: "ListeningSessionTracks",
                columns: new[] { "ListeningSessionId", "ListeningHistoryId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ListeningSessionTracks_TrackId",
                table: "ListeningSessionTracks",
                column: "TrackId");

            migrationBuilder.CreateIndex(
                name: "IX_Playlists_OwnerUserId",
                table: "Playlists",
                column: "OwnerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Playlists_SpotifyId",
                table: "Playlists",
                column: "SpotifyId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PlaylistTracks_PlaylistId_AddedAt",
                table: "PlaylistTracks",
                columns: new[] { "PlaylistId", "AddedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_PlaylistTracks_TrackId",
                table: "PlaylistTracks",
                column: "TrackId");

            migrationBuilder.CreateIndex(
                name: "IX_Posts_AlbumId",
                table: "Posts",
                column: "AlbumId");

            migrationBuilder.CreateIndex(
                name: "IX_Posts_ArtistId",
                table: "Posts",
                column: "ArtistId");

            migrationBuilder.CreateIndex(
                name: "IX_Posts_ListeningSessionId",
                table: "Posts",
                column: "ListeningSessionId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Posts_PlaylistId",
                table: "Posts",
                column: "PlaylistId");

            migrationBuilder.CreateIndex(
                name: "IX_Posts_SourceListeningHistoryId",
                table: "Posts",
                column: "SourceListeningHistoryId");

            migrationBuilder.CreateIndex(
                name: "IX_Posts_TrackId",
                table: "Posts",
                column: "TrackId");

            migrationBuilder.CreateIndex(
                name: "IX_Posts_UserId_CreatedAt",
                table: "Posts",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_SongsOfTheDay_TrackId",
                table: "SongsOfTheDay",
                column: "TrackId");

            migrationBuilder.CreateIndex(
                name: "IX_SongsOfTheDay_UserId_Date",
                table: "SongsOfTheDay",
                columns: new[] { "UserId", "Date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SpotifySyncStates_UserId",
                table: "SpotifySyncStates",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TrackArtists_ArtistId",
                table: "TrackArtists",
                column: "ArtistId");

            migrationBuilder.CreateIndex(
                name: "IX_Tracks_AlbumId",
                table: "Tracks",
                column: "AlbumId");

            migrationBuilder.CreateIndex(
                name: "IX_Tracks_SpotifyId",
                table: "Tracks",
                column: "SpotifyId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserFollowedArtists_ArtistId",
                table: "UserFollowedArtists",
                column: "ArtistId");

            migrationBuilder.CreateIndex(
                name: "IX_UserLikedAlbums_AlbumId",
                table: "UserLikedAlbums",
                column: "AlbumId");

            migrationBuilder.CreateIndex(
                name: "IX_UserLikedTracks_TrackId",
                table: "UserLikedTracks",
                column: "TrackId");

            migrationBuilder.CreateIndex(
                name: "IX_UserPlaylists_PlaylistId",
                table: "UserPlaylists",
                column: "PlaylistId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Handle",
                table: "Users",
                column: "Handle",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_SpotifyId",
                table: "Users",
                column: "SpotifyId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AlbumTracks");

            migrationBuilder.DropTable(
                name: "Comments");

            migrationBuilder.DropTable(
                name: "Follows");

            migrationBuilder.DropTable(
                name: "ListeningSessionTracks");

            migrationBuilder.DropTable(
                name: "PlaylistTracks");

            migrationBuilder.DropTable(
                name: "Posts");

            migrationBuilder.DropTable(
                name: "SongsOfTheDay");

            migrationBuilder.DropTable(
                name: "SpotifySyncStates");

            migrationBuilder.DropTable(
                name: "TrackArtists");

            migrationBuilder.DropTable(
                name: "UserFollowedArtists");

            migrationBuilder.DropTable(
                name: "UserLikedAlbums");

            migrationBuilder.DropTable(
                name: "UserLikedTracks");

            migrationBuilder.DropTable(
                name: "UserPlaylists");

            migrationBuilder.DropTable(
                name: "ListeningHistory");

            migrationBuilder.DropTable(
                name: "ListeningSessions");

            migrationBuilder.DropTable(
                name: "Artists");

            migrationBuilder.DropTable(
                name: "Playlists");

            migrationBuilder.DropTable(
                name: "Tracks");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropTable(
                name: "Albums");
        }
    }
}
