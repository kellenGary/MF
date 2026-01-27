using Xunit;
using Moq;
using Microsoft.EntityFrameworkCore;
using PetalAPI.Services;
using PetalAPI.Data;
using PetalAPI.Models;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;
using System;

namespace PetalAPI.Tests.Services
{
    public class PostServiceTests
    {
        private readonly Mock<ILogger<PostService>> _mockLogger;
        private readonly DbContextOptions<AppDbContext> _dbContextOptions;

        public PostServiceTests()
        {
            _mockLogger = new Mock<ILogger<PostService>>();
            
            // Use InMemory database for testing
            _dbContextOptions = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString()) // Unique DB per test class/run
                .Options;
        }

        private AppDbContext CreateContext()
        {
            return new AppDbContext(_dbContextOptions);
        }

        [Fact]
        public async Task CreateListeningSessionPost_ShouldCreatePost_WhenTracksAreProvided()
        {
            // Arrange
            using var context = CreateContext();
            var service = new PostService(context, _mockLogger.Object);
            var userId = 1;
            var tracks = new List<SessionTrackMetadata>
            {
                new SessionTrackMetadata { TrackId = 101, DurationMs = 60000, Name = "Track 1" },
                new SessionTrackMetadata { TrackId = 102, DurationMs = 120000, Name = "Track 2" }
            };

            // Act
            var result = await service.CreateListeningSessionPost(userId, tracks);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(userId, result.UserId);
            Assert.Equal(PostType.ListeningSession, result.Type);
            Assert.Equal(101, result.TrackId); // Primary track is the first one
            Assert.Equal(1, context.Posts.Count()); // Verify saved to DB
        }

        [Fact]
        public async Task CreateListeningSessionPost_ShouldReturnNull_WhenNoTracksProvided()
        {
            // Arrange
            using var context = CreateContext();
            var service = new PostService(context, _mockLogger.Object);
            var result = await service.CreateListeningSessionPost(1, new List<SessionTrackMetadata>());

            // Assert
            Assert.Null(result);
        }

        [Fact]
        public async Task CreateLikedTrackPost_ShouldCreatePost()
        {
            // Arrange
            using var context = CreateContext();
            var service = new PostService(context, _mockLogger.Object);
            var userId = 1;
            var trackId = 505;

            // Act
            var result = await service.CreateLikedTrackPost(userId, trackId);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(userId, result.UserId);
            Assert.Equal(trackId, result.TrackId);
            Assert.Equal(PostType.LikedTrack, result.Type);
            Assert.Equal(1, context.Posts.Count());
        }
    }
}
