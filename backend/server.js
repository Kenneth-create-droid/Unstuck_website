import "dotenv/config";
import express from "express";
import cors from "cors";

import OpenAI from "openai";

import { Resend } from "resend";
import bcrypt from "bcrypt";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_dev_key");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy_dev_key",
});

const ALLOWED_EMAIL_DOMAINS = [
  "ontariotechu.net",
  "ontariotechu.ca",
   "gmail.com"
];

const DEV_SKIP_EMAIL_VERIFICATION = true;

// Testing values
const MAX_VERIFY_ATTEMPTS = 5;

// Because verification codes currently expire after 60 seconds,
// keep the attempt limiter at 60 seconds while testing.
const VERIFY_ATTEMPT_WINDOW_SECONDS = 60;

// PostgreSQL DB Connection
import { db } from "./db.js";

import { 
  addUserToSpatialIndex, 
  removeUserFromSpatialIndex, 
  moveUserLocation 
} from "../keneca-engine/src/spatialIndexManager.js";

import {
  createChatSession,
  getChatSession,
  addChatMessage,
  getChatMessages,
  deleteChatSession
} from "../keneca-engine/src/redis/chatState.js";

// Redis Client
import { client } from "../keneca-engine/src/redis/redisClient.js";

// Keneca Engine Modules
import { userLocToCell } from "../keneca-engine/src/user.js";
import { dispatchPost } from "../keneca-engine/src/dispatcher.js";
import { setDispatchJob, getDispatchJob, updateDispatchJob, deleteDispatchJob } from "../keneca-engine/src/redis/dispatchState.js";
import { getUserStatus, updateUserStatus } from "../keneca-engine/src/redis/userStatus.js";

// Dispatch History Tracking
// Dispatch History Tracking
import { 
  addUserToDispatchHistory,
  usersInDispatchHistory,
  removeUserFromDispatchHistory
} from "../keneca-engine/src/redis/dispatchHistory.js";
const app = express();

app.use(cors());
app.use(express.json());

// Test PostgreSQL Connection
// Test PostgreSQL Connection




app.get("/", (req, res) => {
    res.send("Our OT support app is running");
});

const PORT = 2000;

const CHAT_INACTIVITY_LIMIT = 5 * 60 * 1000;
const activeChatTimers = new Map();
// ---------------------- AUTH ROUTES ----------------------

// ---------------------- SIGNUP + EMAIL VERIFICATION ----------------------

app.post("/signup", async (req, res) => {
  try {
    const { firstname, lastname, email, password } = req.body;

    // 1. Validate required fields
    if (!firstname || !lastname || !email || !password) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    // 2. Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // 3. Extract and validate exact domain
    const emailParts = normalizedEmail.split("@");

    if (emailParts.length !== 2) {
      return res.status(400).json({
        message: "Please enter a valid email address"
      });
    }

    const emailDomain = emailParts[1];

    if (!ALLOWED_EMAIL_DOMAINS.includes(emailDomain)) {
      return res.status(403).json({
        message:
          "Only Ontario Tech affiliated email addresses can create an Unstuck account."
      });
    }

    // 4. Check whether account already exists
    const existingUser = await db.query(
      "SELECT id FROM users WHERE LOWER(email) = $1",
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: "This account already exists. Try logging in."
      });
    }

    // 5. Generate cryptographically secure 6-digit verification code
    const verificationCode = crypto.randomInt(100000, 1000000).toString();

    // 6. Hash password BEFORE temporarily storing signup information
    const passwordHash = await bcrypt.hash(password, 12);

    if (DEV_SKIP_EMAIL_VERIFICATION) {

    const newUser = await db.query(
        `
        INSERT INTO users(firstname, lastname, email, password)
        VALUES ($1, $2, $3, $4)
        RETURNING id, firstname, lastname, email, created_at
        `,
        [
            firstname.trim(),
            lastname.trim(),
            normalizedEmail,
            passwordHash
        ]
    );


    return res.status(201).json({
        success: true,
        requiresVerification: false,
        user: newUser.rows[0],
        message: "Account created (development mode)."
    });
    }

    // 7. Store pending signup in Redis
    const verificationKey = `signup:verification:${normalizedEmail}`;

    await client.hSet(verificationKey, {
      firstname: firstname.trim(),
      lastname: lastname.trim(),
      email: normalizedEmail,
      passwordHash,
      code: verificationCode
    });

    // Verification expires after 10 minutes
    await client.expire(verificationKey, 120);

    // 8. Send verification email
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: normalizedEmail,
      subject: "Verify your Unstuck account",
      text:
        `Your Unstuck verification code is: ${verificationCode}\n\n` +
        `This code expires in 120 seconds.\n\n` +
        `If you did not request this code, you can ignore this email.`
    });

    if (error) {
      console.error("Verification email error:", error);

      // Don't leave unusable pending signup data
      await client.del(verificationKey);

      return res.status(500).json({
        message: "Unable to send verification email"
      });
    }

    // IMPORTANT: account does NOT exist yet.
    return res.status(200).json({
      success: true,
      requiresVerification: true,
      email: normalizedEmail,
      message: "Verification code sent to your Ontario Tech email."
    });

  } catch (error) {
    console.error("Error starting signup:", error);

    return res.status(500).json({
      message: "Internal server error"
    });
  }
});

// ---------------------- RESEND EMAIL VERIFICATION CODE ----------------------

app.post("/signup/resend", async (req, res) => {
  try {
    const { email } = req.body;

    // 1. Email is required
    if (!email) {
      return res.status(400).json({
        message: "Email is required."
      });
    }

    // 2. Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // 3. Validate Ontario Tech domain again on backend
    const emailParts = normalizedEmail.split("@");

    if (emailParts.length !== 2) {
      return res.status(400).json({
        message: "Please enter a valid email address."
      });
    }

    const emailDomain = emailParts[1];

    if (!ALLOWED_EMAIL_DOMAINS.includes(emailDomain)) {
      return res.status(403).json({
        message:
          "Only Ontario Tech affiliated email addresses can create an Unstuck account."
      });
    }

    // 4. Find the existing pending signup
    const verificationKey =
      `signup:verification:${normalizedEmail}`;

    const pendingSignup =
      await client.hGetAll(verificationKey);

    if (
      !pendingSignup ||
      Object.keys(pendingSignup).length === 0
    ) {
      return res.status(400).json({
        message:
          "Verification session expired. Please return to signup and try again."
      });
    }

    // 5. Check backend resend cooldown
    const cooldownKey =
      `signup:resend:${normalizedEmail}`;

    const cooldownExists =
      await client.exists(cooldownKey);

    if (cooldownExists) {
      const secondsRemaining =
        await client.ttl(cooldownKey);

      return res.status(429).json({
        message:
          `Please wait ${secondsRemaining} seconds before requesting another code.`,
        retryAfter: secondsRemaining
      });
    }

    // 6. Generate a NEW cryptographically secure 6-digit code
    const verificationCode =
      crypto.randomInt(100000, 1000000).toString();

    // 7. Replace the old code
    await client.hSet(verificationKey, {
      code: verificationCode
    });

    // Give the NEW code another 10 minutes
    await client.expire(verificationKey, 120);

    // 8. Send the new verification email
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: normalizedEmail,
      subject: "Your new Unstuck verification code",
      text:
        `Your new Unstuck verification code is: ${verificationCode}\n\n` +
        `This code expires in 120 seconds.\n\n` +
        `If you did not request this code, you can ignore this email.`
    });

    if (error) {
      console.error(
        "Resend verification email error:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to resend verification email."
      });
    }

    // 9. Start cooldown ONLY after email successfully sends
    await client.set(
      cooldownKey,
      "1",
      {
        EX: 60
      }
    );

    return res.status(200).json({
      success: true,
      message:
        "A new verification code was sent to your Ontario Tech email.",
      cooldown: 60
    });

  } catch (error) {
    console.error(
      "Resend verification error:",
      error
    );

    return res.status(500).json({
      message:
        "Internal server error"
    });
  }
});

app.post("/signup/verify", async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        message: "Email and verification code are required"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const verificationKey =
      `signup:verification:${normalizedEmail}`;

    const attemptKey =
      `signup:verify-attempts:${normalizedEmail}`;


    // --------------------------------------------------
    // 1. CHECK WHETHER THIS EMAIL IS RATE LIMITED
    // --------------------------------------------------

    const existingAttempts = Number(
      (await client.get(attemptKey)) || 0
    );

    if (existingAttempts >= MAX_VERIFY_ATTEMPTS) {

      const retryAfter = await client.ttl(attemptKey);

      return res.status(429).json({
        message:
          `Too many incorrect verification attempts. Please wait ${retryAfter} seconds and try again.`,
        retryAfter
      });
    }


    // --------------------------------------------------
    // 2. RETRIEVE PENDING SIGNUP
    // --------------------------------------------------

    const pendingSignup =
      await client.hGetAll(verificationKey);

    if (
      !pendingSignup ||
      Object.keys(pendingSignup).length === 0
    ) {
      return res.status(400).json({
        message:
          "Verification code has expired or no pending signup was found."
      });
    }


    // --------------------------------------------------
    // 3. VERIFY CODE
    // --------------------------------------------------

    if (String(code).trim() !== pendingSignup.code) {

      // Atomically increment failed attempts
      const attempts =
        await client.incr(attemptKey);

      // Only establish expiration when counter is first created
      if (attempts === 1) {
        await client.expire(
          attemptKey,
          VERIFY_ATTEMPT_WINDOW_SECONDS
        );
      }

      const attemptsRemaining =
        Math.max(0, MAX_VERIFY_ATTEMPTS - attempts);

      // User has now reached the limit
      if (attempts >= MAX_VERIFY_ATTEMPTS) {

        const retryAfter =
          await client.ttl(attemptKey);

        return res.status(429).json({
          message:
            `Too many incorrect verification attempts. Please wait ${retryAfter} seconds and try again.`,
          attemptsRemaining: 0,
          retryAfter
        });
      }

      return res.status(401).json({
        message:
          `Incorrect verification code. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? "" : "s"} remaining.`,
        attemptsRemaining
      });
    }


    // --------------------------------------------------
    // 4. CORRECT CODE — CLEAR FAILED ATTEMPTS
    // --------------------------------------------------

    await client.del(attemptKey);


    // --------------------------------------------------
    // 5. CHECK AGAIN FOR DUPLICATE ACCOUNT
    // --------------------------------------------------

    const existingUser = await db.query(
      "SELECT id FROM users WHERE LOWER(email) = $1",
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {

      await client.del(verificationKey);

      return res.status(409).json({
        message: "This account already exists."
      });
    }


    // --------------------------------------------------
    // 6. CREATE VERIFIED ACCOUNT
    // --------------------------------------------------

    const newUser = await db.query(
      `INSERT INTO users(firstname, lastname, email, password)
       VALUES ($1, $2, $3, $4)
       RETURNING id, firstname, lastname, email, created_at`,
      [
        pendingSignup.firstname,
        pendingSignup.lastname,
        pendingSignup.email,
        pendingSignup.passwordHash
      ]
    );


    // --------------------------------------------------
    // 7. CLEAN UP REDIS
    // --------------------------------------------------

    await Promise.all([
      client.del(verificationKey),
      client.del(attemptKey)
    ]);


    return res.status(201).json({
      success: true,
      message:
        "Email verified. Account created successfully.",
      user: newUser.rows[0]
    });

  } catch (error) {

    console.error(
      "Signup verification error:",
      error
    );

    return res.status(500).json({
      message: "Internal server error"
    });
  }
});

// ---------------------- FORGOT PASSWORD ----------------------

app.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    // --------------------------------------------------
    // 1. EMAIL IS REQUIRED
    // --------------------------------------------------

    if (!email) {
      return res.status(400).json({
        message: "Email is required."
      });
    }


    // --------------------------------------------------
    // 2. NORMALIZE EMAIL
    // --------------------------------------------------

    const normalizedEmail = email.trim().toLowerCase();


    // --------------------------------------------------
    // 3. VALIDATE ONTARIO TECH EMAIL
    // --------------------------------------------------

    const emailParts = normalizedEmail.split("@");

    if (emailParts.length !== 2) {
      return res.status(400).json({
        message: "Please enter a valid email address."
      });
    }

    const emailDomain = emailParts[1];

    if (!ALLOWED_EMAIL_DOMAINS.includes(emailDomain)) {
      return res.status(403).json({
        message:
          "Please use your Ontario Tech email address."
      });
    }


    // --------------------------------------------------
    // 4. CHECK WHETHER ACCOUNT EXISTS
    // --------------------------------------------------

    const userResult = await db.query(
      "SELECT id, email FROM users WHERE LOWER(email) = $1",
      [normalizedEmail]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        message:
          "No Unstuck account was found with this email address."
      });
    }


    // --------------------------------------------------
    // 5. CHECK RESET-CODE COOLDOWN
    // --------------------------------------------------

    const cooldownKey =
      `password-reset:cooldown:${normalizedEmail}`;

    const cooldownExists =
      await client.exists(cooldownKey);

    if (cooldownExists) {
      const secondsRemaining =
        await client.ttl(cooldownKey);

      return res.status(429).json({
        message:
          `Please wait ${secondsRemaining} seconds before requesting another reset code.`,
        retryAfter: secondsRemaining
      });
    }


    // --------------------------------------------------
    // 6. GENERATE SECURE 6-DIGIT CODE
    // --------------------------------------------------

    const resetCode =
      crypto.randomInt(100000, 1000000).toString();


    // --------------------------------------------------
    // 7. STORE RESET SESSION IN REDIS
    // --------------------------------------------------

    const resetKey =
      `password-reset:verification:${normalizedEmail}`;

    await client.hSet(resetKey, {
      email: normalizedEmail,
      code: resetCode,
      verified: "false"
    });

    // Code expires after 120 seconds
    await client.expire(resetKey, 120);


    // --------------------------------------------------
    // 8. SEND RESET CODE THROUGH RESEND
    // --------------------------------------------------

    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: normalizedEmail,
      subject: "Reset your Unstuck password",

      text:
        `Your Unstuck password reset code is: ${resetCode}\n\n` +
        `This code expires in 120 seconds.\n\n` +
        `If you did not request a password reset, you can ignore this email.`
    });


    // --------------------------------------------------
    // 9. HANDLE EMAIL FAILURE
    // --------------------------------------------------

    if (error) {
      console.error(
        "Password reset email error:",
        error
      );

      // Remove unusable reset session
      await client.del(resetKey);

      return res.status(500).json({
        message:
          "Unable to send password reset email."
      });
    }


    // --------------------------------------------------
    // 10. START REQUEST COOLDOWN
    // --------------------------------------------------

    await client.set(
      cooldownKey,
      "1",
      {
        EX: 60
      }
    );


    // --------------------------------------------------
    // 11. SUCCESS
    // --------------------------------------------------

    return res.status(200).json({
      success: true,
      requiresVerification: true,
      email: normalizedEmail,
      message:
        "A password reset code was sent to your Ontario Tech email.",
      expiresIn: 120,
      cooldown: 60
    });


  } catch (error) {

    console.error(
      "Forgot password error:",
      error
    );

    return res.status(500).json({
      message: "Internal server error"
    });
  }
});

// ---------------------- VERIFY PASSWORD RESET CODE ----------------------

app.post("/forgot-password/verify", async (req, res) => {
  try {
    const { email, code } = req.body;


    // --------------------------------------------------
    // 1. VALIDATE REQUIRED FIELDS
    // --------------------------------------------------

    if (!email || !code) {
      return res.status(400).json({
        message:
          "Email and verification code are required."
      });
    }


    // --------------------------------------------------
    // 2. NORMALIZE EMAIL + CODE
    // --------------------------------------------------

    const normalizedEmail =
      email.trim().toLowerCase();

    const cleanCode =
      String(code).trim();


    // Code must be exactly 6 digits
    if (!/^\d{6}$/.test(cleanCode)) {
      return res.status(400).json({
        message:
          "Please enter a valid 6-digit verification code."
      });
    }


    // --------------------------------------------------
    // 3. REDIS KEYS
    // --------------------------------------------------

    const resetKey =
      `password-reset:verification:${normalizedEmail}`;

    const attemptKey =
      `password-reset:verify-attempts:${normalizedEmail}`;


    // --------------------------------------------------
    // 4. CHECK RATE LIMIT
    // --------------------------------------------------

    const existingAttempts =
      Number(
        (await client.get(attemptKey)) || 0
      );


    if (
      existingAttempts >=
      MAX_VERIFY_ATTEMPTS
    ) {

      const retryAfter =
        await client.ttl(attemptKey);


      return res.status(429).json({
        message:
          `Too many incorrect verification attempts. Please wait ${retryAfter} seconds and try again.`,

        retryAfter
      });
    }


    // --------------------------------------------------
    // 5. GET PASSWORD RESET SESSION
    // --------------------------------------------------

    const resetSession =
      await client.hGetAll(resetKey);


    if (
      !resetSession ||
      Object.keys(resetSession).length === 0
    ) {

      return res.status(400).json({
        message:
          "Password reset code has expired. Please request a new code."
      });
    }


    // --------------------------------------------------
    // 6. COMPARE VERIFICATION CODE
    // --------------------------------------------------

    if (cleanCode !== resetSession.code) {


      // Atomically increment failed attempts
      const attempts =
        await client.incr(attemptKey);


      // Start attempt-window expiration only
      // when the counter is first created
      if (attempts === 1) {

        await client.expire(
          attemptKey,
          VERIFY_ATTEMPT_WINDOW_SECONDS
        );
      }


      const attemptsRemaining =
        Math.max(
          0,
          MAX_VERIFY_ATTEMPTS - attempts
        );


      // ----------------------------------------------
      // ATTEMPT LIMIT REACHED
      // ----------------------------------------------

      if (
        attempts >=
        MAX_VERIFY_ATTEMPTS
      ) {

        const retryAfter =
          await client.ttl(attemptKey);


        return res.status(429).json({
          message:
            `Too many incorrect verification attempts. Please wait ${retryAfter} seconds and try again.`,

          attemptsRemaining: 0,

          retryAfter
        });
      }


      // ----------------------------------------------
      // WRONG CODE
      // ----------------------------------------------

      return res.status(401).json({
        message:
          `Incorrect verification code. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? "" : "s"} remaining.`,

        attemptsRemaining
      });
    }


    // --------------------------------------------------
    // 7. CORRECT CODE
    // --------------------------------------------------

    // Clear failed attempts
    await client.del(attemptKey);


    // --------------------------------------------------
    // 8. MARK RESET SESSION AS VERIFIED
    // --------------------------------------------------

    await client.hSet(
      resetKey,
      {
        verified: "true"
      }
    );


    // --------------------------------------------------
    // 9. EXTEND SESSION FOR PASSWORD ENTRY
    // --------------------------------------------------
    //
    // The verification code itself had a 2-minute
    // lifetime.
    //
    // Now that ownership has been verified, give the
    // student 5 minutes to enter their new password.

    await client.expire(
      resetKey,
      300
    );


    // --------------------------------------------------
    // 10. SUCCESS
    // --------------------------------------------------

    return res.status(200).json({
      success: true,

      verified: true,

      email: normalizedEmail,

      message:
        "Password reset code verified successfully."
    });


  } catch (error) {

    console.error(
      "Password reset verification error:",
      error
    );


    return res.status(500).json({
      message:
        "Internal server error"
    });
  }
});

// ---------------------- RESET PASSWORD ----------------------

app.post("/forgot-password/reset", async (req, res) => {
  try {
    const { email, password } = req.body;


    // --------------------------------------------------
    // 1. VALIDATE REQUIRED FIELDS
    // --------------------------------------------------

    if (!email || !password) {
      return res.status(400).json({
        message:
          "Email and new password are required."
      });
    }


    // --------------------------------------------------
    // 2. NORMALIZE EMAIL
    // --------------------------------------------------

    const normalizedEmail =
      email.trim().toLowerCase();


    // --------------------------------------------------
    // 3. VALIDATE PASSWORD
    // --------------------------------------------------

    if (password.length < 8) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters long."
      });
    }


    // --------------------------------------------------
    // 4. FIND VERIFIED RESET SESSION IN REDIS
    // --------------------------------------------------

    const resetKey =
      `password-reset:verification:${normalizedEmail}`;

    const resetSession =
      await client.hGetAll(resetKey);


    if (
      !resetSession ||
      Object.keys(resetSession).length === 0
    ) {
      return res.status(400).json({
        message:
          "Your password reset session has expired. Please start again."
      });
    }


    // --------------------------------------------------
    // 5. REQUIRE SUCCESSFUL EMAIL VERIFICATION
    // --------------------------------------------------

    if (resetSession.verified !== "true") {
      return res.status(403).json({
        message:
          "Password reset verification is required before changing your password."
      });
    }


    // --------------------------------------------------
    // 6. MAKE SURE RESET SESSION BELONGS TO EMAIL
    // --------------------------------------------------

    if (resetSession.email !== normalizedEmail) {
      return res.status(403).json({
        message:
          "Invalid password reset session."
      });
    }


    // --------------------------------------------------
    // 7. MAKE SURE USER STILL EXISTS
    // --------------------------------------------------

    const userResult = await db.query(
      "SELECT id FROM users WHERE LOWER(email) = $1",
      [normalizedEmail]
    );


    if (userResult.rows.length === 0) {

      // Session is useless if account no longer exists
      await client.del(resetKey);

      return res.status(404).json({
        message:
          "No Unstuck account was found with this email address."
      });
    }


    // --------------------------------------------------
    // 8. HASH NEW PASSWORD
    // --------------------------------------------------

    const passwordHash =
      await bcrypt.hash(password, 12);


    // --------------------------------------------------
    // 9. UPDATE PASSWORD IN POSTGRESQL
    // --------------------------------------------------

    await db.query(
      `UPDATE users
       SET password = $1
       WHERE LOWER(email) = $2`,
      [
        passwordHash,
        normalizedEmail
      ]
    );


    // --------------------------------------------------
    // 10. DELETE PASSWORD RESET DATA FROM REDIS
    // --------------------------------------------------

    const attemptKey =
      `password-reset:verify-attempts:${normalizedEmail}`;

    const cooldownKey =
      `password-reset:cooldown:${normalizedEmail}`;


    await Promise.all([
      client.del(resetKey),
      client.del(attemptKey),
      client.del(cooldownKey)
    ]);


    // --------------------------------------------------
    // 11. SUCCESS
    // --------------------------------------------------

    return res.status(200).json({
      success: true,
      message:
        "Your password has been reset successfully."
    });


  } catch (error) {

    console.error(
      "Password reset error:",
      error
    );


    return res.status(500).json({
      message:
        "Internal server error"
    });
  }
});
// Login route
app.post("/login", async (req, res) => {
    try {
       const { email, password } = req.body;

        const normalizedEmail = email?.trim().toLowerCase();

        if (!email || !password) {
            return res.status(400).json({ message: "Please provide both email and password" });
        }

        const userResult = await db.query(
            "SELECT id, firstname, lastname, email, password, created_at FROM users WHERE email = $1",
           [normalizedEmail]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const user = userResult.rows[0];

        const passwordMatches = await bcrypt.compare(
              password,
              user.password
            );

            if (!passwordMatches) {
              return res.status(401).json({
                message: "Invalid email or password"
              });
            }

        const { password: _, ...userWithoutPassword } = user;

        return res.status(200).json({
            message: "Login successful",
            user: userWithoutPassword
        });

    } catch (error) {
        console.error("Error during login", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});

// ---------------------- LOCATION ROUTES ----------------------

// Activate Availability (Adds user to Redis Spatial Index)
app.post("/api/location/activate", async (req, res) => {
  try {
    const { userId, lat, lng } = req.body;
    if (!userId || lat === undefined || lng === undefined) {
      return res.status(400).json({ message: "Missing userId or coordinates" });
    }

    await addUserToSpatialIndex({ id: userId, lat, lng });

// Mark helper as AVAILABLE so Keneca can dispatch requests to them
      await updateUserStatus(userId, {
        status: "AVAILABLE",
        postID: ""
      });

      console.log(
        `User ${userId} activated in spatial index at (${lat}, ${lng})`
      );

      return res.status(200).json({
        message: "Added to spatial index successfully"
      });
        } catch (error) {
          console.error("Error activating location:", error);
          return res.status(500).json({ message: "Failed to activate location" });
        }
      });

// Periodic Position Update
app.put("/api/location/update", async (req, res) => {
  try {
    const { userId, oldLat, oldLng, newLat, newLng } = req.body;

    const oldUser = { id: userId, lat: oldLat, lng: oldLng };
    const updatedUser = { id: userId, lat: newLat, lng: newLng };

    await moveUserLocation(oldUser, updatedUser);
    console.log(`User ${userId} position updated in spatial index`);
    return res.status(200).json({ message: "Spatial index updated" });
  } catch (error) {
    console.error("Error updating location:", error);
    return res.status(500).json({ message: "Failed to update location" });
  }
});

// Deactivate Availability (Removes user from Redis Spatial Index & releases active offers)
app.post("/api/location/deactivate", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: "Missing userId" });
    }

    const userIdStr = userId.toString();

    // 1. Fetch user's status to see if they hold an active request offer
    const currentStatus = await getUserStatus(userIdStr);
    const activePostId = currentStatus?.postID || currentStatus?.postId;

    if (activePostId) {
      const job = await getDispatchJob(activePostId);

      // If this user is the active pending candidate, kick the dispatch job back to SEARCHING
          if (
        job &&
        job.status === "PENDING_CANDIDATE" &&
        String(job.currentCandidateId) === userIdStr
      ) {
        console.log(`[Deactivate] Candidate ${userIdStr} deactivated location mid-offer. Revoking post ${activePostId}...`);
        
        await updateDispatchJob(activePostId, {
          status: "SEARCHING",
          currentCandidateId: "",
          sentAt: "",
          expiresAt: ""
        });
      }
    }

    // 2. Clear candidate status back to OFFLINE
    await updateUserStatus(userIdStr, {
      status: "OFFLINE",
      postID: ""
    });

    // 3. Remove user from Redis Spatial Index
    await removeUserFromSpatialIndex({ id: userIdStr });
    console.log(`User ${userIdStr} deactivated and removed from spatial index`);

    return res.status(200).json({ message: "Removed from spatial index and active offers revoked" });
  } catch (error) {
    console.error("Error deactivating location:", error);
    return res.status(500).json({ message: "Failed to deactivate location" });
  }
});

// ---------------------- REQUEST CONTENT MODERATION ----------------------

async function moderateHelpRequest(subject, description) {
  const textToCheck = `
Subject: ${subject || "General Course Help"}
Request: ${description || ""}
  `.trim();

  const response = await openai.moderations.create({
    model: "omni-moderation-latest",
    input: textToCheck,
  });

  const result = response.results[0];

  const flaggedCategories = Object.entries(result.categories)
    .filter(([_, flagged]) => flagged)
    .map(([category]) => category);

  console.log("[Moderation] Flagged:", result.flagged);
  console.log("[Moderation] Categories:", flaggedCategories);

  return {
    allowed: !result.flagged,
    categories: flaggedCategories,
  };
}

async function checkUnstuckPolicy(subject, description) {

  const response = await openai.responses.create({
    model: "gpt-5.4-mini",

    instructions: `
You are the request-policy classifier for Unstuck, an Ontario Tech
student-to-student support application.

Determine whether the student's request is appropriate for Unstuck.

ALLOW:
- academic help
- campus navigation or campus-related help
- study assistance
- course questions
- technical or programming help
- legitimate student-to-student support

REJECT:
- harassment or targeted insults
- sexual requests
- dating or hookup requests
- threats
- hate
- illegal activity
- buying or selling prohibited items
- spam or advertising
- nonsense or meaningless content
- requests unrelated to legitimate campus/student support

Rules:
- Casual profanity alone is not enough to reject a request.
- Judge the main purpose of the request.
- Informal student language is allowed.
- Poor grammar is not a reason to reject.
- A legitimate request for help should be allowed.
- If there is no meaningful campus/student-support purpose, reject it.
`,

    input: `
Subject: ${subject || "General Course Help"}
Request: ${description || ""}
`,

    text: {
      format: {
        type: "json_schema",
        name: "unstuck_policy_result",
        strict: true,

        schema: {
          type: "object",

          properties: {
            allowed: {
              type: "boolean"
            },

            category: {
              type: "string",
              enum: [
                "academic_help",
                "campus_help",
                "technical_help",
                "student_support",
                "harassment",
                "sexual_or_dating",
                "threat",
                "hate",
                "illegal_activity",
                "prohibited_sale",
                "spam",
                "nonsense",
                "unrelated"
              ]
            },

            reason: {
              type: "string"
            }
          },

          required: [
            "allowed",
            "category",
            "reason"
          ],

          additionalProperties: false
        }
      }
    }
  });

  return JSON.parse(response.output_text);
}



// ---------------------- DISPATCH & REQUEST ROUTES ----------------------

// Submit Help Request Endpoint
// ---------------------- SUBMIT HELP REQUEST ----------------------

app.post("/api/request/submit", async (req, res) => {
  try {
    const {
      userId,
      subject,
      description,
      lat,
      lng
    } = req.body;


    // ------------------------------------------
    // 1. VALIDATE REQUEST
    // ------------------------------------------

    if (
      !userId ||
      !description ||
      !description.trim() ||
      lat === undefined ||
      lng === undefined
    ) {
      return res.status(400).json({
        message: "Missing required request information."
      });
    }


    // ------------------------------------------
    // 2. CREATE POST ID + STARTING CELL
    // ------------------------------------------

    const postId =
      `post_${Date.now()}_${userId}`;

    const startingCell =
      userLocToCell({
        lat,
        lng
      });


    // ------------------------------------------
    // 3. CREATE REDIS JOB AS ANALYZING
    // ------------------------------------------

    await setDispatchJob(postId, {
      postId,
      userId: String(userId),
      subject:
        subject || "General Course Help",
      description:
        description.trim(),
      startingCell,
      status: "ANALYZING",
      currentRing: "0"
    });


    // ------------------------------------------
    // 4. RETURN TO FRONTEND IMMEDIATELY
    // ------------------------------------------
    //
    // searching.tsx can now open and display:
    //
    // "Analyzing Your Request..."
    //
    // while moderation runs below.

    res.status(200).json({
      success: true,
      postId,
      status: "ANALYZING"
    });


    // ==========================================
    // BACKGROUND CONTENT ANALYSIS
    // ==========================================

    try {

      console.log(
        `[Moderation] Analyzing request ${postId}...`
      );


      const moderation =
        await moderateHelpRequest(
          subject,
          description
        );


      // ----------------------------------------
      // 5A. REQUEST REJECTED
      // ----------------------------------------

      if (!moderation.allowed) {

        console.log(
          `[Moderation] Request ${postId} rejected.`,
          moderation.categories
        );


        await updateDispatchJob(postId, {
          status: "REJECTED",

          rejectionMessage:
            "Your request doesn't meet Unstuck's community guidelines. Please edit it and try again."
        });


        return;
      }

      // ----------------------------------------
// UNSTUCK-SPECIFIC POLICY CHECK
// ----------------------------------------

// we will comment out this part so when we pay for credits we will use it 

 console.log(
  `[Policy] Checking Unstuck policy for ${postId}...`
);

const policyResult = await checkUnstuckPolicy(
  subject,
  description
);

console.log(
  `[Policy] Allowed: ${policyResult.allowed}`
);

console.log(
  `[Policy] Category: ${policyResult.category}`
);

console.log(
  `[Policy] Reason: ${policyResult.reason}`
);


// ----------------------------------------
// REQUEST VIOLATES UNSTUCK POLICY
// ----------------------------------------

      if (!policyResult.allowed) {

        console.log(
          `[Policy] Request ${postId} rejected.`
        );

        await updateDispatchJob(postId, {
          status: "REJECTED",

          rejectionMessage:
            "Your request doesn't meet Unstuck's community guidelines. Please edit it and try again."
        });

        return;
      }

      

      // ----------------------------------------
// REQUEST APPROVED
// ----------------------------------------

          console.log(
            `[Moderation] Request ${postId} approved.`
          );

          // NEW: Tell Redis moderation passed
          await updateDispatchJob(postId, {
            status: "APPROVED"
          });

          // NEW: Keep this state visible briefly
          await new Promise((resolve) =>
            setTimeout(resolve, 1500)
          );

          // ----------------------------------------
          // NOW START NORMAL MATCHING
          // ----------------------------------------

          await updateUserStatus(userId, {
            status: "SEARCHING",
            postID: postId
          });

          await addUserToDispatchHistory(
            postId,
            userId
          );

          await removeUserFromSpatialIndex({
            id: userId
          }).catch((error) => {
            console.error(
              "Spatial removal error:",
              error
            );
          });

         // APPROVED -> SEARCHING
          // Allow cancellation for the first 5 seconds only.

          const cancelDeadline = Date.now() + 5000;

          await updateDispatchJob(postId, {
            status: "SEARCHING",
            cancelDeadline: String(cancelDeadline)
          });

          console.log(
            `[Dispatch] Starting matching for ${postId}...`
          );

          dispatchPost({
            id: postId,
            startingCell,
            userId,
            current_Ring: 0
          }).catch((error) => {
            console.error(
              "Dispatch background error:",
              error
            );
          });


      // ----------------------------------------
      // 5B. REQUEST APPROVED
      // ----------------------------------------

      




    } catch (moderationError) {

      // ----------------------------------------
      // MODERATION SERVICE FAILED
      // ----------------------------------------
      //
      // Fail closed:
      // Do NOT send unchecked content to helpers.

      console.error(
        "Request moderation error:",
        moderationError
      );


      await updateDispatchJob(postId, {
        status: "REJECTED",

        rejectionMessage:
          "We couldn't analyze your request right now. Please try again."
      });

    }


  } catch (error) {

    console.error(
      "Submit request error:",
      error
    );


    return res.status(500).json({
      message: "Failed to submit request."
    });

  }
});

// Poll Helper Status & Incoming Request Details
app.get("/api/user/status", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: "Missing userId" });

    const statusData = await getUserStatus(userId);
    let postDetails = null;

    if (statusData && statusData.postID) {
      const job = await getDispatchJob(statusData.postID);
      if (job) {
        postDetails = {
          postId: statusData.postID,
          startingCell: job.startingCell,
          status: job.status,
          subject: job.subject || "General Course Help",
          description: job.description || "A student nearby requires course assistance!",
          expiresAt: job.expiresAt ? Number(job.expiresAt) : null,
        };
      }
    }

    return res.status(200).json({
      status: statusData?.status || "OFFLINE",
      postID: statusData?.postID || "",
      subject: postDetails?.subject || "Nearby Help Request",
      description: postDetails?.description || "A student nearby requires course assistance!",
      expiresAt: postDetails?.expiresAt || null,
      postDetails
    });
  } catch (error) {
    console.error("Error fetching user status:", error);
    return res.status(500).json({ message: "Failed to fetch status" });
  }
});

// Candidate Response Endpoint (Accept or Pass)
app.post("/api/request/respond", async (req, res) => {
  try {
    const { postId, candidateId, action } = req.body;

    if (!postId || !candidateId || !["ACCEPT", "PASS"].includes(action)) {
      return res.status(400).json({
        message: "Invalid response information."
      });
    }

    const job = await getDispatchJob(postId);

    if (
      !job ||
      job.status !== "PENDING_CANDIDATE" ||
      String(job.currentCandidateId) !== String(candidateId)
    ) {
      return res.status(409).json({
        message: "This offer is no longer active."
      });
    }

    if (job.expiresAt && Date.now() >= Number(job.expiresAt)) {
      return res.status(409).json({
        message: "This offer has expired."
      });
    }

    if (action === "PASS") {
      // Explicitly retain this candidate in dispatch history.
      await addUserToDispatchHistory(postId, candidateId);

      // Release the pending offer so requestManager can advance.
      await updateDispatchJob(postId, {
        status: "SEARCHING",
        currentCandidateId: "",
        sentAt: "",
        expiresAt: ""
      });

      const helperStatus = await getUserStatus(candidateId);

      if (String(helperStatus?.postID) === String(postId)) {
        await updateUserStatus(candidateId, {
          status: "AVAILABLE",
          postID: ""
        });
      }

      console.log(`[Dispatch] Helper ${candidateId} passed ${postId}`);

      return res.status(200).json({
        success: true,
        message: "Request passed."
      });
    }

    const matchedAt = Date.now();

await updateDispatchJob(postId, {
  status: "MATCHED",
  matchedUserId: String(candidateId),
  lastChatActivity: String(matchedAt)
});

scheduleChatInactivity(postId, matchedAt);

    console.log(`[Dispatch] Helper ${candidateId} accepted ${postId}`);

    return res.status(200).json({
      success: true,
      message: "Request accepted successfully."
    });

  } catch (error) {
    console.error("Error responding to request:", error);

    return res.status(500).json({
      message: "Failed to respond to request."
    });
  }
});
// Poll Search Progress (SearchingScreen.tsx)

app.get("/api/request/progress", async (req, res) => {
  try {
    const { postId } = req.query;

    if (!postId) {
      return res.status(400).json({ message: "Missing postId" });
    }

    const job = await getDispatchJob(postId);

    if (!job) {
      return res.status(404).json({
        message: "Dispatch job not found"
      });
    }

    // Get candidates evaluated so far
    let history = [];

    try {
      history = (await usersInDispatchHistory(postId)) || [];
    } catch (e) {
      history = [];
    }

    // Exclude the requester from evaluated helpers
    const evaluatedCandidatesOnly = history.filter(
      (candidateId) => String(candidateId) !== String(job.userId)
    );

    return res.status(200).json({
      status: job.status,

      // NEW: Cancellation deadline from Redis
      cancelDeadline: job.cancelDeadline
        ? Number(job.cancelDeadline)
        : null,

      currentRing: job.currentRing || "0",
      currentCandidateId: job.currentCandidateId || null,
      matchedUserId: job.matchedUserId || null,
      candidatesEvaluated: evaluatedCandidatesOnly.length,

      // Content moderation rejection reason
      message: job.rejectionMessage || null,
      startingCell: job.startingCell
    });

  } catch (error) {
    console.error("Error fetching dispatch progress:", error);

    return res.status(500).json({
      message: "Failed to fetch dispatch progress"
    });
  }
});

// Cancel Dispatch Request Endpoint

app.post("/api/request/cancel", async (req, res) => {
  try {
    const { postId } = req.body;

    if (!postId) {
      return res.status(400).json({
        message: "Missing postId"
      });
    }

    // 1. Retrieve the current dispatch job
    const job = await getDispatchJob(postId);

    if (!job) {
      return res.status(404).json({
        message: "Request not found."
      });
    }

    // 2. Only allow cancellation while SEARCHING
    if (job.status !== "SEARCHING") {
      return res.status(409).json({
        message: "Request cannot be cancelled in its current state."
      });
    }

    // 3. Check the 5-second cancellation deadline
    const deadline = Number(job.cancelDeadline);

    if (
      !job.cancelDeadline ||
      !Number.isFinite(deadline) ||
      Date.now() >= deadline
    ) {
      return res.status(403).json({
        message: "Cancellation window has expired. Matching will continue."
      });
    }

    // 4. Mark request as CANCELLED
    await updateDispatchJob(postId, {
      status: "CANCELLED"
    });

    // 5. Release helper if one was being contacted
    if (job.currentCandidateId) {
      const helperStatus = await getUserStatus(job.currentCandidateId);

      if (helperStatus?.postID === String(postId)) {
        await updateUserStatus(job.currentCandidateId, {
          status: "AVAILABLE",
          postID: ""
        });
      }
    }

    // 6. Reset requester status
    if (job.userId) {
      const requesterStatus = await getUserStatus(job.userId);

      if (requesterStatus?.postID === String(postId)) {
        await updateUserStatus(job.userId, {
          status: "OFFLINE",
          postID: ""
        });
      }
    }

    // 7. Delete cancelled Redis job after 2 seconds
    setTimeout(async () => {
      try {
        const latestJob = await getDispatchJob(postId);

        // Only delete if the job is still cancelled
        if (latestJob?.status === "CANCELLED") {
          await deleteDispatchJob(postId);
        }
      } catch (error) {
        console.error(
          "Failed to delete cancelled job:",
          error
        );
      }
    }, 2000);

    return res.status(200).json({
      success: true,
      message: "Request cancelled successfully."
    });

  } catch (error) {
    console.error("Error cancelling request:", error);

    return res.status(500).json({
      message: "Failed to cancel request"
    });
  }
});

// Quick Redis Debug Route
app.get("/api/debug/spatial", async (req, res) => {
  try {
    // Fetches all user status keys or spatial index keys
    const keys = await client.keys("*");
    const debugData = {};

    for (const key of keys) {
      const type = await client.type(key);
      if (type === "hash") {
        debugData[key] = await client.hGetAll(key);
      } else if (type === "set") {
        debugData[key] = await client.sMembers(key);
      } else if (type === "string") {
        debugData[key] = await client.get(key);
      }
    }

    return res.json(debugData);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------- CHAT ROUTES ----------------------


function clearChatInactivityTimer(postId) {
  const key = String(postId);
  const timer = activeChatTimers.get(key);

  if (timer) {
    clearTimeout(timer);
    activeChatTimers.delete(key);
  }
}

async function closeInactiveChat(postId, expectedActivity) {
  const job = await getDispatchJob(postId);

  if (!job || job.status !== "MATCHED") {
    clearChatInactivityTimer(postId);
    return;
  }

  // Check the latest activity recorded in Redis.
  const lastActivity = Number(job.lastChatActivity || 0);

  if (
    lastActivity !== expectedActivity ||
    Date.now() - lastActivity < CHAT_INACTIVITY_LIMIT
  ) {
    return;
  }

  // Mark the match closed before releasing its participants.
  await updateDispatchJob(postId, {
    status: "INACTIVE"
  });

  clearChatInactivityTimer(postId);

  if (job.matchedUserId) {
    const helperStatus = await getUserStatus(job.matchedUserId);

    if (String(helperStatus?.postID) === String(postId)) {
      await updateUserStatus(job.matchedUserId, {
        status: "AVAILABLE",
        postID: ""
      });
    }
  }

  if (job.userId) {
    const requesterStatus = await getUserStatus(job.userId);

    if (String(requesterStatus?.postID) === String(postId)) {
      await updateUserStatus(job.userId, {
        status: "OFFLINE",
        postID: ""
      });
    }
  }

  await deleteChatSession(postId);
  await removeUserFromDispatchHistory(postId);
  await deleteDispatchJob(postId);

  console.log(`[Chat] ${postId} closed after 5 minutes of inactivity.`);
}

function scheduleChatInactivity(postId, lastActivity) {
  const key = String(postId);

  clearChatInactivityTimer(key);

  const remaining = Math.max(
    0,
    CHAT_INACTIVITY_LIMIT - (Date.now() - lastActivity)
  );

  const timer = setTimeout(async () => {
    activeChatTimers.delete(key);

    try {
      await closeInactiveChat(key, lastActivity);
    } catch (error) {
      console.error("[Chat] Inactivity cleanup failed:", error);
    }
  }, remaining);

  activeChatTimers.set(key, timer);
}


// Get active chat session
app.get("/api/chat/session", async (req, res) => {
  try {
    const { postId, userId } = req.query;

    // ------------------------------------------
    // 1. VALIDATE REQUIRED PARAMETERS
    // ------------------------------------------

    if (!postId || !userId) {
      return res.status(400).json({
        message: "postId and userId are required."
      });
    }

    // ------------------------------------------
    // 2. GET MATCH FROM REDIS
    // ------------------------------------------

    const job = await getDispatchJob(postId);

    if (!job) {
      return res.status(404).json({
        message: "Chat session not found."
      });
    }

    // ------------------------------------------
    // 3. CHAT ONLY EXISTS AFTER A MATCH
    // ------------------------------------------

    if (job.status !== "MATCHED") {
      return res.status(409).json({
        message: "This request does not currently have an active match.",
        status: job.status
      });
    }

    // ------------------------------------------
    // 4. IDENTIFY BOTH USERS
    // ------------------------------------------

    // ------------------------------------------
// 4. IDENTIFY BOTH USERS
// ------------------------------------------

    if (!job.userId || !job.matchedUserId) {
      return res.status(409).json({
        message: "Match information is incomplete."
      });
    }

    const requesterId = String(job.userId);
    const helperId = String(job.matchedUserId);
    const currentUserId = String(userId);

    // ------------------------------------------
    // 5. MAKE SURE USER BELONGS TO THIS CHAT
    // ------------------------------------------

    let role;

    if (currentUserId === requesterId) {
      role = "REQUESTER";
    } else if (currentUserId === helperId) {
      role = "HELPER";
    } else {
      return res.status(403).json({
        message: "You are not a participant in this chat."
      });
    }

    // ------------------------------------------
// 6. GET OTHER PARTICIPANT'S NAME
// ------------------------------------------

const otherUserId =
  role === "REQUESTER"
    ? helperId
    : requesterId;

const otherUserResult = await db.query(
  `
    SELECT id, firstname, lastname
    FROM users
    WHERE id = $1
  `,
  [otherUserId]
);

if (otherUserResult.rows.length === 0) {
  return res.status(404).json({
    message: "The other chat participant could not be found."
  });
}

const otherUser = otherUserResult.rows[0];

    // ------------------------------------------
    // 6. RETURN CHAT SESSION
    // ------------------------------------------

    // ------------------------------------------
// CREATE TEMPORARY REDIS CHAT IF NEEDED
// ------------------------------------------

console.log(
  `[Chat] Creating chat session for post ${postId}: requester=${requesterId}, helper=${helperId}`
);

await createChatSession(
  postId,
  requesterId,
  helperId
);

console.log(
  `[Chat] Chat session ready for post ${postId}: requester=${requesterId}, helper=${helperId}`
);

      return res.status(200).json({
          success: true,

          session: {
            postId: String(postId),
            requesterId,
            helperId,
            role,
            status: job.status,

            otherUser: {
              id: String(otherUser.id),
              firstname: otherUser.firstname,
              lastname: otherUser.lastname
            }
          }
        });

  } catch (error) {
    console.error("[Chat] Failed to get chat session:", error);

    return res.status(500).json({
      message: "Failed to load chat session."
    });
  }
});

// Send a chat message
app.post("/api/chat/message", async (req, res) => {
  try {
    const { postId, userId, message } = req.body;

    // ------------------------------------------
    // 1. VALIDATE INPUT
    // ------------------------------------------

    if (!postId || !userId || !message?.trim()) {
      return res.status(400).json({
        message: "postId, userId and message are required."
      });
    }

    // ------------------------------------------
    // 2. VERIFY ACTIVE MATCH
    // ------------------------------------------

    const job = await getDispatchJob(postId);

    if (!job || job.status !== "MATCHED") {
      return res.status(409).json({
        message: "This chat is no longer active."
      });
    }

    if (!job.userId || !job.matchedUserId) {
      return res.status(409).json({
        message: "Match information is incomplete."
      });
    }

    const requesterId = String(job.userId);
    const helperId = String(job.matchedUserId);
    const senderId = String(userId);

    // ------------------------------------------
    // 3. VERIFY SENDER BELONGS TO CHAT
    // ------------------------------------------

    if (
      senderId !== requesterId &&
      senderId !== helperId
    ) {
      return res.status(403).json({
        message: "You are not a participant in this chat."
      });
    }

    // ------------------------------------------
    // 4. MAKE SURE REDIS CHAT EXISTS
    // ------------------------------------------

    await createChatSession(
      postId,
      requesterId,
      helperId
    );

    // ------------------------------------------
    // 5. STORE MESSAGE
    // ------------------------------------------

    const newMessage = await addChatMessage(
      postId,
      senderId,
      message.trim()
    );

    const lastActivity = Date.now();

await updateDispatchJob(postId, {
  lastChatActivity: String(lastActivity)
});

scheduleChatInactivity(postId, lastActivity);

    return res.status(201).json({
      success: true,
      message: newMessage
    });

  } catch (error) {
    console.error("[Chat] Failed to send message:", error);

    return res.status(500).json({
      message: "Failed to send message."
    });
  }
});

// Get all messages for an active chat
app.get("/api/chat/messages", async (req, res) => {
  try {
    const { postId, userId } = req.query;

    // ------------------------------------------
    // 1. VALIDATE INPUT
    // ------------------------------------------

    if (!postId || !userId) {
      return res.status(400).json({
        message: "postId and userId are required."
      });
    }

    // ------------------------------------------
    // 2. VERIFY ACTIVE MATCH
    // ------------------------------------------

    const job = await getDispatchJob(postId);

    if (!job || job.status !== "MATCHED") {
      return res.status(409).json({
        message: "This chat is no longer active."
      });
    }

    if (!job.userId || !job.matchedUserId) {
      return res.status(409).json({
        message: "Match information is incomplete."
      });
    }

    const requesterId = String(job.userId);
    const helperId = String(job.matchedUserId);
    const currentUserId = String(userId);

    // ------------------------------------------
    // 3. VERIFY USER BELONGS TO CHAT
    // ------------------------------------------

    if (
      currentUserId !== requesterId &&
      currentUserId !== helperId
    ) {
      return res.status(403).json({
        message: "You are not a participant in this chat."
      });
    }

    // ------------------------------------------
    // 4. GET MESSAGES FROM REDIS
    // ------------------------------------------

    const messages = await getChatMessages(postId);

    return res.status(200).json({
      success: true,
      messages
    });

  } catch (error) {
    console.error("[Chat] Failed to get messages:", error);

    return res.status(500).json({
      message: "Failed to load messages."
    });
  }
});

// Complete a matched help request
app.post("/api/chat/complete", async (req, res) => {
  try {
    const { postId, userId } = req.body;

    // ------------------------------------------
    // 1. VALIDATE INPUT
    // ------------------------------------------

    if (!postId || !userId) {
      return res.status(400).json({
        message: "postId and userId are required."
      });
    }

    // ------------------------------------------
    // 2. GET CURRENT DISPATCH JOB
    // ------------------------------------------

    const job = await getDispatchJob(postId);

    if (!job) {
      return res.status(404).json({
        message: "Request not found."
      });
    }

    // ------------------------------------------
    // 3. ONLY REQUESTER CAN COMPLETE REQUEST
    // ------------------------------------------

    if (String(job.userId) !== String(userId)) {
      return res.status(403).json({
        message: "Only the requester can complete this request."
      });
    }

    // ------------------------------------------
    // 4. REQUEST MUST CURRENTLY BE MATCHED
    // ------------------------------------------

    if (job.status !== "MATCHED") {
      return res.status(409).json({
        message: "This request is not currently matched."
      });
    }

    const helperId = job.matchedUserId;

    if (!helperId) {
      return res.status(409).json({
        message: "Matched helper information is missing."
      });
    }

    // ------------------------------------------
    // 5. MARK COMPLETION BEFORE CLEANUP
    // ------------------------------------------
    //
    // This prevents another completion request from
    // passing the MATCHED check while cleanup occurs.

    await updateDispatchJob(postId, {
      status: "COMPLETING"
    });

    clearChatInactivityTimer(postId);

    // ------------------------------------------
    // 6. GIVE HELPER CREDIT IN POSTGRESQL
    // ------------------------------------------

    await db.query(
      `
        UPDATE users
        SET people_helped = people_helped + 1
        WHERE id = $1
      `,
      [helperId]
    );

    // ------------------------------------------
    // 7. RELEASE HELPER
    // ------------------------------------------

    await updateUserStatus(helperId, {
      status: "AVAILABLE",
      postID: ""
    });

    // ------------------------------------------
    // 8. DELETE TEMPORARY CHAT
    // ------------------------------------------

    await deleteChatSession(postId);

    console.log(
  `[Chat] Old chat deleted for redispatch: ${postId}`
);

    // ------------------------------------------
    // 9. CLEAN DISPATCH HISTORY
    // ------------------------------------------

    await removeUserFromDispatchHistory(postId);

    // ------------------------------------------
    // 10. DELETE FINISHED DISPATCH JOB
    // ------------------------------------------

    await deleteDispatchJob(postId);

    console.log(
      `[Chat] Request ${postId} resolved successfully by helper ${helperId}`
    );

    return res.status(200).json({
      success: true,
      message: "Request completed successfully."
    });

  } catch (error) {
    console.error(
      "[Chat] Failed to complete request:",
      error
    );

    return res.status(500).json({
      message: "Failed to complete request."
    });
  }
});

// Redispatch a matched request when the requester says
// their issue was NOT resolved
app.post("/api/chat/redispatch", async (req, res) => {
  try {
    const { postId, userId } = req.body;

    // ------------------------------------------
    // 1. VALIDATE INPUT
    // ------------------------------------------

    if (!postId || !userId) {
      return res.status(400).json({
        message: "postId and userId are required."
      });
    }

    // ------------------------------------------
    // 2. GET CURRENT DISPATCH JOB
    // ------------------------------------------

    const job = await getDispatchJob(postId);

    if (!job) {
      return res.status(404).json({
        message: "Request not found."
      });
    }

    // ------------------------------------------
    // 3. ONLY REQUESTER CAN REDISPATCH
    // ------------------------------------------

    if (String(job.userId) !== String(userId)) {
      return res.status(403).json({
        message: "Only the requester can find another helper."
      });
    }

    // ------------------------------------------
    // 4. REQUEST MUST CURRENTLY BE MATCHED
    // ------------------------------------------

    if (job.status !== "MATCHED") {
      return res.status(409).json({
        message: "This request is not currently matched."
      });
    }

    const oldHelperId = job.matchedUserId;

    if (!oldHelperId) {
      return res.status(409).json({
        message: "Matched helper information is missing."
      });
    }

    // ------------------------------------------
    // 5. TEMPORARILY LOCK REDISPATCH
    // ------------------------------------------

    await updateDispatchJob(postId, {
      status: "REDISPATCHING"
    });

    clearChatInactivityTimer(postId);

    // ------------------------------------------
    // 6. RELEASE OLD HELPER
    // ------------------------------------------

    await updateUserStatus(oldHelperId, {
      status: "AVAILABLE",
      postID: ""
    });

    // ------------------------------------------
    // 7. DELETE OLD CHAT
    // ------------------------------------------

    await deleteChatSession(postId);

    // IMPORTANT:
    // DO NOT remove dispatch history.
    //
    // The old helper should remain in history so Keneca
    // will not immediately send the same request to them.

    // ------------------------------------------
    // 8. RESET DISPATCH STATE
    // ------------------------------------------

    await updateDispatchJob(postId, {
      status: "SEARCHING",
      currentCandidateId: "",
      matchedUserId: "",
      sentAt: "",
      expiresAt: ""
    });

    // ------------------------------------------
    // 9. REBUILD POST OBJECT FOR KENECA
    // ------------------------------------------

    const redispatchPost = {
      id: postId,
      userId: job.userId,
      subject: job.subject || "General Course Help",
      description: job.description || "",
      startingCell: job.startingCell,

      // Continue from the ring we already reached.
      current_Ring: Number(job.currentRing || 0)
    };

    console.log(
      `[Chat] Redispatching request ${postId}. Previous helper: ${oldHelperId}`
    );

    // ------------------------------------------
    // 10. RESPOND TO FRONTEND IMMEDIATELY
    // ------------------------------------------

    res.status(200).json({
      success: true,
      postId,
      message: "Searching for another helper."
    });

    // ------------------------------------------
    // 11. CONTINUE KENECA SEARCH
    // ------------------------------------------

    dispatchPost(redispatchPost).catch((error) => {
      console.error(
        `[Chat] Redispatch failed for request ${postId}:`,
        error
      );
    });

  } catch (error) {
    console.error("[Chat] Failed to redispatch request:", error);

    return res.status(500).json({
      message: "Failed to search for another helper."
    });
  }
});

// ---------------------- USER PROFILE ROUTE ----------------------

app.get("/api/user/profile", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        message: "userId is required."
      });
    }

    const result = await db.query(
      `
        SELECT
          id,
          firstname,
          lastname,
          email,
          people_helped,
          created_at
        FROM users
        WHERE id = $1
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    return res.status(200).json(result.rows[0]);

  } catch (error) {
    console.error("[Profile] Failed to load user profile:", error);

    return res.status(500).json({
      message: "Failed to load user profile."
    });
  }
});



// Server Startup Routine
async function startServer() {
    try {
        if (!client.isOpen) {
            await client.connect();
        }
        console.log("Redis is fully ready!");

        app.listen(PORT, () => {
            console.log(`Our OT support app is running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
    }
}

startServer();