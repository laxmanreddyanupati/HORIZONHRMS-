using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HorizonHRMS.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddItAssets : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ItAssets",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(48)", maxLength: 48, nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false),
                    AssetId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    SerialNumber = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    Type = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    EmployeeId = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: true),
                    EmployeeCode = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: true),
                    EmployeeName = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: true),
                    AllocationDate = table.Column<DateOnly>(type: "date", nullable: true),
                    Condition = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    Remarks = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ItAssets", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ItAssetEvents",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(48)", maxLength: 48, nullable: false),
                    AssetId = table.Column<string>(type: "nvarchar(48)", maxLength: 48, nullable: false),
                    Action = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    EmployeeId = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: true),
                    EmployeeCode = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: true),
                    EmployeeName = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: true),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    Condition = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    Remarks = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ActorId = table.Column<string>(type: "nvarchar(48)", maxLength: 48, nullable: false),
                    RecordedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ItAssetEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ItAssetEvents_ItAssets_AssetId",
                        column: x => x.AssetId,
                        principalTable: "ItAssets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ItAssetEvents_AssetId",
                table: "ItAssetEvents",
                column: "AssetId");

            migrationBuilder.CreateIndex(
                name: "IX_ItAssets_AssetId",
                table: "ItAssets",
                column: "AssetId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ItAssets_SerialNumber",
                table: "ItAssets",
                column: "SerialNumber",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ItAssetEvents");

            migrationBuilder.DropTable(
                name: "ItAssets");
        }
    }
}
