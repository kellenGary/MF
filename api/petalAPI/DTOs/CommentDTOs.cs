using PetalAPI.Models;
using System.ComponentModel.DataAnnotations;

namespace PetalAPI.DTOs;

public class CreateCommentDto
{
    [Required]
    [MaxLength(1000)]
    public string Text { get; set; } = string.Empty;

    [Required]
    public CommentEntityType EntityType { get; set; }

    [Required]
    public string EntityId { get; set; } = string.Empty;

    public int? ParentCommentId { get; set; }
}

public class CommentResponseDto
{
    public int Id { get; set; }
    public string Text { get; set; } = string.Empty;
    public CommentEntityType EntityType { get; set; }
    public string EntityId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public int? ParentCommentId { get; set; }

    // Author details
    public int AuthorId { get; set; }
    public string? AuthorDisplayName { get; set; }
    public string? AuthorHandle { get; set; }
    public string? AuthorProfileImageUrl { get; set; }
    
    // Additional metadata
    public bool IsOwner { get; set; }
}
