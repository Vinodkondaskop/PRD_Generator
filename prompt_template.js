/**
 * Prompt template and utility for PM Helper PRD generation.
 */

const MANDATORY_SECTIONS = [
    "Executive Summary",
    "Problem Statement",
    "User Personas",
    "Functional Requirements",
    "Non-Functional Requirements",
    "Edge Cases and Failure Scenarios",
    "Estimation Breakdown",
    "Compliance Considerations",
    "Open Questions"
];

const HEALTHCARE_KEYWORDS = [
    "ABHA", "ABDM", "HIMS", "PHI", "Consent",
    "Health records", "Patient", "EMR", "EHR",
    "Clinical", "Doctor", "Hospital", "Pharmacy"
];

/**
 * Checks if the input contains healthcare-related terms.
 */
function detectHealthcareContext(inputText) {
    const text = inputText.toLowerCase();
    return HEALTHCARE_KEYWORDS.some(keyword => text.includes(keyword.toLowerCase()));
}

/**
 * Constructs the system and user prompt for Ollama.
 */
function constructPrompt(featureName, businessObjective, description) {
    const isHealthcare = detectHealthcareContext(`${featureName} ${description} ${businessObjective}`);

    let prompt = `Act as a Senior HealthTech PM. Generate a structured PRD.
NO conversational filler. NO emojis. Use Markdown.

MANDATORY SECTIONS (Include these headers exactly):
${MANDATORY_SECTIONS.map((s, i) => `${i + 1}. ${s}`).join("\n")}

ESTIMATION RULES:
Breakdown task by: Backend, Frontend, Integration, QA.
Provide: Optimistic, Realistic, Pessimistic days + Risk drivers.

${isHealthcare ? `HEALTHCARE CONTEXT:
In 'Compliance Considerations', include: Consent flow, Audit trails, Encryption, Access control, and Data retention.` : ""}

INPUT:
Feature: ${featureName}
Objective: ${businessObjective || "Not provided"}
Description: ${description}

Generate PRD now.`;

    return prompt;
}

/**
 * Validates if the generated text contains all mandatory sections.
 */
function validatePRD(text) {
    const missing = MANDATORY_SECTIONS.filter(section => {
        const regex = new RegExp(`^#+.*${section}`, 'mi');
        return !regex.test(text);
    });
    return {
        isValid: missing.length === 0,
        missingSections: missing
    };
}

module.exports = {
    constructPrompt,
    validatePRD,
    MANDATORY_SECTIONS
};
