import { client } from "./redisClient.js";
import crypto from "node:crypto";

// Active chats are temporary.
// This TTL prevents abandoned chat data from living forever.
const CHAT_TTL_SECONDS = 60 * 60; // 1 hour

// ------------------------------------------
// CREATE / INITIALIZE CHAT
// ------------------------------------------

async function createChatSession(postId, requesterId, helperId) {
  const key = `chat:${postId}`;

  const existing = await client.exists(key);

  // Don't wipe an existing conversation if this is called twice.
  if (!existing) {
    await client.hSet(key, {
      postId: String(postId),
      requesterId: String(requesterId),
      helperId: String(helperId),
      status: "ACTIVE",
      createdAt: Date.now().toString(),
      lastActivityAt: Date.now().toString()
    });
  }

  await client.expire(key, CHAT_TTL_SECONDS);
}


// ------------------------------------------
// GET CHAT SESSION
// ------------------------------------------

async function getChatSession(postId) {
  const key = `chat:${postId}`;

  const chat = await client.hGetAll(key);

  if (!chat || Object.keys(chat).length === 0) {
    return null;
  }

  return chat;
}


// ------------------------------------------
// ADD MESSAGE
// ------------------------------------------


async function addChatMessage(postId, senderId, message, attachment = null) {
  const messagesKey = `chat:${postId}:messages`;
  const chatKey = `chat:${postId}`;

  const chat = await getChatSession(postId);

  if (!chat) {
    throw new Error("Chat session does not exist.");
  }

  const hasText = typeof message === "string" && message.trim().length > 0;

  if (!hasText && !attachment) {
    throw new Error("A message or attachment is required.");
  }

  const now = Date.now();

  const chatMessage = {
    id: crypto.randomUUID(),
    senderId: String(senderId),
    type: attachment ? "file" : "text",
    message: hasText ? message.trim() : "",
    ...(attachment ? { attachment } : {}),
    sentAt: now
  };

  await client.rPush(messagesKey, JSON.stringify(chatMessage));

  await client.hSet(chatKey, {
    lastActivityAt: String(now)
  });

  await client.expire(chatKey, CHAT_TTL_SECONDS);
  await client.expire(messagesKey, CHAT_TTL_SECONDS);

  return chatMessage;
}


// ------------------------------------------
// GET MESSAGES
// ------------------------------------------

async function getChatMessages(postId) {
  const messagesKey = `chat:${postId}:messages`;

  const messages = await client.lRange(
    messagesKey,
    0,
    -1
  );

  return messages.map((message) => {
    try {
      return JSON.parse(message);
    } catch {
      return null;
    }
  }).filter(Boolean);
}


// ------------------------------------------
// DELETE CHAT
// ------------------------------------------

// ------------------------------------------
// DELETE CHAT
// ------------------------------------------

async function deleteChatSession(postId) {
  const chatKey = `chat:${postId}`;
  const messagesKey = `chat:${postId}:messages`;

  console.log("[ChatState] DELETING:", chatKey, messagesKey);

  const beforeChat = await client.exists(chatKey);
  const beforeMessages = await client.exists(messagesKey);

  console.log("[ChatState] BEFORE DELETE:", {
    chat: beforeChat,
    messages: beforeMessages
  });

  // Delete them separately
  const deletedChat = await client.del(chatKey);
  const deletedMessages = await client.del(messagesKey);

  console.log("[ChatState] DELETE RESULTS:", {
    chat: deletedChat,
    messages: deletedMessages
  });

  const afterChat = await client.exists(chatKey);
  const afterMessages = await client.exists(messagesKey);

  console.log("[ChatState] AFTER DELETE:", {
    chat: afterChat,
    messages: afterMessages
  });
}


export {
  createChatSession,
  getChatSession,
  addChatMessage,
  getChatMessages,
  deleteChatSession
};