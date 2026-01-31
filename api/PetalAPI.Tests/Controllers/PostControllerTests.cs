using Xunit;
using Moq;
using Microsoft.EntityFrameworkCore;
using PetalAPI.Controllers;
using PetalAPI.Services;
using PetalAPI.Data;
using PetalAPI.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System.Security.Claims;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;

namespace PetalAPI.Tests.Controllers
{
    public class PostControllerTests
    {
        private readonly Mock<IPostService> _mockPostService;
        private readonly Mock<ILogger<PostController>> _mockLogger;
        private readonly DbContextOptions<AppDbContext> _dbContextOptions;

        public PostControllerTests()
        {
            _mockPostService = new Mock<IPostService>();
            _mockLogger = new Mock<ILogger<PostController>>();
            
            _dbContextOptions = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
        }

        private AppDbContext CreateContext()
        {
            return new AppDbContext(_dbContextOptions);
        }

        private PostController CreateController(AppDbContext context)
        {
            var controller = new PostController(context, _mockPostService.Object, _mockLogger.Object);
            
            // Mock HttpContext for User Claims
            var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
            {
                new Claim(ClaimTypes.NameIdentifier, "1"),
            }, "mock"));

            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user }
            };

            return controller;
        }

        // Share Track Tests
        [Fact]
        public async Task ShareTrack_ShouldReturnOk_WhenTrackExists()
        {
            // Arrange
            using var context = CreateContext();
            var track = new Track { Id = 10, SpotifyId = "spot1", Name = "Test Track", DurationMs = 2000 };
            context.Tracks.Add(track);
            context.SaveChanges();

            _mockPostService
                .Setup(s => s.CreateSharedTrackPost(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<string>(), It.IsAny<PostVisibility>()))
                .ReturnsAsync(new Post { Id = 100 });

            var controller = CreateController(context);
            var request = new ShareTrackRequest { TrackId = 10, Caption = "Nice!" };

            // Act
            var result = await controller.ShareTrack(request);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
        }

        [Fact]
        public async Task ShareTrack_ShouldReturnNotFound_WhenTrackDoesNotExist()
        {
            // Arrange
            using var context = CreateContext();
            var controller = CreateController(context);
            var request = new ShareTrackRequest { TrackId = null }; // Doesn't exist

            // Act
            var result = await controller.ShareTrack(request);

            // Assert
            Assert.IsType<NotFoundObjectResult>(result);
        }

        // Share Album Tests
        [Fact]
        public async Task ShareAlbum_ShouldReturnOk_WhenAlbumExists()
        {
            // Arrange
            using var context = CreateContext();
            var album = new Album { Id = 10, SpotifyId = "spot1", Name = "Test Album" };
            context.Albums.Add(album);
            context.SaveChanges();

            _mockPostService
                .Setup(s => s.CreateSharedAlbumPost(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<string>(), It.IsAny<PostVisibility>()))
                .ReturnsAsync(new Post { Id = 100 });

            var controller = CreateController(context);
            var request = new ShareAlbumRequest { AlbumId = 10, Caption = "Nice!" };

            // Act
            var result = await controller.ShareAlbum(request);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
        }

        [Fact]
        public async Task ShareAlbum_ShouldReturnNotFound_WhenAlbumDoesNotExist()
        {
            // Arrange
            using var context = CreateContext();
            var controller = CreateController(context);
            var request = new ShareAlbumRequest { AlbumId = null }; // Doesn't exist

            // Act
            var result = await controller.ShareAlbum(request);

            // Assert
            Assert.IsType<NotFoundObjectResult>(result);
        }

        // Share Playlist Tests
        [Fact]
        public async Task SharePlaylist_ShouldReturnOk_WhenPlaylistExists()
        {
            // Arrange
            using var context = CreateContext();
            var playlist = new Playlist { Id = 10, SpotifyId = "spot1", Name = "Test Playlist" };
            context.Playlists.Add(playlist);
            context.SaveChanges();

            _mockPostService
                .Setup(s => s.CreateSharedPlaylistPost(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<string>(), It.IsAny<PostVisibility>()))
                .ReturnsAsync(new Post { Id = 100 });

            var controller = CreateController(context);
            var request = new SharePlaylistRequest { PlaylistId = 10, Caption = "Nice!" };

            // Act
            var result = await controller.SharePlaylist(request);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
        }

        [Fact]
        public async Task SharePlaylist_ShouldReturnNotFound_WhenPlaylistDoesNotExist()
        {
            // Arrange
            using var context = CreateContext();
            var controller = CreateController(context);
            var request = new SharePlaylistRequest { PlaylistId = null }; // Doesn't exist

            // Act
            var result = await controller.SharePlaylist(request);

            // Assert
            Assert.IsType<NotFoundObjectResult>(result);
        }

        // Share Artist Tests
        [Fact]
        public async Task ShareArtist_ShouldReturnOk_WhenArtistExists()
        {
            // Arrange
            using var context = CreateContext();
            var artist = new Artist { Id = 10, SpotifyId = "spot1", Name = "Test Artist" };
            context.Artists.Add(artist);
            context.SaveChanges();

            _mockPostService
                .Setup(s => s.CreateSharedArtistPost(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<string>(), It.IsAny<PostVisibility>()))
                .ReturnsAsync(new Post { Id = 100 });

            var controller = CreateController(context);
            var request = new ShareArtistRequest { ArtistId = 10, Caption = "Nice!" };

            // Act
            var result = await controller.ShareArtist(request);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
        }

        [Fact]
        public async Task ShareArtist_ShouldReturnNotFound_WhenArtistDoesNotExist()
        {
            // Arrange
            using var context = CreateContext();
            var controller = CreateController(context);
            var request = new ShareArtistRequest { ArtistId = null }; // Doesn't exist

            // Act
            var result = await controller.ShareArtist(request);

            // Assert
            Assert.IsType<NotFoundObjectResult>(result);
        }

        // Create Listening Session Tests
        [Fact]
        public async Task CreateListeningSession_ShouldReturnOk_WhenTracksExist()
        {
            // Arrange
            using var context = CreateContext();
            var tracks = new List<Track>
            {
                new Track { Id = 1, SpotifyId = "spot1", Name = "Test Track 1" },
                new Track { Id = 2, SpotifyId = "spot2", Name = "Test Track 2" }
            };
            context.Tracks.AddRange(tracks);
            context.SaveChanges();

            _mockPostService
                .Setup(s => s.CreateListeningSessionPost(It.IsAny<int>(), It.IsAny<List<SessionTrackMetadata>>(), It.IsAny<PostVisibility>()))
                .ReturnsAsync(new Post { Id = 100 });

            var controller = CreateController(context);
            var request = new CreateListeningSessionRequest
            {
                Tracks = new List<SessionTrackMetadata> 
                { 
                    new SessionTrackMetadata { TrackId = 1, Name = "Track 1" },
                    new SessionTrackMetadata { TrackId = 2, Name = "Track 2" }
                },
                Visibility = PostVisibility.Public
            };

            // Act
            var result = await controller.CreateListeningSession(request);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
        }

        [Fact]
        public async Task CreateListeningSession_ShouldReturnBadRequest_WhenTracksDoNotExist()
        {
            // Arrange
            using var context = CreateContext();
            var controller = CreateController(context);
            var request = new CreateListeningSessionRequest
            {
                Tracks = new List<SessionTrackMetadata>(),
                Visibility = PostVisibility.Public
            };

            // Act
            var result = await controller.CreateListeningSession(request);

            // Assert
            Assert.IsType<BadRequestObjectResult>(result);
        }

        // Delete Post Tests
        [Fact]
        public async Task DeletePost_ShouldReturnOk_WhenPostExists()
        {
            // Arrange
            using var context = CreateContext();
            var post = new Post { Id = 100, UserId = 1 };
            context.Posts.Add(post);
            context.SaveChanges();

            _mockPostService
                .Setup(s => s.DeletePost(It.IsAny<int>(), It.IsAny<int>()))
                .ReturnsAsync(true);

            var controller = CreateController(context);

            // Act
            var result = await controller.DeletePost(100);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
        }

        [Fact]
        public async Task DeletePost_ShouldReturnNotFound_WhenPostDoesNotExist()
        {
            // Arrange
            using var context = CreateContext();
            var controller = CreateController(context);

            // Act
            var result = await controller.DeletePost(100); // Doesn't exist

            // Assert
            Assert.IsType<NotFoundObjectResult>(result);
        }
    }
}
