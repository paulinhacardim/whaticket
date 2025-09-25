function getConfig(name, defaultValue=null) {
    // If inside a docker container, use window.ENV
    if (typeof window !== 'undefined' && window.ENV !== undefined) {
        return window.ENV[name] || defaultValue;
    }

    return process.env[name] || defaultValue;
}

export function getBackendUrl() {
    const envUrl = getConfig('REACT_APP_BACKEND_URL');
    if (envUrl) return envUrl;
    // Fallbacks: try to infer backend URL from current location
    if (typeof window !== 'undefined' && window.location) {
        const { protocol, hostname, port } = window.location;
        // Common dev ports: frontend 3000/3333 -> backend 8080
        const inferredPort = (port === '3000' || port === '3333' || port === '') ? '8080' : port;
        return `${protocol}//${hostname}:${inferredPort}`;
    }
    // Final fallback
    return 'http://localhost:8080';
}

export function getHoursCloseTicketsAuto() {
    return getConfig('REACT_APP_HOURS_CLOSE_TICKETS_AUTO');
}