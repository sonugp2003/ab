
'use server';

/**
 * @fileOverview A Genkit flow for generating personalized rent reminder emails.
 *
 * This file exports a function `generateReminder` that uses a model to
 * create a friendly, polite, and slightly varied reminder email to a tenant
 * about their outstanding rent.
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';
import { generate } from 'genkit/generate';

// Define the input schema for the reminder flow.
// This ensures that any call to the flow provides the necessary data.
const ReminderInputSchema = z.object({
  tenantName: z.string().describe("The first name of the tenant."),
  ownerName: z.string().describe("The name of the room owner/landlord."),
  rentAmount: z.number().describe("The outstanding rent amount."),
  dueDate: z.string().describe("A description of the due date, e.g., 'for this month' or 'on the 1st'."),
});
export type ReminderInput = z.infer<typeof ReminderInputSchema>;

// Define the output schema for the reminder flow.
// This structures the model's response into a predictable format.
const ReminderOutputSchema = z.object({
  subject: z.string().describe("A short, friendly subject line for the email."),
  body: z.string().describe("The full, single-paragraph body of the email. It should be polite, concise, and professional."),
});
export type ReminderOutput = z.infer<typeof ReminderOutputSchema>;


// Define the prompt. This is where we instruct the model on its task,
// personality, and the format of its output.
const reminderPrompt = ai.definePrompt({
    name: 'reminderPrompt',
    model: googleAI.model('gemini-2.0-flash'),
    input: { schema: ReminderInputSchema },
    output: { schema: ReminderOutputSchema },
    prompt: `
        You are an assistant for a room owner named {{{ownerName}}}.
        Your task is to write a polite and friendly rent reminder email to a tenant named {{{tenantName}}}.

        The outstanding rent is {{rentAmount}} INR due {{{dueDate}}}.

        Keep the tone professional but approachable. The email should be a single, concise paragraph.
        Slightly vary the wording each time to avoid sounding robotic.

        Generate a suitable subject line and the email body.
    `,
});


// Define the main flow function that will be executed.
const generateReminderFlow = ai.defineFlow(
  {
    name: 'generateReminderFlow',
    inputSchema: ReminderInputSchema,
    outputSchema: ReminderOutputSchema,
  },
  async (input) => {
    // Call the model with the defined prompt and the input data.
    const { output } = await reminderPrompt(input);
    
    // The prompt is configured to return the output in the format of ReminderOutputSchema.
    // We return the structured output. '!' asserts that output is not null.
    return output!;
  }
);


/**
 * An exported wrapper function that makes the Genkit flow easily callable
 * from other parts of the application (e.g., server actions or pages).
 *
 * @param input - The data required to generate the reminder.
 * @returns A promise that resolves to the generated email subject and body.
 */
export async function generateReminder(input: ReminderInput): Promise<ReminderOutput> {
  return generateReminderFlow(input);
}
