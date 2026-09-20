function toLongId(shortId: string): string {

    if (shortId.length !== 15) return shortId; // assume it's already 18 or invalid

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ012345";

    const chunks = [
        shortId.substring(0, 5),
        shortId.substring(5, 10),
        shortId.substring(10, 15)
    ];

    let suffix = "";

    for (const chunk of chunks) {
        let flags = 0;
        for (let i = 0; i < chunk.length; i++) {
            const c = chunk[i];
            if (c >= "A" && c <= "Z") {
                flags |= 1 << i;
            }
        }

        suffix += chars[flags];
    }

    return shortId + suffix;
}


/**
 * Convert an 18-char Salesforce ID into a 12-char "super-short" ID.
 * Removes:
 *  - 3-char object prefix
 *  - 3-char checksum at the end
 *
 * Structure:
 * 18-char ID = PPP + XXXXXXXXXXXX + CCC
 * Result = 12 chars (XXXXXXXXXXXX)
 */
export function toSuperShortId(id: string, prefix: string): string {
    if (!id) {
        throw new Error("Salesforce ID cannot be empty.");
    }

    const trimmed = id.trim();

    if (trimmed.length !== 18) {
        throw new Error("Input must be an 18-character Salesforce ID.");
    }

    if (trimmed.substring(0, 2) !== prefix) {
        throw new Error(`Id must contain prefix '${prefix}'`);
    }

    // Remove prefix (first 3) and checksum (last 3)
    return trimmed.substring(3, 15); // characters 3 through 14 (12 chars)
}

/**
 * Turn a 12-char super-short ID into a full 18-char ID using the given object prefix.
 */
function expandSuperShort(body12: string, prefix: string): string {
    if (body12.length !== 12) {
        throw new Error("Super-short ID must be 12 characters.");
    }
    if (prefix.length !== 3) {
        throw new Error("Object prefix must be 3 characters.");
    }

    const id15 = prefix + body12; // prefix + 12-char body = 15-char ID
    return toLongId(id15);
}



/**
 * Normalize any Salesforce ID (12, 15, 18 chars) to full 18-char format.
 */
export function normalizeId(id: string, prefix: string): string {
    if (!id) return "";

    const trimmed = id.trim();

    if (trimmed.length === 18) {
        return trimmed;
    }

    if (trimmed.length === 15) {
        return toLongId(trimmed);
    }

    if (trimmed.length === 12) {
        return expandSuperShort(trimmed, prefix);
    }

    throw new Error(`Unsupported Salesforce ID length: ${trimmed.length}`);
}

/**
 * Compare two Salesforce IDs, allowing either 15 or 18 char formats.
 */
export function idEquals(a: string, b: string, prefix: string): boolean {
    if (!a || !b) return false;
    return normalizeId(a, prefix) === normalizeId(b, prefix);
}
