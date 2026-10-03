import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@caja.local").toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || "Admin123!";
  const nombre = process.env.ADMIN_NOMBRE || "Administrador";

  const passwordHash = await bcrypt.hash(password, 12);

  const usuario = await prisma.usuario.upsert({
    where: { email },
    update: {
      nombre,
      passwordHash,
      rol: "ADMIN",
      estado: "ACTIVO",
      debeCambiarPassword: true,
      sessionVersion: { increment: 1 },
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
    create: {
      nombre,
      email,
      passwordHash,
      rol: "ADMIN",
      estado: "ACTIVO",
      debeCambiarPassword: true,
    },
  });

  console.log("Admin listo:");
  console.log(`  email: ${usuario.email}`);
  console.log(`  password: ${password}`);
  console.log("  Debe cambiar la contrasena en el primer acceso.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
