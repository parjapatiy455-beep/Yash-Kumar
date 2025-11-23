
import { GoogleGenAI } from "@google/genai";
import { db } from '../firebase';
import { ref, get } from 'firebase/database';

// Helper to fetch keys from Firebase
const getApiKeys = async (): Promise<string[]> => {
    try {
        const settingsRef = ref(db, 'settings/gemini/apiKeys');
        const snapshot = await get(settingsRef);
        if (snapshot.exists()) {
            // Database stores as array or object, ensure array
            const data = snapshot.val();
            return Array.isArray(data) ? data : Object.values(data);
        }
        return [];
    } catch (error) {
        console.error("Failed to fetch API keys:", error);
        return [];
    }
};

// Randomly select a key for load balancing
const getRandomKey = (keys: string[]): string | null => {
    if (!keys || keys.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * keys.length);
    return keys[randomIndex];
};

interface AIContext {
    courseName?: string;
    subjectName?: string;
    chapterName?: string;
    lectureTitle?: string;
}

export const askGeminiTutor = async (userPrompt: string, context: AIContext): Promise<string> => {
    const keys = await getApiKeys();
    const apiKey = getRandomKey(keys);

    if (!apiKey) {
        return "AI Tutor is currently unavailable (No API Key Configured). Please contact support.";
    }

    try {
        const ai = new GoogleGenAI({ apiKey });
        
        const systemPrompt = `You are a friendly and expert academic tutor on the VedPath platform.
        
        Current Learning Context:
        - Course: ${context.courseName || 'General'}
        - Subject: ${context.subjectName || 'General'}
        - Chapter: ${context.chapterName || 'General'}
        - Lecture Video: ${context.lectureTitle || 'General'}

        Your Goal: Answer the student's question concisely and accurately based on the likely content of this lecture. 
        Use simple language, bullet points for clarity, and encouraging tone.
        If the question is unrelated to studies, politely guide them back to the topic.
        Format your response in clean plain text or simple structure.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                { role: 'user', parts: [{ text: systemPrompt + "\n\nStudent Question: " + userPrompt }] }
            ],
             config: {
                temperature: 0.7,
                maxOutputTokens: 500,
            }
        });

        return response.text || "I couldn't generate a response. Please try again.";

    } catch (error) {
        console.error("Gemini API Error:", error);
        return "Sorry, I encountered an error while thinking. Please try asking again.";
    }
};
