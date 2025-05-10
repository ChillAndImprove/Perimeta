// src/colors.ts

// --- Base Color Constants ---
export const Red = "#CC0000";
export const Amber = "#AF780E";
export const Green = "#008000";
export const Blue = "#000080";
export const DarkBlue = "#000060";
export const Black = "#000000";
export const Gray = "#444444";
export const LightGray = "#666666";
export const MiddleLightGray = "#999999";
export const MoreLightGray = "#D2D2D2";
export const VeryLightGray = "#E5E5E5";
export const ExtremeLightGray = "#F6F6F6";
export const Pink = "#F987C5";
export const LightPink = "#FFE7EF";
export const DarkGray: string = '#A9A9A9'; // Define the DarkGray you were trying to use
export const White: string = '#FFFFFF';    // Define the White you were trying to use
export const LightOrange = "#FED8B1";     // A light orange, adjust as needed
export const LightSteelBlue = "#B0C4DE";  // A light steel blue, adjust as needed
export const LightYellow = "#FFFFE0";    // A light yellow, adjust as needed


export const ExtremeLightBlue = "#DDFFFF";
export const OutOfScopeFancy = "#D5D7FF";
export const CustomDevelopedParts = "#FFFC97";
export const LightBlue = "#77FFFF";
export const Brown = "#8C4C17";


// --- Hex Color Manipulation ---

/**
 * Darkens a hex color string (#RRGGBB) by subtracting 0x20 (32) from each component.
 * Clamps components at 0.
 * @param hexString - The hex color string (e.g., "#CC0000"). Must start with '#'.
 * @returns The darkened hex color string, or the original string if input is invalid.
 */
export function darkenHexColor(hexString: string): string {
    if (!hexString || !hexString.startsWith('#') || hexString.length !== 7) {
        console.warn(`Invalid hex string format for darken: ${hexString}`);
        return hexString; // Return original on invalid format
    }
    try {
        let r = parseInt(hexString.substring(1, 3), 16);
        let g = parseInt(hexString.substring(3, 5), 16);
        let b = parseInt(hexString.substring(5, 7), 16);

        r = Math.max(0, r - 0x20);
        g = Math.max(0, g - 0x20);
        b = Math.max(0, b - 0x20);

        // Convert back to hex, padding with '0' if needed
        const rr = r.toString(16).padStart(2, '0');
        const gg = g.toString(16).padStart(2, '0');
        const bb = b.toString(16).padStart(2, '0');

        return `#${rr}${gg}${bb}`;
    } catch (e) {
        console.error(`Error parsing hex string for darken: ${hexString}`, e);
        return hexString; // Return original on parsing error
    }
}

/**
 * Brightens a hex color string (#RRGGBB) by adding 0x20 (32) to each component.
 * Clamps components at 255 (0xFF).
 * @param hexString - The hex color string (e.g., "#CC0000"). Must start with '#'.
 * @returns The brightened hex color string, or the original string if input is invalid.
 */
export function brightenHexColor(hexString: string): string {
    if (!hexString || !hexString.startsWith('#') || hexString.length !== 7) {
        console.warn(`Invalid hex string format for brighten: ${hexString}`);
        return hexString; // Return original on invalid format
    }
    try {
        let r = parseInt(hexString.substring(1, 3), 16);
        let g = parseInt(hexString.substring(3, 5), 16);
        let b = parseInt(hexString.substring(5, 7), 16);

        r = Math.min(255, r + 0x20);
        g = Math.min(255, g + 0x20);
        b = Math.min(255, b + 0x20);

        // Convert back to hex, padding with '0' if needed
        const rr = r.toString(16).padStart(2, '0');
        const gg = g.toString(16).padStart(2, '0');
        const bb = b.toString(16).padStart(2, '0');

        return `#${rr}${gg}${bb}`;
    } catch (e) {
        console.error(`Error parsing hex string for brighten: ${hexString}`, e);
        return hexString; // Return original on parsing error
    }
}

// --- Specific Semantic Color Functions (returning hex strings) ---
// These were likely used for text colors in the original PDF report.
// They might still be useful for consistent coloring in a UI.

export function RgbHexColorCriticalRisk(): string {
    return "#FF2600";
}

export function RgbHexColorHighRisk(): string {
    return "#A0281E";
}

export function RgbHexColorElevatedRisk(): string {
    return "#FF8E00";
}

export function RgbHexColorMediumRisk(): string {
    return "#C87832";
}

export function RgbHexColorLowRisk(): string {
    return "#23465F";
}

export function RgbHexColorOutOfScope(): string {
    // Note: This returns a gray color, distinct from the OutOfScopeFancy constant
    return "#7F7F7F";
}

// --- Risk Status Colors ---
export function RgbHexColorRiskStatusUnchecked(): string {
    return "#FF0000";
}

export function RgbHexColorRiskStatusMitigated(): string {
    return "#008F00";
}

export function RgbHexColorRiskStatusInProgress(): string {
    return "#0000FF";
}

export function RgbHexColorRiskStatusAccepted(): string {
    return "#FF40FF";
}

export function RgbHexColorRiskStatusInDiscussion(): string {
    return "#FF9300";
}

export function RgbHexColorRiskStatusFalsePositive(): string {
    return "#666666";
}

// --- Risk Category Colors ---
export function RgbHexColorTwilight(): string {
    return "#3A52C8";
}

export function RgbHexColorBusiness(): string {
    return "#531B93";
}

export function RgbHexColorArchitecture(): string {
    return "#005493";
}

export function RgbHexColorDevelopment(): string {
    return "#DE9223";
}

export function RgbHexColorOperation(): string {
    return "#947F50";
}

export function RgbHexColorModelFailure(): string {
    return "#945200";
}
