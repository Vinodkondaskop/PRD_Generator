/**
 * Prompt template and utility for PM Helper PRD generation.
 */

const MANDATORY_SECTIONS = [
    "Executive Summary",
    "Problem Statement",
    "User Personas",
    "Functional Requirements",
    "User Stories",
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
function constructPrompt(data) {
    const { featureName, problemStatement, businessObjective, successMetrics, targetPersona, constraints } = data;
    const isHealthcare = detectHealthcareContext(`${featureName} ${problemStatement} ${businessObjective}`);

    let prompt = `Act as a Senior HealthTech PM. Generate a professional, highly structured PRD.
NO conversational filler. NO emojis. Use Markdown.

MANDATORY SECTIONS (Include these headers exactly):
${MANDATORY_SECTIONS.map((s, i) => `${i + 1}. ${s}`).join("\n")}

FORMATTING RULES:
1. "User Stories" MUST be a Markdown table with columns: ID, User Story, Priority (e.g., P0-Critical, P1-High, P2-Medium).
2. "Estimation Breakdown" MUST be a Markdown table with Optimistic, Realistic, and Pessimistic days.

${isHealthcare ? `HEALTHCARE CONTEXT:
In 'Compliance Considerations', include: Consent flow, Audit trails, Encryption, Access control, and Data retention.` : ""}

INPUT CONTEXT:
Feature Name: ${featureName}
Problem Statement: ${problemStatement}
Business Objective: ${businessObjective}
Success Metrics: ${successMetrics}
Target Persona: ${targetPersona}
Constraints & Dependencies: ${constraints}

Generate PRD now. Focus on the core problem being solved.`;

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
