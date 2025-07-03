import { PrismaClient } from '@prisma/client';
import { geminiModel, generateQuestions } from '../utils/gemini.js';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subHours } from 'date-fns';


const prisma = new PrismaClient();

export const createTest = async (req, res) => {
  const { title, subject, prompt, difficulty, educationLevel, mcqCount, shortAnswerCount, isPublic } = req.body;
  const userId = req.auth?.userId;

  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) return res.status(404).json({ message: 'User not found' });

    const questions = await generateQuestions({
      subject,
      difficulty,
      educationLevel,
      mcqCount,
      shortAnswerCount,
      prompt
    });

    const newTest = await prisma.testTemplate.create({
      data: {
        title,
        prompt,
        subject,
        difficulty,
        educationLevel,
        mcqCount,
        shortAnswerCount,
        questions,
        creatorId: user.id,
        isPublic,
      },
    });

    console.log("✅ Test created:", newTest);
    return res.status(201).json({ testId: newTest.id });

  } catch (err) {
    console.error('❌ Failed to create test:', err);
    return res.status(500).json({ message: 'Failed to create test', error: err.message });
  }
};
export const evaluateTestAttempt = async (req, res) => {
  // Add debugging
  console.log('=== DEBUG: Evaluate Test Attempt ===');
  console.log('Headers:', req.headers);
  console.log('req.auth:', req.auth);
  console.log('Authorization header:', req.headers.authorization);
  
  const { 
    testId, 
    testTitle,
    questions, 
    answers, 
    timeTaken, 
    isCompleted, 
    totalMarks, 
    totalQuestions, 
    answeredQuestions 
  } = req.body;
  
  const userId = req.auth?.userId;
  console.log('Extracted userId:', userId);

  if (!userId) {
    console.log('❌ No userId found in req.auth');
    return res.status(401).json({ message: 'Unauthorized: Please refresh the page and try again' });
  }

  try {
    console.log('✅ UserId found, proceeding with evaluation...');
    
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      console.log('❌ User not found in database for clerkId:', userId);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('✅ User found:', user.id);

    const test = await prisma.testTemplate.findUnique({
      where: { id: testId },
    });

    if (!test) {
      console.log('❌ Test not found for id:', testId);
      return res.status(404).json({ message: 'Test not found' });
    }

    console.log('✅ Test found, proceeding with Gemini evaluation...');

    // Rest of your evaluation logic remains the same...
    const questionsForEvaluation = questions.map(q => ({
      questionNumber: q.questionNumber,
      question: q.question,
      type: q.type,
      options: q.options,
      userAnswer: q.userAnswer,
      isAnswered: q.isAnswered
    }));

   const prompt = `
Evaluate the following test answers and provide detailed feedback.

Test Title: ${testTitle}
Total Questions: ${totalQuestions}
Total Marks: ${totalMarks}

Questions and User Answers:
${JSON.stringify(questionsForEvaluation, null, 2)}

Instructions:
- For MCQ questions:
  - Indicate if the user's answer is correct or incorrect (true/false).
  - Provide the correct answer and a short feedback.
  - Assign full marks if correct, 0 if incorrect.
- For SHORT type questions:
  - Evaluate the quality of the answer.
  - Provide marks **out of 5** based on answer quality.
  - Provide a short explanation of the evaluation.
  
Please respond in this JSON format:
{
  "score": number,
  "totalMarks": number,
  "feedback": [
    {
      "questionNumber": number,
      "type": "mcq" | "short",
      "isCorrect": boolean | null,
      "marksAwarded": number,
      "outOf": number,
      "correctAnswer": "string" | null,
      "userAnswer": "string",
      "feedback": "string"
    }
  ],
  "overallFeedback": "string"
}
`;


    const result = await geminiModel.generateContent(prompt);
    const response = await result.response.text();
    
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const cleanedResponse = jsonMatch ? jsonMatch[0] : response;
    
    const evaluation = JSON.parse(cleanedResponse);

    const attempt = await prisma.testAttempt.create({
      data: {
        userId: user.id,
        testId,
        testTitle,
        questions: questionsForEvaluation,
        answers,
        score: evaluation.score,
        totalMarks: evaluation.totalMarks || totalMarks,
        feedback: evaluation.feedback,
        overallFeedback: evaluation.overallFeedback,
        timeTaken,
        answeredQuestions,
        totalQuestions,
        isCompleted: true,
        submittedAt: new Date(),
      },
    });

    console.log('✅ Test attempt created successfully:', attempt.id);

    res.status(201).json({
      id: attempt.id,
    });

  } catch (err) {
    console.error('❌ Error evaluating test:', err);
    
    if (err instanceof SyntaxError) {
      return res.status(500).json({ 
        message: 'Failed to parse AI evaluation response', 
        error: 'Invalid JSON response from evaluation service' 
      });
    }
    
    res.status(500).json({ 
      message: 'Failed to evaluate test', 
      error: err.message 
    });
  }
};
export const getTestById = async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Missing test ID in query parameter' });
    }

    const test = await prisma.testTemplate.findUnique({
      where: {
        id: id,
      },
    });

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    res.status(200).json(test);
  } catch (err) {
    console.error('Error fetching test:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
export const getResultById = async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Missing test ID in query parameter' });
    }

    const test = await prisma.testAttempt.findUnique({
      where: {
        id: id,
      },
    });

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    res.status(200).json(test);
  } catch (err) {
    console.error('Error fetching test:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
export const getTestsByCreator = async (req, res) => {
  try {
    const clerkUserId = req.auth?.userId;

    if (!clerkUserId) {
      return res.status(401).json({ error: 'Unauthorized: Missing Clerk user ID' });
    }

    // Step 1: Find the user in your database
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    if (!dbUser) {
      return res.status(404).json({ error: 'User not found in database' });
    }

    // Step 2: Fetch tests where creatorId = dbUser.id
    const tests = await prisma.testTemplate.findMany({
      where: { creatorId: dbUser.id },
      include: {
        attempts: {
          select: {
            id: true, // Just to count
          },
        },
      },
    });

    // Step 3: Add attemptsCount
    const testsWithDetails = tests.map((test) => ({
      ...test,
      attemptsCount: test.attempts.length,
    }));

    // ✅ Use the enriched data
    res.status(200).json(testsWithDetails);
  } catch (err) {
    console.error('Error fetching user-created tests:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
export const getAttemptedTestsByCreator = async (req, res) => {
  try {
    const clerkUserId = req.auth?.userId;

    if (!clerkUserId) {
      return res.status(401).json({ error: 'Unauthorized: Missing Clerk user ID' });
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    if (!dbUser) {
      return res.status(404).json({ error: 'User not found in database' });
    }

    // ✅ Include user to get clerkId in response
    const tests = await prisma.testAttempt.findMany({
      where: { userId: dbUser.id },
      include: {
        user: {
          select: {
            clerkId: true,
          },
        },
      },
    });

    // ✅ Add score2 field to each test attempt
    const testsWithScore2 = tests.map(test => {
      // Calculate score2 as sum of marksAwarded from feedback
      const score2 = test.feedback ? 
        test.feedback.reduce((sum, feedbackItem) => {
          return sum + (feedbackItem.marksAwarded || 0);
        }, 0) : 0;

      return {
        ...test,
        score2
      };
    });

    res.status(200).json(testsWithScore2);
  } catch (err) {
    console.error('Error fetching user-created tests:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPublicTests = async (req, res) => {
  try {
    // Fetch all public tests with creator name
    const tests = await prisma.testTemplate.findMany({
      where: {
        isPublic: true,
      },
      include: {
        creator: {
          select: {
            name: true,
          },
        },
        attempts: {
          select: {
            id: true, // Just to count, we only need id
          },
        },
      },
    });

    // Add attempts count and creatorName
    const testsWithDetails = tests.map((test) => ({
      ...test,
      creatorName: test.creator?.name || 'Unknown',
      attemptsCount: test.attempts.length,
    }));

    res.status(200).json(testsWithDetails);
  } catch (err) {
    console.error('Error fetching public tests:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
export const getUserTestStats = async (req, res) => {
  try {
    // Enhanced auth validation
    const clerkUserId = req.auth?.userId;
    
    if (!clerkUserId) {
      console.error('❌ Auth failed - no userId in req.auth:', req.auth);
      return res.status(401).json({ 
        error: 'Unauthorized: Missing Clerk user ID',
        authStatus: 'failed'
      });
    }

    console.log('✅ Auth successful for user:', clerkUserId);

    // Force fresh database connection
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('🔄 Database connection refreshed');
    } catch (dbError) {
      console.error('❌ Database connection failed:', dbError);
    }

    // Find user with error handling
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    if (!dbUser) {
      console.error('❌ User not found in database for clerkId:', clerkUserId);
      return res.status(404).json({ error: 'User not found in database' });
    }

    const userId = dbUser.id;
    console.log('📊 Fetching stats for userId:', userId);

    // UTC timezone handling - simplified approach
    const now = new Date();
    
    // Calculate date ranges in UTC (dates are already in UTC when stored in DB)
    const weekStartUTC = startOfWeek(now, { weekStartsOn: 1 }); // Monday start
    const weekEndUTC = endOfWeek(now, { weekStartsOn: 1 });
    const monthStartUTC = startOfMonth(now);
    const monthEndUTC = endOfMonth(now);
    const last24HoursUTC = subHours(now, 24);

    console.log('🗓️ Date ranges:', {
      now: now.toISOString(),
      weekStart: weekStartUTC.toISOString(),
      weekEnd: weekEndUTC.toISOString(),
      monthStart: monthStartUTC.toISOString(),
      monthEnd: monthEndUTC.toISOString(),
      last24Hours: last24HoursUTC.toISOString()
    });

    // Force fresh queries by using $queryRaw for critical data
    console.log('🔍 Executing fresh database queries...');

    // Fetch all tests with fresh query
    const allTests = await prisma.testTemplate.findMany({
      where: { creatorId: userId },
      select: { 
        id: true, 
        createdAt: true, 
        title: true,
        updatedAt: true 
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('📝 Found tests:', allTests.length);
    console.log('📝 Test details:', allTests.map(t => ({
      id: t.id,
      title: t.title,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt?.toISOString()
    })));

    const totalTests = allTests.length;
    
    // Filter tests for this week using UTC
    const testsThisWeek = allTests.filter(
      (test) => test.createdAt >= weekStartUTC && test.createdAt <= weekEndUTC
    );
    
    console.log('📅 Tests this week:', testsThisWeek.length, testsThisWeek.map(t => ({
      title: t.title,
      createdAt: t.createdAt.toISOString()
    })));

    const testIds = allTests.map((t) => t.id);
    console.log('🔍 Test IDs to search for attempts:', testIds);

    // Skip attempts query if no tests exist
    let allAttempts = [];
    if (testIds.length > 0) {
      // Fetch attempts with fresh query
      allAttempts = await prisma.testAttempt.findMany({
        where: { testId: { in: testIds } },
        select: {
          id: true,
          testId: true,
          testTitle: true,
          submittedAt: true,
          score: true,
          totalMarks: true,
          userId: true
        },
        orderBy: { submittedAt: 'desc' },
      });

      console.log('📊 Found attempts:', allAttempts.length);
      console.log('📊 Attempt details:', allAttempts.map(a => ({
        id: a.id,
        testTitle: a.testTitle,
        score: a.score,
        totalMarks: a.totalMarks,
        submittedAt: a.submittedAt.toISOString(),
        userId: a.userId
      })));
    } else {
      console.log('📊 No tests found, skipping attempts query');
    }

    const totalAttempts = allAttempts.length;
    
    // Filter attempts for this week using UTC
    const attemptsThisWeek = allAttempts.filter(
      (a) => a.submittedAt >= weekStartUTC && a.submittedAt <= weekEndUTC
    );
    console.log('📅 Attempts this week:', attemptsThisWeek.length);

    // Filter attempts for this month using UTC
    const currentMonthAttempts = allAttempts.filter(
      (a) => a.submittedAt >= monthStartUTC && a.submittedAt <= monthEndUTC
    );
    console.log('📅 Attempts this month:', currentMonthAttempts.length);

    // Calculate percentage scores
    const percentageScores = currentMonthAttempts.map((a) => {
      if (!a.totalMarks || a.totalMarks === 0) {
        console.log(`⚠️ Invalid totalMarks for attempt ${a.id}: ${a.totalMarks}`);
        return 0;
      }
      const percentage = (a.score / a.totalMarks) * 100;
      console.log(`💯 Score calculation for ${a.testTitle}: ${a.score}/${a.totalMarks} = ${percentage.toFixed(2)}%`);
      return percentage;
    });

    const averageScoreThisMonth = percentageScores.length
      ? Math.round(
          percentageScores.reduce((sum, p) => sum + p, 0) / percentageScores.length
        )
      : 0;

    console.log('📈 Average score calculation:', {
      percentageScores: percentageScores.map(p => Math.round(p)),
      sum: percentageScores.reduce((sum, p) => sum + p, 0),
      count: percentageScores.length,
      average: averageScoreThisMonth
    });

    // Recent activity (last 24 hours) using UTC
    const recentActivity = allAttempts.filter(
      (a) => a.submittedAt >= last24HoursUTC
    ).length;
    console.log('⏰ Recent activity (24h):', recentActivity);

    // Recent tests (last 3 attempts)
    const recentTests = allAttempts.slice(0, 3).map((a) => ({
      id: a.id,
      testId: a.testId,
      testTitle: a.testTitle,
      score: a.score,
      totalMarks: a.totalMarks,
      submittedAt: a.submittedAt,
      percentage: a.totalMarks > 0 ? Math.round((a.score / a.totalMarks) * 100) : 0
    }));

    const response = {
      totalTests,
      testsThisWeek: testsThisWeek.length,
      totalAttempts,
      attemptsThisWeek: attemptsThisWeek.length,
      averageScoreThisMonth,
      recentActivity,
      recentTests,
      debug: {
        userId,
        clerkUserId,
        timestamp: now.toISOString(),
        dateRanges: {
          weekStart: weekStartUTC.toISOString(),
          weekEnd: weekEndUTC.toISOString(),
          monthStart: monthStartUTC.toISOString(),
          monthEnd: monthEndUTC.toISOString(),
          last24Hours: last24HoursUTC.toISOString()
        },
        rawData: {
          allTestsCount: allTests.length,
          allAttemptsCount: allAttempts.length,
          testsThisWeekCount: testsThisWeek.length,
          attemptsThisWeekCount: attemptsThisWeek.length,
          currentMonthAttemptsCount: currentMonthAttempts.length,
          percentageScores: percentageScores.map(p => Math.round(p))
        }
      }
    };

    console.log('📤 Final response:', JSON.stringify(response, null, 2));
    res.status(200).json(response);

  } catch (err) {
    console.error('❌ Error in getUserTestStats:', err);
    console.error('❌ Error stack:', err.stack);
    res.status(500).json({ 
      error: 'Internal server error',
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};





