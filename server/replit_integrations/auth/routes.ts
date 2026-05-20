import type { Express } from "express";
import { storage } from "../../storage";
import { isAuthenticated } from "./replitAuth";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";

function sanitizeUser(user: any) {
  if (!user) return user;
  const { password, ...safe } = user;
  return safe;
}

const SALT_ROUNDS = 12;

function isHashed(password: string): boolean {
  return password.startsWith("$2b$") || password.startsWith("$2a$");
}

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !user.password) {
          return done(null, false, { message: "Utilisateur non trouvé" });
        }

        let passwordValid = false;

        if (isHashed(user.password)) {
          // Password is already bcrypt hashed — compare normally
          passwordValid = await bcrypt.compare(password, user.password);
        } else {
          // Legacy plaintext password — compare directly
          passwordValid = user.password === password;
          // If valid, migrate to hashed password automatically
          if (passwordValid) {
            const hashed = await bcrypt.hash(password, SALT_ROUNDS);
            await storage.updateUser(user.id, { password: hashed });
            console.log(`Migrated password to bcrypt for user: ${username}`);
          }
        }

        if (!passwordValid) {
          return done(null, false, { message: "Mot de passe incorrect" });
        }

        return done(null, user);
      } catch (error) {
        console.error("Login strategy error:", error);
        return done(error);
      }
    })
  );

  app.post("/api/register", async (req, res) => {
    try {
      const { username, email, password, fullName } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ message: "Username, email and password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Le mot de passe doit contenir au moins 6 caractères" });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      const user = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        fullName,
      });

      req.login(user, (err) => {
        if (err) return res.status(500).json({ message: "Error logging in after registration" });
        res.status(201).json(sanitizeUser(user));
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/login-local", passport.authenticate("local"), (req, res) => {
    res.json(sanitizeUser(req.user));
  });

  // Get current authenticated user
  app.get("/api/auth/user", async (req: any, res) => {
    if (req.isAuthenticated()) {
      return res.json(sanitizeUser(req.user));
    }
    res.status(401).json({ message: "Unauthorized" });
  });
}
