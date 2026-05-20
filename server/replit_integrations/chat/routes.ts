import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import { chatStorage } from "./storage";
import { storage } from "../../storage";

export const openai = new OpenAI({
  apiKey: "replit",
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://api.openai.com/v1",
});

export function registerChatRoutes(app: Express): void {
  // Get all conversations
  app.get("/api/conversations", async (req: Request, res: Response) => {
    try {
      const conversations = await chatStorage.getAllConversations();
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Get single conversation with messages
  app.get("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const conversation = await chatStorage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const messages = await chatStorage.getMessagesByConversation(id);
      res.json({ ...conversation, messages });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  // Create new conversation
  app.post("/api/conversations", async (req: Request, res: Response) => {
    try {
      const { title } = req.body;
      const conversation = await chatStorage.createConversation(title || "New Chat");
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  // Delete conversation
  app.delete("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await chatStorage.deleteConversation(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  // Send message and get AI response (streaming)
  app.post("/api/conversations/:id/messages", async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { content, imageUrl } = req.body;

      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Freemium check: 5 messages per day for free users
      const FREE_LIMIT = 5;
      const isPremium = user.subscriptionStatus === "premium";
      
      // Reset count if it's a new day
      const lastReset = user.lastResetDate ? new Date(user.lastResetDate) : new Date(0);
      const now = new Date();
      if (lastReset.toDateString() !== now.toDateString()) {
        await storage.resetChatCount(userId);
        user.chatMessagesCount = 0;
      }

      if (!isPremium && (user.chatMessagesCount || 0) >= FREE_LIMIT) {
        return res.status(403).json({ 
          error: "Limit reached", 
          message: "Vous avez atteint la limite quotidienne de 5 messages. Passez à la version Premium pour un accès illimité !" 
        });
      }

      // Save user message (content can be text or include image description)
      await chatStorage.createMessage(conversationId, "user", content);
      await storage.incrementChatCount(userId);

      // Automatically update title if it's a new conversation
      const conversation = await chatStorage.getConversation(conversationId);
      if (conversation && (conversation.title === "New Chat" || conversation.title === "New Consultation")) {
        const newTitle = content.slice(0, 30) + (content.length > 30 ? "..." : "");
        await chatStorage.updateConversationTitle(conversationId, newTitle);
      }

      // Get conversation history for context
      const messages = await chatStorage.getMessagesByConversation(conversationId);
      const chatMessages: any[] = messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      // If there's an image, we use GPT-4o-mini which supports vision
      if (imageUrl) {
        // Replace the last message content with the multimodal structure
        const lastMsg = chatMessages[chatMessages.length - 1];
        lastMsg.content = [
          { type: "text", text: content || "What is in this image?" },
          { type: "image_url", image_url: { url: imageUrl } }
        ];
      }

      // Set up SSE
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // Stream response from OpenAI
      const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: chatMessages,
        stream: true,
        max_completion_tokens: 2048,
      });

      let fullResponse = "";

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      // Save assistant message
      await chatStorage.createMessage(conversationId, "assistant", fullResponse);

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error sending message:", error);
      // Check if headers already sent (SSE streaming started)
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to send message" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  });
}

