/**
 * The route names of the three main modules
 */
export const routeNames = {
    start: "/home",
    editor: "/editor",
    inventory: "/inventory",
};

/**
 * Calculate the brightness for a given color
 *
 * @param color The color as a string in hex format
 */
export function getBrightness(color: string): number {
    let brightness = 0;
    const parsedHex = parseInt(color.substr(1), 16);
    if (parsedHex) {
        // Get R, G, B values from hex-code
        const R = (parsedHex >> 16) & 255;
        const G = (parsedHex >> 8) & 255;
        const B = parsedHex & 255;

        // Calculate color brightness from RGB-values
        brightness = R * 0.299 + G * 0.587 + B * 0.114;
    }
    return brightness;
}

/**
 * Determine whether an object is empty
 *
 * @param object The object to be checked
 * @return True if the object is null
 */
// eslint-disable-next-line
export function isEmpty(object: any): boolean {
    return Object.keys(object).length === 0;
}

/**
 * Create a deep-copy of any object
 *
 * @param obj The object to be copied
 */
export function deepCopy<Type>(obj: Type): Type {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * The default headers for server requests
 */
export const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
};

/**
 * Execute a GET request
 *
 * @param path The path of the request
 */
export function GET(path: string): Promise<Response> {
    return fetch(path);
}

/**
 * Execute a POST request
 *
 * @param path The path of the request
 * @param body The body
 */
export function POST(path: string, body: string): Promise<Response> {
    return fetch(path, {
        headers,
        method: "POST",
        body: body,
    });
}

/**
 * Execute a PUT request
 *
 * @param path The path of the request
 * @param body The body
 */
export function PUT(path: string, body: string): Promise<Response> {
    return fetch(path, {
        headers,
        method: "PUT",
        body: body,
    });
}

/**
 * Execute a DELETE request
 *
 * @param path The path of the request
 */
export function DELETE(path: string): Promise<Response> {
    return fetch(path, {
        headers,
        method: "DELETE",
    });
}

/**
 * Fetch nodes and labels from backend
 *
 * @param filter Filter containing the name and labels to filter nodes by
 */
export async function loadFilteredNodes(filter: {
    userInput: string;
    labelsToFilterBy: Array<string>;
}): Promise<Response[]> {
    const filterString = generateFilterString(filter);

    const resNodes = await GET(`/api/nodes?limit=50${filterString}`);
    const resLabels = await GET("/api/data-scheme/label");
    return [resNodes, resLabels];
}

/**
 * Generate a string from the filter parameters that can be used in backend requests
 *
 * @param filter Filter containing the name and labels to filter nodes by
 */
export function generateFilterString(filter: { userInput: string; labelsToFilterBy: Array<string> }): string {
    let filterString = "";
    if (filter) {
        filterString = "&nameFilter=" + filter.userInput;
        filter.labelsToFilterBy.forEach((label) => (filterString += "&labelFilter=" + label));
    }

    return filterString;
}
