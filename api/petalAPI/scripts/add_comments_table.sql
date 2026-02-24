CREATE TABLE IF NOT EXISTS "Comments" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_Comments" PRIMARY KEY AUTOINCREMENT,
    "Text" TEXT NOT NULL,
    "AuthorId" INTEGER NOT NULL,
    "EntityType" INTEGER NOT NULL,
    "EntityId" TEXT NOT NULL,
    "CreatedAt" TEXT NOT NULL,
    "ParentCommentId" INTEGER NULL,
    CONSTRAINT "FK_Comments_Users_AuthorId" FOREIGN KEY ("AuthorId") REFERENCES "Users" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_Comments_Comments_ParentCommentId" FOREIGN KEY ("ParentCommentId") REFERENCES "Comments" ("Id") ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS "IX_Comments_AuthorId" ON "Comments" ("AuthorId");
CREATE INDEX IF NOT EXISTS "IX_Comments_ParentCommentId" ON "Comments" ("ParentCommentId");
CREATE INDEX IF NOT EXISTS "IX_Comments_EntityType_EntityId_CreatedAt" ON "Comments" ("EntityType", "EntityId", "CreatedAt");
