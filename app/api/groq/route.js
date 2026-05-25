import { jsonSuccess, jsonError } from "@/lib/api-response";
import {
  authenticateRequest,
  withErrorHandler,
} from "@/lib/error-handler";
import { ValidationError } from "@/lib/errors";
import {
  callGroq,
  validateGroqBody,
} from "@/lib/ai/groq";

export const dynamic = "force-dynamic";

import { checkRateLimit } from "@/lib/rateLimit";
import { detectInjection, sanitizeMessage, buildSecureMessages } from "@/utils/promptGuard";

const groqSchema = z.object({
  message: z.string().optional(),
  userMessage: z.string().optional(),
}).refine(
  (data) => {
    const message = data.message || data.userMessage;
    return message && message.trim().length > 0;
  },
  {
    message: "Message is required",
  }
).refine(
  (data) => {
    const message = data.message || data.userMessage;
    return message && message.trim().length <= 2000;
  },
  {
    message: "Message too long",
  }
);

export async function POST(request) {
  try {
    const decodedToken =
      await authenticateRequest(request);

    // Rate limiting
    const rateLimitResult = await checkRateLimit(decodedToken.uid);
    if (!rateLimitResult.allowed) {
      return jsonError(
        "Too many requests. Please try again later.",
        429
      );
    }

    // Parse body
    const body = await request.json();

    const validation = groqSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.issues?.[0]?.message || "Invalid request payload";
      throw new ValidationError(firstError);
    }

    const rawMessage =
      validation.data.message ||
      validation.data.userMessage;

    const trimmedMessage = rawMessage.trim();

    // Check for prompt injection
    const injectionCheck = detectInjection(trimmedMessage);
    if (injectionCheck.isInjection) {
      console.warn(`[nova-ai-safety] Injection blocked for user ${decodedToken.uid}: ${injectionCheck.matchedPattern}`);
      return jsonError("Safety check: System instructions override or prompt injection attempt detected.", 400);
    }

    // Sanitize user message
    const sanitizedMessage = sanitizeMessage(trimmedMessage);

    // API key
    const apiKey =
      process.env.GROQ_API_KEY;

    if (!apiKey) {
      throw new AppError(
        "Groq API key is not configured",
        500
      );
    }

    // Timeout setup
    const timeoutMs = parseInt(
      process.env.GROQ_TIMEOUT || "30000",
      10
    );

    const controller =
      new AbortController();

    const timeoutId = setTimeout(
      () => controller.abort(),
      timeoutMs
    );

    let response;

    try {
      response = await fetch(
        GROQ_API_URL,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type":
              "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: buildSecureMessages(
              sanitizedMessage,
              "You are Nova, the friendly AI assistant for Learnova - a Smart Student Engagement Ecosystem."
            ),
            max_tokens: 400,
            temperature: 0.7,
          }),
        }
      );
    } finally {
      clearTimeout(timeoutId);
    }

    // Handle API errors
    if (!response.ok) {
      const errorData =
        await response
          .json()
          .catch(() => ({}));

      return jsonError(
        errorData?.error?.message ||
          "Groq API request failed",
        response.status
      );
    }

    // Parse response
    const data = await response.json();

    const content =
      data?.choices?.[0]?.message
        ?.content;

    if (!content) {
      return jsonError(
        "AI generated an empty response",
        502
      );
    }
    return jsonSuccess({
      message: content,
    });
  } catch (err) {
    return jsonError(err?.message || "Server error", 500);
  }
}
