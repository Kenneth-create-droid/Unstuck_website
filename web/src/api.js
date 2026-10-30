// API Client for Unstuck & Keneca Matching Engine

const API_BASE_URL = "http://192.168.2.196:2000";

// Default Ontario Tech campus coordinates (North Oshawa campus)
export const DEFAULT_CAMPUS_LOCATION = {
  lat: 43.9458,
  lng: -78.8960
};

export async function apiRequest(endpoint, method = "GET", body = null) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json"
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  const data = await response.json().catch(() => ({}));

 if (!response.ok) {
  const error = new Error(`Failed to fetch chat messages (${response.status})`);
  error.status = response.status;
  throw error;
}

  return data;
}

// ---------------- AUTHENTICATION APIS ----------------

export async function signupUser({ firstname, lastname, email, password }) {
  return apiRequest("/signup", "POST", {
    firstname: firstname.trim(),
    lastname: lastname.trim(),
    email: email.trim().toLowerCase(),
    password
  });
}

export async function verifyEmail({ email, code }) {
  return apiRequest("/signup/verify", "POST", {
    email: email.trim().toLowerCase(),
    code: String(code).trim()
  });
}

export async function resendVerificationCode({ email }) {
  return apiRequest("/signup/resend", "POST", {
    email: email.trim().toLowerCase()
  });
}

export async function loginUser({ email, password }) {
  return apiRequest("/login", "POST", {
    email: email.trim().toLowerCase(),
    password
  });
}

export async function forgotPassword({ email }) {
  return apiRequest("/forgot-password", "POST", {
    email: email.trim().toLowerCase()
  });
}

export async function verifyResetCode({ email, code }) {
  return apiRequest("/forgot-password/verify", "POST", {
    email: email.trim().toLowerCase(),
    code: String(code).trim()
  });
}

export async function resetPassword({ email, code, newPassword }) {
  return apiRequest("/reset-password", "POST", {
    email: email.trim().toLowerCase(),
    code: String(code).trim(),
    newPassword
  });
}

export async function getUserProfile(userId) {
  return apiRequest(`/profile?userId=${userId}`, "GET");
}

// ---------------- KENECA ENGINE & REDIS SPATIAL APIS ----------------

export async function activateLocation({ userId, lat, lng }) {
  return apiRequest("/api/location/activate", "POST", {
    userId,
    lat: Number(lat),
    lng: Number(lng)
  });
}

export async function deactivateLocation({ userId }) {
  return apiRequest("/api/location/deactivate", "POST", {
    userId
  });
}

export async function updateLocation({ userId, oldLat, oldLng, newLat, newLng }) {
  return apiRequest("/api/location/update", "PUT", {
    userId,
    oldLat,
    oldLng,
    newLat,
    newLng
  });
}

export async function getUserStatus(userId) {
  return apiRequest(`/api/user/status?userId=${userId}`, "GET");
}

export async function submitHelpRequest({ userId, subject, description, lat, lng }) {
  return apiRequest("/api/request/submit", "POST", {
    userId,
    subject: subject || "General Course Help",
    description: description.trim(),
    lat: Number(lat),
    lng: Number(lng)
  });
}

export async function getRequestStatus(postId) {
  return apiRequest(
    `/api/request/progress?postId=${encodeURIComponent(postId)}`,
    "GET"
  );
}

export async function acceptOffer({ postId, helperId }) {
  return apiRequest("/api/request/respond", "POST", {
    postId,
    candidateId: helperId,
    action: "ACCEPT"
  });
}

export async function passOffer({ postId, helperId }) {
  return apiRequest("/api/request/respond", "POST", {
    postId,
    candidateId: helperId,
    action: "PASS"
  });
}
export async function cancelHelpRequest({ postId }) {
  return apiRequest("/api/request/cancel", "POST", {
    postId
  });
}

// Fetch messages for an active Unstuck chat session
export async function getChatMessages(postId, userId) {
  const response = await fetch(
    `${API_BASE_URL}/api/chat/messages?postId=${encodeURIComponent(postId)}&userId=${encodeURIComponent(userId)}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch chat messages (${response.status})`);
  }

  return response.json();
}
// Redispatch a help request after a chat session
export async function redispatchMatch(postId, userId) {
  const response = await fetch(`${API_BASE_URL}/api/chat/redispatch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      postId,
      userId,
    }),
  });

  const data = await response.json();

  if (!response.ok || data.success === false) {
    throw new Error(data.error || data.message || "Redispatch failed");
  }

  return data;
}


// Get chat session for requester or helper
export async function getChatSession(postId, userId) {
  return apiRequest(
    `/api/chat/session?postId=${encodeURIComponent(postId)}&userId=${encodeURIComponent(userId)}`
  );
}

// Send a message to the matched student
export async function sendChatMessage(postId, userId, message) {
  return apiRequest("/api/chat/message", "POST", {
    postId,
    userId,
    message
  });
}

// Mark a help request as resolved
export async function completeMatch(postId, userId) {
  return apiRequest("/api/chat/complete", "POST", {
    postId,
    userId
  });
}
