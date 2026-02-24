using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PetalAPI.Data;
using PetalAPI.DTOs;
using PetalAPI.Models;

namespace PetalAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CommentsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CommentsController(AppDbContext context)
        {
            _context = context;
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst("UserId")?.Value;
            if (string.IsNullOrEmpty(userIdClaim))
            {
                throw new UnauthorizedAccessException("User ID not found in token");
            }
            return int.Parse(userIdClaim);
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<CommentResponseDto>>> GetComments(
            [FromQuery] CommentEntityType entityType,
            [FromQuery] string entityId,
            [FromQuery] int page = 1,
            [FromQuery] int limit = 20)
        {
            var currentUserId = GetCurrentUserId();

            var query = _context.Comments
                .Include(c => c.Author)
                .Where(c => c.EntityType == entityType && c.EntityId == entityId && c.ParentCommentId == null)
                .OrderByDescending(c => c.CreatedAt)
                .Skip((page - 1) * limit)
                .Take(limit);

            var comments = await query.Select(c => new CommentResponseDto
            {
                Id = c.Id,
                Text = c.Text,
                EntityType = c.EntityType,
                EntityId = c.EntityId,
                CreatedAt = c.CreatedAt,
                ParentCommentId = c.ParentCommentId,
                AuthorId = c.AuthorId,
                AuthorDisplayName = c.Author.DisplayName,
                AuthorHandle = c.Author.Handle,
                AuthorProfileImageUrl = c.Author.ProfileImageUrl,
                IsOwner = c.AuthorId == currentUserId
            }).ToListAsync();

            return Ok(comments);
        }

        [HttpPost]
        public async Task<ActionResult<CommentResponseDto>> CreateComment([FromBody] CreateCommentDto request)
        {
            var currentUserId = GetCurrentUserId();

            var comment = new Comment
            {
                Text = request.Text,
                AuthorId = currentUserId,
                EntityType = request.EntityType,
                EntityId = request.EntityId,
                CreatedAt = DateTime.UtcNow,
                ParentCommentId = request.ParentCommentId
            };

            _context.Comments.Add(comment);
            await _context.SaveChangesAsync();

            var author = await _context.Users.FindAsync(currentUserId);

            return CreatedAtAction(nameof(GetComments), new { id = comment.Id }, new CommentResponseDto
            {
                Id = comment.Id,
                Text = comment.Text,
                EntityType = comment.EntityType,
                EntityId = comment.EntityId,
                CreatedAt = comment.CreatedAt,
                ParentCommentId = comment.ParentCommentId,
                AuthorId = comment.AuthorId,
                AuthorDisplayName = author?.DisplayName,
                AuthorHandle = author?.Handle,
                AuthorProfileImageUrl = author?.ProfileImageUrl,
                IsOwner = true
            });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteComment(int id)
        {
            var currentUserId = GetCurrentUserId();
            var comment = await _context.Comments.FindAsync(id);

            if (comment == null)
            {
                return NotFound();
            }

            if (comment.AuthorId != currentUserId)
            {
                return Forbid();
            }

            _context.Comments.Remove(comment);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
