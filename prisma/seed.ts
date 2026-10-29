import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

async function main() {
  const teacherHash = await bcrypt.hash('teacher123', 12)
  const studentHash = await bcrypt.hash('student123', 12)

  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@example.com' },
    update: {},
    create: {
      name: 'Ms Sarah Williams',
      email: 'teacher@example.com',
      passwordHash: teacherHash,
      role: 'TEACHER',
    },
  })

  const [alice, bob] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'alice@example.com' },
      update: {},
      create: { name: 'Alice Thompson', email: 'alice@example.com', passwordHash: studentHash, role: 'STUDENT' },
    }),
    prisma.user.upsert({
      where: { email: 'bob@example.com' },
      update: {},
      create: { name: 'Bob Patel', email: 'bob@example.com', passwordHash: studentHash, role: 'STUDENT' },
    }),
  ])

  // Course 1: Year 7 Maths
  const maths = await prisma.course.upsert({
    where: { id: 'seed-course-maths' },
    update: {},
    create: {
      id: 'seed-course-maths',
      title: 'Introduction to Algebra',
      description: 'Building blocks of algebra for Year 7 students — variables, expressions, and simple equations.',
      subject: 'MATHS',
      keyStage: 'KS3',
      teacherId: teacher.id,
    },
  })

  const mathsLessons = [
    { title: 'What is a variable?', content: 'A variable is a symbol (usually a letter like x or y) that represents an unknown number.\n\nFor example: if x + 3 = 7, then x = 4.\n\nVariables let us write rules that work for any number. Instead of saying "5 + 3 = 8", we can say "x + 3 = x + 3" — a rule that holds for any value of x.' },
    { title: 'Writing expressions', content: 'An algebraic expression is a combination of numbers, variables, and operations.\n\nExamples:\n• 2x + 5 (two times x, plus five)\n• 3y − 1 (three times y, minus one)\n• a + b (a plus b)\n\nNotice there is no equals sign — expressions don\'t have a definite answer until we know what the variables equal.' },
    { title: 'Solving simple equations', content: 'An equation has an equals sign and states that two expressions are equal.\n\nTo solve x + 4 = 10:\n1. We want x on its own\n2. Subtract 4 from both sides: x + 4 − 4 = 10 − 4\n3. x = 6\n\nThe golden rule: whatever you do to one side, you must do to the other.' },
  ]

  for (let i = 0; i < mathsLessons.length; i++) {
    const l = mathsLessons[i]!
    await prisma.lesson.upsert({
      where: { courseId_order: { courseId: maths.id, order: i + 1 } },
      update: {},
      create: { title: l.title, content: l.content, order: i + 1, courseId: maths.id },
    })
  }

  // Course 2: KS2 English
  const english = await prisma.course.upsert({
    where: { id: 'seed-course-english' },
    update: {},
    create: {
      id: 'seed-course-english',
      title: 'Descriptive Writing',
      description: 'Learn how to bring your writing to life using vivid language, structure, and imagination.',
      subject: 'ENGLISH',
      keyStage: 'KS2',
      teacherId: teacher.id,
    },
  })

  const englishLessons = [
    { title: 'Show, don\'t tell', content: 'Good descriptive writing makes the reader feel emotions rather than just naming them.\n\nWeak: "She was scared."\nStrong: "Her hands shook. She pressed herself against the wall and held her breath."\n\nInstead of telling us the character is scared, we see it through her actions. This is called "show, don\'t tell".' },
    { title: 'Using the five senses', content: 'Paint a picture with all five senses: sight, sound, smell, taste, and touch.\n\nExample:\nThe market buzzed with noise. The smell of frying onions drifted through the air. Rough wooden crates scraped her fingers as she reached for a plum — cold, firm, and perfect.' },
  ]

  for (let i = 0; i < englishLessons.length; i++) {
    const l = englishLessons[i]!
    await prisma.lesson.upsert({
      where: { courseId_order: { courseId: english.id, order: i + 1 } },
      update: {},
      create: { title: l.title, content: l.content, order: i + 1, courseId: english.id },
    })
  }

  // Assignments
  const mathsAssignment = await prisma.assignment.upsert({
    where: { id: 'seed-assign-maths' },
    update: {},
    create: { id: 'seed-assign-maths', courseId: maths.id, teacherId: teacher.id },
  })

  const englishAssignment = await prisma.assignment.upsert({
    where: { id: 'seed-assign-english' },
    update: {},
    create: { id: 'seed-assign-english', courseId: english.id, teacherId: teacher.id },
  })

  // Enrol both students in maths; alice also in english
  for (const student of [alice, bob]) {
    await prisma.enrollment.upsert({
      where: { studentId_assignmentId: { studentId: student.id, assignmentId: mathsAssignment.id } },
      update: {},
      create: { studentId: student.id, assignmentId: mathsAssignment.id },
    })
  }
  await prisma.enrollment.upsert({
    where: { studentId_assignmentId: { studentId: alice.id, assignmentId: englishAssignment.id } },
    update: {},
    create: { studentId: alice.id, assignmentId: englishAssignment.id },
  })

  console.log('Seeded:')
  console.log('  teacher@example.com / teacher123')
  console.log('  alice@example.com   / student123')
  console.log('  bob@example.com     / student123')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async e => { console.error(e); await prisma.$disconnect(); process.exit(1) })
