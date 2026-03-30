const USERS_STORAGE_KEY = "gigshield.auth.users";
const SESSION_STORAGE_KEY = "gigshield.auth.session";

function isBrowser() {
  return typeof window !== "undefined";
}

function readJson(key, fallback) {
  if (!isBrowser()) {
    return fallback;
  }

  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function sanitizeEmail(email = "") {
  return email
    .normalize("NFKC")
    .replace(/\p{Cf}/gu, "")
    .replace(/\s+/gu, "")
    .toLowerCase();
}

function buildSession(user) {
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      platform: user.platform,
      phone: user.phone || "",
      pinCode: user.pinCode || "",
      earnings: user.earnings ?? 0,
      nfi: user.nfi ?? 55,
    },
  };
}

export function getStoredSession() {
  return readJson(SESSION_STORAGE_KEY, null);
}

export async function signUpWithEmail({ email, password, name, platform, phone }) {
  const normalizedEmail = sanitizeEmail(email);
  const users = readJson(USERS_STORAGE_KEY, []);

  const existingUser = users.find(user => user.email === normalizedEmail);
  if (existingUser) {
    return {
      data: null,
      error: {
        message: "An account with this email already exists.",
        code: "email_already_exists",
        status: 409,
      },
    };
  }

  const user = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    password,
    name,
    platform,
    phone: phone || "",
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  writeJson(USERS_STORAGE_KEY, users);

  const session = buildSession(user);
  writeJson(SESSION_STORAGE_KEY, session);

  return {
    data: session,
    error: null,
  };
}

export async function signInWithEmail({ email, password }) {
  const normalizedEmail = sanitizeEmail(email);
  const users = readJson(USERS_STORAGE_KEY, []);

  const user = users.find(
    storedUser => storedUser.email === normalizedEmail && storedUser.password === password
  );

  if (!user) {
    return {
      data: null,
      error: {
        message: "Incorrect email or password.",
        code: "invalid_credentials",
        status: 401,
      },
    };
  }

  const session = buildSession(user);
  writeJson(SESSION_STORAGE_KEY, session);

  return {
    data: session,
    error: null,
  };
}

export async function createUserProfile({ userId, name, platform, phone, pinCode, earnings, nfi }) {
  const users = readJson(USERS_STORAGE_KEY, []);
  const userIndex = users.findIndex(user => user.id === userId);

  if (userIndex === -1) {
    return {
      data: null,
      error: {
        message: "Account record not found.",
        code: "user_not_found",
        status: 404,
      },
    };
  }

  users[userIndex] = {
    ...users[userIndex],
    name,
    platform,
    phone: phone || "",
    pinCode,
    earnings: Number(earnings) || 0,
    nfi: Number(nfi) || 55,
    updatedAt: new Date().toISOString(),
  };

  writeJson(USERS_STORAGE_KEY, users);

  const session = buildSession(users[userIndex]);
  writeJson(SESSION_STORAGE_KEY, session);

  return {
    data: session.user,
    error: null,
  };
}

export async function signOut() {
  if (isBrowser()) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  }

  return { error: null };
}
