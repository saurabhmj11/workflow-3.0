import { PrismaClient } from "@prisma/client"
import { randomUUID, createHash } from "crypto"

const prisma = new PrismaClient()

async function hashPassword(password: string): Promise<string> {
  const salt = randomUUID()
  const hash = createHash("sha256").update(password + salt).digest("hex")
  return `sha256:${salt}:${hash}`
}

async function main() {
  const email = "admin@openworkflow.ai"
  const password = "admin123"

  // Check if admin user already exists
  const existing = await prisma.user.findUnique({
    where: { email },
  })

  if (existing) {
    console.log("Admin user already exists:", email)
    // Update password hash to new format
    const hashedPassword = await hashPassword(password)
    await prisma.user.update({
      where: { email },
      data: { hashedPassword },
    })
    console.log("Admin password updated to new hash format")
    return
  }

  // Hash password using SHA-256 (same as register route)
  const hashedPassword = await hashPassword(password)

  // Create admin user
  const user = await prisma.user.create({
    data: {
      email,
      name: "Admin",
      hashedPassword,
      role: "ADMIN",
      image: null,
    },
  })

  console.log("Admin user created:", user.email, "(id:", user.id, ")")
}

main()
  .catch((e) => {
    console.error("Seed error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
