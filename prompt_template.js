/**
 * Prompt template and utility for AI PRD Workbench.
 * Implements Expert PM Assistant logic and Iterative Guided Chat.
 */

const MANDATORY_SECTIONS = [
    "Overview",
    "Objectives",
    "User Personas",
    "User Stories",
    "Functional Requirements",
    "Non-Functional Requirements",
    "Design Considerations",
    "Success Metrics",
    "Open Questions & Future Considerations"
];

const HEALTHCARE_KEYWORDS = [
    "ABHA", "ABDM", "HIMS", "PHI", "Consent",
    "Health records", "Patient", "EMR", "EHR",
    "Clinical", "Doctor", "Hospital", "Pharmacy"
];

function detectHealthcareContext(inputText) {
    const text = inputText.toLowerCase();
    return HEALTHCARE_KEYWORDS.some(keyword => text.includes(keyword.toLowerCase()));
}

/**
 * Constructs the prompt for the Iterative Guided Chat (Collaborator mode).
 * Implements the 12 rules for expert product requirements elicitation.
 */
function constructGuidedChatPrompt(chatHistory) {
    const systemPrompt = `ROLE:
You are an expert Product Manager assistant and requirements analyst. Act as a specialized agent focused solely on eliciting product requirements. Respond with the perspective of an expert in product requirements gathering.

GOAL:
Collaborate with the user to create a comprehensive draft PRD through an iterative, question-driven process.

PROCESS & KEY RULES:
1. Analyze the user's input step-by-step. Cross-reference all info to ensure coverage and identify contradictions.
2. Guide by asking specific, targeted questions (1-3 at a time). Use bullet points for clarity. Keep questions concise.
3. Anticipate follow-up questions needed for a comprehensive PRD.
4. If you make assumptions, state them explicitly and ask for validation.
5. Prompt for multiple perspectives (user types, edge cases).
6. Ask for quantification (metrics, numbers) for goals and success.
7. USER-CENTERED CHECK-IN: Regularly verify direction. Before shifting focus, briefly state your intended next step and explicitly ask for confirmation.
8. Do not write the full PRD yet until sufficient information is gathered and the user confirms.

DESIRED PRD STRUCTURE (Towards which we build):
* Introduction / Overview
* Goals / Objectives (SMART)
* Target Audience / User Personas
* User Stories / Use Cases
* Functional Requirements
* Non-Functional Requirements (Security, Performance, etc.)
* Design Considerations
* Success Metrics
* Open Questions

TONE: Professional, inquisitive, and helpful. Neutral guidance.`;

    return `${systemPrompt}\n\nCONVERSATION HISTORY:\n${chatHistory}\n\nYOUR RESPONSE:`;
}

/**
 * Constructs the final structured PRD prompt.
 */
function constructPrompt(data) {
    const { featureName, problemStatement, businessObjective, successMetrics, targetPersona, constraints } = data;
    const isHealthcare = detectHealthcareContext(`${featureName} ${problemStatement} ${businessObjective}`);

    let prompt = `Act as an Expert PM Assistant. Generate a professional, highly structured PRD.
NO conversational filler. Use Markdown.

SECTIONS TO INCLUDE:
1. Introduction / Overview
2. Goals / Objectives (SMART)
3. Target Audience / User Personas
4. User Stories (Table: ID, User Story, Priority)
5. Functional Requirements
6. Non-Functional Requirements (Performance, Security, Compliance)
7. Design Considerations
8. Success Metrics
9. Open Questions & Future Considerations

${isHealthcare ? `HEALTHCARE CONTEXT: Include ABHA/ABDM/PHI compliance details.` : ""}

INPUT CONTEXT:
Feature Name: ${featureName}
Problem Statement: ${problemStatement}
Business Objective: ${businessObjective}
Success Metrics: ${successMetrics}
Target Persona: ${targetPersona}
Constraints: ${constraints}

Generate the draft PRD now. Focus on logical clarity and implementation readiness.`;

    return prompt;
}

/**
 * Constructs a prompt to extract structured PRD fields from a raw brain dump.
 */
function constructBrainDumpParserPrompt(brainDump) {
    return `### TASK: EXTRACT JSON DATA FROM BRAIN DUMP ::: STRICTLY NO CONVERSATION ###
Extract the following fields from the raw text provided. 
If a field is unknown, use an empty string.

REQUIRED JSON FORMAT:
{
  "featureName": "string",
  "problemStatement": "string",
  "businessObjective": "string",
  "successMetrics": "string",
  "targetPersona": "string",
  "constraints": "string"
}

BRAIN DUMP TEXT:
"${brainDump}"

### RESPONSE (Valid JSON only):`;
}

module.exports = { constructPrompt, constructGuidedChatPrompt, constructBrainDumpParserPrompt };
