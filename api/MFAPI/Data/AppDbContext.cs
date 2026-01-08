using Microsoft.EntityFrameworkCore;
using MFAPI.Models;

namespace MFAPI.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }
    
    public DbSet<User> Users { get; set; }
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // Create unique index on SpotifyId and Handle
        modelBuilder.Entity<User>()
            .HasIndex(u => u.SpotifyId)
            .IsUnique();
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Handle)
            .IsUnique();
    }
}
