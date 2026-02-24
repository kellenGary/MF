using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PetalAPI.Models;

public enum CommentEntityType
{
    Track = 0,
    Album = 1,
    Artist = 2
}

public class Comment
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(1000)]
    public string Text { get; set; } = string.Empty;

    public int AuthorId { get; set; }
    public User Author { get; set; } = default!;

    public CommentEntityType EntityType { get; set; }
    
    [Required]
    public string EntityId { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public int? ParentCommentId { get; set; }
    public Comment? ParentComment { get; set; }
    
    public ICollection<Comment> Replies { get; set; } = new List<Comment>();
}
