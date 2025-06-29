/*
  Warnings:

  - Added the required column `answeredQuestions` to the `test_attempts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `questions` to the `test_attempts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `submittedAt` to the `test_attempts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `testTitle` to the `test_attempts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalQuestions` to the `test_attempts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "test_attempts" ADD COLUMN     "answeredQuestions" INTEGER NOT NULL,
ADD COLUMN     "overallFeedback" TEXT,
ADD COLUMN     "questions" JSONB NOT NULL,
ADD COLUMN     "submittedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "testTitle" TEXT NOT NULL,
ADD COLUMN     "totalQuestions" INTEGER NOT NULL;
