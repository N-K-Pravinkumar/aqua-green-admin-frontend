// The backend server's root URL, WITHOUT the trailing /api.
// Used by raw fetch() calls that build their own path (uploads, PDFs, etc)
// — the axios instance in services/api.js handles the /api-prefixed calls.
//
// REACT_APP_API_URL is expected to look like "https://your-backend.onrender.com/api".
// This strips the trailing "/api" (if present) to get just the server root.
const API_ROOT = (process.env.REACT_APP_API_URL || '${API_ROOT}/api').replace(/\/api\/?$/, '');

export default API_ROOT;