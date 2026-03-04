using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PetalAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddIsInitialSyncComplete : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsInitialSyncComplete",
                table: "Users",
                type: "INTEGER",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsInitialSyncComplete",
                table: "Users");
        }
    }
}
