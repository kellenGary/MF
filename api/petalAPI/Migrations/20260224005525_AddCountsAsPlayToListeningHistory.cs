using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PetalAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddCountsAsPlayToListeningHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "CountsAsPlay",
                table: "ListeningHistory",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_ListeningHistory_UserId_CountsAsPlay_PlayedAt",
                table: "ListeningHistory",
                columns: new[] { "UserId", "CountsAsPlay", "PlayedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ListeningHistory_UserId_CountsAsPlay_PlayedAt",
                table: "ListeningHistory");

            migrationBuilder.DropColumn(
                name: "CountsAsPlay",
                table: "ListeningHistory");
        }
    }
}
